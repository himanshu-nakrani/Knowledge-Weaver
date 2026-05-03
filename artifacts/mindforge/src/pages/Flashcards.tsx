import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { BookOpen, Trash2, ChevronDown, ChevronUp, Calendar, Layers, Flame, Clock, RotateCcw, ThumbsUp, Zap, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface Flashcard {
  question: string;
  answer: string;
}

interface CardSR {
  ef: number;
  interval: number;
  reps: number;
  nextReview: string;
}

interface SrData {
  [cardIndex: number]: CardSR;
}

interface FlashcardDeck {
  id: number;
  documentId: number;
  documentTitle: string;
  deckTitle: string;
  flashcards: Flashcard[];
  cardCount: number;
  srData: SrData;
  lastReviewedAt: string | null;
  streak: number;
  createdAt: string;
}

type Grade = 0 | 1 | 2 | 3;

function sm2(card: CardSR | undefined, grade: Grade): CardSR {
  const ef = card?.ef ?? 2.5;
  const interval = card?.interval ?? 1;
  const reps = card?.reps ?? 0;
  if (grade === 0) return { ef, interval: 1, reps: 0, nextReview: addDays(1) };
  const newReps = reps + 1;
  let newInterval = newReps === 1 ? 1 : newReps === 2 ? 6 : Math.ceil(interval * ef);
  if (grade === 3) newInterval = Math.ceil(newInterval * 1.3);
  const delta = 0.1 - (3 - grade) * (0.08 + (3 - grade) * 0.02);
  const newEf = Math.max(1.3, ef + delta);
  return { ef: newEf, interval: newInterval, reps: newReps, nextReview: addDays(newInterval) };
}

function addDays(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString();
}

function isDue(card: CardSR | undefined): boolean {
  if (!card) return true;
  return new Date(card.nextReview) <= new Date();
}

function dueCount(deck: FlashcardDeck): number {
  return (deck.flashcards ?? []).filter((_, i) => isDue((deck.srData ?? {})[i])).length;
}

function DeckCard({ deck, onDelete, onUpdate }: {
  deck: FlashcardDeck;
  onDelete: () => void;
  onUpdate: (updated: FlashcardDeck) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [cardIdx, setCardIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [graded, setGraded] = useState(false);
  const [sessionSR, setSessionSR] = useState<SrData>({});
  const [sessionStreak, setSessionStreak] = useState(0);
  const [doneCards, setDoneCards] = useState<Set<number>>(new Set());
  const due = dueCount(deck);
  const cards = deck.flashcards ?? [];

  const startReview = () => {
    setSessionSR(deck.srData ?? {});
    setSessionStreak(deck.streak ?? 0);
    setDoneCards(new Set());
    setCardIdx(0);
    setFlipped(false);
    setGraded(false);
    setReviewing(true);
  };

  const handleSkip = () => {
    const nextIdx = cardIdx + 1;
    if (nextIdx < cards.length) {
      setCardIdx(nextIdx);
      setFlipped(false);
      setGraded(false);
    }
  };

  const handleGrade = async (grade: Grade) => {
    const updated = { ...sessionSR, [cardIdx]: sm2(sessionSR[cardIdx], grade) };
    setSessionSR(updated);
    setDoneCards((prev) => new Set([...prev, cardIdx]));
    const newStreak = grade >= 2 ? sessionStreak + 1 : Math.max(0, sessionStreak - 1);
    setSessionStreak(newStreak);
    setGraded(true);
    const nextIdx = cardIdx + 1;
    if (nextIdx >= cards.length) {
      try {
        const res = await fetch(`${BASE}/api/tools/flashcard-decks/${deck.id}/review`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ srData: updated, streak: newStreak }),
        });
        if (res.ok) onUpdate(await res.json() as FlashcardDeck);
      } catch { /* local state still updated */ }
    }
    setTimeout(() => {
      if (nextIdx < cards.length) {
        setCardIdx(nextIdx);
        setFlipped(false);
        setGraded(false);
      }
    }, 400);
  };

  const isLastCard = cardIdx === cards.length - 1;
  const currentCard = cards[cardIdx];
  const isSessionDone = isLastCard && doneCards.has(cardIdx);

  return (
    <motion.div layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
      className="border border-border rounded-xl bg-card overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-accent/30 transition-colors" onClick={() => setExpanded(!expanded)}>
        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <BookOpen className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-foreground truncate">{deck.deckTitle}</p>
          <div className="flex items-center gap-3 mt-0.5 flex-wrap">
            <span className="text-xs text-muted-foreground truncate">from: {deck.documentTitle}</span>
            <span className="flex items-center gap-1 text-xs text-muted-foreground"><Layers className="h-3 w-3" />{deck.cardCount} cards</span>
            {(deck.streak ?? 0) > 0 && <span className="flex items-center gap-1 text-xs text-orange-400"><Flame className="h-3 w-3" />{deck.streak}</span>}
            <span className="flex items-center gap-1 text-xs text-muted-foreground"><Calendar className="h-3 w-3" />{new Date(deck.createdAt).toLocaleDateString()}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {due > 0 && (
            <span className="flex items-center gap-1 px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full font-medium">
              <Clock className="h-3 w-3" />{due} due
            </span>
          )}
          <button onClick={(e) => { e.stopPropagation(); startReview(); }} className="px-2.5 py-1 bg-primary/10 text-primary text-xs font-medium rounded-md hover:bg-primary/20 transition-colors">Review</button>
          <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="p-1 text-muted-foreground hover:text-destructive transition-colors rounded"><Trash2 className="h-3.5 w-3.5" /></button>
          {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="border-t border-border overflow-hidden">
            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {cards.map((card, i) => {
                const sr = (sessionSR ?? {})[i];
                const cardDue = isDue(sr);
                return (
                  <div key={i} className={`border rounded-xl p-3 min-h-[90px] flex flex-col transition-all ${cardDue ? "border-primary/30 bg-primary/5" : "border-border bg-muted"}`}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-medium text-primary">Card {i + 1}</span>
                      {sr ? (
                        <span className={`text-xs px-1.5 py-0.5 rounded-full ${cardDue ? "bg-primary/20 text-primary" : "bg-muted-foreground/20 text-muted-foreground"}`}>{cardDue ? "due" : `+${sr.interval}d`}</span>
                      ) : <span className="text-xs text-muted-foreground">new</span>}
                    </div>
                    <p className="text-xs leading-relaxed flex-1 text-foreground">{card.question}</p>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {reviewing && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
            onClick={() => setReviewing(false)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              className="bg-card border border-border rounded-2xl w-full max-w-md shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}>
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-border">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm font-semibold truncate">{deck.deckTitle}</span>
                  {sessionStreak > 0 && (
                    <span className="flex items-center gap-0.5 text-xs text-orange-400 shrink-0 px-1.5 py-0.5 bg-orange-400/10 rounded-full">
                      <Flame className="h-3 w-3" />{sessionStreak}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs font-medium text-muted-foreground tabular-nums">{cardIdx + 1} / {cards.length}</span>
                  {doneCards.size > 0 && (
                    <span className="text-xs text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">{doneCards.size} done</span>
                  )}
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-muted h-1.5">
                <div
                  className="bg-primary h-1.5 transition-all duration-500"
                  style={{ width: `${(doneCards.size / cards.length) * 100}%` }}
                />
              </div>

              <div className="p-6">
                {/* 3D flip card */}
                {currentCard && (
                  <div
                    className="relative cursor-pointer"
                    style={{ perspective: "1000px", height: "180px" }}
                    onClick={() => !graded && setFlipped(!flipped)}
                  >
                    <motion.div
                      animate={{ rotateY: flipped ? 180 : 0 }}
                      transition={{ duration: 0.4, type: "spring", stiffness: 200, damping: 20 }}
                      style={{ transformStyle: "preserve-3d" }}
                      className="w-full h-full"
                    >
                      {/* Front */}
                      <div
                        className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 rounded-xl border border-border bg-muted hover:border-primary/30 transition-colors"
                        style={{ backfaceVisibility: "hidden" }}
                      >
                        <p className="text-sm font-semibold text-foreground leading-relaxed">{currentCard.question}</p>
                        <p className="text-xs text-muted-foreground mt-4">Tap to reveal answer</p>
                      </div>
                      {/* Back */}
                      <div
                        className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 rounded-xl border border-green-500/40 bg-green-500/5"
                        style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
                      >
                        <p className="text-sm text-green-400 font-medium leading-relaxed">{currentCard.answer}</p>
                        <p className="text-xs text-muted-foreground mt-4">Rate your recall below</p>
                      </div>
                    </motion.div>
                  </div>
                )}
              </div>

              <AnimatePresence mode="wait">
                {isSessionDone ? (
                  <motion.div key="done" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="px-5 pb-5 flex flex-col items-center gap-3 text-center">
                    <div className="w-12 h-12 rounded-full bg-orange-400/10 flex items-center justify-center"><Flame className="h-6 w-6 text-orange-400" /></div>
                    <div>
                      <p className="font-semibold text-foreground">Session complete!</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Streak: {sessionStreak} · {doneCards.size} cards reviewed</p>
                    </div>
                    <button onClick={() => setReviewing(false)} className="w-full py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity">Done</button>
                  </motion.div>
                ) : flipped && !graded ? (
                  <motion.div key="grade" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="px-5 pb-5 space-y-2">
                    <div className="grid grid-cols-4 gap-2">
                      {([
                        { grade: 0 as Grade, label: "Again", icon: <RotateCcw className="h-3.5 w-3.5" />, color: "bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20" },
                        { grade: 1 as Grade, label: "Hard", icon: <ChevronRight className="h-3.5 w-3.5" />, color: "bg-orange-500/10 text-orange-400 border-orange-500/20 hover:bg-orange-500/20" },
                        { grade: 2 as Grade, label: "Good", icon: <ThumbsUp className="h-3.5 w-3.5" />, color: "bg-primary/10 text-primary border-primary/20 hover:bg-primary/20" },
                        { grade: 3 as Grade, label: "Easy", icon: <Zap className="h-3.5 w-3.5" />, color: "bg-green-500/10 text-green-400 border-green-500/20 hover:bg-green-500/20" },
                      ]).map(({ grade, label, icon, color }) => (
                        <button key={grade} onClick={() => handleGrade(grade)}
                          className={`flex flex-col items-center gap-1 py-2 rounded-lg border text-xs font-medium transition-colors ${color}`}>
                          {icon}{label}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                ) : (
                  <motion.div key="show" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="px-5 pb-5 flex gap-2">
                    <button onClick={() => setFlipped(true)} className="flex-1 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity">
                      Show Answer
                    </button>
                    {!isLastCard && (
                      <button onClick={handleSkip} className="px-3 py-2 bg-muted border border-border rounded-lg text-sm text-muted-foreground hover:text-foreground transition-colors" title="Skip this card">
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function Flashcards() {
  const [decks, setDecks] = useState<FlashcardDeck[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${BASE}/api/tools/flashcard-decks`)
      .then((r) => r.json())
      .then((data) => setDecks(data as FlashcardDeck[]))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const deleteDeck = async (id: number) => {
    await fetch(`${BASE}/api/tools/flashcard-decks/${id}`, { method: "DELETE" });
    setDecks((prev) => prev.filter((d) => d.id !== id));
  };

  const updateDeck = (updated: FlashcardDeck) => {
    setDecks((prev) => prev.map((d) => (d.id === updated.id ? { ...d, ...updated } : d)));
  };

  const totalDue = decks.reduce((sum, d) => sum + dueCount(d), 0);

  return (
    <AppLayout>
      <div className="h-full flex flex-col p-6 overflow-hidden">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Flashcard Decks</h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              {decks.length} deck{decks.length !== 1 ? "s" : ""}
              {totalDue > 0 && <span className="ml-2 text-primary font-medium">{totalDue} card{totalDue !== 1 ? "s" : ""} due</span>}
            </p>
          </div>
          {totalDue > 0 && (
            <span className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary rounded-lg text-sm font-medium">
              <Clock className="h-4 w-4" />{totalDue} due today
            </span>
          )}
        </div>
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-16 bg-card border border-border rounded-xl animate-pulse" />)}</div>
          ) : decks.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-card border border-border flex items-center justify-center"><BookOpen className="h-8 w-8 text-muted-foreground" /></div>
              <div>
                <p className="font-medium text-foreground">No flashcard decks yet</p>
                <p className="text-muted-foreground text-sm mt-1">Go to the Workspace, open a document, and click <span className="text-primary font-medium">Flashcards → Save Deck</span></p>
              </div>
            </div>
          ) : (
            <motion.div layout className="space-y-3 pb-6">
              <AnimatePresence>
                {decks.map((deck) => <DeckCard key={deck.id} deck={deck} onDelete={() => deleteDeck(deck.id)} onUpdate={updateDeck} />)}
              </AnimatePresence>
            </motion.div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
