import { useEffect, useState } from "react";
import { useSummarizeDocument, useExtractActionItems, useGenerateFlashcards, useGenerateMindmap } from "@workspace/api-client-react";
import { X, Loader2, ChevronDown, ChevronUp, GitBranch } from "lucide-react";
import { motion } from "framer-motion";

type ToolType = "summarize" | "actions" | "flashcards" | "mindmap";

interface ToolResultModalProps {
  type: ToolType;
  docId: number;
  onClose: () => void;
}

const TITLES: Record<ToolType, string> = {
  summarize: "Document Summary",
  actions: "Action Items",
  flashcards: "Flashcards",
  mindmap: "Mind Map",
};

interface Flashcard {
  question: string;
  answer: string;
}

export function ToolResultModal({ type, docId, onClose }: ToolResultModalProps) {
  const [flipped, setFlipped] = useState<Set<number>>(new Set());
  const [mermaidEl, setMermaidEl] = useState<string>("");

  const summarize = useSummarizeDocument();
  const actions = useExtractActionItems();
  const flashcards = useGenerateFlashcards();
  const mindmap = useGenerateMindmap();

  useEffect(() => {
    const data = { data: { documentId: docId } };
    if (type === "summarize") summarize.mutate(data);
    else if (type === "actions") actions.mutate(data);
    else if (type === "flashcards") flashcards.mutate(data);
    else if (type === "mindmap") mindmap.mutate(data);
  }, []);

  const isLoading = summarize.isPending || actions.isPending || flashcards.isPending || mindmap.isPending;

  const toggleFlip = (i: number) => {
    setFlipped((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };

  useEffect(() => {
    if (type === "mindmap" && mindmap.data?.result) {
      const code = mindmap.data.result;
      setMermaidEl(code);
    }
  }, [mindmap.data, type]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-card border border-border rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="font-semibold text-foreground">{TITLES[type]}</h2>
          <button onClick={onClose} className="p-1 text-muted-foreground hover:text-foreground rounded">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-40 gap-3">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Generating {TITLES[type].toLowerCase()}...</p>
            </div>
          ) : (
            <>
              {type === "summarize" && summarize.data && (
                <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">{summarize.data.result}</p>
              )}

              {type === "actions" && actions.data && (
                <div className="space-y-2">
                  {actions.data.result.split("\n").filter(Boolean).map((line, i) => (
                    <div key={i} className="flex items-start gap-2 p-2 rounded-lg hover:bg-accent/30 transition-colors">
                      <span className="text-primary mt-0.5 font-mono text-xs">{String(i + 1).padStart(2, "0")}</span>
                      <p className="text-sm text-foreground/90 flex-1">{line.replace(/^\d+\.\s*/, "").replace(/^[-•]\s*/, "")}</p>
                    </div>
                  ))}
                </div>
              )}

              {type === "flashcards" && flashcards.data && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {(flashcards.data.flashcards as Flashcard[]).map((card, i) => (
                    <div
                      key={i}
                      onClick={() => toggleFlip(i)}
                      className="cursor-pointer border border-border rounded-xl p-4 bg-muted hover:border-primary/30 transition-all min-h-[100px] flex flex-col justify-between"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-primary font-medium">Card {i + 1}</span>
                        {flipped.has(i) ? <ChevronUp className="h-3 w-3 text-muted-foreground" /> : <ChevronDown className="h-3 w-3 text-muted-foreground" />}
                      </div>
                      {flipped.has(i) ? (
                        <p className="text-sm text-green-400 leading-relaxed">{card.answer}</p>
                      ) : (
                        <p className="text-sm text-foreground font-medium leading-relaxed">{card.question}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-2">{flipped.has(i) ? "Answer" : "Click to reveal answer"}</p>
                    </div>
                  ))}
                </div>
              )}

              {type === "mindmap" && (
                <div>
                  {mindmap.data ? (
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <GitBranch className="h-4 w-4 text-primary" />
                        <span className="text-sm font-medium text-foreground">Mermaid Diagram</span>
                      </div>
                      <pre className="bg-muted border border-border rounded-lg p-4 text-xs text-foreground/80 overflow-x-auto font-mono whitespace-pre-wrap">
                        {mindmap.data.result}
                      </pre>
                      <p className="text-xs text-muted-foreground mt-2">
                        Copy this Mermaid syntax to{" "}
                        <a href="https://mermaid.live" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                          mermaid.live
                        </a>{" "}
                        to visualize the mind map.
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No mind map generated.</p>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
