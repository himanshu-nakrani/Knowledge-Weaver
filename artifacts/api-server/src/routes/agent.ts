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

type AgentMode = "researcher" | "brainstorm" | "tutor" | "critic";

const MODE_CONFIGS: Record<AgentMode, {
  planLabel: string;
  planInstruction: string;
  reasonLabel: string;
  reasonInstruction: string;
  answerInstruction: string;
  extraSteps?: string[];
}> = {
  researcher: {
    planLabel: "Research plan",
    planInstruction: "You are a meticulous research agent. Give a clear 2-3 step plan to deeply investigate this question, citing sources and verifying claims.",
    reasonLabel: "Analyzing evidence",
    reasonInstruction: "Carefully analyze all evidence. Identify supporting facts, contradictions, and knowledge gaps. Prioritize accuracy.",
    answerInstruction: "Provide a thorough, evidence-based answer with citations [1], [2]. Note any caveats or areas needing further research.",
  },
  brainstorm: {
    planLabel: "Brainstorm strategy",
    planInstruction: "You are a creative brainstorming agent. Plan how to explore this topic creatively, finding unexpected connections and novel angles.",
    reasonLabel: "Making connections",
    reasonInstruction: "Think laterally. Find surprising connections between concepts, analogies, and creative angles. List 3-5 novel insights.",
    answerInstruction: "Share a range of creative ideas, perspectives, and unexpected connections. Encourage further exploration with follow-up questions.",
  },
  tutor: {
    planLabel: "Teaching plan",
    planInstruction: "You are a patient, expert tutor. Plan how to explain this topic clearly, building from fundamentals to advanced concepts.",
    reasonLabel: "Building explanation",
    reasonInstruction: "Identify the core concepts to explain, appropriate analogies, and common misconceptions to address.",
    answerInstruction: "Explain clearly with examples and analogies. Build from simple to complex. Check understanding with a follow-up question.",
  },
  critic: {
    planLabel: "Critical analysis plan",
    planInstruction: "You are a rigorous critical thinker. Plan how to examine this topic skeptically, identifying weak arguments and unstated assumptions.",
    reasonLabel: "Critical examination",
    reasonInstruction: "Identify logical fallacies, weak evidence, unstated assumptions, and alternative explanations. Be rigorous.",
    answerInstruction: "Present a balanced but skeptical analysis. Point out weaknesses, contradictions, and what evidence is missing. Suggest how to strengthen the argument.",
  },
};

router.get("/agent/run", rateLimiter(8, 60000), async (req, res): Promise<void> => {
  const content = String(req.query.content ?? "").trim();
  const mode = (String(req.query.mode ?? "researcher")) as AgentMode;
  const cfg = MODE_CONFIGS[mode] ?? MODE_CONFIGS.researcher;

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
    sseWrite(res, { type: "step", step: "plan", status: "running", label: cfg.planLabel, detail: `Analyzing: "${content.slice(0, 80)}${content.length > 80 ? "..." : ""}"` });

    const planPrompt = `${cfg.planInstruction}

User question: "${content}"

Respond with just the plan, no preamble. 2-3 sentences max.`;

    const plan = await chatCompletion([{ role: "user", content: planPrompt }], 0.4, 256);
    sseWrite(res, { type: "step", step: "plan", status: "done", label: cfg.planLabel, detail: plan });

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

    sseWrite(res, { type: "step", step: "reason", status: "running", label: cfg.reasonLabel, detail: "Synthesizing knowledge base and web findings..." });

    const docContext = chunks
      .slice(0, 4)
      .map((c, i) => `[Source ${i + 1}: ${c.documentTitle}]\n${c.content}`)
      .join("\n\n---\n\n");

    const reasoningPrompt = `${cfg.reasonInstruction}

User question: "${content}"

Evidence from knowledge base:
${docContext || "No relevant documents found."}
${webContext ? `\nWeb search results:\n${webContext}` : ""}

List 2-4 key insights. Be concise.`;

    const reasoning = await chatCompletion([{ role: "user", content: reasoningPrompt }], 0.4, 512);
    sseWrite(res, { type: "step", step: "reason", status: "done", label: cfg.reasonLabel, detail: reasoning });

    // Extra step for tutor mode: generate an analogy
    if (mode === "tutor") {
      sseWrite(res, { type: "step", step: "analogy", status: "running", label: "Finding analogies", detail: "Looking for helpful comparisons..." });
      const analogyPrompt = `Create 1-2 simple analogies or real-world examples to help explain the answer to: "${content}" Keep it brief.`;
      const analogy = await chatCompletion([{ role: "user", content: analogyPrompt }], 0.6, 200);
      sseWrite(res, { type: "step", step: "analogy", status: "done", label: "Finding analogies", detail: analogy });
    }

    // Extra step for brainstorm mode: unexpected connections
    if (mode === "brainstorm") {
      sseWrite(res, { type: "step", step: "connections", status: "running", label: "Exploring connections", detail: "Finding unexpected links..." });
      const connPrompt = `What are 2-3 surprising or non-obvious connections between "${content}" and other fields or ideas? Be creative and brief.`;
      const connections = await chatCompletion([{ role: "user", content: connPrompt }], 0.8, 200);
      sseWrite(res, { type: "step", step: "connections", status: "done", label: "Exploring connections", detail: connections });
    }

    // Extra step for critic mode: identify weaknesses
    if (mode === "critic") {
      sseWrite(res, { type: "step", step: "critique", status: "running", label: "Identifying weaknesses", detail: "Examining for flaws..." });
      const critiquePrompt = `What are the 2-3 main weaknesses, gaps, or unstated assumptions related to: "${content}"? Be specific and brief.`;
      const critique = await chatCompletion([{ role: "user", content: critiquePrompt }], 0.4, 250);
      sseWrite(res, { type: "step", step: "critique", status: "done", label: "Identifying weaknesses", detail: critique });
    }

    sseWrite(res, { type: "step", step: "answer", status: "running", label: "Generating answer", detail: "Composing final response..." });

    const answerPrompt = `You are yukara, a knowledge assistant operating in ${mode} mode. ${cfg.answerInstruction}

${docContext ? `Knowledge base context:\n${docContext}` : "No relevant documents found."}
${webContext ? `\nWeb context:\n${webContext}` : ""}

User question: "${content}"`;

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
