import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import {
  Brain, FileText, Settings, ActivitySquare, Menu,
  MessageSquare, Plus, Trash2, BookOpen, StickyNote,
  LogIn, LogOut, User, Trash, Network, Bot, Sun, Moon, Keyboard,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useDeleteChatSession, getListChatSessionsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { CommandPalette } from "@/components/CommandPalette";
import { QuickNoteModal } from "@/components/QuickNoteModal";
import { ShortcutsModal } from "@/components/ShortcutsModal";
import { useAuth } from "@workspace/replit-auth-web";
import { useTheme } from "@/hooks/useTheme";

interface ChatSession {
  id: number;
  title: string;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
}

interface AppLayoutProps {
  children: React.ReactNode;
  sessions?: ChatSession[];
  activeSid?: number | null;
  onSelectSession?: (id: number) => void;
  onNewSession?: () => void;
}

const navItems = [
  { href: "/", icon: Brain, label: "Workspace" },
  { href: "/documents", icon: FileText, label: "Library" },
  { href: "/flashcards", icon: BookOpen, label: "Flashcards" },
  { href: "/knowledge-graph", icon: Network, label: "Knowledge Graph" },
  { href: "/agent", icon: Bot, label: "AI Agent" },
  { href: "/eval", icon: ActivitySquare, label: "Evaluation" },
  { href: "/settings", icon: Settings, label: "Settings" },
];

export function AppLayout({ children, sessions, activeSid, onSelectSession, onNewSession }: AppLayoutProps) {
  const [location] = useLocation();
  const queryClient = useQueryClient();
  const deleteSession = useDeleteChatSession();
  const [showNote, setShowNote] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const { user, isLoading: authLoading, login, logout } = useAuth();
  const { theme, toggle: toggleTheme } = useTheme();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "n") {
        e.preventDefault();
        setShowNote(true);
      }
      if (e.key === "?" && !e.metaKey && !e.ctrlKey && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLTextAreaElement)) {
        e.preventDefault();
        setShowShortcuts(true);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "\\") {
        e.preventDefault();
        toggleTheme();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [toggleTheme]);

  const handleDeleteSession = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    await deleteSession.mutateAsync({ id });
    queryClient.invalidateQueries({ queryKey: getListChatSessionsQueryKey() });
  };

  const userDisplayName = user
    ? (user.firstName ? `${user.firstName}${user.lastName ? ` ${user.lastName}` : ""}`.trim() : user.email ?? "User")
    : null;

  const NavContent = () => (
    <div className="flex flex-col h-full border-r border-border" style={{ background: "hsl(220 15% 5%)" }}>
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 py-4 border-b border-border">
        <div className="w-8 h-8 bg-primary/20 rounded-lg flex items-center justify-center shrink-0">
          <Brain className="h-4 w-4 text-primary" />
        </div>
        <div className="hidden lg:flex flex-1 items-center justify-between min-w-0">
          <span className="font-bold text-base text-foreground tracking-tight">MindForge</span>
          <div className="flex items-center gap-1">
            <kbd className="text-[10px] text-muted-foreground border border-border rounded px-1 py-0.5 font-mono">⌘K</kbd>
            <kbd className="text-[10px] text-muted-foreground border border-border rounded px-1 py-0.5 font-mono">?</kbd>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="px-2 py-3 space-y-0.5">
        {navItems.map((item) => {
          const isActive = item.href === "/" ? location === "/" : location.startsWith(item.href);
          return (
            <Link key={item.href} href={item.href}>
              <div
                className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-all duration-150 ${
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
                }`}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                <span className="hidden lg:block text-sm font-medium">{item.label}</span>
              </div>
            </Link>
          );
        })}

        {/* Quick note */}
        <button
          onClick={() => setShowNote(true)}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-all duration-150 text-muted-foreground hover:bg-amber-400/10 hover:text-amber-400"
        >
          <StickyNote className="h-4 w-4 shrink-0" />
          <span className="hidden lg:block text-sm font-medium">Quick Note</span>
        </button>

        {/* Trash */}
        <Link href="/trash">
          <div
            className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-all duration-150 ${
              location === "/trash"
                ? "bg-destructive/10 text-destructive"
                : "text-muted-foreground hover:bg-destructive/10 hover:text-destructive/80"
            }`}
          >
            <Trash className="h-4 w-4 shrink-0" />
            <span className="hidden lg:block text-sm font-medium">Trash</span>
          </div>
        </Link>
      </nav>

      {/* Sessions */}
      {sessions !== undefined && (
        <div className="flex-1 flex flex-col overflow-hidden border-t border-border mt-2">
          <div className="flex items-center justify-between px-3 py-2">
            <div className="flex items-center gap-1.5">
              <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground hidden lg:block">Sessions</span>
            </div>
            {onNewSession && (
              <button
                onClick={onNewSession}
                className="p-1 text-muted-foreground hover:text-foreground hover:bg-accent rounded transition-colors"
                title="New session (⌘K)"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <div className="flex-1 overflow-y-auto px-2 space-y-0.5">
            {sessions.map((s) => (
              <div
                key={s.id}
                onClick={() => onSelectSession?.(s.id)}
                className={`group flex items-center gap-2 px-2 py-2 rounded-lg cursor-pointer transition-all ${
                  activeSid === s.id
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
                }`}
              >
                <MessageSquare className="h-3.5 w-3.5 shrink-0" />
                <span className="hidden lg:block text-xs truncate flex-1">{s.title}</span>
                <button
                  onClick={(e) => handleDeleteSession(e, s.id)}
                  className="hidden group-hover:block p-0.5 hover:text-destructive transition-colors rounded"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bottom controls + User */}
      <div className="border-t border-border p-3 space-y-2">
        {/* Theme + Shortcuts row */}
        <div className="hidden lg:flex items-center gap-1">
          <button
            onClick={toggleTheme}
            title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            className="flex-1 flex items-center gap-2 px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-accent/50 rounded-md transition-colors"
          >
            {theme === "dark" ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
            <span>{theme === "dark" ? "Light mode" : "Dark mode"}</span>
          </button>
          <button
            onClick={() => setShowShortcuts(true)}
            title="Keyboard shortcuts (?)"
            className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent/50 rounded-md transition-colors"
          >
            <Keyboard className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* User profile / Login */}
        {authLoading ? (
          <div className="h-8 bg-muted/30 rounded-lg animate-pulse" />
        ) : user ? (
          <div className="flex items-center gap-2 group">
            <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center shrink-0 overflow-hidden">
              {user.profileImageUrl ? (
                <img src={user.profileImageUrl} alt="avatar" className="w-full h-full object-cover" />
              ) : (
                <User className="h-3.5 w-3.5 text-primary" />
              )}
            </div>
            <div className="hidden lg:flex flex-1 items-center justify-between min-w-0">
              <span className="text-xs text-foreground truncate">{userDisplayName}</span>
              <button
                onClick={logout}
                title="Sign out"
                className="p-1 text-muted-foreground hover:text-foreground rounded transition-colors opacity-0 group-hover:opacity-100"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={login}
            className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-muted-foreground hover:bg-primary/10 hover:text-primary transition-all duration-150"
          >
            <LogIn className="h-4 w-4 shrink-0" />
            <span className="hidden lg:block text-xs font-medium">Sign in with Replit</span>
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden">
      <CommandPalette onSelectSession={onSelectSession} onQuickNote={() => setShowNote(true)} />
      {showNote && <QuickNoteModal onClose={() => setShowNote(false)} />}
      {showShortcuts && <ShortcutsModal onClose={() => setShowShortcuts(false)} />}

      {/* Desktop sidebar */}
      <div className="hidden md:flex h-full w-[60px] lg:w-[220px] shrink-0">
        <div className="w-full">
          <NavContent />
        </div>
      </div>

      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-12 border-b border-border bg-background/80 backdrop-blur flex items-center px-3 z-50 gap-2">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Menu className="h-4 w-4" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-[220px] bg-background border-border">
            <NavContent />
          </SheetContent>
        </Sheet>
        <Brain className="h-4 w-4 text-primary" />
        <span className="font-bold text-sm">MindForge</span>
        <div className="ml-auto flex items-center gap-1">
          <kbd className="text-[10px] text-muted-foreground border border-border rounded px-1.5 py-0.5 font-mono">⌘K</kbd>
          <button onClick={() => setShowNote(true)} className="p-1.5 text-muted-foreground hover:text-amber-400 transition-colors rounded">
            <StickyNote className="h-4 w-4" />
          </button>
          <button onClick={toggleTheme} className="p-1.5 text-muted-foreground hover:text-foreground transition-colors rounded">
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          {!authLoading && !user && (
            <button onClick={login} className="p-1.5 text-muted-foreground hover:text-primary transition-colors rounded">
              <LogIn className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Main content */}
      <main className="flex-1 h-full pt-12 md:pt-0 overflow-hidden">
        {children}
      </main>
    </div>
  );
}
