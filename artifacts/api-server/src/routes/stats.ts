import { Router, type IRouter } from "express";
import { db, documentsTable, chatSessionsTable, chatMessagesTable, activityTable } from "@workspace/db";
import { sql, desc } from "drizzle-orm";
import { getTotalChunkCount } from "../lib/vectorStore";

const router: IRouter = Router();

router.get("/stats/overview", async (_req, res): Promise<void> => {
  const [docsResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(documentsTable);

  const [sessionsResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(chatSessionsTable);

  const [messagesResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(chatMessagesTable);

  // Get documents by type
  const typeBreakdown = await db
    .select({
      type: documentsTable.type,
      count: sql<number>`count(*)::int`,
    })
    .from(documentsTable)
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

export default router;
