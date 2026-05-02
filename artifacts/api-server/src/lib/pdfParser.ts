import { logger } from "./logger";

export async function parsePdfBuffer(buffer: Buffer): Promise<string> {
  try {
    // Dynamic import to avoid ESM issues
    const pdfParse = await import("pdf-parse");
    const data = await pdfParse.default(buffer);
    return data.text;
  } catch (err) {
    logger.error({ err }, "PDF parsing failed");
    throw new Error("Failed to parse PDF");
  }
}
