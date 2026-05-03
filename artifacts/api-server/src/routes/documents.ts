import { Router, type IRouter } from "express";
import { eq, ilike, or, sql, isNull, isNotNull } from "drizzle-orm";
import { db, documentsTable, activityTable, chatSessionsTable, chatMessagesTable, flashcardDecksTable } from "@workspace/db";
import multer from "multer";
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
import { parsePdfBuffer } from "../lib/pdfParser";
import { scrapeWebPage } from "../lib/webScraper";
import crypto from "node:crypto";

const router: IRouter = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

function formatDoc(doc: typeof documentsTable.$inferSelect, chunkCount: number) {
  return {
    ...doc,
    tags: doc.tags ?? [],
    chunkCount,
    sourceUrl: doc.sourceUrl ?? null,
    pinned: doc.pinned ?? false,
    collectionId: doc.collectionId ?? null,
    shareToken: doc.shareToken ?? null,
    deletedAt: doc.deletedAt ? doc.deletedAt.toISOString() : null,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

// List active (non-deleted) documents
router.get("/documents", async (req, res): Promise<void> => {
  const params = ListDocumentsQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const docs = await db
    .select()
    .from(documentsTable)
    .where(isNull(documentsTable.deletedAt))
    .orderBy(sql`${documentsTable.pinned} desc, ${documentsTable.createdAt} desc`);

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
    result = result.filter((d) => d.tags.some((t) => t.toLowerCase() === tag));
  }
  if (params.data.collectionId) {
    const cid = Number(params.data.collectionId);
    result = result.filter((d) => d.collectionId === cid);
  }

  res.json(result.map((d) => formatDoc(d, getChunksForDocument(d.id).length)));
});

// List trash (soft-deleted documents)
router.get("/documents/trash", async (_req, res): Promise<void> => {
  const docs = await db
    .select()
    .from(documentsTable)
    .where(isNotNull(documentsTable.deletedAt))
    .orderBy(sql`${documentsTable.deletedAt} desc`);
  res.json(docs.map((d) => formatDoc(d, getChunksForDocument(d.id).length)));
});

router.post("/documents", async (req, res): Promise<void> => {
  const parsed = UploadDocumentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { title, content, type, tags } = parsed.data;
  const processedContent = type === "markdown" ? extractHeadingsAndCode(content) : content;
  const chunks = chunkText(processedContent);

  const [doc] = await db
    .insert(documentsTable)
    .values({ title, content, type, tags: tags ?? [], chunkCount: chunks.length, sourceUrl: null })
    .returning();

  addChunks(doc.id, chunks);

  await db.insert(activityTable).values({
    type: "document_added",
    description: `Document "${title}" uploaded (${chunks.length} chunks)`,
  });

  res.status(201).json(formatDoc(doc, chunks.length));
});

/** PDF upload via multipart/form-data */
router.post("/documents/pdf", upload.single("file"), async (req, res): Promise<void> => {
  if (!req.file) { res.status(400).json({ error: "No file uploaded" }); return; }
  if (req.file.mimetype !== "application/pdf") { res.status(400).json({ error: "File must be a PDF" }); return; }

  const rawTags = req.body.tags ?? "";
  const tags = typeof rawTags === "string"
    ? rawTags.split(",").map((t: string) => t.trim()).filter(Boolean)
    : [];

  try {
    const text = await parsePdfBuffer(req.file.buffer);
    const title = req.body.title?.trim() || req.file.originalname.replace(/\.pdf$/i, "");
    const chunks = chunkText(text);

    const [doc] = await db
      .insert(documentsTable)
      .values({ title, content: text, type: "pdf", tags, chunkCount: chunks.length, sourceUrl: null })
      .returning();

    addChunks(doc.id, chunks);

    await db.insert(activityTable).values({
      type: "document_added",
      description: `PDF "${title}" uploaded (${chunks.length} chunks)`,
    });

    res.status(201).json(formatDoc(doc, chunks.length));
  } catch (err) {
    req.log.error({ err }, "PDF parse failed");
    res.status(422).json({ error: "Failed to parse PDF" });
  }
});

/** URL web page scrape + ingest */
router.post("/documents/url", async (req, res): Promise<void> => {
  const { url, tags: rawTags } = req.body as { url?: string; tags?: string[] };
  if (!url || typeof url !== "string") { res.status(400).json({ error: "url is required" }); return; }
  const tags = Array.isArray(rawTags) ? rawTags : [];
  try {
    const page = await scrapeWebPage(url);
    const chunks = chunkText(page.content);
    const [doc] = await db
      .insert(documentsTable)
      .values({ title: page.title, content: page.content, type: "url", tags, chunkCount: chunks.length, sourceUrl: page.sourceUrl })
      .returning();
    addChunks(doc.id, chunks);
    await db.insert(activityTable).values({
      type: "document_added",
      description: `Web page "${page.title}" ingested (${chunks.length} chunks)`,
    });
    res.status(201).json(formatDoc(doc, chunks.length));
  } catch (err) {
    req.log.error({ err }, "URL scrape failed");
    res.status(422).json({ error: "Failed to scrape URL" });
  }
});

router.post("/documents/github", async (req, res): Promise<void> => {
  const parsed = IngestGithubRepoBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const { url, tags } = parsed.data;
  const githubContent = await scrapeGithubRepo(url);
  const chunks = chunkText(githubContent.content);

  const [doc] = await db
    .insert(documentsTable)
    .values({ title: githubContent.title, content: githubContent.content, type: "github", tags: tags ?? [], chunkCount: chunks.length, sourceUrl: githubContent.sourceUrl })
    .returning();

  addChunks(doc.id, chunks);

  await db.insert(activityTable).values({
    type: "document_added",
    description: `GitHub repo "${githubContent.title}" ingested (${chunks.length} chunks)`,
  });

  res.status(201).json(formatDoc(doc, chunks.length));
});

router.get("/documents/:id", async (req, res): Promise<void> => {
  const params = GetDocumentParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const [doc] = await db.select().from(documentsTable).where(eq(documentsTable.id, params.data.id));
  if (!doc) { res.status(404).json({ error: "Document not found" }); return; }
  res.json(formatDoc(doc, getChunksForDocument(doc.id).length));
});

router.patch("/documents/:id", async (req, res): Promise<void> => {
  const params = UpdateDocumentParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = UpdateDocumentBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const updateData: Record<string, unknown> = {};
  if (parsed.data.title != null) updateData.title = parsed.data.title;
  if (parsed.data.tags != null) updateData.tags = parsed.data.tags;
  if ("collectionId" in req.body) updateData.collectionId = req.body.collectionId ?? null;

  const [doc] = await db
    .update(documentsTable)
    .set(updateData)
    .where(eq(documentsTable.id, params.data.id))
    .returning();
  if (!doc) { res.status(404).json({ error: "Document not found" }); return; }
  res.json(formatDoc(doc, getChunksForDocument(doc.id).length));
});

/** Toggle pin on a document */
router.patch("/documents/:id/pin", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const [current] = await db.select().from(documentsTable).where(eq(documentsTable.id, id));
  if (!current) { res.status(404).json({ error: "Document not found" }); return; }
  const [doc] = await db
    .update(documentsTable)
    .set({ pinned: !current.pinned })
    .where(eq(documentsTable.id, id))
    .returning();
  res.json(formatDoc(doc, getChunksForDocument(doc.id).length));
});

