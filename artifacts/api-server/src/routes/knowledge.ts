import { Router, type IRouter } from "express";
import { eq, inArray } from "drizzle-orm";
import { db, documentsTable } from "@workspace/db";
import { chatCompletion } from "../lib/groq";
import { z } from "zod";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const KnowledgeGraphBody = z.object({
  documentIds: z.array(z.number()).min(1).max(20),
  query: z.string().optional(),
});

router.post("/knowledge-graph", async (req, res): Promise<void> => {
  const parsed = KnowledgeGraphBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { documentIds, query } = parsed.data;

  const docs = await db
    .select({ id: documentsTable.id, title: documentsTable.title, content: documentsTable.content, type: documentsTable.type })
    .from(documentsTable)
    .where(inArray(documentsTable.id, documentIds));

  if (docs.length === 0) {
    res.status(404).json({ error: "No documents found" });
    return;
  }

  const combinedText = docs
    .map((d) => `## ${d.title}\n${d.content.slice(0, 2000)}`)
    .join("\n\n---\n\n");

  const focusClause = query ? `Focus especially on concepts related to: "${query}".` : "";

  const prompt = `You are a knowledge graph extraction engine. Analyze the following documents and extract a rich knowledge graph.

Documents:
${combinedText}

${focusClause}

Instructions:
1. Extract the most important entities (people, organizations, concepts, technologies, places, events)
2. Identify meaningful relationships between entities
3. Return a valid Mermaid graph TD diagram with labeled edges
4. Also return a JSON list of entities

Respond with EXACTLY this format (no other text):
<mermaid>
graph TD
  A[Entity1] -->|relationship| B[Entity2]
  ... (10-25 nodes maximum)
</mermaid>
<entities>
[{"name": "Entity1", "type": "concept", "mentions": 3}, ...]
</entities>`;

  try {
    const result = await chatCompletion(
      [{ role: "user", content: prompt }],
      0.3,
      2048
    );

    const mermaidMatch = result.match(/<mermaid>\s*([\s\S]*?)\s*<\/mermaid>/);
    const entitiesMatch = result.match(/<entities>\s*([\s\S]*?)\s*<\/entities>/);

    let mermaid = mermaidMatch?.[1] ?? "graph TD\n  A[No entities extracted]";
    let entities: Array<{ name: string; type: string; mentions: number }> = [];

    if (entitiesMatch) {
      try {
        entities = JSON.parse(entitiesMatch[1]);
      } catch {
        entities = [];
      }
    }

    if (!mermaid.trim().startsWith("graph")) {
      mermaid = `graph TD\n  A[${docs[0].title}] -->|contains| B[Knowledge Graph]\n  B -->|needs| C[More Documents]`;
    }

    res.json({
      mermaid,
      entities,
      documentCount: docs.length,
      documentTitles: docs.map((d) => d.title),
    });
  } catch (err) {
    logger.error({ err }, "Knowledge graph extraction failed");
    res.status(500).json({ error: "Failed to extract knowledge graph" });
  }
});

export default router;
