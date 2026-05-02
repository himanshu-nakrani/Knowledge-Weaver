import { useState, useRef, useEffect, useCallback } from "react";
import { useGetChatSession, useListDocuments } from "@workspace/api-client-react";
import { getGetChatSessionQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Send, Globe, ChevronDown, ChevronRight, Zap, List, BookOpen, GitBranch, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { ToolResultModal } from "./ToolResultModal";

interface ChatAreaProps {
  sessionId: number;
}

interface Source {
  documentId: number;
  documentTitle: string;
  chunkContent: string;
  score: number;
}

interface StreamingMessage {
  id: "streaming";
  role: "assistant";
  content: string;
  sources: Source[];
  faithfulnessScore: number | null;
  usedWebSearch: boolean;
}

type ToolType = "summarize" | "actions" | "flashcards" | "mindmap";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export function ChatArea({ sessionId }: ChatAreaProps) {
  const [input, setInput] = useState("");
  const [expandedSources, setExpandedSources] = useState<Set<number | "streaming">>(new Set());
  const [toolModal, setToolModal] = useState<{ type: ToolType; docId: number } | null>(null);
  const [streaming, setStreaming] = useState<StreamingMessage | null>(null);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const queryClient = useQueryClient();

  const { data: session, isLoading } = useGetChatSession(sessionId, {
    query: { queryKey: getGetChatSessionQueryKey(sessionId), refetchInterval: false },
  });
  const { data: docs = [] } = useListDocuments();

  const messages = session?.messages ?? [];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streaming?.content]);

  const handleSend = useCallback(async () => {
    if (!input.trim() || isSending) return;
    const content = input.trim();
    setInput("");
    setIsSending(true);

    // Optimistically show user msg
    await queryClient.invalidateQueries({ queryKey: getGetChatSessionQueryKey(sessionId) });

    const abort = new AbortController();
    abortRef.current = abort;

    const streamMsg: StreamingMessage = {
      id: "streaming",
      role: "assistant",
      content: "",
      sources: [],
      faithfulnessScore: null,
      usedWebSearch: false,
    };
    setStreaming(streamMsg);

    try {
      const url = `${BASE}/api/chat/sessions/${sessionId}/stream?content=${encodeURIComponent(content)}`;
      const response = await fetch(url, { signal: abort.signal });

      if (!response.ok || !response.body) throw new Error("Stream failed");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });

        const lines = buf.split("\n");
        buf = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const evt = JSON.parse(line.slice(6)) as {
              type: string;
              content?: string;
              sources?: Source[];
              faithfulnessScore?: number;
              usedWebSearch?: boolean;
              message?: { id: number };
            };

            if (evt.type === "meta") {
              setStreaming((prev) =>
                prev
                  ? {
                      ...prev,
                      sources: evt.sources ?? [],
                      faithfulnessScore: evt.faithfulnessScore ?? null,
                      usedWebSearch: evt.usedWebSearch ?? false,
                    }
                  : prev
              );
            } else if (evt.type === "token") {
              setStreaming((prev) =>
                prev ? { ...prev, content: prev.content + (evt.content ?? "") } : prev
              );
            } else if (evt.type === "done") {
              setStreaming(null);
              queryClient.invalidateQueries({ queryKey: getGetChatSessionQueryKey(sessionId) });
            } else if (evt.type === "error") {
              setStreaming(null);
            }
          } catch {
          }
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== "AbortError") {
        setStreaming(null);
        queryClient.invalidateQueries({ queryKey: getGetChatSessionQueryKey(sessionId) });
      }
    } finally {
      setIsSending(false);
      setStreaming(null);
    }
  }, [input, isSending, sessionId, queryClient]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const toggleSources = (msgId: number | "streaming") => {
    setExpandedSources((prev) => {
      const next = new Set(prev);
      if (next.has(msgId)) next.delete(msgId);
      else next.add(msgId);
      return next;
    });
  };

  const activeDocId = docs[0]?.id;

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const renderMeta = (
    msgId: number | "streaming",
    role: string,
    usedWebSearch: boolean,
    faithfulnessScore: number | null,
    sources: Source[]
  ) => {
    if (role !== "assistant") return null;
    return (
      <div className="flex flex-wrap items-center gap-2 px-1">
        {usedWebSearch && (
          <span className="flex items-center gap-1 text-xs text-blue-400">
            <Globe className="h-3 w-3" />
            Web search used
          </span>
        )}
        {faithfulnessScore != null && (
          <span
            className={`text-xs px-1.5 py-0.5 rounded ${
              faithfulnessScore > 0.7
                ? "text-green-400 bg-green-400/10"
                : faithfulnessScore > 0.4
                ? "text-yellow-400 bg-yellow-400/10"
                : "text-red-400 bg-red-400/10"
            }`}
          >
            {(faithfulnessScore * 100).toFixed(0)}% faithful
          </span>
        )}
        {sources.length > 0 && (
          <button
            onClick={() => toggleSources(msgId)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {expandedSources.has(msgId) ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
            {sources.length} source{sources.length !== 1 ? "s" : ""}
          </button>
        )}
      </div>
    );
  };

  const renderSources = (msgId: number | "streaming", sources: Source[]) =>
    expandedSources.has(msgId) && sources.length > 0 ? (
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: "auto" }}
        className="space-y-2 w-full max-w-lg"
      >
        {sources.map((src, si) => (
          <div key={si} className="bg-muted/50 border border-border rounded-lg p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-primary">
                [{si + 1}] {src.documentTitle}
              </span>
              <span className="text-xs text-muted-foreground">
                {(src.score * 100).toFixed(0)}%
              </span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
              {src.chunkContent}
            </p>
          </div>
        ))}
      </motion.div>
    ) : null;

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Tool bar */}
      {activeDocId && (
        <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-card/50 flex-wrap">
          <span className="text-xs text-muted-foreground font-medium">Tools:</span>
          {[
            { id: "summarize" as ToolType, label: "Summarize", icon: Zap },
            { id: "actions" as ToolType, label: "Action Items", icon: List },
            { id: "flashcards" as ToolType, label: "Flashcards", icon: BookOpen },
            { id: "mindmap" as ToolType, label: "Mind Map", icon: GitBranch },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setToolModal({ type: id, docId: activeDocId })}
              className="flex items-center gap-1.5 px-2.5 py-1 bg-card border border-border rounded-md text-xs text-muted-foreground hover:text-foreground hover:border-primary/30 transition-all"
            >
              <Icon className="h-3 w-3" />
              {label}
            </button>
          ))}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 && !streaming && !isSending ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
            <div className="w-14 h-14 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Send className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-foreground">Start a conversation</p>
              <p className="text-muted-foreground text-sm mt-1 max-w-xs">
                Ask questions about your knowledge base. The AI will search your documents and cite sources.
              </p>
            </div>
          </div>
        ) : (
          <>
            <AnimatePresence initial={false}>
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] flex flex-col gap-1 ${
                      msg.role === "user" ? "items-end" : "items-start"
                    }`}
                  >
                    <div
                      className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground rounded-tr-sm"
                          : "bg-card border border-border text-foreground rounded-tl-sm"
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    </div>
                    {renderMeta(
                      msg.id,
                      msg.role,
                      msg.usedWebSearch ?? false,
                      msg.faithfulnessScore ?? null,
                      (msg.sources as Source[]) ?? []
                    )}
                    {renderSources(msg.id, (msg.sources as Source[]) ?? [])}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Streaming response */}
            {(isSending || streaming) && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex justify-start"
              >
                <div className="max-w-[80%] flex flex-col gap-1 items-start">
                  <div className="bg-card border border-border rounded-2xl rounded-tl-sm px-4 py-3">
                    {!streaming || streaming.content === "" ? (
                      <div className="flex items-center gap-2">
                        <div className="flex gap-1">
                          {[0, 1, 2].map((i) => (
                            <motion.div
                              key={i}
                              className="w-1.5 h-1.5 bg-primary rounded-full"
                              animate={{ scale: [1, 1.3, 1] }}
                              transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
                            />
                          ))}
                        </div>
                        <span className="text-xs text-muted-foreground">MindForge is thinking...</span>
                      </div>
                    ) : (
                      <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">
                        {streaming.content}
                        <span className="inline-block w-0.5 h-4 bg-primary ml-0.5 animate-pulse align-text-bottom" />
                      </p>
                    )}
                  </div>
                  {streaming &&
                    renderMeta(
                      "streaming",
                      "assistant",
                      streaming.usedWebSearch,
                      streaming.faithfulnessScore,
                      streaming.sources
                    )}
                  {streaming && renderSources("streaming", streaming.sources)}
                </div>
              </motion.div>
            )}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-border bg-card/30">
        <div className="flex items-end gap-2 bg-card border border-border rounded-xl px-3 py-2 focus-within:ring-1 focus-within:ring-primary/50 focus-within:border-primary/50 transition-all">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything about your knowledge base..."
            rows={1}
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none resize-none max-h-32 py-1"
            style={{ minHeight: "24px" }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isSending}
            className="p-1.5 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
          >
            <Send className="h-3.5 w-3.5" />
          </button>
        </div>
        <p className="text-xs text-muted-foreground mt-1.5 text-center">
          Adaptive RAG · streaming · searches docs + web when needed
        </p>
      </div>

      {toolModal && (
        <ToolResultModal
          type={toolModal.type}
          docId={toolModal.docId}
          onClose={() => setToolModal(null)}
        />
      )}
    </div>
  );
}
