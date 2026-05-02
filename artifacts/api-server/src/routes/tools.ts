import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, documentsTable, activityTable } from "@workspace/db";
import {
  SummarizeDocumentBody,
  ExtractActionItemsBody,
  GenerateFlashcardsBody,
  GenerateMindmapBody,
} from "@workspace/api-zod";
import { chatCompletion } from "../lib/groq";

const router: IRouter = Router();

async function getDocContent(id: number): Promise<string | null> {
  const [doc] = await db
    .select()
    .from(documentsTable)
    .where(eq(documentsTable.id, id));
  return doc?.content ?? null;
}

router.post("/tools/summarize", async (req, res): Promise<void> => {
  const parsed = SummarizeDocumentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const content = await getDocContent(parsed.data.documentId);
  if (!content) {
    res.status(404).json({ error: "Document not found" });
    return;
  }

  const truncated = content.slice(0, 6000);
  const result = await chatCompletion([
    {
      role: "system",
      content:
        "You are a precise document summarizer. Create a comprehensive summary with key points.",
    },
    {
      role: "user",
      content: `Please summarize this document:\n\n${truncated}`,
    },
  ]);

  await db.insert(activityTable).values({
    type: "tool_used",
    description: `Summarized document #${parsed.data.documentId}`,
  });

  res.json({ result, documentId: parsed.data.documentId });
});

router.post("/tools/action-items", async (req, res): Promise<void> => {
  const parsed = ExtractActionItemsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const content = await getDocContent(parsed.data.documentId);
  if (!content) {
    res.status(404).json({ error: "Document not found" });
    return;
  }

  const truncated = content.slice(0, 6000);
  const result = await chatCompletion([
    {
      role: "system",
      content:
        "You are an expert at extracting actionable items. Extract all action items, TODOs, tasks, and next steps from the document. Format as a numbered list.",
    },
    {
      role: "user",
      content: `Extract action items from this document:\n\n${truncated}`,
    },
  ]);

  await db.insert(activityTable).values({
    type: "tool_used",
    description: `Extracted action items from document #${parsed.data.documentId}`,
  });

  res.json({ result, documentId: parsed.data.documentId });
});

router.post("/tools/flashcards", async (req, res): Promise<void> => {
  const parsed = GenerateFlashcardsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const content = await getDocContent(parsed.data.documentId);
  if (!content) {
    res.status(404).json({ error: "Document not found" });
    return;
  }

  const truncated = content.slice(0, 5000);
  const result = await chatCompletion(
    [
      {
        role: "system",
        content: `You are an expert at creating study flashcards. Generate 5-10 question-answer pairs from the document.
Return ONLY a valid JSON array like: [{"question": "...", "answer": "..."}, ...]
No explanation, just the JSON array.`,
      },
      {
        role: "user",
        content: `Generate flashcards from this document:\n\n${truncated}`,
      },
    ],
    0.3,
    1024
  );

  let flashcards: Array<{ question: string; answer: string }> = [];
  try {
    const cleaned = result.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    flashcards = JSON.parse(cleaned);
  } catch {
    // Try to extract JSON from the response
    const match = result.match(/\[[\s\S]*\]/);
    if (match) {
      try {
        flashcards = JSON.parse(match[0]);
      } catch {
        flashcards = [
          { question: "Could not parse flashcards", answer: result.slice(0, 200) },
        ];
      }
    }
  }

  await db.insert(activityTable).values({
    type: "tool_used",
    description: `Generated ${flashcards.length} flashcards from document #${parsed.data.documentId}`,
  });

  res.json({ flashcards, documentId: parsed.data.documentId });
});

router.post("/tools/mindmap", async (req, res): Promise<void> => {
  const parsed = GenerateMindmapBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const content = await getDocContent(parsed.data.documentId);
  if (!content) {
    res.status(404).json({ error: "Document not found" });
    return;
  }

  const truncated = content.slice(0, 4000);
  const result = await chatCompletion(
    [
      {
        role: "system",
        content: `You are an expert at creating mind maps. Generate a Mermaid mindmap diagram from the document.
Return ONLY valid Mermaid mindmap syntax starting with:
mindmap
  root((Topic))
No explanation, no markdown code fences, just the Mermaid syntax.`,
      },
      {
        role: "user",
        content: `Generate a mind map from this document:\n\n${truncated}`,
      },
    ],
    0.3,
    512
  );

  const cleaned = result
    .replace(/```mermaid\n?/g, "")
    .replace(/```\n?/g, "")
    .trim();

  await db.insert(activityTable).values({
    type: "tool_used",
    description: `Generated mind map from document #${parsed.data.documentId}`,
  });

  res.json({ result: cleaned, documentId: parsed.data.documentId });
});

export default router;
