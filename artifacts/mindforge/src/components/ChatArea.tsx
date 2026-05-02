import { useState, useRef, useEffect } from "react";
import { useGetChatSession, useSendMessage, useSummarizeDocument, useExtractActionItems, useGenerateFlashcards, useGenerateMindmap, useListDocuments } from "@workspace/api-client-react";
import { getGetChatSessionQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Send, Globe, ChevronDown, ChevronRight, Zap, List, BookOpen, GitBranch, Loader2, X } from "lucide-react";
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

type ToolType = "summarize" | "actions" | "flashcards" | "mindmap";

export function ChatArea({ sessionId }: ChatAreaProps) {
  const [input, setInput] = useState("");
  const [expandedSources, setExpandedSources] = useState<Set<number>>(new Set());
  const [toolModal, setToolModal] = useState<{ type: ToolType; docId: number } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const { data: session, isLoading } = useGetChatSession(sessionId, {
    query: { queryKey: getGetChatSessionQueryKey(sessionId), refetchInterval: false },
  });
  const sendMessage = useSendMessage();
  const { data: docs = [] } = useListDocuments();

  const messages = session?.messages ?? [];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || sendMessage.isPending) return;
    const content = input.trim();
    setInput("");
    await sendMessage.mutateAsync({ id: sessionId, data: { content } });
    queryClient.invalidateQueries({ queryKey: getGetChatSessionQueryKey(sessionId) });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const toggleSources = (msgId: number) => {
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

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Tool bar */}
      {activeDocId && (
        <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-card/50">
          <span className="text-xs text-muted-foreground font-medium mr-1">Tools:</span>
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
        {messages.length === 0 ? (
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
              {messages.map((msg, idx) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div className={`max-w-[80%] ${msg.role === "user" ? "items-end" : "items-start"} flex flex-col gap-1`}>
                    {/* Message bubble */}
                    <div
                      className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground rounded-tr-sm"
                          : "bg-card border border-border text-foreground rounded-tl-sm"
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    </div>

                    {/* AI message extras */}
                    {msg.role === "assistant" && (
                      <div className="flex flex-wrap items-center gap-2 px-1">
                        {msg.usedWebSearch && (
                          <span className="flex items-center gap-1 text-xs text-blue-400">
                            <Globe className="h-3 w-3" />
                            Web search used
                          </span>
                        )}
                        {msg.faithfulnessScore != null && (
                          <span className={`text-xs px-1.5 py-0.5 rounded ${
                            msg.faithfulnessScore > 0.7 ? "text-green-400 bg-green-400/10" :
                            msg.faithfulnessScore > 0.4 ? "text-yellow-400 bg-yellow-400/10" :
                            "text-red-400 bg-red-400/10"
                          }`}>
                            {(msg.faithfulnessScore * 100).toFixed(0)}% faithful
                          </span>
                        )}
                        {(msg.sources as Source[]).length > 0 && (
                          <button
                            onClick={() => toggleSources(msg.id)}
                            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                          >
                            {expandedSources.has(msg.id) ? (
                              <ChevronDown className="h-3 w-3" />
                            ) : (
                              <ChevronRight className="h-3 w-3" />
                            )}
                            {(msg.sources as Source[]).length} source{(msg.sources as Source[]).length !== 1 ? "s" : ""}
                          </button>
                        )}
                      </div>
                    )}

                    {/* Sources */}
                    {msg.role === "assistant" && expandedSources.has(msg.id) && (msg.sources as Source[]).length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-2 w-full max-w-lg"
                      >
                        {(msg.sources as Source[]).map((src, si) => (
                          <div key={si} className="bg-muted/50 border border-border rounded-lg p-3">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-medium text-primary">[{si + 1}] {src.documentTitle}</span>
                              <span className="text-xs text-muted-foreground">{(src.score * 100).toFixed(0)}%</span>
                            </div>
                            <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{src.chunkContent}</p>
                          </div>
                        ))}
                      </motion.div>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {sendMessage.isPending && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex justify-start"
              >
                <div className="bg-card border border-border rounded-2xl rounded-tl-sm px-4 py-3">
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
            disabled={!input.trim() || sendMessage.isPending}
            className="p-1.5 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
          >
            <Send className="h-3.5 w-3.5" />
          </button>
        </div>
        <p className="text-xs text-muted-foreground mt-1.5 text-center">
          Adaptive RAG — searches your docs + web when needed
        </p>
      </div>

      {/* Tool modal */}
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
