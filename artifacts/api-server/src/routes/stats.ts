import { Router, type IRouter } from "express";
import { db, documentsTable, chatSessionsTable, chatMessagesTable, activityTable } from "@workspace/db";
import { sql, desc, isNull } from "drizzle-orm";
import { getTotalChunkCount } from "../lib/vectorStore";

const router: IRouter = Router();

// ── In-memory query analytics ─────────────────────────────────────────────
interface QueryEntry { query: string; ts: number }
const queryLog: QueryEntry[] = [];
const MAX_QUERY_LOG = 500;

export function trackQuery(query: string): void {
  queryLog.push({ query: query.slice(0, 200), ts: Date.now() });
  if (queryLog.length > MAX_QUERY_LOG) queryLog.shift();
}
// ─────────────────────────────────────────────────────────────────────────

router.get("/stats/overview", async (_req, res): Promise<void> => {
  const [docsResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(documentsTable)
    .where(isNull(documentsTable.deletedAt));

  const [sessionsResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(chatSessionsTable);

  const [messagesResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(chatMessagesTable);

  const typeBreakdown = await db
    .select({
      type: documentsTable.type,
      count: sql<number>`count(*)::int`,
    })
    .from(documentsTable)
    .where(isNull(documentsTable.deletedAt))
    .groupBy(documentsTable.type);

  const documentsByType: Record<string, number> = {};
  for (const row of typeBreakdown) {
    documentsByType[row.type] = row.count;
  }

  res.json({
    totalDocuments: docsResult.count,
    totalChunks: getTotalChunkCount(),
    totalChatSessions: sessionsResult.count,
    totalMessages: messagesResult.count,
    documentsByType,
  });
});

router.get("/stats/activity", async (_req, res): Promise<void> => {
  const activities = await db
    .select()
    .from(activityTable)
    .orderBy(desc(activityTable.createdAt))
    .limit(20);

  res.json(
    activities.map((a) => ({
      ...a,
      createdAt: a.createdAt.toISOString(),
    }))
  );
});

router.get("/stats/queries", async (_req, res): Promise<void> => {
  const since = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const recent = queryLog.filter((q) => q.ts > since);

  const countMap = new Map<string, number>();
  for (const { query } of recent) {
    const key = query.toLowerCase().trim();
    countMap.set(key, (countMap.get(key) ?? 0) + 1);
  }

  const topQueries = Array.from(countMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([query, count]) => ({ query, count }));

  res.json({
    total: recent.length,
    totalAllTime: queryLog.length,
    topQueries,
    recentQueries: recent.slice(-10).reverse().map((q) => ({
      query: q.query,
      ts: new Date(q.ts).toISOString(),
    })),
  });
});

export default router;
