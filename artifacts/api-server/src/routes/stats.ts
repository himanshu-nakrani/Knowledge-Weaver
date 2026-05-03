import { Router, type IRouter } from "express";
import { db, documentsTable, chatSessionsTable, chatMessagesTable, activityTable, flashcardDecksTable } from "@workspace/db";
import { sql, desc, isNull, gte } from "drizzle-orm";
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

router.get("/stats/learning", async (_req, res): Promise<void> => {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [docCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(documentsTable)
    .where(isNull(documentsTable.deletedAt));

  const typeBreakdown = await db
    .select({ type: documentsTable.type, count: sql<number>`count(*)::int` })
    .from(documentsTable)
    .where(isNull(documentsTable.deletedAt))
    .groupBy(documentsTable.type);

  const recentDocs = await db
    .select({ type: documentsTable.type, count: sql<number>`count(*)::int` })
    .from(documentsTable)
    .where(sql`${documentsTable.deletedAt} is null and ${documentsTable.createdAt} >= ${thirtyDaysAgo}`)
    .groupBy(documentsTable.type);

  const [sessionCount] = await db.select({ count: sql<number>`count(*)::int` }).from(chatSessionsTable);
  const [msgCount] = await db.select({ count: sql<number>`count(*)::int` }).from(chatMessagesTable);

  const flashcardDecks = await db.select().from(flashcardDecksTable);
  const totalCards = flashcardDecks.reduce((sum, d) => sum + (d.cardCount ?? 0), 0);
  const maxStreak = flashcardDecks.reduce((max, d) => Math.max(max, d.streak ?? 0), 0);
  const reviewedDecks = flashcardDecks.filter((d) => d.lastReviewedAt).length;

  const activities = await db
    .select()
    .from(activityTable)
    .orderBy(desc(activityTable.createdAt))
    .limit(30);

  // Build daily doc counts for past 30 days
  const dailyDocs = await db
    .select({
      day: sql<string>`date_trunc('day', ${documentsTable.createdAt})::date::text`,
      count: sql<number>`count(*)::int`,
    })
    .from(documentsTable)
    .where(sql`${documentsTable.deletedAt} is null and ${documentsTable.createdAt} >= ${thirtyDaysAgo}`)
    .groupBy(sql`date_trunc('day', ${documentsTable.createdAt})`)
    .orderBy(sql`date_trunc('day', ${documentsTable.createdAt})`);

  res.json({
    totalDocuments: docCount.count,
    typeBreakdown: Object.fromEntries(typeBreakdown.map((r) => [r.type, r.count])),
    recentDocsByType: Object.fromEntries(recentDocs.map((r) => [r.type, r.count])),
    totalChatSessions: sessionCount.count,
    totalMessages: msgCount.count,
    totalFlashcardDecks: flashcardDecks.length,
    totalCards,
    maxStreak,
    reviewedDecks,
    dailyDocs,
    recentActivity: activities.map((a) => ({ ...a, createdAt: a.createdAt.toISOString() })),
  });
});

router.get("/stats/recommendations", async (_req, res): Promise<void> => {
  const { similaritySearch } = await import("../lib/vectorStore");
  const since = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const recent = queryLog.filter((q) => q.ts > since).slice(-20);

  if (recent.length === 0) {
    const docs = await db
      .select()
      .from(documentsTable)
      .where(isNull(documentsTable.deletedAt))
      .limit(5);
    res.json(docs.map((d) => ({ id: d.id, title: d.title, type: d.type, tags: d.tags, reason: "Recently added" })));
    return;
  }

  const queryText = recent.map((q) => q.query).join(" ");
  const chunks = await similaritySearch(queryText, 10);

  const seen = new Set<number>();
  const recs: { id: number; title: string; type: string; tags: string[]; score: number; reason: string }[] = [];

  for (const chunk of chunks) {
    if (seen.has(chunk.documentId)) continue;
    seen.add(chunk.documentId);
    const [doc] = await db
      .select()
      .from(documentsTable)
      .where(sql`${documentsTable.id} = ${chunk.documentId} and ${documentsTable.deletedAt} is null`);
    if (doc) {
      recs.push({ id: doc.id, title: doc.title, type: doc.type, tags: doc.tags, score: chunk.score, reason: "Matches recent queries" });
    }
    if (recs.length >= 5) break;
  }

  res.json(recs);
});

export default router;
