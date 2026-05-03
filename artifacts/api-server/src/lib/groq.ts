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

/**
 * Extracts relevant tags from document content using an LLM.
 */
export async function extractTags(title: string, content: string): Promise<string[]> {
  if (!process.env.GROQ_API_KEY) return [];
  try {
    const snippet = content.slice(0, 1500);
    const prompt = `Extract 3-7 concise topic tags for this document. Tags should be lowercase, single words or short hyphenated phrases.

Title: "${title}"
Content snippet: "${snippet}"

Respond with ONLY a comma-separated list of tags, nothing else:`;
    const result = await chatCompletion([{ role: "user", content: prompt }], 0.2, 100);
    return result
      .split(",")
      .map((t) => t.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""))
      .filter((t) => t.length > 0 && t.length < 30)
      .slice(0, 7);
  } catch {
    return [];
  }
}

/**
 * Generates a concise 2-4 sentence summary of document content.
 */
export async function generateSummary(title: string, content: string): Promise<string> {
  if (!process.env.GROQ_API_KEY) {
    return "AI summaries require GROQ_API_KEY to be configured.";
  }
  const snippet = content.slice(0, 3000);
  const prompt = `Write a concise 2-4 sentence summary of this document. Focus on the key ideas and takeaways.

Title: "${title}"
Content: "${snippet}"

Summary:`;
  return chatCompletion([{ role: "user", content: prompt }], 0.4, 300);
}

/**
 * Expands a user query into multiple semantically related search terms
 * to improve BM25 recall. Returns the original query plus synonyms/related terms.
 */
export async function expandQuery(query: string): Promise<string> {
  if (!process.env.GROQ_API_KEY) return query;

  try {
    const prompt = `Given this search query, generate 3-5 alternative phrasings and related terms that would help find relevant documents. Keep each variation concise.

Query: "${query}"

Respond with ONLY a single line of comma-separated terms (no labels, no bullet points, no extra text):`;

    const expanded = await chatCompletion(
      [{ role: "user", content: prompt }],
      0.3,
      150
    );

    const terms = expanded
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t.length > 0)
      .slice(0, 5);

    return [query, ...terms].join(" ");
  } catch {
    return query;
  }
}