/** Restore a document from trash */
router.patch("/documents/:id/restore", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const [doc] = await db
    .update(documentsTable)
    .set({ deletedAt: null })
    .where(eq(documentsTable.id, id))
    .returning();
  if (!doc) { res.status(404).json({ error: "Document not found" }); return; }
  await db.insert(activityTable).values({ type: "document_added", description: `Document "${doc.title}" restored from trash` });
  res.json(formatDoc(doc, getChunksForDocument(doc.id).length));
});

/** Generate or return share token */
router.post("/documents/:id/share", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [current] = await db.select().from(documentsTable).where(eq(documentsTable.id, id));
  if (!current) { res.status(404).json({ error: "Document not found" }); return; }

  if (current.shareToken) {
    res.json({ shareToken: current.shareToken, shareUrl: `/share/${current.shareToken}` });
    return;
  }

  const token = crypto.randomBytes(16).toString("hex");
  await db.update(documentsTable).set({ shareToken: token }).where(eq(documentsTable.id, id));
  res.json({ shareToken: token, shareUrl: `/share/${token}` });
});

/** Remove share token */
router.delete("/documents/:id/share", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  await db.update(documentsTable).set({ shareToken: null }).where(eq(documentsTable.id, id));
  res.sendStatus(204);
});

/** Duplicate a document */
router.post("/documents/:id/duplicate", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [original] = await db.select().from(documentsTable).where(eq(documentsTable.id, id));
  if (!original) { res.status(404).json({ error: "Document not found" }); return; }

  const chunks = chunkText(original.content);
  const [copy] = await db
    .insert(documentsTable)
    .values({
      title: `${original.title} (copy)`,
      content: original.content,
      type: original.type,
      tags: original.tags,
      chunkCount: chunks.length,
      sourceUrl: original.sourceUrl,
      collectionId: original.collectionId,
    })
    .returning();

  addChunks(copy.id, chunks);

  await db.insert(activityTable).values({
    type: "document_added",
    description: `Document "${original.title}" duplicated`,
  });

  res.status(201).json(formatDoc(copy, chunks.length));
});

