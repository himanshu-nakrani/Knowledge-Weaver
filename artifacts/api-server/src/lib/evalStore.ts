interface EvalData {
  query: string;
  retrievedChunks: Array<{
    id: string;
    content: string;
    documentId: number;
    chunkIndex: number;
    score: number;
  }>;
  faithfulnessScore: number;
  usedWebSearch: boolean;
}

const evalStore = new Map<number, EvalData>();

export function setLastEval(sessionId: number, data: EvalData): void {
  evalStore.set(sessionId, data);
  evalStore.set(0, data); // also store as "global" last
}

export function getLastEval(sessionId?: number): EvalData | null {
  if (sessionId) {
    return evalStore.get(sessionId) ?? evalStore.get(0) ?? null;
  }
  return evalStore.get(0) ?? null;
}
