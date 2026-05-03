import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { BarChart2, FileText, MessageSquare, BookOpen, Flame, TrendingUp, Activity, Calendar, Zap, Globe, Github, File, RefreshCw, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface LearningStats {
  totalDocuments: number;
  typeBreakdown: Record<string, number>;
  recentDocsByType: Record<string, number>;
  totalChatSessions: number;
  totalMessages: number;
  totalFlashcardDecks: number;
  totalCards: number;
  maxStreak: number;
  reviewedDecks: number;
  dailyDocs: { day: string; count: number }[];
  recentActivity: { id: number; type: string; description: string; createdAt: string }[];
}

interface QueryStats {
  total: number;
  totalAllTime: number;
  topQueries: { query: string; count: number }[];
  recentQueries: { query: string; ts: string }[];
}

const TYPE_COLORS: Record<string, string> = {
  pdf: "#f97316",
  markdown: "#3b82f6",
  text: "#10b981",
  github: "#a855f7",
  url: "#06b6d4",
};

const TYPE_ICONS: Record<string, React.ReactNode> = {
  pdf: <File className="h-3 w-3" />,
  markdown: <FileText className="h-3 w-3" />,
  text: <FileText className="h-3 w-3" />,
  github: <Github className="h-3 w-3" />,
  url: <Globe className="h-3 w-3" />,
};

function StatCard({ label, value, sub, icon, color }: {
  label: string; value: string | number; sub?: string; icon: React.ReactNode; color?: string;
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      className="bg-card border border-border rounded-xl p-4 flex items-start gap-3">
      <div className="p-2 rounded-lg shrink-0" style={{ background: `${color ?? "hsl(var(--primary))"}20` }}>
        <div style={{ color: color ?? "hsl(var(--primary))" }}>{icon}</div>
      </div>
      <div className="min-w-0">
        <div className="text-2xl font-bold text-foreground tabular-nums">{value}</div>
        <div className="text-xs font-medium text-foreground/70 mt-0.5">{label}</div>
        {sub && <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>}
      </div>
    </motion.div>
  );
}

function MiniBarChart({ data, maxVal, color }: { data: number[]; maxVal: number; color: string }) {
  return (
    <div className="flex items-end gap-0.5 h-12">
      {data.map((v, i) => (
        <div key={i} className="flex-1 rounded-sm transition-all" style={{
          height: `${maxVal > 0 ? Math.max(2, (v / maxVal) * 100) : 2}%`,
          backgroundColor: v > 0 ? color : "hsl(var(--border))",
          opacity: v > 0 ? 1 : 0.4,
        }} title={`${v}`} />
      ))}
    </div>
  );
}

export default function Analytics() {
  const [stats, setStats] = useState<LearningStats | null>(null);
  const [queryStats, setQueryStats] = useState<QueryStats | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [lr, qr] = await Promise.all([
        fetch(`${BASE}/api/stats/learning`).then((r) => r.json()),
        fetch(`${BASE}/api/stats/queries`).then((r) => r.json()),
      ]);
      setStats(lr as LearningStats);
      setQueryStats(qr as QueryStats);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  // Build 30-day chart data
  const chartData = (() => {
    if (!stats) return { days: [] as string[], counts: [] as number[], max: 0 };
    const map = new Map(stats.dailyDocs.map((d) => [d.day, d.count]));
    const days: string[] = [];
    const counts: number[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      days.push(key);
      counts.push(map.get(key) ?? 0);
    }
    return { days, counts, max: Math.max(...counts, 1) };
  })();

  const typeEntries = Object.entries(stats?.typeBreakdown ?? {}).sort((a, b) => b[1] - a[1]);
  const totalTypes = typeEntries.reduce((sum, [, c]) => sum + c, 0);

  return (
    <AppLayout>
      <div className="h-full flex flex-col p-6 overflow-y-auto">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Analytics</h1>
            <p className="text-muted-foreground text-sm mt-0.5">Your learning dashboard</p>
          </div>
          <button
            onClick={load}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-card border border-border rounded-lg text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-24 bg-card border border-border rounded-xl animate-pulse" />
            ))}
          </div>
        ) : stats ? (
          <>
            {/* Stat cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              <StatCard label="Total Documents" value={stats.totalDocuments} icon={<FileText className="h-4 w-4" />} sub={`${Object.values(stats.recentDocsByType).reduce((s, c) => s + c, 0)} added this month`} />
              <StatCard label="Chat Sessions" value={stats.totalChatSessions} icon={<MessageSquare className="h-4 w-4" />} sub={`${stats.totalMessages} messages total`} />
              <StatCard label="Flashcard Decks" value={stats.totalFlashcardDecks} icon={<BookOpen className="h-4 w-4" />} sub={`${stats.totalCards} cards · ${stats.reviewedDecks} reviewed`} color="#3b82f6" />
              <StatCard label="Best Streak" value={`${stats.maxStreak} 🔥`} icon={<Flame className="h-4 w-4" />} sub="consecutive correct answers" color="#f97316" />
              <StatCard label="Queries (7d)" value={queryStats?.total ?? 0} icon={<Zap className="h-4 w-4" />} sub={`${queryStats?.totalAllTime ?? 0} all time`} color="#10b981" />
              <StatCard label="Activities" value={stats.recentActivity.length} icon={<Activity className="h-4 w-4" />} sub="recent events tracked" color="#8b5cf6" />
              <StatCard label="Total Queries" value={queryStats?.totalAllTime ?? 0} icon={<TrendingUp className="h-4 w-4" />} sub="across chat + agent" color="#ec4899" />
              <StatCard label="Calendar" value={`${chartData.counts.filter((c) => c > 0).length} / 30`} icon={<Calendar className="h-4 w-4" />} sub="active days this month" color="#06b6d4" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
              {/* Daily docs chart */}
              <div className="lg:col-span-2 bg-card border border-border rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-foreground">Documents added (30 days)</h3>
                  <span className="text-xs text-muted-foreground">{chartData.counts.reduce((s, c) => s + c, 0)} total</span>
                </div>
                <MiniBarChart data={chartData.counts} maxVal={chartData.max} color="hsl(var(--primary))" />
                <div className="flex justify-between mt-1">
                  <span className="text-[10px] text-muted-foreground">{chartData.days[0]?.slice(5)}</span>
                  <span className="text-[10px] text-muted-foreground">{chartData.days[chartData.days.length - 1]?.slice(5)}</span>
                </div>
              </div>

              {/* Type breakdown */}
              <div className="bg-card border border-border rounded-xl p-5">
                <h3 className="text-sm font-semibold text-foreground mb-3">Document types</h3>
                <div className="space-y-2.5">
                  {typeEntries.map(([type, count]) => (
                    <div key={type} className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5 w-24 shrink-0">
                        <div style={{ color: TYPE_COLORS[type] ?? "#666" }}>{TYPE_ICONS[type] ?? <FileText className="h-3 w-3" />}</div>
                        <span className="text-xs text-foreground capitalize">{type}</span>
                      </div>
                      <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{
                            width: `${totalTypes > 0 ? (count / totalTypes) * 100 : 0}%`,
                            backgroundColor: TYPE_COLORS[type] ?? "hsl(var(--primary))",
                          }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground w-6 text-right shrink-0">{count}</span>
                    </div>
                  ))}
                  {typeEntries.length === 0 && (
                    <p className="text-xs text-muted-foreground">No documents yet</p>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Top queries */}
              <div className="bg-card border border-border rounded-xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold text-foreground">Top queries (7 days)</h3>
                </div>
                {queryStats && queryStats.topQueries.length > 0 ? (
                  <div className="space-y-1.5">
                    {queryStats.topQueries.slice(0, 10).map((q, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className="text-[10px] text-muted-foreground w-4 text-right shrink-0">{i + 1}</span>
                        <div className="flex-1 bg-muted/50 rounded h-6 overflow-hidden relative">
                          <div
                            className="absolute left-0 top-0 h-full bg-primary/15 rounded"
                            style={{ width: `${Math.round((q.count / queryStats.topQueries[0].count) * 100)}%` }}
                          />
                          <span className="relative text-xs text-foreground px-2 leading-6 truncate block">{q.query}</span>
                        </div>
                        <span className="text-[10px] text-muted-foreground shrink-0">{q.count}×</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground py-4 text-center">No queries tracked yet</p>
                )}
              </div>

              {/* Activity feed */}
              <div className="bg-card border border-border rounded-xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Activity className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold text-foreground">Recent activity</h3>
                </div>
                {stats.recentActivity.length > 0 ? (
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {stats.recentActivity.map((a) => (
                      <div key={a.id} className="flex items-start gap-2.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary/60 mt-1.5 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-foreground/80 leading-tight truncate">{a.description}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            {new Date(a.createdAt).toLocaleDateString()} {new Date(a.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground py-4 text-center">No activity yet</p>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            <p className="text-sm">Failed to load analytics. Try refreshing.</p>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
