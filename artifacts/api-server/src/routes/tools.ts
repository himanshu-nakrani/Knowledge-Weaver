import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, documentsTable, activityTable, flashcardDecksTable } from "@workspace/db";
import {
  SummarizeDocumentBody,
  ExtractActionItemsBody,
  GenerateFlashcardsBody,
  GenerateMindmapBody,
} from "@workspace/api-zod";
import { chatCompletion } from "../lib/groq";

const router: IRouter = Router();

async function getDocContent(id: number): Promise<{ content: string; title: string } | null> {
  const [doc] = await db.select().from(documentsTable).where(eq(documentsTable.id, id));
  return doc ? { content: doc.content, title: doc.title } : null;
}

router.post("/tools/summarize", async (req, res): Promise<void> => {
  const parsed = SummarizeDocumentBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const doc = await getDocContent(parsed.data.documentId);
  if (!doc) { res.status(404).json({ error: "Document not found" }); return; }
  const result = await chatCompletion([
    { role: "system", content: "You are a precise document summarizer. Create a comprehensive summary with key points, organized clearly." },
    { role: "user", content: `Summarize this document:\n\n${doc.content.slice(0, 6000)}` },
  ]);
  await db.insert(activityTable).values({ type: "tool_used", description: `Summarized "${doc.title}"` });
  res.json({ result, documentId: parsed.data.documentId });
});

router.post("/tools/action-items", async (req, res): Promise<void> => {
  const parsed = ExtractActionItemsBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const doc = await getDocContent(parsed.data.documentId);
  if (!doc) { res.status(404).json({ error: "Document not found" }); return; }
  const result = await chatCompletion([
    { role: "system", content: "You are an expert at extracting actionable items. Extract all action items, TODOs, tasks, and next steps. Format as a numbered list." },
    { role: "user", content: `Extract action items from:\n\n${doc.content.slice(0, 6000)}` },
  ]);
  await db.insert(activityTable).values({ type: "tool_used", description: `Extracted action items from "${doc.title}"` });
  res.json({ result, documentId: parsed.data.documentId });
});

router.post("/tools/flashcards", async (req, res): Promise<void> => {
  const parsed = GenerateFlashcardsBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const doc = await getDocContent(parsed.data.documentId);
  if (!doc) { res.status(404).json({ error: "Document not found" }); return; }
  const result = await chatCompletion(
    [
      { role: "system", content: `You are an expert at creating study flashcards. Generate 6-10 question-answer pairs.
Return ONLY a valid JSON array: [{"question": "...", "answer": "..."}, ...]
No explanation, just the JSON array.` },
      { role: "user", content: `Generate flashcards from:\n\n${doc.content.slice(0, 5000)}` },
    ],
    0.3,
    1024
  );
  let flashcards: Array<{ question: string; answer: string }> = [];
  try {
    const cleaned = result.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    flashcards = JSON.parse(cleaned);
  } catch {
    const match = result.match(/\[[\s\S]*\]/);
    if (match) {
      try { flashcards = JSON.parse(match[0]); } catch {
        flashcards = [{ question: "Could not parse flashcards", answer: result.slice(0, 200) }];
      }
    }
  }
  await db.insert(activityTable).values({ type: "tool_used", description: `Generated ${flashcards.length} flashcards from "${doc.title}"` });
  res.json({ flashcards, documentId: parsed.data.documentId, documentTitle: doc.title });
});

router.post("/tools/mindmap", async (req, res): Promise<void> => {
  const parsed = GenerateMindmapBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const doc = await getDocContent(parsed.data.documentId);
  if (!doc) { res.status(404).json({ error: "Document not found" }); return; }
  const result = await chatCompletion(
    [
      { role: "system", content: `You are an expert at creating mind maps. Generate a Mermaid mindmap diagram.
Return ONLY valid Mermaid mindmap syntax starting with:
mindmap
  root((Topic))
No explanation, no code fences.` },
      { role: "user", content: `Generate a mind map from:\n\n${doc.content.slice(0, 4000)}` },
    ],
    0.3,
    512
  );
  const cleaned = result.replace(/```mermaid\n?/g, "").replace(/```\n?/g, "").trim();
  await db.insert(activityTable).values({ type: "tool_used", description: `Generated mind map from "${doc.title}"` });
  res.json({ result: cleaned, documentId: parsed.data.documentId });
});

// Flashcard Deck persistence
router.post("/tools/flashcard-decks", async (req, res): Promise<void> => {
  const { documentId, documentTitle, deckTitle, flashcards } = req.body as {
    documentId?: unknown;
    documentTitle?: unknown;
    deckTitle?: unknown;
    flashcards?: unknown;
  };
  if (
    typeof documentId !== "number" ||
    typeof documentTitle !== "string" ||
    typeof deckTitle !== "string" ||
    !Array.isArray(flashcards)
  ) {
    res.status(400).json({ error: "Invalid deck payload" });
    return;
  }
  const [deck] = await db.insert(flashcardDecksTable).values({
    documentId,
    documentTitle,
    deckTitle,
    flashcards,
    cardCount: flashcards.length,
  }).returning();
  await db.insert(activityTable).values({
    type: "tool_used",
    description: `Saved flashcard deck "${deckTitle}" (${flashcards.length} cards)`,
  });
  res.status(201).json(deck);
});

router.get("/tools/flashcard-decks", async (_req, res): Promise<void> => {
  const decks = await db.select().from(flashcardDecksTable).orderBy(desc(flashcardDecksTable.createdAt));
  res.json(decks);
});

router.delete("/tools/flashcard-decks/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const [deck] = await db.delete(flashcardDecksTable).where(eq(flashcardDecksTable.id, id)).returning();
  if (!deck) { res.status(404).json({ error: "Deck not found" }); return; }
  res.sendStatus(204);
});

export default router;
