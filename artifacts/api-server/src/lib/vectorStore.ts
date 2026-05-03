import { db, documentsTable, type Document } from "@workspace/db";
import { logger } from "./logger";

export interface RetrievedChunk {
  id: string;
  content: string;
  documentId: number;
  chunkIndex: number;
  score: number;
  documentTitle: string;
}

interface StoredChunk {
  id: string;
  documentId: number;
  chunkIndex: number;
  content: string;
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

/**
 * Position-based re-ranking bonus: earlier chunks get a small boost since
 * introductory and summary content tends to be most relevant.
 * Bonus decays exponentially: ~5% for chunk 0, ~2.5% for chunk 5, ~0.7% for chunk 20.
 */
function positionBonus(chunkIndex: number): number {
  return 0.05 * Math.exp(-chunkIndex / 10);
}

export async function similaritySearch(
  query: string,
  k = 5,
  documentIds?: number[]
): Promise<RetrievedChunk[]> {
  const queryTokens = tokenize(query);

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
    const bm25 = bm25Score(queryTokens, chunkTokens);
    return { chunk, bm25 };
  });

  const relevant = scored.filter((s) => s.bm25 > 0);
  if (relevant.length === 0) return [];

  // Normalize BM25 scores to 0-1
  const maxBm25 = Math.max(...relevant.map((s) => s.bm25));

  // Re-rank: combine normalized BM25 with position bonus
  const reranked = relevant.map((s) => ({
    chunk: s.chunk,
    score: (s.bm25 / maxBm25) + positionBonus(s.chunk.chunkIndex),
  }));

  const topChunks = reranked
    .sort((a, b) => b.score - a.score)
    .slice(0, k);

  // Final normalization to 0-1
  const maxFinal = topChunks[0]?.score ?? 1;

  return topChunks.map(({ chunk, score }) => ({
    id: chunk.id,
    content: chunk.content,
    documentId: chunk.documentId,
    chunkIndex: chunk.chunkIndex,
    score: maxFinal > 0 ? score / maxFinal : 0,
    documentTitle: docMap.get(chunk.documentId)?.title ?? "Unknown",
  }));
}

export function getTotalChunkCount(): number {
  return chunkStore.size;
}
