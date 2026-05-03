import { useState, useEffect, useRef } from "react";
import { useUploadDocument } from "@workspace/api-client-react";
import { getListDocumentsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { X, StickyNote, Loader2, Check, Eye, Pencil } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface QuickNoteModalProps {
  onClose: () => void;
}

function MarkdownPreview({ content }: { content: string }) {
  const lines = content.split("\n");
  return (
    <div className="px-4 py-3 text-sm text-foreground leading-relaxed space-y-1 min-h-[168px] overflow-y-auto">
      {lines.map((line, i) => {
        if (line.startsWith("# ")) return <h1 key={i} className="text-base font-bold mt-2">{line.slice(2)}</h1>;
        if (line.startsWith("## ")) return <h2 key={i} className="text-sm font-semibold mt-2">{line.slice(3)}</h2>;
        if (line.startsWith("### ")) return <h3 key={i} className="text-xs font-semibold mt-1 text-primary">{line.slice(4)}</h3>;
        if (line.startsWith("- ") || line.startsWith("* ")) return <div key={i} className="flex gap-2"><span className="text-primary">•</span><span>{line.slice(2)}</span></div>;
        if (/^\d+\. /.test(line)) {
          const m = line.match(/^(\d+)\. (.*)/);
          return m ? <div key={i} className="flex gap-2"><span className="text-primary">{m[1]}.</span><span>{m[2]}</span></div> : <p key={i}>{line}</p>;
        }
        if (line.startsWith("> ")) return <blockquote key={i} className="border-l-2 border-primary/40 pl-3 text-muted-foreground italic">{line.slice(2)}</blockquote>;
        if (line.startsWith("```")) return <div key={i} className="font-mono text-xs bg-muted px-2 py-0.5 rounded text-primary/80">{line}</div>;
        if (line === "") return <div key={i} className="h-2" />;
        const formatted = line
          .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
          .replace(/\*(.+?)\*/g, "<em>$1</em>")
          .replace(/`(.+?)`/g, '<code class="bg-muted px-1 rounded text-xs font-mono text-primary">$1</code>');
        return <p key={i} dangerouslySetInnerHTML={{ __html: formatted }} />;
      })}
      {!content && <p className="text-muted-foreground italic">Nothing to preview yet...</p>}
    </div>
  );
}

export function QuickNoteModal({ onClose }: QuickNoteModalProps) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [saved, setSaved] = useState(false);
  const [preview, setPreview] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const queryClient = useQueryClient();
  const upload = useUploadDocument();

  useEffect(() => {
    if (!preview) textareaRef.current?.focus();
  }, [preview]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const handleSave = async () => {
    if (!content.trim()) return;
    const noteTitle = title.trim() || `Note — ${new Date().toLocaleString()}`;
    await upload.mutateAsync({
      data: { title: noteTitle, content: content.trim(), type: "text", tags: ["note"] },
    });
    queryClient.invalidateQueries({ queryKey: getListDocumentsQueryKey() });
    setSaved(true);
    setTimeout(onClose, 700);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      handleSave();
    }
    if ((e.metaKey || e.ctrlKey) && e.key === "p") {
      e.preventDefault();
      setPreview((v) => !v);
    }
  };

  const wordCount = content.split(/\s+/).filter(Boolean).length;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[60] flex items-start justify-center pt-[15vh] bg-black/50 backdrop-blur-sm px-4"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          initial={{ opacity: 0, y: -16, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -12, scale: 0.97 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          className="bg-card border border-border rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center gap-3 px-4 pt-4 pb-3">
            <div className="w-7 h-7 bg-amber-500/10 rounded-lg flex items-center justify-center shrink-0">
              <StickyNote className="h-3.5 w-3.5 text-amber-400" />
            </div>
            <input
              type="text"
              placeholder="Note title (optional)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="flex-1 bg-transparent text-sm font-medium text-foreground placeholder:text-muted-foreground focus:outline-none"
            />
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPreview((v) => !v)}
                title={preview ? "Edit (⌘P)" : "Preview (⌘P)"}
                className={`p-1.5 rounded-md text-xs transition-colors flex items-center gap-1 ${preview ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}
              >
                {preview ? <Pencil className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                <span className="hidden sm:inline">{preview ? "Edit" : "Preview"}</span>
              </button>
              <button onClick={onClose} className="p-1 text-muted-foreground hover:text-foreground rounded transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="px-4 pb-1">
            <div className="h-px bg-border" />
          </div>

          {/* Content / Preview */}
          <AnimatePresence mode="wait">
            {preview ? (
              <motion.div key="preview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <MarkdownPreview content={content} />
              </motion.div>
            ) : (
              <motion.div key="edit" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <textarea
                  ref={textareaRef}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Start writing your note... Markdown supported"
                  rows={7}
                  className="w-full px-4 py-3 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none resize-none leading-relaxed font-mono"
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Footer */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <span className="text-xs text-muted-foreground">
              {wordCount} words · <span className="text-primary/70 font-medium">markdown</span> · tag{" "}
              <span className="text-amber-400 font-medium">note</span>
            </span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground hidden sm:block">⌘↵ save · ⌘P preview</span>
              <button
                onClick={handleSave}
                disabled={!content.trim() || upload.isPending || saved}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  saved
                    ? "bg-green-500/20 text-green-400"
                    : "bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-40"
                } disabled:cursor-not-allowed`}
              >
                {saved ? (
                  <><Check className="h-3 w-3" /> Saved!</>
                ) : upload.isPending ? (
                  <><Loader2 className="h-3 w-3 animate-spin" /> Saving...</>
                ) : (
                  "Save Note"
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
