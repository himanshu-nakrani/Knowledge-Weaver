import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  useListTrashDocuments,
  useRestoreDocument,
  getListDocumentsQueryKey,
  getListTrashDocumentsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Trash2, RotateCcw, File, FileText, Github, Globe, AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const typeIcons: Record<string, React.ReactNode> = {
  pdf: <File className="h-4 w-4 text-orange-400" />,
  markdown: <FileText className="h-4 w-4 text-blue-400" />,
  text: <FileText className="h-4 w-4 text-green-400" />,
  github: <Github className="h-4 w-4 text-purple-400" />,
  url: <Globe className="h-4 w-4 text-cyan-400" />,
};

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function Trash() {
  const queryClient = useQueryClient();
  const { data: docs = [], isLoading } = useListTrashDocuments();
  const restore = useRestoreDocument();
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const handleRestore = async (id: number) => {
    await restore.mutateAsync({ id });
    queryClient.invalidateQueries({ queryKey: getListTrashDocumentsQueryKey() });
    queryClient.invalidateQueries({ queryKey: getListDocumentsQueryKey() });
  };

  const handlePermanentDelete = async (id: number) => {
    if (!confirm("Permanently delete this document? This cannot be undone.")) return;
    setDeletingId(id);
    try {
      await fetch(`${BASE}/api/documents/${id}/permanent`, { method: "DELETE", credentials: "include" });
      queryClient.invalidateQueries({ queryKey: getListTrashDocumentsQueryKey() });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <AppLayout>
      <div className="h-full flex flex-col p-6 overflow-hidden">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Trash2 className="h-6 w-6 text-muted-foreground" />
              Trash
            </h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              {docs.length} deleted {docs.length === 1 ? "document" : "documents"}
            </p>
          </div>
        </div>

        {docs.length > 0 && (
          <div className="flex items-center gap-2 mb-4 px-3 py-2 bg-amber-400/10 border border-amber-400/20 rounded-lg">
            <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />
            <p className="text-xs text-amber-400">Documents in trash are not available for AI search. Restore them to include in your knowledge base.</p>
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-20 bg-card border border-border rounded-xl animate-pulse" />
              ))}
            </div>
          ) : docs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-card border border-border flex items-center justify-center">
                <Trash2 className="h-8 w-8 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium text-foreground">Trash is empty</p>
                <p className="text-muted-foreground text-sm mt-1">Deleted documents will appear here</p>
              </div>
            </div>
          ) : (
            <motion.div className="space-y-3 pb-6">
              <AnimatePresence>
                {docs.map((doc) => (
                  <motion.div
                    key={doc.id}
                    layout
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    className="group flex items-center gap-4 p-4 bg-card border border-border rounded-xl hover:border-border/80 transition-all"
                  >
                    <div className="p-2 bg-muted rounded-lg">
                      {typeIcons[doc.type] ?? <FileText className="h-4 w-4 text-muted-foreground" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground text-sm truncate">{doc.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-muted-foreground uppercase">{doc.type}</span>
                        <span className="text-xs text-muted-foreground">·</span>
                        <span className="text-xs text-muted-foreground">{doc.chunkCount} chunks</span>
                        {doc.deletedAt && (
                          <>
                            <span className="text-xs text-muted-foreground">·</span>
                            <span className="text-xs text-muted-foreground">
                              Deleted {new Date(doc.deletedAt).toLocaleDateString()}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleRestore(doc.id)}
                        disabled={restore.isPending}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-primary border border-primary/30 bg-primary/10 rounded-lg hover:bg-primary/20 transition-colors disabled:opacity-50"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        Restore
                      </button>
                      <button
                        onClick={() => handlePermanentDelete(doc.id)}
                        disabled={deletingId === doc.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-destructive border border-destructive/30 bg-destructive/10 rounded-lg hover:bg-destructive/20 transition-colors disabled:opacity-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete forever
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
