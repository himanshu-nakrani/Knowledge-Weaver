import { useState } from "react";
import { useUploadDocument, useIngestGithubRepo } from "@workspace/api-client-react";
import { X, Upload, Github, FileText, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface UploadModalProps {
  onClose: () => void;
}

type Tab = "text" | "github";

export function UploadModal({ onClose }: UploadModalProps) {
  const [tab, setTab] = useState<Tab>("text");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [docType, setDocType] = useState<"text" | "markdown">("text");
  const [tags, setTags] = useState("");
  const [githubUrl, setGithubUrl] = useState("");
  const [githubTags, setGithubTags] = useState("");

  const uploadDoc = useUploadDocument();
  const ingestGithub = useIngestGithubRepo();

  const isLoading = uploadDoc.isPending || ingestGithub.isPending;

  const parseTags = (raw: string) =>
    raw.split(",").map((t) => t.trim()).filter(Boolean);

  const handleUpload = async () => {
    if (!title.trim() || !content.trim()) return;
    await uploadDoc.mutateAsync({
      data: {
        title: title.trim(),
        content: content.trim(),
        type: docType,
        tags: parseTags(tags),
      },
    });
    onClose();
  };

  const handleGithub = async () => {
    if (!githubUrl.trim()) return;
    await ingestGithub.mutateAsync({
      data: {
        url: githubUrl.trim(),
        tags: parseTags(githubTags),
      },
    });
    onClose();
  };

  return (
    <AnimatePresence>
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
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="bg-card border border-border rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <h2 className="font-semibold text-foreground">Add to Knowledge Base</h2>
            <button
              onClick={onClose}
              className="p-1 text-muted-foreground hover:text-foreground transition-colors rounded"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-border">
            {[
              { id: "text" as Tab, label: "Document", icon: FileText },
              { id: "github" as Tab, label: "GitHub Repo", icon: Github },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium transition-colors ${
                  tab === id
                    ? "text-primary border-b-2 border-primary -mb-px"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="p-5 space-y-4">
            {tab === "text" ? (
              <>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Title *</label>
                  <input
                    type="text"
                    placeholder="Document title..."
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Type</label>
                  <div className="flex gap-2">
                    {(["text", "markdown"] as const).map((t) => (
                      <button
                        key={t}
                        onClick={() => setDocType(t)}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                          docType === t
                            ? "bg-primary/10 text-primary border-primary/30"
                            : "bg-muted text-muted-foreground border-border hover:text-foreground"
                        }`}
                      >
                        {t === "text" ? "Plain Text" : "Markdown"}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Content *</label>
                  <textarea
                    placeholder="Paste your document content here..."
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    rows={6}
                    className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 resize-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Tags (comma-separated)</label>
                  <input
                    type="text"
                    placeholder="research, ai, notes..."
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                  />
                </div>
                <button
                  onClick={handleUpload}
                  disabled={isLoading || !title.trim() || !content.trim()}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                  {isLoading ? "Processing..." : "Upload & Index"}
                </button>
              </>
            ) : (
              <>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">GitHub Repository URL *</label>
                  <input
                    type="url"
                    placeholder="https://github.com/owner/repo"
                    value={githubUrl}
                    onChange={(e) => setGithubUrl(e.target.value)}
                    className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                  />
                  <p className="text-xs text-muted-foreground mt-1">We'll scrape the README and file structure.</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Tags (comma-separated)</label>
                  <input
                    type="text"
                    placeholder="github, code, library..."
                    value={githubTags}
                    onChange={(e) => setGithubTags(e.target.value)}
                    className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                  />
                </div>
                <button
                  onClick={handleGithub}
                  disabled={isLoading || !githubUrl.trim()}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Github className="h-4 w-4" />
                  )}
                  {isLoading ? "Ingesting..." : "Ingest Repository"}
                </button>
              </>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
