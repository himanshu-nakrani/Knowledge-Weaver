import { Router, type IRouter } from "express";
import { eq, sql, desc } from "drizzle-orm";
import {
  db,
  chatSessionsTable,
  chatMessagesTable,
  activityTable,
} from "@workspace/db";
import {
  CreateChatSessionBody,
  GetChatSessionParams,
  DeleteChatSessionParams,
  SendMessageParams,
  SendMessageBody,
} from "@workspace/api-zod";
import { similaritySearch } from "../lib/vectorStore";
import {
  chatCompletion,
  chatCompletionStream,
  tavilySearch,
  shouldUseWebSearch,
} from "../lib/groq";
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
  res.json({ ...formatSession(session), messages: messages.map(formatMessage) });
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

/** Shared: build retrieval context and system prompt */
async function buildChatContext(sessionId: number, userContent: string) {
  const retrievedChunks = await similaritySearch(userContent, 5);
  const hasRelevantDocs = retrievedChunks.length > 0 && retrievedChunks[0].score > 0.2;
  const useWebSearch = shouldUseWebSearch(userContent, hasRelevantDocs);
  let webContext = "";
  if (useWebSearch) webContext = await tavilySearch(userContent);

  const docContext = retrievedChunks
    .slice(0, 4)
    .map((c, i) => `[Source ${i + 1}: ${c.documentTitle}]\n${c.content}`)
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

  const history = await db
    .select()
    .from(chatMessagesTable)
    .where(eq(chatMessagesTable.sessionId, sessionId))
    .orderBy(chatMessagesTable.createdAt)
    .limit(10);

  const messages = [
    { role: "system" as const, content: systemPrompt },
    ...history.slice(-8).map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
    { role: "user" as const, content: userContent },
  ];

  const faithfulnessScore = hasRelevantDocs
    ? Math.min(0.95, 0.5 + retrievedChunks[0].score * 0.5)
    : 0.3;

  const sources = retrievedChunks.map((c) => ({
    documentId: c.documentId,
    documentTitle: c.documentTitle,
    chunkContent: c.content.slice(0, 200) + (c.content.length > 200 ? "..." : ""),
    score: c.score,
  }));

  return { messages, retrievedChunks, faithfulnessScore, sources, useWebSearch, webContext };
}

/** Streaming SSE endpoint: GET /api/chat/sessions/:id/stream?content=... */
router.get("/chat/sessions/:id/stream", async (req, res): Promise<void> => {
  const params = SendMessageParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const userContent = String(req.query.content ?? "").trim();
  if (!userContent) {
    res.status(400).json({ error: "content query param required" });
    return;
  }

  const sessionId = params.data.id;
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

  // SSE headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  try {
    const ctx = await buildChatContext(sessionId, userContent);

    // Send retrieval metadata first
    res.write(
      `data: ${JSON.stringify({
        type: "meta",
        sources: ctx.sources,
        faithfulnessScore: ctx.faithfulnessScore,
        usedWebSearch: ctx.useWebSearch && !!ctx.webContext,
      })}\n\n`
    );

    // Stream tokens
    let fullContent = "";
    for await (const token of chatCompletionStream(ctx.messages)) {
      fullContent += token;
      res.write(`data: ${JSON.stringify({ type: "token", content: token })}\n\n`);
    }

    // Save assistant message
    const [aiMessage] = await db
      .insert(chatMessagesTable)
      .values({
        sessionId,
        role: "assistant",
        content: fullContent,
        sources: ctx.sources,
        usedWebSearch: ctx.useWebSearch && !!ctx.webContext,
        faithfulnessScore: ctx.faithfulnessScore,
      })
      .returning();

    // Update session message count
    await db
      .update(chatSessionsTable)
      .set({ messageCount: sql`${chatSessionsTable.messageCount} + 2` })
      .where(eq(chatSessionsTable.id, sessionId));

    // Store eval
    setLastEval(sessionId, {
      query: userContent,
      retrievedChunks: ctx.retrievedChunks.map((c) => ({
        id: c.id,
        content: c.content,
        documentId: c.documentId,
        chunkIndex: c.chunkIndex,
        score: c.score,
      })),
      faithfulnessScore: ctx.faithfulnessScore,
      usedWebSearch: ctx.useWebSearch && !!ctx.webContext,
    });

    await db.insert(activityTable).values({
      type: "chat_message",
      description: `Question: "${userContent.slice(0, 60)}${userContent.length > 60 ? "..." : ""}"`,
    });

    // Done event with final message
    res.write(
      `data: ${JSON.stringify({ type: "done", message: formatMessage(aiMessage) })}\n\n`
    );
    res.end();
  } catch (err) {
    logger.error({ err }, "Streaming chat error");
    res.write(`data: ${JSON.stringify({ type: "error", error: "Stream failed" })}\n\n`);
    res.end();
  }
});

/** Non-streaming fallback POST */
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

  const [session] = await db
    .select()
    .from(chatSessionsTable)
    .where(eq(chatSessionsTable.id, sessionId));
  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  await db.insert(chatMessagesTable).values({
    sessionId,
    role: "user",
    content: userContent,
    sources: [],
    usedWebSearch: false,
  });

  const ctx = await buildChatContext(sessionId, userContent);
  const aiResponse = await chatCompletion(ctx.messages);

  const [aiMessage] = await db
    .insert(chatMessagesTable)
    .values({
      sessionId,
      role: "assistant",
      content: aiResponse,
      sources: ctx.sources,
      usedWebSearch: ctx.useWebSearch && !!ctx.webContext,
      faithfulnessScore: ctx.faithfulnessScore,
    })
    .returning();

  await db
    .update(chatSessionsTable)
    .set({ messageCount: sql`${chatSessionsTable.messageCount} + 2` })
    .where(eq(chatSessionsTable.id, sessionId));

  setLastEval(sessionId, {
    query: userContent,
    retrievedChunks: ctx.retrievedChunks.map((c) => ({
      id: c.id,
      content: c.content,
      documentId: c.documentId,
      chunkIndex: c.chunkIndex,
      score: c.score,
    })),
    faithfulnessScore: ctx.faithfulnessScore,
    usedWebSearch: ctx.useWebSearch && !!ctx.webContext,
  });

  await db.insert(activityTable).values({
    type: "chat_message",
    description: `Question: "${userContent.slice(0, 60)}${userContent.length > 60 ? "..." : ""}"`,
  });

  req.log.info({ sessionId }, "Chat message processed");
  res.json(formatMessage(aiMessage));
});

export default router;
