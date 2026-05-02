import { useState, useRef } from "react";
import { useUploadDocument, useIngestGithubRepo } from "@workspace/api-client-react";
import { X, Upload, Github, FileText, Loader2, FileUp, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface UploadModalProps {
  onClose: () => void;
}

type Tab = "text" | "pdf" | "github";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export function UploadModal({ onClose }: UploadModalProps) {
  const [tab, setTab] = useState<Tab>("text");

  // Text tab
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [docType, setDocType] = useState<"text" | "markdown">("text");
  const [tags, setTags] = useState("");

  // PDF tab
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfTitle, setPdfTitle] = useState("");
  const [pdfTags, setPdfTags] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [pdfUploading, setPdfUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // GitHub tab
  const [githubUrl, setGithubUrl] = useState("");
  const [githubTags, setGithubTags] = useState("");

  const uploadDoc = useUploadDocument();
  const ingestGithub = useIngestGithubRepo();

  const isLoading = uploadDoc.isPending || ingestGithub.isPending || pdfUploading;

  const parseTags = (raw: string) =>
    raw.split(",").map((t) => t.trim()).filter(Boolean);

  const handleUploadText = async () => {
    if (!title.trim() || !content.trim()) return;
    await uploadDoc.mutateAsync({
      data: { title: title.trim(), content: content.trim(), type: docType, tags: parseTags(tags) },
    });
    onClose();
  };

  const handleUploadPdf = async () => {
    if (!pdfFile) return;
    setPdfUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", pdfFile);
      if (pdfTitle.trim()) formData.append("title", pdfTitle.trim());
      if (pdfTags.trim()) formData.append("tags", pdfTags.trim());

      const res = await fetch(`${BASE}/api/documents/pdf`, { method: "POST", body: formData });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Upload failed" }));
        throw new Error(err.error ?? "Upload failed");
      }
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setPdfUploading(false);
    }
  };

  const handleGithub = async () => {
    if (!githubUrl.trim()) return;
    await ingestGithub.mutateAsync({ data: { url: githubUrl.trim(), tags: parseTags(githubTags) } });
    onClose();
  };

  const onDropFile = (file: File) => {
    if (file.type !== "application/pdf") return;
    setPdfFile(file);
    if (!pdfTitle) setPdfTitle(file.name.replace(/\.pdf$/i, ""));
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
            <button onClick={onClose} className="p-1 text-muted-foreground hover:text-foreground rounded">
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-border">
            {[
              { id: "text" as Tab, label: "Document", icon: FileText },
              { id: "pdf" as Tab, label: "PDF", icon: FileUp },
              { id: "github" as Tab, label: "GitHub", icon: Github },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium transition-colors ${
                  tab === id
                    ? "text-primary border-b-2 border-primary -mb-px"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="p-5 space-y-4">
            {tab === "text" && (
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
                    rows={5}
                    className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 resize-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Tags</label>
                  <input
                    type="text"
                    placeholder="research, ai, notes..."
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                  />
                </div>
                <button
                  onClick={handleUploadText}
                  disabled={isLoading || !title.trim() || !content.trim()}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  {isLoading ? "Processing..." : "Upload & Index"}
                </button>
              </>
            )}

            {tab === "pdf" && (
              <>
                {/* Drop zone */}
                <div
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                    const file = e.dataTransfer.files[0];
                    if (file) onDropFile(file);
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  className={`relative flex flex-col items-center justify-center gap-3 border-2 border-dashed rounded-xl py-8 px-4 cursor-pointer transition-all ${
                    isDragging
                      ? "border-primary bg-primary/5"
                      : pdfFile
                      ? "border-green-500/50 bg-green-500/5"
                      : "border-border hover:border-primary/40 hover:bg-muted/50"
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,application/pdf"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) onDropFile(file);
                    }}
                  />
                  {pdfFile ? (
                    <>
                      <CheckCircle2 className="h-8 w-8 text-green-400" />
                      <div className="text-center">
                        <p className="text-sm font-medium text-foreground">{pdfFile.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {(pdfFile.size / 1024).toFixed(0)} KB · Click to change
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <FileUp className="h-8 w-8 text-muted-foreground" />
                      <div className="text-center">
                        <p className="text-sm font-medium text-foreground">Drop PDF here</p>
                        <p className="text-xs text-muted-foreground mt-0.5">or click to browse · max 50 MB</p>
                      </div>
                    </>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Title (optional)</label>
                  <input
                    type="text"
                    placeholder={pdfFile?.name.replace(/\.pdf$/i, "") ?? "Inferred from filename..."}
                    value={pdfTitle}
                    onChange={(e) => setPdfTitle(e.target.value)}
                    className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Tags</label>
                  <input
                    type="text"
                    placeholder="paper, research, notes..."
                    value={pdfTags}
                    onChange={(e) => setPdfTags(e.target.value)}
                    className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                  />
                </div>
                <button
                  onClick={handleUploadPdf}
                  disabled={isLoading || !pdfFile}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileUp className="h-4 w-4" />}
                  {isLoading ? "Parsing PDF..." : "Upload PDF & Index"}
                </button>
              </>
            )}

            {tab === "github" && (
              <>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                    GitHub Repository URL *
                  </label>
                  <input
                    type="url"
                    placeholder="https://github.com/owner/repo"
                    value={githubUrl}
                    onChange={(e) => setGithubUrl(e.target.value)}
                    className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Scrapes README, file tree, and top-level files.
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Tags</label>
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
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Github className="h-4 w-4" />}
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
