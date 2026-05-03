export interface EvalData {
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
  timestamp: string;
  expandedQueries?: string[];
}

const evalStore = new Map<number, EvalData>();
const evalHistory: EvalData[] = [];
const MAX_HISTORY = 20;

export function setLastEval(sessionId: number, data: Omit<EvalData, "timestamp">): void {
  const entry: EvalData = { ...data, timestamp: new Date().toISOString() };
  evalStore.set(sessionId, entry);
  evalStore.set(0, entry);
  evalHistory.unshift(entry);
  if (evalHistory.length > MAX_HISTORY) evalHistory.pop();
}

export function getLastEval(sessionId?: number): EvalData | null {
  if (sessionId) {
    return evalStore.get(sessionId) ?? evalStore.get(0) ?? null;
  }
  return evalStore.get(0) ?? null;
}

export function getEvalHistory(): EvalData[] {
  return evalHistory;
}
