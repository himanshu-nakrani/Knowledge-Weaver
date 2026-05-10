import { useEffect, useState, useCallback } from "react";
import { useLocation } from "wouter";
import { useListDocuments, useListChatSessions, useCreateChatSession, getListChatSessionsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Brain, FileText, MessageSquare, Plus, Settings, ActivitySquare, BookOpen, File, Github, Globe, StickyNote, Trash, Network, Bot, Sun, Moon } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";

const typeIcons: Record<string, React.ReactNode> = {
  pdf: <File className="h-4 w-4 text-orange-400" />,
  markdown: <FileText className="h-4 w-4 text-blue-400" />,
  text: <FileText className="h-4 w-4 text-green-400" />,
  github: <Github className="h-4 w-4 text-purple-400" />,
  url: <Globe className="h-4 w-4 text-cyan-400" />,
};

interface CommandPaletteProps {
  onSelectSession?: (id: number) => void;
  onQuickNote?: () => void;
}

export function CommandPalette({ onSelectSession, onQuickNote }: CommandPaletteProps) {
  const [open, setOpen] = useState(false);
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const { theme, toggle: toggleTheme } = useTheme();

  const { data: docsData = [] } = useListDocuments();
  const { data: sessionsData = [] } = useListChatSessions();
  const createSession = useCreateChatSession();
  const docs = Array.isArray(docsData) ? docsData : [];
  const sessions = Array.isArray(sessionsData) ? sessionsData : [];

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  const run = useCallback((fn: () => void) => {
    setOpen(false);
    setTimeout(fn, 80);
  }, []);

  const handleNewSession = async () => {
    run(async () => {
      const session = await createSession.mutateAsync({
        data: { title: `Session ${new Date().toLocaleTimeString()}` },
      });
      queryClient.invalidateQueries({ queryKey: getListChatSessionsQueryKey() });
      navigate("/workspace");
      onSelectSession?.(session.id);
    });
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search documents, sessions, navigate..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        {/* Quick actions */}
        <CommandGroup heading="Actions">
          <CommandItem onSelect={() => run(() => { navigate("/workspace"); handleNewSession(); })}>
            <Plus className="h-4 w-4 mr-2 text-primary" />
            New chat session
          </CommandItem>
          <CommandItem onSelect={() => run(() => onQuickNote?.())}>
            <StickyNote className="h-4 w-4 mr-2 text-amber-400" />
            Quick note <span className="ml-auto text-xs text-muted-foreground font-mono">⌘N</span>
          </CommandItem>
          <CommandItem onSelect={() => run(() => navigate("/documents"))}>
            <Plus className="h-4 w-4 mr-2 text-green-400" />
            Upload document
          </CommandItem>
          <CommandItem onSelect={() => run(() => toggleTheme())}>
            {theme === "dark" ? <Sun className="h-4 w-4 mr-2 text-yellow-400" /> : <Moon className="h-4 w-4 mr-2 text-blue-400" />}
            Toggle {theme === "dark" ? "light" : "dark"} mode
            <span className="ml-auto text-xs text-muted-foreground font-mono">⌘\</span>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        {/* Navigation */}
        <CommandGroup heading="Navigate">
          {[
            { label: "Workspace", href: "/workspace", icon: Brain, shortcut: "⌘/" },
            { label: "Document Library", href: "/documents", icon: FileText },
            { label: "Flashcard Decks", href: "/flashcards", icon: BookOpen },
            { label: "Knowledge Graph", href: "/knowledge-graph", icon: Network, shortcut: "⌘G" },
            { label: "AI Agent", href: "/agent", icon: Bot, shortcut: "⌘A" },
            { label: "Evaluation", href: "/eval", icon: ActivitySquare },
            { label: "Settings", href: "/settings", icon: Settings },
            { label: "Trash", href: "/trash", icon: Trash },
          ].map(({ label, href, icon: Icon, shortcut }) => (
            <CommandItem key={href} onSelect={() => run(() => navigate(href))}>
              <Icon className="h-4 w-4 mr-2 text-muted-foreground" />
              <span className="flex-1">{label}</span>
              {shortcut && <span className="ml-auto text-xs text-muted-foreground">{shortcut}</span>}
            </CommandItem>
          ))}
        </CommandGroup>

        {sessions.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Recent Sessions">
              {sessions.slice(0, 5).map((s) => (
                <CommandItem
                  key={s.id}
                  onSelect={() =>
                    run(() => {
                      navigate("/workspace");
                      onSelectSession?.(s.id);
                    })
                  }
                >
                  <MessageSquare className="h-4 w-4 mr-2 text-muted-foreground" />
                  <span className="flex-1 truncate">{s.title}</span>
                  <span className="text-xs text-muted-foreground ml-2">{s.messageCount} msgs</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {docs.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Documents">
              {docs.slice(0, 8).map((doc) => (
                <CommandItem
                  key={doc.id}
                  onSelect={() => run(() => navigate("/documents"))}
                >
                  {typeIcons[doc.type] ?? <FileText className="h-4 w-4 mr-2" />}
                  <span className="ml-2 flex-1 truncate">{doc.title}</span>
                  <span className="text-xs text-muted-foreground ml-2">{doc.chunkCount} chunks</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
