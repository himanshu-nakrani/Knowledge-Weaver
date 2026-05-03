import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Key, Brain, Globe, Info, Download, Loader2, Sliders, RotateCcw, BarChart2, TrendingUp, Clock } from "lucide-react";
import { usePreferences, GROQ_MODELS } from "@/hooks/usePreferences";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface QueryStats {
  total: number;
  totalAllTime: number;
  topQueries: { query: string; count: number }[];
  recentQueries: { query: string; ts: string }[];
}

export default function Settings() {
  const [exporting, setExporting] = useState(false);
  const { prefs, setPrefs, resetPrefs } = usePreferences();
  const [queryStats, setQueryStats] = useState<QueryStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  const loadQueryStats = async () => {
    setStatsLoading(true);
    try {
      const res = await fetch(`${BASE}/api/stats/queries`);
      setQueryStats(await res.json() as QueryStats);
    } catch {
      // ignore
    } finally {
      setStatsLoading(false);
    }
  };

  useEffect(() => { loadQueryStats(); }, []);

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await fetch(`${BASE}/api/export`, { credentials: "include" });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `mindforge-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  return (
    <AppLayout>
      <div className="h-full flex flex-col p-6 overflow-y-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">Settings</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Configure your MindForge knowledge base</p>
        </div>

        <div className="space-y-4 max-w-2xl">
          {/* Retrieval Preferences */}
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg"><Sliders className="h-4 w-4 text-primary" /></div>
                <div>
                  <h2 className="font-semibold text-foreground">Retrieval Preferences</h2>
                  <p className="text-muted-foreground text-xs">Tune how documents are searched</p>
                </div>
              </div>
              <button onClick={resetPrefs} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                <RotateCcw className="h-3 w-3" />Reset
              </button>
            </div>
            <div className="space-y-5">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-foreground">Top-K Chunks</label>
                  <span className="text-sm font-bold text-primary tabular-nums">{prefs.retrievalTopK}</span>
                </div>
                <input
                  type="range" min={3} max={15} step={1}
                  value={prefs.retrievalTopK}
                  onChange={(e) => setPrefs({ retrievalTopK: Number(e.target.value) })}
                  className="w-full h-1.5 accent-[hsl(var(--primary))] cursor-pointer"
                />
                <div className="flex justify-between mt-1"><span className="text-xs text-muted-foreground">3 (fast)</span><span className="text-xs text-muted-foreground">15 (thorough)</span></div>
                <p className="text-xs text-muted-foreground mt-1">Number of document chunks retrieved per query. Higher = more context, slightly slower.</p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-foreground">Default Cards per Deck</label>
                  <span className="text-sm font-bold text-primary tabular-nums">{prefs.cardsPerDeck}</span>
                </div>
                <input
                  type="range" min={4} max={20} step={2}
                  value={prefs.cardsPerDeck}
                  onChange={(e) => setPrefs({ cardsPerDeck: Number(e.target.value) })}
                  className="w-full h-1.5 accent-[hsl(var(--primary))] cursor-pointer"
                />
                <div className="flex justify-between mt-1"><span className="text-xs text-muted-foreground">4</span><span className="text-xs text-muted-foreground">20</span></div>
              </div>

              <div className="flex items-center justify-between py-3 border-t border-border">
                <div>
                  <p className="text-sm font-medium text-foreground">Web Search Fallback</p>
                  <p className="text-xs text-muted-foreground">Use Tavily when local knowledge is insufficient</p>
                </div>
                <button
                  onClick={() => setPrefs({ webSearchEnabled: !prefs.webSearchEnabled })}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${prefs.webSearchEnabled ? "bg-primary" : "bg-muted-foreground/30"}`}
                >
                  <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${prefs.webSearchEnabled ? "translate-x-4" : "translate-x-1"}`} />
                </button>
              </div>

              <div className="flex items-center justify-between py-3 border-t border-border">
                <div>
                  <p className="text-sm font-medium text-foreground">Compact View</p>
                  <p className="text-xs text-muted-foreground">Denser layout in the document library</p>
                </div>
                <button
                  onClick={() => setPrefs({ compactView: !prefs.compactView })}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${prefs.compactView ? "bg-primary" : "bg-muted-foreground/30"}`}
                >
                  <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${prefs.compactView ? "translate-x-4" : "translate-x-1"}`} />
                </button>
              </div>
            </div>
          </div>

          {/* LLM Model Selector */}
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-primary/10 rounded-lg"><Brain className="h-4 w-4 text-primary" /></div>
              <div>
                <h2 className="font-semibold text-foreground">LLM Model</h2>
                <p className="text-muted-foreground text-xs">Choose your Groq inference model</p>
              </div>
            </div>
            <div className="space-y-2">
              {GROQ_MODELS.map((model) => (
                <label
                  key={model.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                    prefs.llmModel === model.id
                      ? "bg-primary/8 border-primary/30"
                      : "border-border hover:border-muted-foreground/30 hover:bg-accent/30"
                  }`}
                >
                  <input
                    type="radio"
                    name="llmModel"
                    value={model.id}
                    checked={prefs.llmModel === model.id}
                    onChange={() => setPrefs({ llmModel: model.id })}
                    className="accent-[hsl(var(--primary))]"
                  />
                  <div className="flex-1">
                    <span className="text-sm font-medium text-foreground">{model.label}</span>
                    <p className="text-xs text-muted-foreground font-mono">{model.id}</p>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-medium ${
                    prefs.llmModel === model.id ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
                  }`}>
                    {model.badge}
                  </span>
                </label>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-3">Model preference is saved locally. Requires GROQ_API_KEY to be active.</p>
          </div>

          {/* Query Analytics */}
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg"><BarChart2 className="h-4 w-4 text-primary" /></div>
                <div>
                  <h2 className="font-semibold text-foreground">Query Analytics</h2>
                  <p className="text-muted-foreground text-xs">Search patterns across chat and agent</p>
                </div>
              </div>
              <button
                onClick={loadQueryStats}
                disabled={statsLoading}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                {statsLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <RotateCcw className="h-3 w-3" />}
                Refresh
              </button>
            </div>
            {queryStats ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-muted/40 rounded-lg p-3">
                    <div className="text-xl font-bold text-foreground">{queryStats.total}</div>
                    <div className="text-xs text-muted-foreground">Queries (7 days)</div>
                  </div>
                  <div className="bg-muted/40 rounded-lg p-3">
                    <div className="text-xl font-bold text-foreground">{queryStats.totalAllTime}</div>
                    <div className="text-xs text-muted-foreground">Total tracked</div>
                  </div>
                </div>

                {queryStats.topQueries.length > 0 && (
                  <div>
                    <div className="flex items-center gap-1.5 mb-2">
                      <TrendingUp className="h-3.5 w-3.5 text-primary" />
                      <span className="text-xs font-medium text-foreground">Top queries</span>
                    </div>
                    <div className="space-y-1.5">
                      {queryStats.topQueries.slice(0, 8).map((q, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <span className="text-[10px] text-muted-foreground w-4 text-right shrink-0">{i + 1}</span>
                          <div className="flex-1 bg-muted/50 rounded h-5 overflow-hidden relative">
                            <div
                              className="absolute left-0 top-0 h-full bg-primary/15 rounded"
                              style={{ width: `${Math.round((q.count / queryStats.topQueries[0].count) * 100)}%` }}
                            />
                            <span className="relative text-xs text-foreground px-2 leading-5 truncate block">{q.query}</span>
                          </div>
                          <span className="text-[10px] text-muted-foreground shrink-0">{q.count}×</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {queryStats.recentQueries.length > 0 && (
                  <div>
                    <div className="flex items-center gap-1.5 mb-2">
                      <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-xs font-medium text-foreground">Recent</span>
                    </div>
                    <div className="space-y-1">
                      {queryStats.recentQueries.slice(0, 5).map((q, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs">
                          <span className="text-muted-foreground shrink-0">{new Date(q.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                          <span className="text-foreground/80 truncate">{q.query}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
                {statsLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "No queries tracked yet"}
              </div>
            )}
          </div>

          {/* API Keys */}
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-primary/10 rounded-lg"><Key className="h-4 w-4 text-primary" /></div>
              <div>
                <h2 className="font-semibold text-foreground">API Keys</h2>
                <p className="text-muted-foreground text-xs">Configure your AI provider keys</p>
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Groq API Key</label>
                <div className="flex items-center gap-2">
                  <input type="password" placeholder="gsk_..." disabled className="flex-1 px-3 py-2 bg-muted border border-border rounded-lg text-sm text-muted-foreground placeholder:text-muted-foreground/50 focus:outline-none cursor-not-allowed" />
                  <span className="text-xs text-muted-foreground whitespace-nowrap">Set via env</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Set GROQ_API_KEY in your environment secrets.</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Tavily API Key</label>
                <div className="flex items-center gap-2">
                  <input type="password" placeholder="tvly-..." disabled className="flex-1 px-3 py-2 bg-muted border border-border rounded-lg text-sm text-muted-foreground placeholder:text-muted-foreground/50 focus:outline-none cursor-not-allowed" />
                  <span className="text-xs text-muted-foreground whitespace-nowrap">Set via env</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Set TAVILY_API_KEY for adaptive web search in RAG.</p>
              </div>
            </div>
          </div>

          {/* Data Export */}
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-primary/10 rounded-lg"><Download className="h-4 w-4 text-primary" /></div>
              <div>
                <h2 className="font-semibold text-foreground">Data Export</h2>
                <p className="text-muted-foreground text-xs">Download all your knowledge base data</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-4">Export all documents, chat sessions, and flashcard decks as JSON.</p>
            <button
              onClick={handleExport}
              disabled={exporting}
              className="flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/30 text-primary rounded-lg text-sm font-medium hover:bg-primary/20 transition-colors disabled:opacity-50"
            >
              {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              {exporting ? "Exporting..." : "Export all data"}
            </button>
          </div>

          {/* About */}
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-primary/10 rounded-lg"><Info className="h-4 w-4 text-primary" /></div>
              <h2 className="font-semibold text-foreground">About MindForge</h2>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              MindForge is a personal second brain powered by adaptive RAG. Upload documents, notes, and code — then ask questions across your entire knowledge base with spaced repetition flashcards, knowledge graphs, and an AI reasoning agent.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {["Groq LLaMA 3.3", "BM25 + RAG", "Tavily Search", "Mermaid Graphs", "AI Flashcards", "Spaced Repetition", "Collections", "Document Sharing", "AI Agent", "Auto-tagging"].map((tag) => (
                <span key={tag} className="px-2 py-0.5 bg-secondary text-secondary-foreground text-xs rounded border border-border">{tag}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
