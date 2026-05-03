import { useState, useRef, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Bot, Send, Loader2, CheckCircle2, Circle, ChevronDown, ChevronRight, ExternalLink, AlertCircle, Copy, Check, Trash2, FileText, FlaskConical, Lightbulb, GraduationCap, Target } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const STORAGE_KEY = "mindforge:agent-runs";
const MAX_SAVED_RUNS = 20;

interface AgentStep {
  step: string;
  status: "running" | "done" | "error";
  label: string;
  detail: string;
}

interface Source {
  documentId: number;
  documentTitle: string;
  chunkContent: string;
  score: number;
}

interface AgentRun {
  id: number;
  query: string;
  steps: AgentStep[];
  answer: string | null;
  sources: Source[];
  usedWebSearch: boolean;
  running: boolean;
}

type AgentMode = "researcher" | "brainstorm" | "tutor" | "critic";

const MODES: { id: AgentMode; label: string; icon: React.ReactNode; desc: string; color: string }[] = [
  { id: "researcher", label: "Researcher", icon: <FlaskConical className="h-3.5 w-3.5" />, desc: "Deep evidence-based research with citations", color: "text-blue-400 border-blue-400/30 bg-blue-400/10" },
  { id: "brainstorm", label: "Brainstorm", icon: <Lightbulb className="h-3.5 w-3.5" />, desc: "Creative connections and lateral thinking", color: "text-yellow-400 border-yellow-400/30 bg-yellow-400/10" },
  { id: "tutor", label: "Tutor", icon: <GraduationCap className="h-3.5 w-3.5" />, desc: "Clear explanations with examples and analogies", color: "text-green-400 border-green-400/30 bg-green-400/10" },
  { id: "critic", label: "Critic", icon: <Target className="h-3.5 w-3.5" />, desc: "Skeptical analysis of weaknesses and gaps", color: "text-red-400 border-red-400/30 bg-red-400/10" },
];

const stepIcons: Record<string, string> = {
  plan: "🧭",
  retrieve: "🔍",
  websearch: "🌐",
  reason: "🧠",
  analogy: "💡",
  connections: "🔗",
  critique: "🎯",
  answer: "✍️",
};

function runToMarkdown(run: AgentRun): string {
  return [
    `# Agent Run`,
    `**Query:** ${run.query}`,
    "",
    "## Reasoning Trace",
    "",
    ...run.steps.map((s) => `### ${stepIcons[s.step] ?? "·"} ${s.label}\n\n${s.detail}`),
    "",
    "## Answer",
    "",
    run.answer ?? "(no answer)",
    "",
    ...(run.sources.length > 0
      ? [
          "## Sources",
          "",
          ...run.sources.map((s, i) => `[${i + 1}] **${s.documentTitle}** (score: ${s.score.toFixed(2)})\n> ${s.chunkContent}`),
        ]
      : []),
  ].join("\n");
}

