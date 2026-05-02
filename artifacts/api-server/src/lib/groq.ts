import Groq from "groq-sdk";
import { logger } from "./logger";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY ?? "",
});

export interface ChatCompletionMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export async function chatCompletion(
  messages: ChatCompletionMessage[],
  temperature = 0.7,
  maxTokens = 1024
): Promise<string> {
  if (!process.env.GROQ_API_KEY) {
    logger.warn("GROQ_API_KEY not set — returning mock response");
    return "I'm MindForge's AI assistant. Please set GROQ_API_KEY to enable AI responses. Your documents are indexed and ready.";
  }

  const response = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages,
    temperature,
    max_tokens: maxTokens,
  });

  return response.choices[0]?.message?.content ?? "";
}

export async function* chatCompletionStream(
  messages: ChatCompletionMessage[],
  temperature = 0.7,
  maxTokens = 1024
): AsyncGenerator<string> {
  if (!process.env.GROQ_API_KEY) {
    const mock =
      "I'm MindForge's AI assistant. Please set GROQ_API_KEY to enable AI responses. Your documents are indexed and ready.";
    for (const char of mock) {
      yield char;
      await new Promise((r) => setTimeout(r, 8));
    }
    return;
  }

  const stream = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages,
    temperature,
    max_tokens: maxTokens,
    stream: true,
  });

  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content;
    if (delta) yield delta;
  }
}

export async function tavilySearch(query: string): Promise<string> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) {
    logger.warn("TAVILY_API_KEY not set — skipping web search");
    return "";
  }

  try {
    const response = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: apiKey,
        query,
        search_depth: "basic",
        max_results: 3,
      }),
    });
    const data = (await response.json()) as {
      results?: Array<{ title: string; content: string; url: string }>;
    };
    if (!data.results) return "";
    return data.results
      .map((r) => `[${r.title}](${r.url})\n${r.content}`)
      .join("\n\n");
  } catch (err) {
    logger.error({ err }, "Tavily search failed");
    return "";
  }
}

export function shouldUseWebSearch(query: string, hasRelevantDocs: boolean): boolean {
  const webKeywords = [
    "latest", "recent", "new", "current", "today", "2024", "2025",
    "news", "update", "release", "announced", "trending",
  ];
  const hasWebKeyword = webKeywords.some((kw) => query.toLowerCase().includes(kw));
  return hasWebKeyword || !hasRelevantDocs;
}
