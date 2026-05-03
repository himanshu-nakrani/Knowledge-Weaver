import { useState, useEffect, useRef } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useListDocuments } from "@workspace/api-client-react";
import { Network, Search, Loader2, RefreshCw, Info, ChevronDown, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface Entity {
  name: string;
  type: string;
  mentions: number;
}

interface GraphResult {
  mermaid: string;
  entities: Entity[];
  documentCount: number;
  documentTitles: string[];
}

const entityTypeColors: Record<string, string> = {
  person: "bg-blue-400/10 text-blue-400 border-blue-400/20",
  concept: "bg-purple-400/10 text-purple-400 border-purple-400/20",
  technology: "bg-green-400/10 text-green-400 border-green-400/20",
  organization: "bg-orange-400/10 text-orange-400 border-orange-400/20",
  place: "bg-cyan-400/10 text-cyan-400 border-cyan-400/20",
  event: "bg-yellow-400/10 text-yellow-400 border-yellow-400/20",
};

function MermaidDiagram({ chart }: { chart: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>("");
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function render() {
      try {
        const mermaid = (await import("mermaid")).default;
        mermaid.initialize({
          startOnLoad: false,
          theme: "dark",
          themeVariables: {
            primaryColor: "#6366f1",
            primaryTextColor: "#e2e8f0",
            primaryBorderColor: "#6366f1",
            lineColor: "#475569",
            secondaryColor: "#1e293b",
            tertiaryColor: "#0f172a",
            background: "#0f172a",
            nodeBorder: "#6366f1",
            clusterBkg: "#1e293b",
            titleColor: "#e2e8f0",
            edgeLabelBackground: "#1e293b",
          },
        });
        const id = `kg-${Date.now()}`;
        const { svg: rendered } = await mermaid.render(id, chart);
        if (!cancelled) setSvg(rendered);
      } catch {
        if (!cancelled) setError(true);
      }
    }
    render();
    return () => { cancelled = true; };
  }, [chart]);

  if (error) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
        <p>Could not render diagram. The graph may be too complex.</p>
      </div>
    );
  }

  if (!svg) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div
      ref={ref}
      className="w-full overflow-auto"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

export default function KnowledgeGraph() {
  const { data: docs = [] } = useListDocuments();
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<GraphResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"graph" | "entities">("graph");
  const [showDocPicker, setShowDocPicker] = useState(false);

  const toggleDoc = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelectedIds(new Set(docs.map((d) => d.id)));
  const clearAll = () => setSelectedIds(new Set());

  const build = async () => {
    if (selectedIds.size === 0) {
      setError("Select at least one document");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const resp = await fetch(`${BASE}/api/knowledge-graph`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentIds: Array.from(selectedIds),
          query: query.trim() || undefined,
        }),
      });
      if (!resp.ok) throw new Error((await resp.json()).error ?? "Failed");
      const data = await resp.json() as GraphResult;
      setResult(data);
      setActiveTab("graph");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setError(msg);
      toast({ title: "Graph extraction failed", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout>
      <div className="h-full flex flex-col overflow-hidden">
        <div className="px-6 py-4 border-b border-border shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Network className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-foreground">Knowledge Graph</h1>
                <p className="text-xs text-muted-foreground">Extract entities and relationships from your documents</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Controls Panel */}
          <div className="w-72 border-r border-border flex flex-col overflow-hidden shrink-0" style={{ background: "hsl(220 15% 6%)" }}>
            <div className="p-4 space-y-4 flex-1 overflow-y-auto">
              {/* Focus query */}
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">Focus query (optional)</label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="e.g. machine learning"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && build()}
                    className="w-full pl-8 pr-3 py-1.5 bg-card border border-border rounded-lg text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                  />
                </div>
              </div>

              {/* Document picker */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Documents ({selectedIds.size} selected)</label>
                  <div className="flex gap-1">
                    <button onClick={selectAll} className="text-[10px] text-primary hover:underline">All</button>
                    <span className="text-muted-foreground text-[10px]">/</span>
                    <button onClick={clearAll} className="text-[10px] text-muted-foreground hover:text-foreground">None</button>
                  </div>
                </div>
                <div className="space-y-1 max-h-60 overflow-y-auto">
                  {docs.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4">No documents yet</p>
                  ) : (
                    docs.map((doc) => (
                      <button
                        key={doc.id}
                        onClick={() => toggleDoc(doc.id)}
                        className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left transition-colors ${
                          selectedIds.has(doc.id)
                            ? "bg-primary/10 border border-primary/30 text-foreground"
                            : "hover:bg-accent/50 text-muted-foreground border border-transparent"
                        }`}
                      >
                        <div className={`w-3.5 h-3.5 rounded border shrink-0 flex items-center justify-center ${selectedIds.has(doc.id) ? "bg-primary border-primary" : "border-border"}`}>
                          {selectedIds.has(doc.id) && <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 10 10"><path d="M2 5l2.5 2.5 3.5-4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round"/></svg>}
                        </div>
                        <span className="text-xs truncate flex-1">{doc.title}</span>
                      </button>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-border">
              <button
                onClick={build}
                disabled={loading || selectedIds.size === 0}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Network className="h-4 w-4" />}
                {loading ? "Extracting..." : "Build Graph"}
              </button>
              {error && <p className="text-xs text-destructive mt-2 text-center">{error}</p>}
            </div>
          </div>

          {/* Graph Area */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {!result ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center p-8">
                <div className="w-20 h-20 rounded-2xl bg-primary/5 border border-primary/10 flex items-center justify-center">
                  <Network className="h-10 w-10 text-primary/40" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-foreground mb-1">No graph yet</h2>
                  <p className="text-sm text-muted-foreground max-w-xs">
                    Select documents from the left panel and click "Build Graph" to extract entities and relationships.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Tabs */}
                <div className="flex items-center justify-between px-4 py-2 border-b border-border shrink-0">
                  <div className="flex items-center gap-1">
                    {(["graph", "entities"] as const).map((tab) => (
                      <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors capitalize ${
                          activeTab === tab ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {tab}
                        {tab === "entities" && result.entities.length > 0 && (
                          <span className="ml-1.5 text-[10px] bg-primary/20 text-primary px-1 rounded">{result.entities.length}</span>
                        )}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Info className="h-3.5 w-3.5" />
                    <span>{result.documentCount} doc{result.documentCount !== 1 ? "s" : ""}: {result.documentTitles.slice(0, 2).join(", ")}{result.documentTitles.length > 2 ? ` +${result.documentTitles.length - 2}` : ""}</span>
                    <button onClick={build} title="Rebuild" className="p-1 hover:text-foreground transition-colors">
                      <RefreshCw className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-auto p-4">
                  {activeTab === "graph" && (
                    <div className="bg-card border border-border rounded-xl p-4 min-h-64">
                      <MermaidDiagram chart={result.mermaid} />
                    </div>
                  )}
                  {activeTab === "entities" && (
                    <div className="space-y-2">
                      {result.entities.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-8">No entities extracted</p>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                          {result.entities
                            .sort((a, b) => b.mentions - a.mentions)
                            .map((entity, i) => (
                              <div key={i} className="flex items-center gap-3 p-3 bg-card border border-border rounded-lg">
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-foreground truncate">{entity.name}</p>
                                  <p className="text-xs text-muted-foreground">{entity.mentions} mention{entity.mentions !== 1 ? "s" : ""}</p>
                                </div>
                                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${entityTypeColors[entity.type] ?? "bg-muted text-muted-foreground border-border"}`}>
                                  {entity.type}
                                </span>
                              </div>
                            ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
