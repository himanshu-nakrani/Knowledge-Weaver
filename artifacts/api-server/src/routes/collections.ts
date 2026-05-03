import { Router, type IRouter } from "express";
import { eq, sql } from "drizzle-orm";
import { db, collectionsTable, documentsTable } from "@workspace/db";
import { z } from "zod";
import { isNull } from "drizzle-orm";

const router: IRouter = Router();

const CreateCollectionBody = z.object({
  name: z.string().min(1).max(100),
  color: z.string().optional().default("#6366f1"),
  icon: z.string().optional(),
  description: z.string().optional(),
});

const UpdateCollectionBody = z.object({
  name: z.string().min(1).max(100).optional(),
  color: z.string().optional(),
  icon: z.string().optional(),
  description: z.string().optional(),
});

function formatCollection(c: typeof collectionsTable.$inferSelect, docCount: number) {
  return {
    ...c,
    documentCount: docCount,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  };
}

router.get("/collections", async (_req, res): Promise<void> => {
  const collections = await db.select().from(collectionsTable).orderBy(collectionsTable.createdAt);

  const countRows = await db
    .select({ collectionId: documentsTable.collectionId, count: sql<number>`count(*)::int` })
    .from(documentsTable)
    .where(isNull(documentsTable.deletedAt))
    .groupBy(documentsTable.collectionId);

  const countMap = new Map<number, number>();
  for (const row of countRows) {
    if (row.collectionId != null) countMap.set(row.collectionId, row.count);
  }

  res.json(collections.map((c) => formatCollection(c, countMap.get(c.id) ?? 0)));
});

router.post("/collections", async (req, res): Promise<void> => {
  const parsed = CreateCollectionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [collection] = await db.insert(collectionsTable).values(parsed.data).returning();
  res.status(201).json(formatCollection(collection, 0));
});

router.patch("/collections/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const parsed = UpdateCollectionBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const updateData: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) updateData.name = parsed.data.name;
  if (parsed.data.color !== undefined) updateData.color = parsed.data.color;
  if (parsed.data.icon !== undefined) updateData.icon = parsed.data.icon;
  if (parsed.data.description !== undefined) updateData.description = parsed.data.description;

  const [collection] = await db
    .update(collectionsTable)
    .set(updateData)
    .where(eq(collectionsTable.id, id))
    .returning();

  if (!collection) { res.status(404).json({ error: "Collection not found" }); return; }

  const [countRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(documentsTable)
    .where(eq(documentsTable.collectionId, id));

  res.json(formatCollection(collection, countRow?.count ?? 0));
});

router.delete("/collections/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  await db
    .update(documentsTable)
    .set({ collectionId: null })
    .where(eq(documentsTable.collectionId, id));

  const [deleted] = await db
    .delete(collectionsTable)
    .where(eq(collectionsTable.id, id))
    .returning();

  if (!deleted) { res.status(404).json({ error: "Collection not found" }); return; }
  res.sendStatus(204);
});

export default router;