function StepCard({ step, isLast }: { step: AgentStep; isLast: boolean }) {
  const [expanded, setExpanded] = useState(step.status === "done" && (step.step === "answer" || step.step === "reason"));

  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-all ${
          step.status === "running"
            ? "bg-primary/20 border border-primary/40"
            : step.status === "done"
            ? "bg-primary/10 border border-primary/30"
            : "bg-destructive/10 border border-destructive/30"
        }`}>
          {step.status === "running" ? (
            <Loader2 className="h-3 w-3 text-primary animate-spin" />
          ) : step.status === "done" ? (
            <CheckCircle2 className="h-3 w-3 text-primary" />
          ) : (
            <Circle className="h-3 w-3 text-destructive" />
          )}
        </div>
        {!isLast && <div className="w-px flex-1 bg-border mt-1" />}
      </div>

      <div className="flex-1 pb-4">
        <button
          onClick={() => step.detail && setExpanded((e) => !e)}
          className="flex items-center gap-2 w-full text-left"
        >
          <span className="text-sm">{stepIcons[step.step] ?? "·"}</span>
          <span className={`text-sm font-medium ${step.status === "running" ? "text-primary" : "text-foreground"}`}>
            {step.label}
          </span>
          {step.status === "running" && (
            <span className="text-xs text-muted-foreground animate-pulse">thinking...</span>
          )}
          {step.detail && step.status === "done" && (
            <span className="ml-auto text-muted-foreground">
              {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            </span>
          )}
        </button>

        <AnimatePresence>
          {expanded && step.detail && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className={`mt-2 p-3 rounded-lg text-sm leading-relaxed whitespace-pre-wrap border ${
                step.step === "answer"
                  ? "bg-primary/5 border-primary/20 text-foreground"
                  : "bg-card border-border text-muted-foreground"
              }`}>
                {step.detail}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

let runCounter = 0;

function loadSavedRuns(): AgentRun[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export default function Agent() {
  const [input, setInput] = useState("");
  const [mode, setMode] = useState<AgentMode>("researcher");
  const [runs, setRuns] = useState<AgentRun[]>(loadSavedRuns);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [traceCopiedId, setTraceCopiedId] = useState<number | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Persist completed runs to localStorage
  useEffect(() => {
    const completed = runs.filter((r) => !r.running).slice(-MAX_SAVED_RUNS);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(completed));
    } catch {
      // storage full — ignore
    }
  }, [runs]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [runs]);

  const clearHistory = () => {
    setRuns([]);
    localStorage.removeItem(STORAGE_KEY);
    toast({ title: "History cleared" });
  };

  const handleCopyAnswer = (answer: string, runId: number) => {
    navigator.clipboard.writeText(answer);
    setCopiedId(runId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCopyTrace = (run: AgentRun) => {
    navigator.clipboard.writeText(runToMarkdown(run));
    setTraceCopiedId(run.id);
    setTimeout(() => setTraceCopiedId(null), 2000);
    toast({ title: "Full trace copied as Markdown" });
  };

  const runAgent = async () => {
    const q = input.trim();
    if (!q) return;
    setInput("");

    const id = ++runCounter;
    const newRun: AgentRun = { id, query: q, steps: [], answer: null, sources: [], usedWebSearch: false, running: true };
    setRuns((prev) => [...prev, newRun]);

    const updateRun = (updater: (r: AgentRun) => AgentRun) => {
      setRuns((prev) => prev.map((r) => (r.id === id ? updater(r) : r)));
    };

    const url = `${BASE}/api/agent/run?content=${encodeURIComponent(q)}&mode=${mode}`;
    const eventSource = new EventSource(url);

    eventSource.onmessage = (e) => {
      const data = JSON.parse(e.data) as { type: string } & Record<string, unknown>;

      if (data.type === "step") {
        const step: AgentStep = {
          step: data.step as string,
          status: data.status as "running" | "done",
          label: data.label as string,
          detail: data.detail as string,
        };
        updateRun((r) => {
          const existing = r.steps.findIndex((s) => s.step === step.step);
          if (existing >= 0) {
            const steps = [...r.steps];
            steps[existing] = step;
            return { ...r, steps };
          }
          return { ...r, steps: [...r.steps, step] };
        });
      } else if (data.type === "done") {
        updateRun((r) => ({
          ...r,
          running: false,
          answer: data.answer as string,
          sources: (data.sources as Source[]) ?? [],
          usedWebSearch: !!data.usedWebSearch,
        }));
        eventSource.close();
      } else if (data.type === "error") {
        updateRun((r) => ({ ...r, running: false }));
        eventSource.close();
      }
    };

    eventSource.onerror = () => {
      updateRun((r) => ({ ...r, running: false }));
      eventSource.close();
      toast({ title: "Agent failed", description: "Unable to complete reasoning trace", variant: "destructive" });
    };
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      runAgent();
    }
  };

  const activeRun = runs[runs.length - 1];

  return (
    <AppLayout>
      <div className="h-full flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Bot className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-foreground">AI Agent</h1>
                <p className="text-xs text-muted-foreground">Multi-step reasoning with full trace transparency</p>
              </div>
            </div>
            {runs.length > 0 && (
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs text-muted-foreground">{runs.filter((r) => !r.running).length} saved</span>
                <button
                  onClick={clearHistory}
                  title="Clear history"
                  className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 border border-border rounded-lg transition-all"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Clear
                </button>
              </div>
            )}
          </div>
          {/* Mode selector */}
          <div className="flex items-center gap-1.5 mt-3 flex-wrap">
            {MODES.map((m) => (
              <button
                key={m.id}
                onClick={() => setMode(m.id)}
                title={m.desc}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                  mode === m.id ? m.color : "text-muted-foreground border-border hover:border-primary/30 hover:text-foreground"
                }`}
              >
                {m.icon}
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* Runs list */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {runs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
              <div className="w-20 h-20 rounded-2xl bg-primary/5 border border-primary/10 flex items-center justify-center">
                <Bot className="h-10 w-10 text-primary/40" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground mb-1">AI Agent ready</h2>
                <p className="text-sm text-muted-foreground max-w-xs">
                  Ask anything. The agent will plan its approach, retrieve relevant knowledge, reason over evidence, and deliver a comprehensive answer — showing every step.
                </p>
              </div>
              <div className="flex flex-wrap gap-2 justify-center">
                {["What are the key themes in my documents?", "Summarize recent research on AI safety", "Find connections between topics in my knowledge base"].map((ex) => (
                  <button
                    key={ex}
                    onClick={() => setInput(ex)}
                    className="px-3 py-1.5 bg-card border border-border rounded-lg text-xs text-muted-foreground hover:text-foreground hover:border-primary/30 transition-all"
                  >
                    {ex}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            runs.map((run) => (
              <motion.div
                key={run.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                {/* Query */}
                <div className="flex justify-end">
                  <div className="bg-primary/10 border border-primary/20 text-foreground rounded-2xl rounded-tr-sm px-4 py-2.5 max-w-xl text-sm">
                    {run.query}
                  </div>
                </div>

                {/* Steps trace */}
                <div className="bg-card border border-border rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Bot className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium text-foreground">Agent trace</span>
                    {run.running && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground ml-auto" />}
                    {!run.running && run.steps.length > 0 && (
                      <button
                        onClick={() => handleCopyTrace(run)}
                        title="Copy full trace as Markdown"
                        className="ml-auto flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {traceCopiedId === run.id ? <Check className="h-3.5 w-3.5 text-green-400" /> : <FileText className="h-3.5 w-3.5" />}
                        {traceCopiedId === run.id ? "Copied!" : "Export trace"}
                      </button>
                    )}
                  </div>
                  <div className="pl-1">
                    {run.steps.map((step, i) => (
                      <StepCard key={step.step} step={step} isLast={i === run.steps.length - 1} />
                    ))}
                  </div>
                </div>

                {/* Answer + Sources */}
                {run.answer && (
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 bg-primary/5 border border-primary/20 rounded-lg p-3">
                        <p className="text-sm text-foreground leading-relaxed">{run.answer}</p>
                      </div>
                      <button
                        onClick={() => handleCopyAnswer(run.answer!, run.id)}
                        className="p-2 text-muted-foreground hover:text-foreground hover:bg-card rounded transition-colors shrink-0"
                        title="Copy answer"
                      >
                        {copiedId === run.id ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
                      </button>
                    </div>
                    {run.sources.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {run.usedWebSearch && (
                          <span className="flex items-center gap-1 text-xs text-cyan-400 bg-cyan-400/10 border border-cyan-400/20 px-2 py-1 rounded-full">
                            <ExternalLink className="h-3 w-3" /> Web search
                          </span>
                        )}
                        {run.sources.slice(0, 3).map((s, i) => (
                          <span key={i} className="text-xs text-muted-foreground bg-card border border-border px-2 py-1 rounded-full">
                            [{i + 1}] {s.documentTitle}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            ))
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="border-t border-border p-4 shrink-0">
          <div className="flex gap-3 items-end">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask the agent anything... (Enter to send, Shift+Enter for new line)"
              rows={2}
              className="flex-1 px-4 py-3 bg-card border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 resize-none"
            />
            <button
              onClick={runAgent}
              disabled={!input.trim() || activeRun?.running}
              className="p-3 bg-primary text-primary-foreground rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
            >
              {activeRun?.running ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
