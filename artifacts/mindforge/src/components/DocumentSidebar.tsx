import { useState } from "react";
import { useListDocuments, useGetStatsOverview, useGetStatsActivity } from "@workspace/api-client-react";
import { getListDocumentsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Search, FileText, File, Github, Database, Clock, Upload } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { UploadModal } from "./UploadModal";

const typeIcons: Record<string, React.ReactNode> = {
  pdf: <File className="h-3.5 w-3.5 text-orange-400" />,
  markdown: <FileText className="h-3.5 w-3.5 text-blue-400" />,
  text: <FileText className="h-3.5 w-3.5 text-green-400" />,
  github: <Github className="h-3.5 w-3.5 text-purple-400" />,
};

const activityIcons: Record<string, string> = {
  document_added: "↑",
  document_deleted: "✕",
  chat_message: "→",
  tool_used: "⚡",
};

export function DocumentSidebar() {
  const [search, setSearch] = useState("");
  const [showUpload, setShowUpload] = useState(false);
  const queryClient = useQueryClient();

  const { data: docsData = [] } = useListDocuments({ search: search || undefined });
  const { data: stats } = useGetStatsOverview();
  const { data: activityData = [] } = useGetStatsActivity();
  const docs = Array.isArray(docsData) ? docsData : [];
  const activity = Array.isArray(activityData) ? activityData : [];

  const allTags = Array.from(new Set(docs.flatMap((d) => d.tags))).slice(0, 8);

  return (
    <>
      <div
        className="w-72 h-full border-r border-border flex flex-col overflow-hidden"
        style={{ background: "hsl(220 15% 7%)" }}
      >
        {/* Stats */}
        <div className="px-4 pt-4 pb-3 border-b border-border">
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-card border border-border rounded-lg px-3 py-2">
              <div className="flex items-center gap-1.5 mb-0.5">
                <Database className="h-3 w-3 text-primary" />
                <span className="text-xs text-muted-foreground">Docs</span>
              </div>
              <p className="text-lg font-bold text-foreground">{stats?.totalDocuments ?? 0}</p>
            </div>
            <div className="bg-card border border-border rounded-lg px-3 py-2">
              <div className="flex items-center gap-1.5 mb-0.5">
                <FileText className="h-3 w-3 text-primary" />
                <span className="text-xs text-muted-foreground">Chunks</span>
              </div>
              <p className="text-lg font-bold text-foreground">{stats?.totalChunks ?? 0}</p>
            </div>
          </div>
        </div>

        {/* Search + Upload */}
        <div className="px-3 py-3 border-b border-border">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search docs..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-card border border-border rounded-lg text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
              />
            </div>
            <button
              onClick={() => setShowUpload(true)}
              className="p-1.5 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
              title="Upload document"
            >
              <Upload className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Tags */}
          {allTags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {allTags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => setSearch(tag)}
                  className="px-1.5 py-0.5 bg-primary/10 text-primary text-xs rounded hover:bg-primary/20 transition-colors"
                >
                  {tag}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Document list */}
        <div className="flex-1 overflow-y-auto py-2">
          {docs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 gap-2 px-4 text-center">
              <Plus className="h-6 w-6 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">No documents yet. Upload to begin.</p>
            </div>
          ) : (
            <AnimatePresence>
              {docs.map((doc) => (
                <motion.div
                  key={doc.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -8 }}
                  className="mx-2 mb-1 px-3 py-2.5 rounded-lg hover:bg-accent/50 transition-colors group cursor-default"
                >
                  <div className="flex items-center gap-2 mb-1">
                    {typeIcons[doc.type]}
                    <span className="text-xs font-medium text-foreground truncate flex-1">{doc.title}</span>
                  </div>
                  <div className="flex items-center gap-1 flex-wrap">
                    {doc.tags.slice(0, 2).map((tag) => (
                      <span key={tag} className="px-1 py-0.5 bg-primary/10 text-primary text-xs rounded">
                        {tag}
                      </span>
                    ))}
                    <span className="text-xs text-muted-foreground ml-auto">{doc.chunkCount}c</span>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>

        {/* Activity feed */}
        {activity.length > 0 && (
          <div className="border-t border-border p-3">
            <div className="flex items-center gap-1.5 mb-2">
              <Clock className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground">Recent Activity</span>
            </div>
            <div className="space-y-1.5">
              {activity.slice(0, 4).map((item) => (
                <div key={item.id} className="flex items-start gap-2">
                  <span className="text-xs text-primary mt-0.5">{activityIcons[item.type] ?? "·"}</span>
                  <p className="text-xs text-muted-foreground line-clamp-1 flex-1">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {showUpload && (
        <UploadModal
          onClose={() => {
            setShowUpload(false);
            queryClient.invalidateQueries({ queryKey: getListDocumentsQueryKey() });
          }}
        />
      )}
    </>
  );
}
