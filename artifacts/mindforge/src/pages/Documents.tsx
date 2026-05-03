import { useState, useMemo, useEffect, useRef } from "react";
import { useLocation, useSearch } from "wouter";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  useListDocuments,
  useDeleteDocument,
  usePinDocument,
  getListDocumentsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { UploadModal } from "@/components/UploadModal";
import { DocumentReader } from "@/components/DocumentReader";
import { ToolResultModal } from "@/components/ToolResultModal";
import { Search, Plus, Trash2, FileText, File, Github, Globe, ExternalLink, BookOpen, Pin, PinOff, Copy, Share2, GitBranch, CheckSquare, Square, ArrowUpDown, FolderOpen, Check, Tag } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const typeIcons: Record<string, React.ReactNode> = {
  pdf: <File className="h-4 w-4 text-orange-400" />,
  markdown: <FileText className="h-4 w-4 text-blue-400" />,
  text: <FileText className="h-4 w-4 text-green-400" />,
  github: <Github className="h-4 w-4 text-purple-400" />,
  url: <Globe className="h-4 w-4 text-cyan-400" />,
};

const typeColors: Record<string, string> = {
  pdf: "border-orange-400/20 bg-orange-400/5",
  markdown: "border-blue-400/20 bg-blue-400/5",
  text: "border-green-400/20 bg-green-400/5",
  github: "border-purple-400/20 bg-purple-400/5",
  url: "border-cyan-400/20 bg-cyan-400/5",
};

interface Collection {
  id: number;
  name: string;
  color: string;
  documentCount: number;
}

type ToolType = "summarize" | "actions" | "flashcards" | "mindmap";

