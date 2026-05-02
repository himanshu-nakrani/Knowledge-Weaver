export interface TextChunk {
  content: string;
  index: number;
}

const CHUNK_SIZE = 800;
const CHUNK_OVERLAP = 150;
const MIN_CHUNK_LENGTH = 50;

function splitBySentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+(?=[A-Z])|(?<=\n)\s*\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

export function chunkText(text: string): TextChunk[] {
  const sentences = splitBySentences(text);
  const chunks: TextChunk[] = [];
  let current = "";
  let chunkIndex = 0;

  for (const sentence of sentences) {
    if (current.length + sentence.length + 1 > CHUNK_SIZE && current.length > 0) {
      if (current.trim().length >= MIN_CHUNK_LENGTH) {
        chunks.push({ content: current.trim(), index: chunkIndex++ });
      }
      // Overlap: keep last portion
      const words = current.split(" ");
      const overlapWords = words.slice(-Math.floor(CHUNK_OVERLAP / 6));
      current = overlapWords.join(" ") + " " + sentence;
    } else {
      current = current ? current + " " + sentence : sentence;
    }
  }

  if (current.trim().length >= MIN_CHUNK_LENGTH) {
    chunks.push({ content: current.trim(), index: chunkIndex++ });
  }

  // If no chunks created, create one from the whole text
  if (chunks.length === 0 && text.trim().length > 0) {
    chunks.push({ content: text.trim(), index: 0 });
  }

  return chunks;
}

export function extractHeadingsAndCode(markdown: string): string {
  // Convert markdown to plain text preserving structure
  return markdown
    .replace(/```[\s\S]*?```/g, (match) => {
      const code = match.replace(/```\w*\n?/g, "").trim();
      return `[CODE BLOCK]\n${code}\n[/CODE BLOCK]`;
    })
    .replace(/#{1,6}\s+(.+)/g, "\n$1\n")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/\[(.+?)\]\(.+?\)/g, "$1")
    .replace(/^\s*[-*+]\s+/gm, "• ")
    .replace(/^\s*\d+\.\s+/gm, "• ");
}
