import { useState, useRef, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { DocumentSidebar } from "@/components/DocumentSidebar";
import { ChatArea } from "@/components/ChatArea";
import { useListChatSessions, useCreateChatSession, useGetChatSession } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { getListChatSessionsQueryKey } from "@workspace/api-client-react";

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
        <div className="flex-1 flex flex-col overflow-hidden">
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
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
              >
                Start a session
              </button>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