export default function Documents() {
  const [, setLocation] = useLocation();
  const searchString = useSearch();
  const filterCollection = (() => {
    const p = new URLSearchParams(searchString);
    const c = p.get("c");
    return c ? Number(c) : null;
  })();

  const [search, setSearch] = useState("");
  const [filterTag, setFilterTag] = useState<string | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [readerDoc, setReaderDoc] = useState<(typeof docs)[0] | null>(null);
  const [toolState, setToolState] = useState<{ type: ToolType; docId: number } | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkMoveOpen, setBulkMoveOpen] = useState(false);
  const [bulkTagOpen, setBulkTagOpen] = useState(false);
  const [bulkTagInput, setBulkTagInput] = useState("");
  const bulkMoveRef = useRef<HTMLDivElement>(null);
  const [shareModalDocId, setShareModalDocId] = useState<number | null>(null);
  const [shareInfo, setShareInfo] = useState<{ token: string; url: string } | null>(null);
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "title" | "type">("newest");
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [moveDocId, setMoveDocId] = useState<number | null>(null);
  const moveDropdownRef = useRef<HTMLDivElement>(null);

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: docs = [], isLoading } = useListDocuments({ search: search || undefined, tag: filterTag || undefined, collectionId: filterCollection || undefined });
  const deleteDoc = useDeleteDocument();
  const pinDoc = usePinDocument();
  const resolvedReader = readerDoc ? (docs.find((d) => d.id === readerDoc.id) ?? readerDoc) : null;

  const allTags = Array.from(new Set(docs.flatMap((d) => d.tags)));

  useEffect(() => {
    fetch(`${BASE}/api/collections`)
      .then((r) => r.json())
      .then((data) => setCollections(data as Collection[]))
      .catch(() => {});
  }, []);

  const collectionMap = useMemo(() => new Map(collections.map((c) => [c.id, c])), [collections]);
  const activeCollection = filterCollection ? collectionMap.get(filterCollection) : null;

  const sortedDocs = useMemo(() => {
    const copy = [...docs];
    if (sortBy === "newest") copy.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    else if (sortBy === "oldest") copy.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    else if (sortBy === "title") copy.sort((a, b) => a.title.localeCompare(b.title));
    else if (sortBy === "type") copy.sort((a, b) => a.type.localeCompare(b.type));
    return copy;
  }, [docs, sortBy]);

  const pinnedDocs = sortedDocs.filter((d) => d.pinned);
  const unpinnedDocs = sortedDocs.filter((d) => !d.pinned);

  const handleDelete = async (id: number) => {
    await deleteDoc.mutateAsync({ id });
    queryClient.invalidateQueries({ queryKey: getListDocumentsQueryKey() });
    setSelectedIds((prev) => { const next = new Set(prev); next.delete(id); return next; });
  };

  const handlePin = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    await pinDoc.mutateAsync({ id });
    queryClient.invalidateQueries({ queryKey: getListDocumentsQueryKey() });
  };

  const handleDuplicate = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    try {
      await fetch(`${BASE}/api/documents/${id}/duplicate`, { method: "POST" });
      queryClient.invalidateQueries({ queryKey: getListDocumentsQueryKey() });
      toast({ title: "Document duplicated", description: "A copy has been added to your library." });
    } catch {
      toast({ title: "Duplicate failed", variant: "destructive" });
    }
  };

  const handleCopy = (e: React.MouseEvent, doc: (typeof docs)[0]) => {
    e.stopPropagation();
    const text = `# ${doc.title}\n\nType: ${doc.type} | Tags: ${doc.tags.join(", ")}\n\n${doc.content}`;
    navigator.clipboard.writeText(text).then(() => {
      toast({ title: "Copied!", description: "Document content copied to clipboard." });
    });
  };

  const handleShare = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    try {
      const resp = await fetch(`${BASE}/api/documents/${id}/share`, { method: "POST" });
      if (!resp.ok) throw new Error("Share failed");
      const data = await resp.json() as { shareToken: string; shareUrl: string };
      const fullUrl = `${window.location.origin}${import.meta.env.BASE_URL.replace(/\/$/, "")}${data.shareUrl}`;
      setShareInfo({ token: data.shareToken, url: fullUrl });
      setShareModalDocId(id);
      toast({ title: "Share link created", description: "Copy the link to share with others" });
    } catch (err) {
      toast({ title: "Share failed", description: err instanceof Error ? err.message : "Unable to share document", variant: "destructive" });
    }
  };

  const handleMoveToCollection = async (e: React.MouseEvent, docId: number, collectionId: number | null) => {
    e.stopPropagation();
    try {
      await fetch(`${BASE}/api/documents/${docId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ collectionId }),
      });
      queryClient.invalidateQueries({ queryKey: getListDocumentsQueryKey() });
      setMoveDocId(null);
      const collName = collectionId ? collectionMap.get(collectionId)?.name : null;
      toast({ title: collName ? `Moved to "${collName}"` : "Removed from collection" });
    } catch {
      toast({ title: "Move failed", variant: "destructive" });
    }
  };

  const handleBulkDelete = async () => {
    const count = selectedIds.size;
    try {
      for (const id of selectedIds) {
        await deleteDoc.mutateAsync({ id });
      }
      queryClient.invalidateQueries({ queryKey: getListDocumentsQueryKey() });
      setSelectedIds(new Set());
      setBulkMode(false);
      toast({ title: `Deleted ${count} document${count > 1 ? "s" : ""}` });
    } catch {
      toast({ title: "Delete failed", variant: "destructive" });
    }
  };

  const handleBulkMove = async (collectionId: number | null) => {
    const count = selectedIds.size;
    try {
      await Promise.all(
        Array.from(selectedIds).map((id) =>
          fetch(`${BASE}/api/documents/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ collectionId }),
          })
        )
      );
      queryClient.invalidateQueries({ queryKey: getListDocumentsQueryKey() });
      const collName = collectionId ? collectionMap.get(collectionId)?.name : null;
      toast({ title: collName ? `Moved ${count} docs to "${collName}"` : `Removed ${count} docs from collection` });
      setBulkMoveOpen(false);
      setSelectedIds(new Set());
      setBulkMode(false);
    } catch {
      toast({ title: "Move failed", variant: "destructive" });
    }
  };

  const handleBulkAddTag = async () => {
    const tag = bulkTagInput.trim().toLowerCase().replace(/\s+/g, "-");
    if (!tag) return;
    const count = selectedIds.size;
    try {
      await Promise.all(
        Array.from(selectedIds).map(async (id) => {
          const doc = docs.find((d) => d.id === id);
          if (!doc || doc.tags.includes(tag)) return;
          return fetch(`${BASE}/api/documents/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ tags: [...doc.tags, tag] }),
          });
        })
      );
      queryClient.invalidateQueries({ queryKey: getListDocumentsQueryKey() });
      toast({ title: `Tag "${tag}" added to ${count} doc${count > 1 ? "s" : ""}` });
      setBulkTagInput("");
      setBulkTagOpen(false);
    } catch {
      toast({ title: "Tag failed", variant: "destructive" });
    }
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (moveDropdownRef.current && !moveDropdownRef.current.contains(e.target as Node)) {
        setMoveDocId(null);
      }
      if (bulkMoveRef.current && !bulkMoveRef.current.contains(e.target as Node)) {
        setBulkMoveOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const DocCard = ({ doc }: { doc: (typeof docs)[0] }) => {
    const docCollection = doc.collectionId ? collectionMap.get(doc.collectionId) : null;

    return (
      <motion.div
        key={doc.id}
        layout
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        onClick={() => bulkMode ? setSelectedIds((prev) => { const next = new Set(prev); next.has(doc.id) ? next.delete(doc.id) : next.add(doc.id); return next; }) : setReaderDoc(doc)}
        className={`group relative border rounded-xl p-4 bg-card hover:border-primary/30 transition-all duration-200 cursor-pointer ${typeColors[doc.type] ?? "border-border"} ${doc.pinned ? "ring-1 ring-primary/20" : ""} ${selectedIds.has(doc.id) ? "ring-1 ring-primary/40 border-primary/40" : ""}`}
      >
        {bulkMode && (
          <div className="absolute top-2 left-2">
            {selectedIds.has(doc.id)
              ? <CheckSquare className="h-4 w-4 text-primary" />
              : <Square className="h-4 w-4 text-muted-foreground" />
            }
          </div>
        )}
        {doc.pinned && !bulkMode && (
          <div className="absolute top-2 right-2">
            <Pin className="h-3 w-3 text-primary/60 fill-primary/30" />
          </div>
        )}

        <div className={`flex items-start justify-between mb-3 ${bulkMode ? "pl-6" : ""}`}>
          <div className="flex items-center gap-2">
            {typeIcons[doc.type]}
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{doc.type}</span>
            {docCollection && (
              <span
                className="text-[10px] font-medium px-1.5 py-0.5 rounded-full border"
                style={{ color: docCollection.color, borderColor: `${docCollection.color}40`, background: `${docCollection.color}12` }}
              >
                {docCollection.name}
              </span>
            )}
          </div>
          {!bulkMode && (
            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all duration-200">
              <button onClick={(e) => handlePin(e, doc.id)} title={doc.pinned ? "Unpin" : "Pin"} className={`p-1 rounded transition-colors ${doc.pinned ? "text-primary" : "text-muted-foreground hover:text-primary"}`}>
                {doc.pinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
              </button>
              <button onClick={(e) => handleCopy(e, doc)} title="Copy content" className="p-1 text-muted-foreground hover:text-foreground rounded transition-colors">
                <Copy className="h-3.5 w-3.5" />
              </button>
              <button onClick={(e) => handleShare(e, doc.id)} title="Share document" className="p-1 text-muted-foreground hover:text-cyan-400 rounded transition-colors">
                <Share2 className="h-3.5 w-3.5" />
              </button>
              <button onClick={(e) => handleDuplicate(e, doc.id)} title="Duplicate" className="p-1 text-muted-foreground hover:text-green-400 rounded transition-colors">
                <GitBranch className="h-3.5 w-3.5" />
              </button>
              {/* Move to collection */}
              <div className="relative" ref={moveDocId === doc.id ? moveDropdownRef : undefined}>
                <button
                  onClick={(e) => { e.stopPropagation(); setMoveDocId(moveDocId === doc.id ? null : doc.id); }}
                  title="Move to collection"
                  className="p-1 text-muted-foreground hover:text-amber-400 rounded transition-colors"
                >
                  <FolderOpen className="h-3.5 w-3.5" />
                </button>
                <AnimatePresence>
                  {moveDocId === doc.id && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: -4 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: -4 }}
                      transition={{ duration: 0.12 }}
                      className="absolute right-0 top-full mt-1 w-44 bg-card border border-border rounded-xl shadow-2xl z-40 overflow-hidden py-1"
                    >
                      {doc.collectionId && (
                        <button
                          onMouseDown={(e) => handleMoveToCollection(e, doc.id, null)}
                          className="w-full flex items-center gap-2 px-3 py-2 text-xs text-destructive/80 hover:bg-destructive/10 transition-colors"
                        >
                          Remove from collection
                        </button>
                      )}
                      {collections.length === 0 ? (
                        <p className="px-3 py-2 text-xs text-muted-foreground">No collections yet</p>
                      ) : (
                        collections.map((coll) => (
                          <button
                            key={coll.id}
                            onMouseDown={(e) => handleMoveToCollection(e, doc.id, coll.id)}
                            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-foreground hover:bg-accent transition-colors"
                          >
                            <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: coll.color }} />
                            <span className="truncate flex-1 text-left">{coll.name}</span>
                            {doc.collectionId === coll.id && <Check className="h-3 w-3 text-primary shrink-0" />}
                          </button>
                        ))
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <button onClick={(e) => { e.stopPropagation(); setToolState({ type: "flashcards", docId: doc.id }); }} title="Generate flashcards" className="p-1 text-muted-foreground hover:text-primary rounded transition-colors">
                <BookOpen className="h-3.5 w-3.5" />
              </button>
              <button onClick={(e) => { e.stopPropagation(); handleDelete(doc.id); }} className="p-1 text-muted-foreground hover:text-destructive rounded transition-colors">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>

        <h3 className={`font-semibold text-foreground text-sm mb-1 line-clamp-2 ${bulkMode ? "pl-6" : ""}`}>{doc.title}</h3>
        <p className="text-muted-foreground text-xs line-clamp-2 mb-3">{doc.content.slice(0, 100)}...</p>

        <div className="flex items-center justify-between">
          <div className="flex flex-wrap gap-1">
            {doc.tags.slice(0, 3).map((tag) => (
              <span key={tag} className="px-1.5 py-0.5 bg-primary/10 text-primary text-xs rounded font-medium">{tag}</span>
            ))}
          </div>
          <span className="text-xs text-muted-foreground">{doc.chunkCount} chunks</span>
        </div>

        {doc.sourceUrl && (
          <a href={doc.sourceUrl} target="_blank" rel="noopener noreferrer" className="mt-2 flex items-center gap-1 text-xs text-primary hover:underline" onClick={(e) => e.stopPropagation()}>
            <ExternalLink className="h-3 w-3" />View source
          </a>
        )}
        <p className="text-xs text-muted-foreground mt-2">{new Date(doc.createdAt).toLocaleDateString()}</p>
      </motion.div>
    );
  };

  return (
    <AppLayout>
      <div className="h-full flex flex-col p-6 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-foreground">
                {activeCollection ? (
                  <span className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: activeCollection.color }} />
                    {activeCollection.name}
                  </span>
                ) : "Document Library"}
              </h1>
            </div>
            <p className="text-muted-foreground text-sm mt-0.5">
              {docs.length} document{docs.length !== 1 ? "s" : ""} • {docs.reduce((sum, d) => sum + d.chunkCount, 0)} chunks indexed
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setBulkMode((b) => !b); setSelectedIds(new Set()); }}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors border ${bulkMode ? "bg-primary/10 text-primary border-primary/30" : "bg-card border-border text-muted-foreground hover:text-foreground"}`}
            >
              <CheckSquare className="h-4 w-4" />
              {bulkMode ? "Exit Select" : "Select"}
            </button>
            {bulkMode && selectedIds.size > 0 && (
              <>
                <button
                  onClick={handleBulkDelete}
                  className="flex items-center gap-2 px-3 py-2 bg-destructive/10 border border-destructive/30 text-destructive rounded-lg text-sm font-medium hover:bg-destructive/20 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete {selectedIds.size}
                </button>

                {/* Bulk move to collection */}
                <div className="relative" ref={bulkMoveRef}>
                  <button
                    onClick={() => { setBulkMoveOpen((v) => !v); setBulkTagOpen(false); }}
                    className="flex items-center gap-2 px-3 py-2 bg-amber-400/10 border border-amber-400/30 text-amber-400 rounded-lg text-sm font-medium hover:bg-amber-400/20 transition-colors"
                  >
                    <FolderOpen className="h-4 w-4" />
                    Move
                  </button>
                  <AnimatePresence>
                    {bulkMoveOpen && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -4 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -4 }}
                        transition={{ duration: 0.12 }}
                        className="absolute right-0 top-full mt-1 w-48 bg-card border border-border rounded-xl shadow-2xl z-40 overflow-hidden py-1"
                      >
                        <p className="px-3 py-1.5 text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Move {selectedIds.size} docs to:</p>
                        <button
                          onMouseDown={() => handleBulkMove(null)}
                          className="w-full flex items-center gap-2 px-3 py-2 text-xs text-destructive/80 hover:bg-destructive/10 transition-colors"
                        >
                          Remove from collection
                        </button>
                        {collections.length === 0 ? (
                          <p className="px-3 py-2 text-xs text-muted-foreground">No collections yet</p>
                        ) : (
                          collections.map((coll) => (
                            <button
                              key={coll.id}
                              onMouseDown={() => handleBulkMove(coll.id)}
                              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-foreground hover:bg-accent transition-colors"
                            >
                              <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: coll.color }} />
                              <span className="truncate">{coll.name}</span>
                            </button>
                          ))
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Bulk add tag */}
                <div className="relative">
                  {bulkTagOpen ? (
                    <form
                      onSubmit={(e) => { e.preventDefault(); handleBulkAddTag(); }}
                      className="flex items-center gap-1"
                    >
                      <input
                        autoFocus
                        value={bulkTagInput}
                        onChange={(e) => setBulkTagInput(e.target.value)}
                        onBlur={() => { if (!bulkTagInput.trim()) setBulkTagOpen(false); }}
                        onKeyDown={(e) => e.key === "Escape" && setBulkTagOpen(false)}
                        placeholder="tag name"
                        className="w-28 px-2 py-2 bg-card border border-primary/40 rounded-lg text-xs text-foreground focus:outline-none"
                      />
                      <button
                        type="submit"
                        disabled={!bulkTagInput.trim()}
                        className="px-2 py-2 bg-primary/10 border border-primary/30 text-primary rounded-lg text-xs hover:bg-primary/20 transition-colors disabled:opacity-40"
                      >
                        Add
                      </button>
                    </form>
                  ) : (
                    <button
                      onClick={() => { setBulkTagOpen(true); setBulkMoveOpen(false); }}
                      className="flex items-center gap-2 px-3 py-2 bg-primary/10 border border-primary/30 text-primary rounded-lg text-sm font-medium hover:bg-primary/20 transition-colors"
                    >
                      <Tag className="h-4 w-4" />
                      Tag
                    </button>
                  )}
                </div>
              </>
            )}
            <button
              onClick={() => setShowUpload(true)}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
            >
              <Plus className="h-4 w-4" />
              Add Document
            </button>
          </div>
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
          {/* Sort dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowSortMenu((v) => !v)}
              onBlur={() => setTimeout(() => setShowSortMenu(false), 120)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-card border border-border rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowUpDown className="h-3.5 w-3.5" />
              {sortBy === "newest" ? "Newest" : sortBy === "oldest" ? "Oldest" : sortBy === "title" ? "Title A–Z" : "By Type"}
            </button>
            {showSortMenu && (
              <div className="absolute right-0 top-full mt-1 w-36 bg-card border border-border rounded-xl shadow-xl z-30 overflow-hidden">
                {(["newest", "oldest", "title", "type"] as const).map((opt) => (
                  <button
                    key={opt}
                    onMouseDown={() => { setSortBy(opt); setShowSortMenu(false); }}
                    className={`w-full text-left px-3 py-2 text-xs transition-colors ${sortBy === opt ? "bg-primary/10 text-primary font-medium" : "text-foreground hover:bg-accent"}`}
                  >
                    {opt === "newest" ? "Newest first" : opt === "oldest" ? "Oldest first" : opt === "title" ? "Title A–Z" : "By type"}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => { setFilterTag(null); setLocation("/documents"); }}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${!filterTag && !filterCollection ? "bg-primary text-primary-foreground" : "bg-card border border-border text-muted-foreground hover:text-foreground"}`}
            >
              All
            </button>
            {activeCollection && (
              <button
                onClick={() => setLocation("/documents")}
                className="px-3 py-1.5 rounded-md text-xs font-medium border flex items-center gap-1.5"
                style={{ color: activeCollection.color, borderColor: `${activeCollection.color}40`, background: `${activeCollection.color}12` }}
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: activeCollection.color }} />
                {activeCollection.name} ✕
              </button>
            )}
            {allTags.map((tag) => (
              <button
                key={tag}
                onClick={() => setFilterTag(filterTag === tag ? null : tag)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${filterTag === tag ? "bg-primary text-primary-foreground" : "bg-card border border-border text-muted-foreground hover:text-foreground"}`}
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
                {activeCollection ? (
                  <FolderOpen className="h-8 w-8 text-muted-foreground" />
                ) : (
                  <FileText className="h-8 w-8 text-muted-foreground" />
                )}
              </div>
              <div>
                <p className="font-medium text-foreground">
                  {activeCollection ? `No documents in "${activeCollection.name}"` : "No documents yet"}
                </p>
                <p className="text-muted-foreground text-sm mt-1">
                  {activeCollection ? "Move documents here from the library" : "Upload your first document to get started"}
                </p>
              </div>
            </div>
          ) : (
            <div className="pb-6 space-y-6">
              {pinnedDocs.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Pin className="h-3.5 w-3.5 text-primary/70" />
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Pinned</span>
                  </div>
                  <motion.div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <AnimatePresence>{pinnedDocs.map((doc) => <DocCard key={doc.id} doc={doc} />)}</AnimatePresence>
                  </motion.div>
                </div>
              )}
              {unpinnedDocs.length > 0 && (
                <div>
                  {pinnedDocs.length > 0 && (
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">All Documents</span>
                    </div>
                  )}
                  <motion.div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <AnimatePresence>{unpinnedDocs.map((doc) => <DocCard key={doc.id} doc={doc} />)}</AnimatePresence>
                  </motion.div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {showUpload && <UploadModal onClose={() => setShowUpload(false)} />}

      {resolvedReader && (
        <DocumentReader
          doc={resolvedReader}
          onClose={() => setReaderDoc(null)}
          onTool={(type, docId) => setToolState({ type, docId })}
        />
      )}

      {toolState && (
        <ToolResultModal type={toolState.type} docId={toolState.docId} onClose={() => setToolState(null)} />
      )}

      {/* Share modal */}
      <AnimatePresence>
        {shareModalDocId !== null && shareInfo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={(e) => { if (e.target === e.currentTarget) { setShareModalDocId(null); setShareInfo(null); }}}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card border border-border rounded-2xl w-full max-w-md p-6 shadow-2xl"
            >
              <div className="flex items-center gap-2 mb-4">
                <Share2 className="h-5 w-5 text-primary" />
                <h2 className="font-semibold text-foreground">Share Document</h2>
              </div>
              <p className="text-sm text-muted-foreground mb-4">Anyone with this link can view the document — no account required.</p>
              <div className="flex gap-2">
                <input
                  readOnly
                  value={shareInfo.url}
                  className="flex-1 px-3 py-2 bg-muted border border-border rounded-lg text-xs text-foreground font-mono"
                />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(shareInfo.url);
                    toast({ title: "Link copied!" });
                  }}
                  className="px-3 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90"
                >
                  <Copy className="h-4 w-4" />
                </button>
              </div>
              <div className="flex justify-between mt-4">
                <button
                  onClick={async () => {
                    await fetch(`${BASE}/api/documents/${shareModalDocId}/share`, { method: "DELETE" });
                    setShareModalDocId(null);
                    setShareInfo(null);
                    toast({ title: "Share link revoked" });
                  }}
                  className="text-xs text-destructive hover:underline"
                >
                  Revoke link
                </button>
                <button
                  onClick={() => { setShareModalDocId(null); setShareInfo(null); }}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AppLayout>
  );
}
