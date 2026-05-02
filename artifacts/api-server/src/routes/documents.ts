import { Router, type IRouter } from "express";
import { eq, ilike, or, sql } from "drizzle-orm";
import { db, documentsTable, activityTable } from "@workspace/db";
import {
  ListDocumentsQueryParams,
  UploadDocumentBody,
  GetDocumentParams,
  UpdateDocumentParams,
  UpdateDocumentBody,
  DeleteDocumentParams,
  GetDocumentChunksParams,
  IngestGithubRepoBody,
} from "@workspace/api-zod";
import { chunkText, extractHeadingsAndCode } from "../lib/chunker";
import { addChunks, removeChunks, getChunksForDocument } from "../lib/vectorStore";
import { scrapeGithubRepo } from "../lib/github";

const router: IRouter = Router();

router.get("/documents", async (req, res): Promise<void> => {
  const params = ListDocumentsQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  let query = db.select().from(documentsTable);

  if (params.data.search) {
    const search = `%${params.data.search}%`;
    // @ts-expect-error dynamic filter
    query = query.where(
      or(
        ilike(documentsTable.title, search),
        ilike(documentsTable.content, search)
      )
    );
  }

  const docs = await db
    .select()
    .from(documentsTable)
    .orderBy(sql`${documentsTable.createdAt} desc`);

  let result = docs;
  if (params.data.search) {
    const s = params.data.search.toLowerCase();
    result = docs.filter(
      (d) =>
        d.title.toLowerCase().includes(s) ||
        d.content.toLowerCase().includes(s) ||
        d.tags.some((t) => t.toLowerCase().includes(s))
    );
  }
  if (params.data.tag) {
    const tag = params.data.tag.toLowerCase();
    result = result.filter((d) =>
      d.tags.some((t) => t.toLowerCase() === tag)
    );
  }

  const mapped = result.map((d) => ({
    ...d,
    tags: d.tags ?? [],
    chunkCount: getChunksForDocument(d.id).length,
    sourceUrl: d.sourceUrl ?? null,
    createdAt: d.createdAt.toISOString(),
    updatedAt: d.updatedAt.toISOString(),
  }));

  res.json(mapped);
});

router.post("/documents", async (req, res): Promise<void> => {
  const parsed = UploadDocumentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { title, content, type, tags } = parsed.data;
  const processedContent =
    type === "markdown" ? extractHeadingsAndCode(content) : content;
  const chunks = chunkText(processedContent);

  const [doc] = await db
    .insert(documentsTable)
    .values({
      title,
      content,
      type,
      tags: tags ?? [],
      chunkCount: chunks.length,
      sourceUrl: null,
    })
    .returning();

  addChunks(doc.id, chunks);

  await db.insert(activityTable).values({
    type: "document_added",
    description: `Document "${title}" uploaded (${chunks.length} chunks)`,
  });

  res.status(201).json({
    ...doc,
    tags: doc.tags ?? [],
    chunkCount: chunks.length,
    sourceUrl: doc.sourceUrl ?? null,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  });
});

router.post("/documents/github", async (req, res): Promise<void> => {
  const parsed = IngestGithubRepoBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { url, tags } = parsed.data;

  const githubContent = await scrapeGithubRepo(url);
  const chunks = chunkText(githubContent.content);

  const [doc] = await db
    .insert(documentsTable)
    .values({
      title: githubContent.title,
      content: githubContent.content,
      type: "github",
      tags: tags ?? [],
      chunkCount: chunks.length,
      sourceUrl: githubContent.sourceUrl,
    })
    .returning();

  addChunks(doc.id, chunks);

  await db.insert(activityTable).values({
    type: "document_added",
    description: `GitHub repo "${githubContent.title}" ingested (${chunks.length} chunks)`,
  });

  res.status(201).json({
    ...doc,
    tags: doc.tags ?? [],
    chunkCount: chunks.length,
    sourceUrl: doc.sourceUrl ?? null,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  });
});

router.get("/documents/:id", async (req, res): Promise<void> => {
  const params = GetDocumentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [doc] = await db
    .select()
    .from(documentsTable)
    .where(eq(documentsTable.id, params.data.id));

  if (!doc) {
    res.status(404).json({ error: "Document not found" });
    return;
  }

  res.json({
    ...doc,
    tags: doc.tags ?? [],
    chunkCount: getChunksForDocument(doc.id).length,
    sourceUrl: doc.sourceUrl ?? null,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  });
});

router.patch("/documents/:id", async (req, res): Promise<void> => {
  const params = UpdateDocumentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateDocumentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updateData: Record<string, unknown> = {};
  if (parsed.data.title != null) updateData.title = parsed.data.title;
  if (parsed.data.tags != null) updateData.tags = parsed.data.tags;

  const [doc] = await db
    .update(documentsTable)
    .set(updateData)
    .where(eq(documentsTable.id, params.data.id))
    .returning();

  if (!doc) {
    res.status(404).json({ error: "Document not found" });
    return;
  }

  res.json({
    ...doc,
    tags: doc.tags ?? [],
    chunkCount: getChunksForDocument(doc.id).length,
    sourceUrl: doc.sourceUrl ?? null,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  });
});

router.delete("/documents/:id", async (req, res): Promise<void> => {
  const params = DeleteDocumentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [doc] = await db
    .delete(documentsTable)
    .where(eq(documentsTable.id, params.data.id))
    .returning();

  if (!doc) {
    res.status(404).json({ error: "Document not found" });
    return;
  }

  removeChunks(params.data.id);

  await db.insert(activityTable).values({
    type: "document_deleted",
    description: `Document "${doc.title}" removed`,
  });

  res.sendStatus(204);
});

router.get("/documents/:id/chunks", async (req, res): Promise<void> => {
  const params = GetDocumentChunksParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const chunks = getChunksForDocument(params.data.id);

  res.json(
    chunks.map((c) => ({
      id: c.id,
      content: c.content,
      documentId: c.documentId,
      chunkIndex: c.chunkIndex,
      score: null,
    }))
  );
});

export default router;
