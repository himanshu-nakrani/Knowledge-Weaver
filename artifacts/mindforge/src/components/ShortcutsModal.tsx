import { useEffect } from "react";
import { X, Keyboard } from "lucide-react";
import { motion } from "framer-motion";

interface ShortcutsModalProps {
  onClose: () => void;
}

const shortcuts = [
  { category: "Navigation", items: [
    { keys: ["⌘", "K"], label: "Open command palette" },
    { keys: ["⌘", "N"], label: "New quick note" },
    { keys: ["?"], label: "Show keyboard shortcuts" },
    { keys: ["Esc"], label: "Close modal / palette" },
  ]},
  { category: "Documents", items: [
    { keys: ["⌘", "U"], label: "Upload document" },
    { keys: ["⌘", "D"], label: "Duplicate document" },
    { keys: ["⌘", "C"], label: "Copy document content" },
    { keys: ["⌘", "S"], label: "Share document" },
  ]},
  { category: "Chat", items: [
    { keys: ["Enter"], label: "Send message" },
    { keys: ["Shift", "Enter"], label: "New line in message" },
    { keys: ["↑"], label: "Edit last message" },
  ]},
  { category: "UI", items: [
    { keys: ["⌘", "\\"], label: "Toggle theme (dark/light)" },
    { keys: ["⌘", "G"], label: "Open knowledge graph" },
    { keys: ["⌘", "A"], label: "Open AI agent" },
  ]},
];

export function ShortcutsModal({ onClose }: ShortcutsModalProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: -16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: -16 }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
        className="bg-card border border-border rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col shadow-2xl"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2.5">
            <Keyboard className="h-4 w-4 text-primary" />
            <h2 className="font-semibold text-foreground">Keyboard Shortcuts</h2>
          </div>
          <button onClick={onClose} className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {shortcuts.map((section) => (
              <div key={section.category}>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  {section.category}
                </h3>
                <div className="space-y-2">
                  {section.items.map(({ keys, label }) => (
                    <div key={label} className="flex items-center justify-between gap-4">
                      <span className="text-sm text-foreground/80">{label}</span>
                      <div className="flex items-center gap-1 shrink-0">
                        {keys.map((key, i) => (
                          <kbd
                            key={i}
                            className="text-[11px] font-mono text-muted-foreground bg-muted border border-border rounded px-1.5 py-0.5 min-w-[24px] text-center"
                          >
                            {key}
                          </kbd>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="px-6 py-3 border-t border-border bg-muted/20">
          <p className="text-xs text-muted-foreground text-center">
            Press <kbd className="font-mono bg-muted border border-border rounded px-1 py-0.5">?</kbd> anywhere to show this panel
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}
