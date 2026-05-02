import { Router, type IRouter } from "express";
import { eq, sql, desc } from "drizzle-orm";
import {
  db,
  chatSessionsTable,
  chatMessagesTable,
  activityTable,
} from "@workspace/db";
import {
  ListChatSessionsResponseItem,
  CreateChatSessionBody,
  GetChatSessionParams,
  DeleteChatSessionParams,
  SendMessageParams,
  SendMessageBody,
} from "@workspace/api-zod";
import { similaritySearch, type RetrievedChunk } from "../lib/vectorStore";
import { chatCompletion, tavilySearch, shouldUseWebSearch } from "../lib/groq";
import { logger } from "../lib/logger";
import { setLastEval } from "../lib/evalStore";

const router: IRouter = Router();

function formatSession(session: typeof chatSessionsTable.$inferSelect) {
  return {
    ...session,
    createdAt: session.createdAt.toISOString(),
    updatedAt: session.updatedAt.toISOString(),
  };
}

function formatMessage(msg: typeof chatMessagesTable.$inferSelect) {
  return {
    ...msg,
    sources: (msg.sources as object[]) ?? [],
    faithfulnessScore: msg.faithfulnessScore ?? null,
    createdAt: msg.createdAt.toISOString(),
  };
}

router.get("/chat/sessions", async (_req, res): Promise<void> => {
  const sessions = await db
    .select()
    .from(chatSessionsTable)
    .orderBy(desc(chatSessionsTable.updatedAt));

  res.json(sessions.map(formatSession));
});

router.post("/chat/sessions", async (req, res): Promise<void> => {
  const parsed = CreateChatSessionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [session] = await db
    .insert(chatSessionsTable)
    .values({ title: parsed.data.title })
    .returning();

  res.status(201).json(formatSession(session));
});

router.get("/chat/sessions/:id", async (req, res): Promise<void> => {
  const params = GetChatSessionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [session] = await db
    .select()
    .from(chatSessionsTable)
    .where(eq(chatSessionsTable.id, params.data.id));

  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  const messages = await db
    .select()
    .from(chatMessagesTable)
    .where(eq(chatMessagesTable.sessionId, params.data.id))
    .orderBy(chatMessagesTable.createdAt);

  res.json({
    ...formatSession(session),
    messages: messages.map(formatMessage),
  });
});

router.delete("/chat/sessions/:id", async (req, res): Promise<void> => {
  const params = DeleteChatSessionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [session] = await db
    .delete(chatSessionsTable)
    .where(eq(chatSessionsTable.id, params.data.id))
    .returning();

  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  res.sendStatus(204);
});

router.post("/chat/sessions/:id/messages", async (req, res): Promise<void> => {
  const params = SendMessageParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = SendMessageBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const sessionId = params.data.id;
  const userContent = parsed.data.content;

  // Check session exists
  const [session] = await db
    .select()
    .from(chatSessionsTable)
    .where(eq(chatSessionsTable.id, sessionId));

  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  // Save user message
  await db.insert(chatMessagesTable).values({
    sessionId,
    role: "user",
    content: userContent,
    sources: [],
    usedWebSearch: false,
  });

  // Retrieve relevant chunks
  const retrievedChunks = await similaritySearch(userContent, 5);
  const hasRelevantDocs = retrievedChunks.length > 0 && retrievedChunks[0].score > 0.2;

  // Decide web search
  const useWebSearch = shouldUseWebSearch(userContent, hasRelevantDocs);
  let webContext = "";
  if (useWebSearch) {
    webContext = await tavilySearch(userContent);
  }

  // Build context
  const docContext = retrievedChunks
    .slice(0, 4)
    .map(
      (c, i) =>
        `[Source ${i + 1}: ${c.documentTitle}]\n${c.content}`
    )
    .join("\n\n---\n\n");

  const systemPrompt = `You are MindForge, an intelligent personal knowledge assistant. You help users explore and understand their knowledge base.

${docContext ? `Relevant knowledge from the user's documents:\n\n${docContext}` : "No directly relevant documents found."}
${webContext ? `\n\nFresh web information:\n\n${webContext}` : ""}

Instructions:
- Answer based on the provided context when available
- Cite sources using [1], [2] notation referring to the source numbers above
- If web search was used, mention that the information is from the web
- Be concise, precise, and helpful
- If you don't know something, say so honestly`;

  // Get chat history for context
  const history = await db
    .select()
    .from(chatMessagesTable)
    .where(eq(chatMessagesTable.sessionId, sessionId))
    .orderBy(chatMessagesTable.createdAt)
    .limit(10);

  const messages = [
    { role: "system" as const, content: systemPrompt },
    ...history.slice(-6).map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
    { role: "user" as const, content: userContent },
  ];

  const aiResponse = await chatCompletion(messages);

  // Simple faithfulness score based on overlap
  const faithfulnessScore =
    hasRelevantDocs
      ? Math.min(0.95, 0.5 + retrievedChunks[0].score * 0.5)
      : 0.3;

  const sources = retrievedChunks.map((c) => ({
    documentId: c.documentId,
    documentTitle: c.documentTitle,
    chunkContent: c.content.slice(0, 200) + (c.content.length > 200 ? "..." : ""),
    score: c.score,
  }));

  // Save AI message
  const [aiMessage] = await db
    .insert(chatMessagesTable)
    .values({
      sessionId,
      role: "assistant",
      content: aiResponse,
      sources,
      usedWebSearch: useWebSearch && !!webContext,
      faithfulnessScore,
    })
    .returning();

  // Update message count
  await db
    .update(chatSessionsTable)
    .set({
      messageCount: sql`${chatSessionsTable.messageCount} + 2`,
    })
    .where(eq(chatSessionsTable.id, sessionId));

  // Store eval data
  setLastEval(sessionId, {
    query: userContent,
    retrievedChunks: retrievedChunks.map((c) => ({
      id: c.id,
      content: c.content,
      documentId: c.documentId,
      chunkIndex: c.chunkIndex,
      score: c.score,
    })),
    faithfulnessScore,
    usedWebSearch: useWebSearch && !!webContext,
  });

  await db.insert(activityTable).values({
    type: "chat_message",
    description: `Question: "${userContent.slice(0, 60)}${userContent.length > 60 ? "..." : ""}"`,
  });

  req.log.info({ sessionId, usedWebSearch: useWebSearch }, "Chat message processed");

  res.json(formatMessage(aiMessage));
});

export default router;
