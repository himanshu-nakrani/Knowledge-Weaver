import { useState, useRef, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { DocumentSidebar } from "@/components/DocumentSidebar";
import { ChatArea } from "@/components/ChatArea";
import { useListChatSessions, useCreateChatSession } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { getListChatSessionsQueryKey } from "@workspace/api-client-react";
import { TrendingUp, FileText, File, Github, Globe, ExternalLink, Loader2 } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface Rec { id: number; title: string; type: string; tags: string[]; reason: string }

const typeIcons: Record<string, React.ReactNode> = {
  pdf: <File className="h-3 w-3 text-orange-400" />,
  markdown: <FileText className="h-3 w-3 text-blue-400" />,
  text: <FileText className="h-3 w-3 text-green-400" />,
  github: <Github className="h-3 w-3 text-purple-400" />,
  url: <Globe className="h-3 w-3 text-cyan-400" />,
};

function RecommendationsSidebar() {
  const [recs, setRecs] = useState<Rec[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${BASE}/api/stats/recommendations`)
      .then((r) => r.json())
      .then((data) => setRecs(data as Rec[]))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="w-64 shrink-0 border-l border-border hidden xl:flex flex-col">
        <div className="px-4 py-3 border-b border-border flex items-center gap-2">
          <TrendingUp className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs font-semibold text-foreground">Suggested Reading</span>
        </div>
        <div className="p-3 space-y-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-12 bg-muted/40 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (recs.length === 0) return null;

  return (
    <div className="w-64 shrink-0 border-l border-border hidden xl:flex flex-col">
      <div className="px-4 py-3 border-b border-border flex items-center gap-2">
        <TrendingUp className="h-3.5 w-3.5 text-primary" />
        <span className="text-xs font-semibold text-foreground">Suggested Reading</span>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
        {recs.map((r) => (
          <a
            key={r.id}
            href={`/documents?random=${r.id}`}
            className="flex items-start gap-2 p-2 rounded-lg hover:bg-accent/60 transition-colors group"
          >
            <div className="mt-0.5 shrink-0">{typeIcons[r.type] ?? <FileText className="h-3 w-3 text-muted-foreground" />}</div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-foreground group-hover:text-primary transition-colors leading-tight truncate">{r.title}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{r.reason}</p>
              {r.tags.length > 0 && (
                <div className="flex gap-1 mt-1 flex-wrap">
                  {r.tags.slice(0, 2).map((t) => (
                    <span key={t} className="text-[10px] px-1 py-0.5 bg-primary/10 text-primary rounded">{t}</span>
                  ))}
                </div>
              )}
            </div>
          </a>
        ))}
      </div>
      <div className="border-t border-border px-4 py-2">
        <a href="/analytics" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors">
          <ExternalLink className="h-3 w-3" /> View analytics
        </a>
      </div>
    </div>
  );
}

export default function Home() {
  const [activeSid, setActiveSid] = useState<number | null>(null);
  const queryClient = useQueryClient();

  const { data: sessions = [] } = useListChatSessions();
  const createSession = useCreateChatSession();

  useEffect(() => {
    if (sessions.length > 0 && activeSid === null) {
      setActiveSid(sessions[0].id);
    }
  }, [sessions, activeSid]);

  const handleNewSession = async () => {
    const session = await createSession.mutateAsync({
      data: { title: `Session ${new Date().toLocaleTimeString()}` },
    });
    queryClient.invalidateQueries({ queryKey: getListChatSessionsQueryKey() });
    setActiveSid(session.id);
  };

  return (
    <AppLayout
      sessions={sessions}
      activeSid={activeSid}
      onSelectSession={setActiveSid}
      onNewSession={handleNewSession}
    >
      <div className="flex h-full overflow-hidden">
        <DocumentSidebar />
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          {activeSid ? (
            <ChatArea sessionId={activeSid} />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center gap-6 text-center p-8">
              <div className="w-20 h-20 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                  <path d="M20 4C11.163 4 4 11.163 4 20s7.163 16 16 16 16-7.163 16-16S28.837 4 20 4z" fill="currentColor" fillOpacity=".08"/>
                  <path d="M13 14h14M13 20h10M13 26h7" stroke="hsl(var(--primary))" strokeWidth="2" strokeLinecap="round"/>
                  <circle cx="28" cy="28" r="6" fill="hsl(var(--primary))" fillOpacity=".2"/>
                  <path d="M26 28h4M28 26v4" stroke="hsl(var(--primary))" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-semibold text-foreground mb-2">Your knowledge base is ready</h2>
                <p className="text-muted-foreground max-w-sm text-sm">
                  Upload documents from the sidebar, then start a new session to ask questions about your knowledge base.
                </p>
              </div>
              <button
                onClick={handleNewSession}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:shadow-lg hover:scale-105 transition-all duration-200"
              >
                Start a session
              </button>
            </div>
          )}
        </div>
        <RecommendationsSidebar />
      </div>
    </AppLayout>
  );
}
