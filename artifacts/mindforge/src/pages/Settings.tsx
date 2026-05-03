import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Key, Brain, Globe, Info, Download, Loader2, Sliders, RotateCcw } from "lucide-react";
import { usePreferences } from "@/hooks/usePreferences";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function Settings() {
  const [exporting, setExporting] = useState(false);
  const { prefs, setPrefs, resetPrefs } = usePreferences();

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

          {/* Model config */}
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-primary/10 rounded-lg"><Brain className="h-4 w-4 text-primary" /></div>
              <div>
                <h2 className="font-semibold text-foreground">Model Configuration</h2>
                <p className="text-muted-foreground text-xs">LLM and retrieval settings</p>
              </div>
            </div>
            <div className="space-y-0">
              {[
                { label: "LLM Model", detail: "Chat and generation", badge: "llama-3.3-70b-versatile", color: "bg-primary/10 text-primary" },
                { label: "Provider", detail: "Inference API", badge: "Groq", color: "bg-emerald-400/10 text-emerald-400" },
                { label: "Retrieval Strategy", detail: "Document search method", badge: "BM25 + Adaptive RAG", color: "bg-blue-400/10 text-blue-400" },
                { label: "Query Expansion", detail: "LLM-generated alternatives", badge: "Groq-powered", color: "bg-violet-400/10 text-violet-400" },
                { label: "Web Search", detail: "Fallback for fresh information", badge: "Tavily", color: "bg-cyan-400/10 text-cyan-400" },
              ].map(({ label, detail, badge, color }) => (
                <div key={label} className="flex items-center justify-between py-2.5 border-b border-border last:border-0">
                  <div><p className="text-sm font-medium text-foreground">{label}</p><p className="text-xs text-muted-foreground">{detail}</p></div>
                  <span className={`px-2 py-1 text-xs rounded font-medium font-mono ${color}`}>{badge}</span>
                </div>
              ))}
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
              {["Groq LLaMA 3.3", "BM25 + RAG", "Tavily Search", "Mermaid Graphs", "AI Flashcards", "Spaced Repetition", "Collections", "Document Sharing"].map((tag) => (
                <span key={tag} className="px-2 py-0.5 bg-secondary text-secondary-foreground text-xs rounded border border-border">{tag}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
