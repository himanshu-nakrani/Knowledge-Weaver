import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useListDocuments, useDeleteDocument, useUpdateDocument } from "@workspace/api-client-react";
import { getListDocumentsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { UploadModal } from "@/components/UploadModal";
import { Search, Plus, Trash2, Tag, FileText, File, Github, ExternalLink } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const typeIcons: Record<string, React.ReactNode> = {
  pdf: <File className="h-4 w-4 text-orange-400" />,
  markdown: <FileText className="h-4 w-4 text-blue-400" />,
  text: <FileText className="h-4 w-4 text-green-400" />,
  github: <Github className="h-4 w-4 text-purple-400" />,
};

const typeColors: Record<string, string> = {
  pdf: "border-orange-400/20 bg-orange-400/5",
  markdown: "border-blue-400/20 bg-blue-400/5",
  text: "border-green-400/20 bg-green-400/5",
  github: "border-purple-400/20 bg-purple-400/5",
};

export default function Documents() {
  const [search, setSearch] = useState("");
  const [filterTag, setFilterTag] = useState<string | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const queryClient = useQueryClient();

  const { data: docs = [], isLoading } = useListDocuments({ search: search || undefined, tag: filterTag || undefined });
  const deleteDoc = useDeleteDocument();

  const allTags = Array.from(new Set(docs.flatMap((d) => d.tags)));

  const handleDelete = async (id: number) => {
    await deleteDoc.mutateAsync({ id });
    queryClient.invalidateQueries({ queryKey: getListDocumentsQueryKey() });
  };

  return (
    <AppLayout>
      <div className="h-full flex flex-col p-6 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Document Library</h1>
            <p className="text-muted-foreground text-sm mt-0.5">{docs.length} documents in your knowledge base</p>
          </div>
          <button
            onClick={() => setShowUpload(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
          >
            <Plus className="h-4 w-4" />
            Add Document
          </button>
        </div>

        {/* Filters */}
        <div className="flex gap-3 mb-4 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search documents..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-card border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setFilterTag(null)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                !filterTag ? "bg-primary text-primary-foreground" : "bg-card border border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              All
            </button>
            {allTags.map((tag) => (
              <button
                key={tag}
                onClick={() => setFilterTag(filterTag === tag ? null : tag)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  filterTag === tag ? "bg-primary text-primary-foreground" : "bg-card border border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        {/* Document Grid */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-40 bg-card border border-border rounded-xl animate-pulse" />
              ))}
            </div>
          ) : docs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-card border border-border flex items-center justify-center">
                <FileText className="h-8 w-8 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium text-foreground">No documents yet</p>
                <p className="text-muted-foreground text-sm mt-1">Upload your first document to get started</p>
              </div>
            </div>
          ) : (
            <motion.div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pb-6">
              <AnimatePresence>
                {docs.map((doc) => (
                  <motion.div
                    key={doc.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className={`group relative border rounded-xl p-4 bg-card hover:border-primary/30 transition-all duration-200 cursor-default ${typeColors[doc.type] ?? "border-border"}`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        {typeIcons[doc.type]}
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{doc.type}</span>
                      </div>
                      <button
                        onClick={() => handleDelete(doc.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-destructive transition-all duration-200 rounded"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <h3 className="font-semibold text-foreground text-sm mb-1 line-clamp-2">{doc.title}</h3>
                    <p className="text-muted-foreground text-xs line-clamp-2 mb-3">{doc.content.slice(0, 100)}...</p>

                    <div className="flex items-center justify-between">
                      <div className="flex flex-wrap gap-1">
                        {doc.tags.slice(0, 3).map((tag) => (
                          <span key={tag} className="px-1.5 py-0.5 bg-primary/10 text-primary text-xs rounded font-medium">
                            {tag}
                          </span>
                        ))}
                      </div>
                      <span className="text-xs text-muted-foreground">{doc.chunkCount} chunks</span>
                    </div>

                    {doc.sourceUrl && (
                      <a
                        href={doc.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 flex items-center gap-1 text-xs text-primary hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <ExternalLink className="h-3 w-3" />
                        View source
                      </a>
                    )}

                    <p className="text-xs text-muted-foreground mt-2">{new Date(doc.createdAt).toLocaleDateString()}</p>
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          )}
        </div>
      </div>

      {showUpload && (
        <UploadModal onClose={() => setShowUpload(false)} />
      )}
    </AppLayout>
  );
}
