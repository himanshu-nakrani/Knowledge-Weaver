import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Key, Brain, Globe, Info, Download, Loader2 } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function Settings() {
  const [exporting, setExporting] = useState(false);

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
          {/* API Keys */}
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Key className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h2 className="font-semibold text-foreground">API Keys</h2>
                <p className="text-muted-foreground text-xs">Configure your AI provider keys</p>
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Groq API Key</label>
                <div className="flex items-center gap-2">
                  <input
                    type="password"
                    placeholder="gsk_..."
                    disabled
                    className="flex-1 px-3 py-2 bg-muted border border-border rounded-lg text-sm text-muted-foreground placeholder:text-muted-foreground/50 focus:outline-none cursor-not-allowed"
                  />
                  <span className="text-xs text-muted-foreground whitespace-nowrap">Set via env</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Set GROQ_API_KEY in your environment secrets for AI responses.</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Tavily API Key</label>
                <div className="flex items-center gap-2">
                  <input
                    type="password"
                    placeholder="tvly-..."
                    disabled
                    className="flex-1 px-3 py-2 bg-muted border border-border rounded-lg text-sm text-muted-foreground placeholder:text-muted-foreground/50 focus:outline-none cursor-not-allowed"
                  />
                  <span className="text-xs text-muted-foreground whitespace-nowrap">Set via env</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Set TAVILY_API_KEY for adaptive web search in RAG.</p>
              </div>
            </div>
          </div>

          {/* Model config */}
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Brain className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h2 className="font-semibold text-foreground">Model Configuration</h2>
                <p className="text-muted-foreground text-xs">LLM and retrieval settings</p>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b border-border">
                <div>
                  <p className="text-sm font-medium text-foreground">LLM Model</p>
                  <p className="text-xs text-muted-foreground">Chat and generation</p>
                </div>
                <span className="px-2 py-1 bg-primary/10 text-primary text-xs rounded font-mono">llama-3.3-70b-versatile</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-border">
                <div>
                  <p className="text-sm font-medium text-foreground">Provider</p>
                  <p className="text-xs text-muted-foreground">Inference API</p>
                </div>
                <span className="px-2 py-1 bg-emerald-400/10 text-emerald-400 text-xs rounded font-medium">Groq</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-border">
                <div>
                  <p className="text-sm font-medium text-foreground">Retrieval Strategy</p>
                  <p className="text-xs text-muted-foreground">Document search method</p>
                </div>
                <span className="px-2 py-1 bg-blue-400/10 text-blue-400 text-xs rounded font-medium">BM25 + Adaptive RAG</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm font-medium text-foreground">Web Search</p>
                  <p className="text-xs text-muted-foreground">Fallback for fresh information</p>
                </div>
                <span className="px-2 py-1 bg-violet-400/10 text-violet-400 text-xs rounded font-medium">Tavily</span>
              </div>
            </div>
          </div>

          {/* Data Export */}
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Download className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h2 className="font-semibold text-foreground">Data Export</h2>
                <p className="text-muted-foreground text-xs">Download all your knowledge base data</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Export all your documents, chat sessions, and flashcard decks as a single JSON file. Useful for backups or migrating to another instance.
            </p>
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
              <div className="p-2 bg-primary/10 rounded-lg">
                <Info className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h2 className="font-semibold text-foreground">About MindForge</h2>
              </div>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              MindForge is a personal second brain powered by adaptive RAG. Upload your documents, notes, and code repositories — then ask questions across your entire knowledge base. The AI agent decides whether to use your personal documents or fetch fresh information from the web.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {["LangChain RAG", "Groq LLaMA 3.3", "BM25 Retrieval", "Tavily Search", "Mermaid Mind Maps", "AI Flashcards"].map((tag) => (
                <span key={tag} className="px-2 py-0.5 bg-secondary text-secondary-foreground text-xs rounded border border-border">{tag}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
