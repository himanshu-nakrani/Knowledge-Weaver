import * as cheerio from "cheerio";
import { logger } from "./logger";

export interface ScrapedPage {
  title: string;
  content: string;
  sourceUrl: string;
}

export async function scrapeWebPage(url: string): Promise<ScrapedPage> {
  logger.info({ url }, "Scraping web page");

  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; MindForge/1.0; +https://mindforge.app)",
      "Accept": "text/html,application/xhtml+xml",
    },
    signal: AbortSignal.timeout(15_000),
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status} fetching ${url}`);
  }

  const html = await res.text();
  const $ = cheerio.load(html);

  // Remove noisy elements
  $("script, style, nav, footer, header, aside, .nav, .footer, .header, .sidebar, .ad, .ads, .advertisement, [role='navigation'], [role='banner']").remove();

  const title =
    $("h1").first().text().trim() ||
    $("title").text().trim() ||
    new URL(url).hostname;

  // Extract main content — prefer article/main, fall back to body
  const mainEl = $("article, main, [role='main'], .content, .post, .entry").first();
  const rawText = (mainEl.length ? mainEl : $("body"))
    .find("h1, h2, h3, h4, p, li, td, th, blockquote, pre, code")
    .map((_, el) => {
      const tag = el.tagName?.toLowerCase() ?? "";
      const text = $(el).text().trim();
      if (!text) return "";
      if (["h1", "h2", "h3"].includes(tag)) return `\n## ${text}\n`;
      if (tag === "h4") return `\n### ${text}\n`;
      if (tag === "li") return `- ${text}`;
      if (["pre", "code"].includes(tag)) return `\`\`\`\n${text}\n\`\`\``;
      return text;
    })
    .get()
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  const content = `# ${title}\n\nSource: ${url}\n\n${rawText}`;

  return { title, content, sourceUrl: url };
}
