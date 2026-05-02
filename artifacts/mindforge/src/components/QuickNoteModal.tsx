import { useState, useEffect, useRef } from "react";
import { useUploadDocument } from "@workspace/api-client-react";
import { getListDocumentsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { X, StickyNote, Loader2, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface QuickNoteModalProps {
  onClose: () => void;
}

export function QuickNoteModal({ onClose }: QuickNoteModalProps) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [saved, setSaved] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const queryClient = useQueryClient();
  const upload = useUploadDocument();

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

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
  };

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
            <button onClick={onClose} className="p-1 text-muted-foreground hover:text-foreground rounded transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="px-4 pb-1">
            <div className="h-px bg-border" />
          </div>

          {/* Content */}
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Start writing your note..."
            rows={7}
            className="w-full px-4 py-3 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none resize-none leading-relaxed"
          />

          {/* Footer */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <span className="text-xs text-muted-foreground">
              {content.split(/\s+/).filter(Boolean).length} words · saved to Library with tag{" "}
              <span className="text-amber-400 font-medium">note</span>
            </span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground hidden sm:block">⌘↵ to save</span>
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
