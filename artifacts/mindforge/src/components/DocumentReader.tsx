import { useState } from "react";
import { X, ExternalLink, FileText, File, Github, Globe, Tag, Layers, Clock, Hash, Zap, BookOpen, GitBranch, List, Download } from "lucide-react";
import { motion } from "framer-motion";

interface Doc {
  id: number;
  title: string;
  type: string;
  content: string;
  tags: string[];
  chunkCount: number;
  sourceUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

interface DocumentReaderProps {
  doc: Doc;
  onClose: () => void;
  onTool?: (type: "summarize" | "actions" | "flashcards" | "mindmap", docId: number) => void;
}

const typeIcon: Record<string, React.ReactNode> = {
  pdf: <File className="h-4 w-4 text-orange-400" />,
  markdown: <FileText className="h-4 w-4 text-blue-400" />,
  text: <FileText className="h-4 w-4 text-green-400" />,
  github: <Github className="h-4 w-4 text-purple-400" />,
  url: <Globe className="h-4 w-4 text-cyan-400" />,
};

const typeBadge: Record<string, string> = {
  pdf: "text-orange-400 bg-orange-400/10 border-orange-400/20",
  markdown: "text-blue-400 bg-blue-400/10 border-blue-400/20",
  text: "text-green-400 bg-green-400/10 border-green-400/20",
  github: "text-purple-400 bg-purple-400/10 border-purple-400/20",
  url: "text-cyan-400 bg-cyan-400/10 border-cyan-400/20",
};

function readingTime(text: string) {
  const words = text.split(/\s+/).filter(Boolean).length;
  const mins = Math.max(1, Math.round(words / 200));
  return { words, mins };
}

function renderContent(type: string, content: string) {
  const lines = content.split("\n");
  return lines.map((line, i) => {
    if (type === "markdown" || type === "github" || type === "url") {
      if (/^## /.test(line)) {
        return <h2 key={i} className="text-base font-semibold text-foreground mt-5 mb-1.5">{line.slice(3)}</h2>;
      }
      if (/^### /.test(line)) {
        return <h3 key={i} className="text-sm font-semibold text-foreground/90 mt-4 mb-1">{line.slice(4)}</h3>;
      }
      if (/^# /.test(line)) {
        return <h1 key={i} className="text-lg font-bold text-foreground mt-2 mb-2">{line.slice(2)}</h1>;
      }
      if (/^- /.test(line) || /^\* /.test(line)) {
        return (
          <div key={i} className="flex items-start gap-2 my-0.5">
            <span className="text-primary mt-1.5 shrink-0">·</span>
            <p className="text-sm text-foreground/85 leading-relaxed">{line.slice(2)}</p>
          </div>
        );
      }
      if (/^```/.test(line)) {
        return <div key={i} className="font-mono text-xs text-muted-foreground bg-muted rounded px-2 py-0.5 my-0.5">{line}</div>;
      }
    }
    if (!line.trim()) return <div key={i} className="h-2" />;
    return <p key={i} className="text-sm text-foreground/85 leading-relaxed my-0.5">{line}</p>;
  });
}

function exportAsMarkdown(doc: Doc) {
  const text = `# ${doc.title}\n\nType: ${doc.type} | Tags: ${doc.tags.join(", ")} | Chunks: ${doc.chunkCount}\nSource: ${doc.sourceUrl ?? "N/A"}\nAdded: ${new Date(doc.createdAt).toLocaleDateString()}\n\n---\n\n${doc.content}`;
  const blob = new Blob([text], { type: "text/markdown" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${doc.title.replace(/[^a-z0-9]/gi, "_").toLowerCase()}.md`;
  a.click();
  URL.revokeObjectURL(a.href);
}

export function DocumentReader({ doc, onClose, onTool }: DocumentReaderProps) {
  const [tab, setTab] = useState<"content" | "meta">("content");
  const { words, mins } = readingTime(doc.content);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, x: 40 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 40 }}
        transition={{ type: "spring", stiffness: 350, damping: 30 }}
        className="bg-card border border-border rounded-2xl w-full max-w-2xl max-h-[88vh] flex flex-col shadow-2xl"
      >
        {/* Header */}
        <div className="px-5 pt-5 pb-3 border-b border-border shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2.5 min-w-0">
              <div className="mt-0.5 shrink-0">{typeIcon[doc.type] ?? <FileText className="h-4 w-4" />}</div>
              <div className="min-w-0">
                <h2 className="font-semibold text-foreground leading-tight">{doc.title}</h2>
                <div className="flex items-center gap-3 mt-1 flex-wrap">
                  <span className={`text-[11px] font-medium px-1.5 py-0.5 rounded border ${typeBadge[doc.type] ?? "text-muted-foreground bg-muted border-border"}`}>
                    {doc.type.toUpperCase()}
                  </span>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Hash className="h-3 w-3" />{doc.chunkCount} chunks
                  </span>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />{mins} min read
                  </span>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Layers className="h-3 w-3" />{words.toLocaleString()} words
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={() => exportAsMarkdown(doc)}
                title="Export as Markdown"
                className="flex items-center gap-1 px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground border border-border rounded-lg hover:border-primary/30 transition-all"
              >
                <Download className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Export</span>
              </button>
              <button onClick={onClose} className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* AI tools row */}
          {onTool && (
            <div className="flex items-center gap-1.5 mt-3 flex-wrap">
              <span className="text-xs text-muted-foreground mr-0.5">AI:</span>
              {[
                { id: "summarize" as const, label: "Summarize", icon: Zap },
                { id: "actions" as const, label: "Actions", icon: List },
                { id: "flashcards" as const, label: "Flashcards", icon: BookOpen },
                { id: "mindmap" as const, label: "Mind Map", icon: GitBranch },
              ].map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => { onClose(); setTimeout(() => onTool(id, doc.id), 100); }}
                  className="flex items-center gap-1 px-2 py-1 bg-muted border border-border rounded-md text-xs text-muted-foreground hover:text-foreground hover:border-primary/30 transition-all"
                >
                  <Icon className="h-3 w-3" />{label}
                </button>
              ))}
            </div>
          )}

          {/* Tags */}
          {doc.tags.length > 0 && (
            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
              <Tag className="h-3 w-3 text-muted-foreground" />
              {doc.tags.map((tag) => (
                <span key={tag} className="px-1.5 py-0.5 bg-primary/10 text-primary text-xs rounded font-medium">{tag}</span>
              ))}
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border shrink-0">
          {[
            { id: "content" as const, label: "Content" },
            { id: "meta" as const, label: "Details" },
          ].map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`px-5 py-2.5 text-sm font-medium transition-colors ${
                tab === id ? "text-primary border-b-2 border-primary -mb-px" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {tab === "content" && (
            <div className="prose-sm max-w-none">
              {renderContent(doc.type, doc.content)}
            </div>
          )}
          {tab === "meta" && (
            <div className="space-y-4">
              {[
                { label: "Document ID", value: `#${doc.id}` },
                { label: "Type", value: doc.type },
                { label: "Chunks", value: `${doc.chunkCount} (used for BM25 retrieval)` },
                { label: "Words", value: words.toLocaleString() },
                { label: "Reading time", value: `~${mins} minute${mins !== 1 ? "s" : ""}` },
                { label: "Added", value: new Date(doc.createdAt).toLocaleString() },
                { label: "Updated", value: new Date(doc.updatedAt).toLocaleString() },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-start gap-4">
                  <span className="text-xs text-muted-foreground w-28 shrink-0 pt-0.5">{label}</span>
                  <span className="text-sm text-foreground">{value}</span>
                </div>
              ))}
              {doc.sourceUrl && (
                <div className="flex items-start gap-4">
                  <span className="text-xs text-muted-foreground w-28 shrink-0 pt-0.5">Source URL</span>
                  <a href={doc.sourceUrl} target="_blank" rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline flex items-center gap-1 break-all">
                    <ExternalLink className="h-3 w-3 shrink-0" />{doc.sourceUrl}
                  </a>
                </div>
              )}
              <div className="flex items-start gap-4">
                <span className="text-xs text-muted-foreground w-28 shrink-0 pt-0.5">Tags</span>
                <div className="flex flex-wrap gap-1">
                  {doc.tags.length > 0 ? doc.tags.map((t) => (
                    <span key={t} className="px-1.5 py-0.5 bg-primary/10 text-primary text-xs rounded font-medium">{t}</span>
                  )) : <span className="text-sm text-muted-foreground">No tags</span>}
                </div>
              </div>
              <div className="pt-2 border-t border-border">
                <button
                  onClick={() => exportAsMarkdown(doc)}
                  className="flex items-center gap-2 px-3 py-2 bg-muted border border-border rounded-lg text-sm text-foreground hover:border-primary/30 transition-all"
                >
                  <Download className="h-4 w-4 text-primary" />
                  Download as Markdown (.md)
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
