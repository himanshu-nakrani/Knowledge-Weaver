import { useEffect, useRef, useState } from "react";
import {
  useSummarizeDocument,
  useExtractActionItems,
  useGenerateFlashcards,
  useGenerateMindmap,
} from "@workspace/api-client-react";
import { X, Loader2, ChevronDown, ChevronUp, Copy, Check } from "lucide-react";
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

function MermaidDiagram({ code }: { code: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [error, setError] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const mermaid = (await import("mermaid")).default;
        mermaid.initialize({
          startOnLoad: false,
          theme: "dark",
          themeVariables: {
            primaryColor: "#6366f1",
            primaryTextColor: "#e2e8f0",
            primaryBorderColor: "#4f46e5",
            lineColor: "#6366f1",
            secondaryColor: "#1e1b4b",
            tertiaryColor: "#1e293b",
            background: "#0f172a",
            mainBkg: "#1e293b",
            nodeBorder: "#4f46e5",
            clusterBkg: "#1e1b4b",
            titleColor: "#e2e8f0",
            edgeLabelBackground: "#1e293b",
            attributeBackgroundColorEven: "#1e293b",
            attributeBackgroundColorOdd: "#0f172a",
          },
        });
        const id = `mermaid-${Date.now()}`;
        const { svg } = await mermaid.render(id, code);
        if (!cancelled && ref.current) {
          ref.current.innerHTML = svg;
          // Make SVG responsive
          const svgEl = ref.current.querySelector("svg");
          if (svgEl) {
            svgEl.removeAttribute("height");
            svgEl.style.width = "100%";
            svgEl.style.maxWidth = "100%";
          }
        }
      } catch {
        if (!cancelled) setError(true);
      }
    })();
    return () => { cancelled = true; };
  }, [code]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-muted-foreground">
          Interactive mind map — rendered with Mermaid
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 px-2 py-1 text-xs text-muted-foreground hover:text-foreground border border-border rounded-md transition-colors"
        >
          {copied ? <Check className="h-3 w-3 text-green-400" /> : <Copy className="h-3 w-3" />}
          {copied ? "Copied!" : "Copy code"}
        </button>
      </div>

      {error ? (
        <div>
          <p className="text-xs text-yellow-400 mb-2">Could not render diagram — showing source:</p>
          <pre className="bg-muted border border-border rounded-lg p-4 text-xs text-foreground/80 overflow-x-auto font-mono whitespace-pre-wrap">
            {code}
          </pre>
        </div>
      ) : (
        <div
          ref={ref}
          className="bg-muted/30 border border-border rounded-xl p-4 min-h-[200px] flex items-center justify-center overflow-x-auto"
        />
      )}

      <p className="text-xs text-muted-foreground mt-3">
        Edit or share at{" "}
        <a
          href={`https://mermaid.live/edit#pako:${btoa(code)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline"
        >
          mermaid.live ↗
        </a>
      </p>
    </div>
  );
}

export function ToolResultModal({ type, docId, onClose }: ToolResultModalProps) {
  const [flipped, setFlipped] = useState<Set<number>>(new Set());
  const [copied, setCopied] = useState(false);

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

  const isLoading =
    summarize.isPending || actions.isPending || flashcards.isPending || mindmap.isPending;

  const toggleFlip = (i: number) => {
    setFlipped((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };

  const handleCopySummary = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

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
        className="bg-card border border-border rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="font-semibold text-foreground">{TITLES[type]}</h2>
          <button
            onClick={onClose}
            className="p-1 text-muted-foreground hover:text-foreground rounded"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-48 gap-3">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">
                Generating {TITLES[type].toLowerCase()}...
              </p>
            </div>
          ) : (
            <>
              {type === "summarize" && summarize.data && (
                <div>
                  <div className="flex justify-end mb-2">
                    <button
                      onClick={() => handleCopySummary(summarize.data!.result)}
                      className="flex items-center gap-1 px-2 py-1 text-xs text-muted-foreground hover:text-foreground border border-border rounded-md transition-colors"
                    >
                      {copied ? <Check className="h-3 w-3 text-green-400" /> : <Copy className="h-3 w-3" />}
                      {copied ? "Copied!" : "Copy"}
                    </button>
                  </div>
                  <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">
                    {summarize.data.result}
                  </p>
                </div>
              )}

              {type === "actions" && actions.data && (
                <div className="space-y-1.5">
                  {actions.data.result
                    .split("\n")
                    .filter(Boolean)
                    .map((line, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-accent/30 transition-colors group"
                      >
                        <div className="w-5 h-5 rounded border border-border flex items-center justify-center shrink-0 mt-0.5 group-hover:border-primary/40">
                          <span className="text-xs text-muted-foreground font-mono">{i + 1}</span>
                        </div>
                        <p className="text-sm text-foreground/90 flex-1">
                          {line.replace(/^\d+\.\s*/, "").replace(/^[-•]\s*/, "")}
                        </p>
                      </div>
                    ))}
                </div>
              )}

              {type === "flashcards" && flashcards.data && (
                <div>
                  <p className="text-xs text-muted-foreground mb-3">
                    {(flashcards.data.flashcards as Flashcard[]).length} cards · Click to flip
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {(flashcards.data.flashcards as Flashcard[]).map((card, i) => (
                      <motion.div
                        key={i}
                        onClick={() => toggleFlip(i)}
                        whileTap={{ scale: 0.98 }}
                        className={`cursor-pointer border rounded-xl p-4 transition-all min-h-[110px] flex flex-col ${
                          flipped.has(i)
                            ? "border-green-500/40 bg-green-500/5"
                            : "border-border bg-muted hover:border-primary/30"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-medium text-primary">Card {i + 1}</span>
                          {flipped.has(i) ? (
                            <ChevronUp className="h-3 w-3 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="h-3 w-3 text-muted-foreground" />
                          )}
                        </div>
                        <p
                          className={`text-sm leading-relaxed flex-1 ${
                            flipped.has(i) ? "text-green-400" : "text-foreground font-medium"
                          }`}
                        >
                          {flipped.has(i) ? card.answer : card.question}
                        </p>
                        <p className="text-xs text-muted-foreground mt-2">
                          {flipped.has(i) ? "Answer ✓" : "Tap to reveal"}
                        </p>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {type === "mindmap" && mindmap.data?.result && (
                <MermaidDiagram code={mindmap.data.result} />
              )}

              {type === "mindmap" && !mindmap.data && !mindmap.isPending && (
                <p className="text-sm text-muted-foreground">No mind map generated.</p>
              )}
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