/** Public shared document view — no auth required */
router.get("/share/:token", async (req, res): Promise<void> => {
  const token = req.params.token;
  if (!token) { res.status(400).json({ error: "Invalid token" }); return; }

  const [doc] = await db
    .select()
    .from(documentsTable)
    .where(eq(documentsTable.shareToken, token));

  if (!doc || doc.deletedAt) {
    res.status(404).json({ error: "Shared document not found or no longer available" });
    return;
  }

  res.json(formatDoc(doc, getChunksForDocument(doc.id).length));
});

/** Soft delete — moves to trash */
router.delete("/documents/:id", async (req, res): Promise<void> => {
  const params = DeleteDocumentParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const [doc] = await db
    .update(documentsTable)
    .set({ deletedAt: new Date() })
    .where(eq(documentsTable.id, params.data.id))
    .returning();
  if (!doc) { res.status(404).json({ error: "Document not found" }); return; }
  await db.insert(activityTable).values({ type: "document_deleted", description: `Document "${doc.title}" moved to trash` });
  res.sendStatus(204);
});

/** Permanent delete */
router.delete("/documents/:id/permanent", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const [doc] = await db.delete(documentsTable).where(eq(documentsTable.id, id)).returning();
  if (!doc) { res.status(404).json({ error: "Document not found" }); return; }
  removeChunks(id);
  await db.insert(activityTable).values({ type: "document_deleted", description: `Document "${doc.title}" permanently deleted` });
  res.sendStatus(204);
});

router.get("/documents/:id/chunks", async (req, res): Promise<void> => {
  const params = GetDocumentChunksParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const chunks = getChunksForDocument(params.data.id);
  res.json(chunks.map((c) => ({
    id: c.id, content: c.content, documentId: c.documentId, chunkIndex: c.chunkIndex, score: null,
  })));
});

/** Full data export */
router.get("/export", async (_req, res): Promise<void> => {
  const [documents, chatSessions, chatMessages, flashcardDecks] = await Promise.all([
    db.select().from(documentsTable).where(isNull(documentsTable.deletedAt)),
    db.select().from(chatSessionsTable),
    db.select().from(chatMessagesTable),
    db.select().from(flashcardDecksTable),
  ]);

  const sessionsWithMessages = chatSessions.map((s) => ({
    ...s,
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
    messages: chatMessages
      .filter((m) => m.sessionId === s.id)
      .map((m) => ({ ...m, createdAt: m.createdAt.toISOString() })),
  }));

  res.setHeader("Content-Disposition", `attachment; filename="mindforge-export-${new Date().toISOString().slice(0, 10)}.json"`);
  res.json({
    exportedAt: new Date().toISOString(),
    documents: documents.map((d) => formatDoc(d, getChunksForDocument(d.id).length)),
    chatSessions: sessionsWithMessages,
    flashcardDecks: flashcardDecks.map((deck) => ({
      ...deck,
      createdAt: deck.createdAt.toISOString(),
    })),
  });
});

export default router;
