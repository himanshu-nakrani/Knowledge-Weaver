import { Router, type IRouter } from "express";
import { chatCompletion, tavilySearch, shouldUseWebSearch } from "../lib/groq";
import { similaritySearch } from "../lib/vectorStore";
import { logger } from "../lib/logger";
import { rateLimiter } from "../middlewares/rateLimiter";
import { trackQuery } from "./stats";

const router: IRouter = Router();

function sseWrite(res: import("express").Response, event: object) {
  res.write(`data: ${JSON.stringify(event)}\n\n`);
}

router.get("/agent/run", rateLimiter(8, 60000), async (req, res): Promise<void> => {
  const content = String(req.query.content ?? "").trim();
  if (!content) {
    res.status(400).json({ error: "content query param required" });
    return;
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  trackQuery(content);

  try {
    sseWrite(res, { type: "step", step: "plan", status: "running", label: "Planning approach", detail: `Analyzing: "${content.slice(0, 80)}${content.length > 80 ? "..." : ""}"` });

    const planPrompt = `You are a planning agent. Given the user's question, briefly describe a 2-3 step plan to answer it. Keep it to 1-2 sentences.

User question: "${content}"

Respond with just the plan, no preamble.`;

    const plan = await chatCompletion([{ role: "user", content: planPrompt }], 0.3, 256);
    sseWrite(res, { type: "step", step: "plan", status: "done", label: "Planning approach", detail: plan });

    sseWrite(res, { type: "step", step: "retrieve", status: "running", label: "Retrieving relevant knowledge", detail: "Searching your knowledge base..." });

    const chunks = await similaritySearch(content, 6);
    const hasRelevantDocs = chunks.length > 0 && chunks[0].score > 0.15;

    const retrievalSummary = hasRelevantDocs
      ? `Found ${chunks.length} relevant chunks from: ${[...new Set(chunks.map((c) => c.documentTitle))].join(", ")}`
      : "No highly relevant documents found — will rely on general knowledge";

    sseWrite(res, { type: "step", step: "retrieve", status: "done", label: "Retrieving relevant knowledge", detail: retrievalSummary });

    const useWebSearch = shouldUseWebSearch(content, hasRelevantDocs);
    let webContext = "";

    if (useWebSearch) {
      sseWrite(res, { type: "step", step: "websearch", status: "running", label: "Searching the web", detail: `Querying web for: "${content.slice(0, 60)}"` });
      webContext = await tavilySearch(content);
      sseWrite(res, { type: "step", step: "websearch", status: "done", label: "Searching the web", detail: webContext ? "Web results retrieved" : "No web results found" });
    }

    sseWrite(res, { type: "step", step: "reason", status: "running", label: "Reasoning over evidence", detail: "Synthesizing knowledge base and web findings..." });

    const docContext = chunks
      .slice(0, 4)
      .map((c, i) => `[Source ${i + 1}: ${c.documentTitle}]\n${c.content}`)
      .join("\n\n---\n\n");

    const reasoningPrompt = `Analyze the following evidence and identify key insights relevant to the user's question.

User question: "${content}"

Evidence from knowledge base:
${docContext || "No relevant documents found."}
${webContext ? `\nWeb search results:\n${webContext}` : ""}

List 2-4 key insights you'll use to answer the question. Be concise.`;

    const reasoning = await chatCompletion([{ role: "user", content: reasoningPrompt }], 0.3, 512);
    sseWrite(res, { type: "step", step: "reason", status: "done", label: "Reasoning over evidence", detail: reasoning });

    sseWrite(res, { type: "step", step: "answer", status: "running", label: "Generating answer", detail: "Composing final response..." });

    const answerPrompt = `You are MindForge, an intelligent knowledge assistant. Answer the user's question thoroughly using the provided evidence.

${docContext ? `Knowledge base context:\n${docContext}` : "No relevant documents found."}
${webContext ? `\nWeb context:\n${webContext}` : ""}

User question: "${content}"

Provide a comprehensive, well-structured answer. Use [1], [2] citations for sources when citing knowledge base chunks. If using web info, note it.`;

    const answer = await chatCompletion([{ role: "user", content: answerPrompt }], 0.7, 1024);
    sseWrite(res, { type: "step", step: "answer", status: "done", label: "Answer ready", detail: answer });

    const sources = chunks.map((c) => ({
      documentId: c.documentId,
      documentTitle: c.documentTitle,
      chunkContent: c.content.slice(0, 200) + (c.content.length > 200 ? "..." : ""),
      score: c.score,
    }));

    sseWrite(res, {
      type: "done",
      answer,
      sources,
      usedWebSearch: useWebSearch && !!webContext,
    });

    res.end();
  } catch (err) {
    logger.error({ err }, "Agent run failed");
    sseWrite(res, { type: "error", error: "Agent run failed" });
    res.end();
  }
});

export default router;
