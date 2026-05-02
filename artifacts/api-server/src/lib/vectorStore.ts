import { db, documentsTable, type Document } from "@workspace/db";
import { sql, ilike, or } from "drizzle-orm";
import { logger } from "./logger";

export interface RetrievedChunk {
  id: string;
  content: string;
  documentId: number;
  chunkIndex: number;
  score: number;
  documentTitle: string;
}

// In-memory chunk store (chunks are re-loaded from docs on startup)
// For a production system, use pgvector or Chroma
interface StoredChunk {
  id: string;
  documentId: number;
  chunkIndex: number;
  content: string;
  tsvector?: string;
}

const chunkStore = new Map<string, StoredChunk>();

export function addChunks(documentId: number, chunks: { content: string; index: number }[]): void {
  for (const chunk of chunks) {
    const id = `${documentId}-${chunk.index}`;
    chunkStore.set(id, {
      id,
      documentId,
      chunkIndex: chunk.index,
      content: chunk.content,
    });
  }
  logger.info({ documentId, count: chunks.length }, "Chunks stored in vector store");
}

export function removeChunks(documentId: number): void {
  for (const [key, chunk] of chunkStore.entries()) {
    if (chunk.documentId === documentId) {
      chunkStore.delete(key);
    }
  }
}

export function getChunksForDocument(documentId: number): StoredChunk[] {
  return Array.from(chunkStore.values())
    .filter((c) => c.documentId === documentId)
    .sort((a, b) => a.chunkIndex - b.chunkIndex);
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2);
}

function bm25Score(query: string[], doc: string[]): number {
  const k1 = 1.5;
  const b = 0.75;
  const avgLen = 150;
  const docLen = doc.length;

  const docFreq = new Map<string, number>();
  for (const term of doc) {
    docFreq.set(term, (docFreq.get(term) ?? 0) + 1);
  }

  let score = 0;
  for (const term of query) {
    const tf = docFreq.get(term) ?? 0;
    if (tf > 0) {
      const idf = Math.log((chunkStore.size + 1) / (tf + 0.5));
      score += idf * ((tf * (k1 + 1)) / (tf + k1 * (1 - b + b * (docLen / avgLen))));
    }
  }
  return score;
}

export async function similaritySearch(
  query: string,
  k = 5,
  documentIds?: number[]
): Promise<RetrievedChunk[]> {
  const queryTokens = tokenize(query);

  // Get documents for titles
  const docs = await db.select().from(documentsTable);
  const docMap = new Map<number, Document>(docs.map((d) => [d.id, d]));

  const chunks = Array.from(chunkStore.values()).filter((c) => {
    if (documentIds && documentIds.length > 0) {
      return documentIds.includes(c.documentId);
    }
    return true;
  });

  if (chunks.length === 0) return [];

  const scored = chunks.map((chunk) => {
    const chunkTokens = tokenize(chunk.content);
    const score = bm25Score(queryTokens, chunkTokens);
    return { chunk, score };
  });

  const topChunks = scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, k);

  // Normalize scores to 0-1
  const maxScore = topChunks[0]?.score ?? 1;

  return topChunks.map(({ chunk, score }) => ({
    id: chunk.id,
    content: chunk.content,
    documentId: chunk.documentId,
    chunkIndex: chunk.chunkIndex,
    score: maxScore > 0 ? score / maxScore : 0,
    documentTitle: docMap.get(chunk.documentId)?.title ?? "Unknown",
  }));
}

export function getTotalChunkCount(): number {
  return chunkStore.size;
}
