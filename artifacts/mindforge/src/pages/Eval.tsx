import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useGetRetrievedChunks, useGetStatsOverview, useGetStatsActivity } from "@workspace/api-client-react";
import { Activity, BarChart3, Globe, Shield, Database, Clock, Search, CheckCircle2 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface HistoryEntry {
  query: string;
  faithfulnessScore: number;
  usedWebSearch: boolean;
  timestamp: string;
  retrievedChunks: Array<{ id: string; score: number }>;
}

const CHART_COLORS: Record<string, string> = {
  pdf: "hsl(30 90% 60%)",
  markdown: "hsl(210 80% 60%)",
  text: "hsl(142 70% 50%)",
  github: "hsl(270 65% 60%)",
  url: "hsl(190 75% 55%)",
};

export default function Eval() {
  const { data: eval_ } = useGetRetrievedChunks();
  const { data: stats } = useGetStatsOverview();
  const { data: activities = [] } = useGetStatsActivity();
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  useEffect(() => {
    fetch(`${BASE}/api/eval/history`)
      .then((r) => r.json())
      .then((data) => setHistory(data as HistoryEntry[]))
      .catch(() => {});
  }, [eval_]);

  const chunks = eval_?.retrievedChunks ?? [];
  const maxScore = chunks.length > 0 ? Math.max(...chunks.map((c) => c.score ?? 0)) : 1;

  const chartData = Object.entries(stats?.documentsByType ?? {}).map(([type, count]) => ({
    name: type,
    count,
    fill: CHART_COLORS[type] ?? "hsl(38 92% 65%)",
  }));

  return (
    <AppLayout>
      <div className="h-full flex flex-col p-6 overflow-y-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">Evaluation Panel</h1>
          <p className="text-muted-foreground text-sm mt-0.5">RAG pipeline transparency and quality metrics</p>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[
            { label: "Documents", value: stats?.totalDocuments ?? 0, icon: Database },
            { label: "Chunks Indexed", value: stats?.totalChunks ?? 0, icon: BarChart3 },
            { label: "Chat Sessions", value: stats?.totalChatSessions ?? 0, icon: Activity },
            { label: "Messages", value: stats?.totalMessages ?? 0, icon: Shield },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Icon className="h-4 w-4 text-primary" />
                <span className="text-xs text-muted-foreground font-medium">{label}</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{value.toLocaleString()}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          {/* Document type breakdown */}
          {chartData.length > 0 && (
            <div className="bg-card border border-border rounded-xl p-4">
              <h2 className="font-semibold text-foreground text-sm mb-4">Documents by Type</h2>
              <ResponsiveContainer width="100%" height={140}>
                <BarChart data={chartData} barCategoryGap="30%">
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} width={28} />
                  <Tooltip
                    contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: 12 }}
                    labelStyle={{ color: "hsl(var(--foreground))" }}
                    cursor={{ fill: "hsl(var(--accent))" }}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {chartData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Faithfulness trend */}
          {history.length > 0 && (
            <div className="bg-card border border-border rounded-xl p-4">
              <h2 className="font-semibold text-foreground text-sm mb-4">Faithfulness Trend (last {history.length})</h2>
              <ResponsiveContainer width="100%" height={140}>
                <BarChart data={[...history].reverse().slice(0, 10).map((h, i) => ({ i: i + 1, score: Math.round(h.faithfulnessScore * 100) }))} barCategoryGap="20%">
                  <XAxis dataKey="i" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} width={32} />
                  <Tooltip
                    formatter={(v) => [`${v}%`, "Faithfulness"]}
                    contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: 12 }}
                    cursor={{ fill: "hsl(var(--accent))" }}
                  />
                  <Bar dataKey="score" radius={[4, 4, 0, 0]}>
                    {[...history].reverse().slice(0, 10).map((h, i) => (
                      <Cell key={i} fill={h.faithfulnessScore > 0.7 ? "hsl(142 70% 50%)" : h.faithfulnessScore > 0.4 ? "hsl(38 92% 65%)" : "hsl(0 70% 55%)"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Last query detail */}
        {eval_?.query && (
          <>
            <div className="bg-card border border-border rounded-xl p-4 mb-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold text-foreground text-sm">Last Query</h2>
                <div className="flex items-center gap-2">
                  {eval_.usedWebSearch && (
                    <span className="flex items-center gap-1 px-2 py-0.5 bg-blue-400/10 text-blue-400 text-xs rounded-full border border-blue-400/20">
                      <Globe className="h-3 w-3" />Web search
                    </span>
                  )}
                  {eval_.faithfulnessScore != null && (
                    <span className={`px-2 py-0.5 text-xs rounded-full border font-medium ${eval_.faithfulnessScore > 0.7 ? "bg-green-400/10 text-green-400 border-green-400/20" : eval_.faithfulnessScore > 0.4 ? "bg-yellow-400/10 text-yellow-400 border-yellow-400/20" : "bg-red-400/10 text-red-400 border-red-400/20"}`}>
                      Faithfulness: {(eval_.faithfulnessScore * 100).toFixed(0)}%
                    </span>
                  )}
                </div>
              </div>
              <p className="text-foreground text-sm italic">"{eval_.query}"</p>
              {eval_.faithfulnessScore != null && (
                <div className="mt-3">
                  <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${eval_.faithfulnessScore > 0.7 ? "bg-green-400" : eval_.faithfulnessScore > 0.4 ? "bg-yellow-400" : "bg-red-400"}`}
                      style={{ width: `${eval_.faithfulnessScore * 100}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {chunks.length > 0 && (
              <div className="bg-card border border-border rounded-xl p-4 mb-4">
                <h2 className="font-semibold text-foreground text-sm mb-3">Retrieved Chunks ({chunks.length})</h2>
                <div className="space-y-3">
                  {chunks.map((chunk, i) => (
                    <div key={chunk.id} className="border border-border rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-primary">Chunk {i + 1} · Index {chunk.chunkIndex}</span>
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-primary rounded-full" style={{ width: `${((chunk.score ?? 0) / (maxScore || 1)) * 100}%` }} />
                          </div>
                          <span className="text-xs text-muted-foreground">{((chunk.score ?? 0) * 100).toFixed(0)}%</span>
                        </div>
                      </div>
                      <p className="text-sm text-foreground/80 leading-relaxed line-clamp-3">{chunk.content}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* Query History */}
        {history.length > 0 && (
          <div className="bg-card border border-border rounded-xl p-4 mb-4">
            <h2 className="font-semibold text-foreground text-sm mb-3 flex items-center gap-2">
              <Search className="h-4 w-4 text-primary" />Query History ({history.length})
            </h2>
            <div className="space-y-2">
              {history.slice(0, 8).map((entry, i) => (
                <div key={i} className="flex items-start gap-3 py-2 border-b border-border last:border-0">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-primary">{i + 1}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground truncate">"{entry.query}"</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className={`text-xs font-medium ${entry.faithfulnessScore > 0.7 ? "text-green-400" : entry.faithfulnessScore > 0.4 ? "text-yellow-400" : "text-red-400"}`}>
                        {(entry.faithfulnessScore * 100).toFixed(0)}% faithful
                      </span>
                      <span className="text-xs text-muted-foreground">{entry.retrievedChunks?.length ?? 0} chunks</span>
                      {entry.usedWebSearch && <span className="text-xs text-blue-400 flex items-center gap-0.5"><Globe className="h-3 w-3" />web</span>}
                      <span className="text-xs text-muted-foreground flex items-center gap-0.5"><Clock className="h-3 w-3" />{new Date(entry.timestamp).toLocaleTimeString()}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Activity Feed */}
        {activities.length > 0 && (
          <div className="bg-card border border-border rounded-xl p-4 mb-4">
            <h2 className="font-semibold text-foreground text-sm mb-3 flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />Recent Activity
            </h2>
            <div className="space-y-2">
              {activities.slice(0, 10).map((act) => (
                <div key={act.id} className="flex items-center gap-3 py-1.5">
                  <CheckCircle2 className="h-4 w-4 text-primary/50 shrink-0" />
                  <span className="text-sm text-foreground flex-1">{act.description}</span>
                  <span className="text-xs text-muted-foreground shrink-0">{new Date(act.createdAt).toLocaleTimeString()}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {!eval_?.query && history.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center text-center gap-4 mt-8">
            <div className="w-16 h-16 rounded-2xl bg-card border border-border flex items-center justify-center">
              <BarChart3 className="h-8 w-8 text-muted-foreground" />
            </div>
            <div>
              <p className="font-medium text-foreground">No evaluation data yet</p>
              <p className="text-muted-foreground text-sm mt-1">Ask a question in the chat to see RAG pipeline metrics here</p>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
