import { AppLayout } from "@/components/layout/AppLayout";
import { useGetRetrievedChunks, useGetStatsOverview } from "@workspace/api-client-react";
import { Activity, BarChart3, Globe, Shield, Database } from "lucide-react";

export default function Eval() {
  const { data: eval_ } = useGetRetrievedChunks();
  const { data: stats } = useGetStatsOverview();

  const chunks = eval_?.retrievedChunks ?? [];
  const maxScore = chunks.length > 0 ? Math.max(...chunks.map((c) => c.score ?? 0)) : 1;

  return (
    <AppLayout>
      <div className="h-full flex flex-col p-6 overflow-y-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">Evaluation Panel</h1>
          <p className="text-muted-foreground text-sm mt-0.5">RAG pipeline transparency and quality metrics</p>
        </div>

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
              <p className="text-2xl font-bold text-foreground">{value}</p>
            </div>
          ))}
        </div>

        {eval_?.query ? (
          <>
            <div className="bg-card border border-border rounded-xl p-4 mb-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold text-foreground text-sm">Last Query</h2>
                <div className="flex items-center gap-2">
                  {eval_.usedWebSearch && (
                    <span className="flex items-center gap-1 px-2 py-0.5 bg-blue-400/10 text-blue-400 text-xs rounded-full border border-blue-400/20">
                      <Globe className="h-3 w-3" />
                      Web search used
                    </span>
                  )}
                  {eval_.faithfulnessScore != null && (
                    <span className={`px-2 py-0.5 text-xs rounded-full border font-medium ${
                      eval_.faithfulnessScore > 0.7
                        ? "bg-green-400/10 text-green-400 border-green-400/20"
                        : eval_.faithfulnessScore > 0.4
                        ? "bg-yellow-400/10 text-yellow-400 border-yellow-400/20"
                        : "bg-red-400/10 text-red-400 border-red-400/20"
                    }`}>
                      Faithfulness: {(eval_.faithfulnessScore * 100).toFixed(0)}%
                    </span>
                  )}
                </div>
              </div>
              <p className="text-foreground text-sm italic">"{eval_.query}"</p>
            </div>

            {eval_.faithfulnessScore != null && (
              <div className="bg-card border border-border rounded-xl p-4 mb-4">
                <h2 className="font-semibold text-foreground text-sm mb-3">Faithfulness Score</h2>
                <div className="relative h-3 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${
                      eval_.faithfulnessScore > 0.7 ? "bg-green-400" :
                      eval_.faithfulnessScore > 0.4 ? "bg-yellow-400" : "bg-red-400"
                    }`}
                    style={{ width: `${eval_.faithfulnessScore * 100}%` }}
                  />
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-xs text-muted-foreground">0%</span>
                  <span className="text-xs text-muted-foreground">100%</span>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Score reflects how well the AI response is grounded in retrieved document chunks.
                </p>
              </div>
            )}

            <div className="bg-card border border-border rounded-xl p-4">
              <h2 className="font-semibold text-foreground text-sm mb-3">
                Retrieved Chunks ({chunks.length})
              </h2>
              {chunks.length === 0 ? (
                <p className="text-muted-foreground text-sm">No chunks retrieved for this query.</p>
              ) : (
                <div className="space-y-3">
                  {chunks.map((chunk, i) => (
                    <div key={chunk.id} className="border border-border rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-primary">Chunk {i + 1} · Index {chunk.chunkIndex}</span>
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary rounded-full"
                              style={{ width: `${((chunk.score ?? 0) / (maxScore || 1)) * 100}%` }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {((chunk.score ?? 0) * 100).toFixed(0)}%
                          </span>
                        </div>
                      </div>
                      <p className="text-sm text-foreground/80 leading-relaxed line-clamp-4">{chunk.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center gap-4 mt-12">
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
