import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { BookOpen, Trash2, ChevronDown, ChevronUp, Calendar, Layers } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface Flashcard {
  question: string;
  answer: string;
}

interface FlashcardDeck {
  id: number;
  documentId: number;
  documentTitle: string;
  deckTitle: string;
  flashcards: Flashcard[];
  cardCount: number;
  createdAt: string;
}

function useDeckStore() {
  const [decks, setDecks] = useState<FlashcardDeck[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetched, setFetched] = useState(false);

  const fetchDecks = async () => {
    if (fetched) return;
    setLoading(true);
    try {
      const res = await fetch(`${BASE}/api/tools/flashcard-decks`);
      const data = await res.json();
      setDecks(data);
    } catch {
    } finally {
      setLoading(false);
      setFetched(true);
    }
  };

  const deleteDeck = async (id: number) => {
    await fetch(`${BASE}/api/tools/flashcard-decks/${id}`, { method: "DELETE" });
    setDecks((prev) => prev.filter((d) => d.id !== id));
  };

  return { decks, loading, fetchDecks, deleteDeck };
}

function DeckCard({ deck, onDelete }: { deck: FlashcardDeck; onDelete: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [flipped, setFlipped] = useState<Set<number>>(new Set());
  const [reviewing, setReviewing] = useState(false);
  const [cardIdx, setCardIdx] = useState(0);

  const toggleFlip = (i: number) => {
    setFlipped((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="border border-border rounded-xl bg-card overflow-hidden"
    >
      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-accent/30 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <BookOpen className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-foreground truncate">{deck.deckTitle}</p>
          <div className="flex items-center gap-3 mt-0.5">
            <span className="text-xs text-muted-foreground truncate">from: {deck.documentTitle}</span>
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Layers className="h-3 w-3" />
              {deck.cardCount} cards
            </span>
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3" />
              {new Date(deck.createdAt).toLocaleDateString()}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setReviewing(true);
              setCardIdx(0);
              setFlipped(new Set());
            }}
            className="px-2.5 py-1 bg-primary/10 text-primary text-xs font-medium rounded-md hover:bg-primary/20 transition-colors"
          >
            Review
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="p-1 text-muted-foreground hover:text-destructive transition-colors rounded"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </div>

      {/* Expanded grid */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-border overflow-hidden"
          >
            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {deck.flashcards.map((card, i) => (
                <div
                  key={i}
                  onClick={() => toggleFlip(i)}
                  className={`cursor-pointer border rounded-xl p-3 transition-all min-h-[90px] flex flex-col ${
                    flipped.has(i)
                      ? "border-green-500/40 bg-green-500/5"
                      : "border-border bg-muted hover:border-primary/30"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-medium text-primary">Card {i + 1}</span>
                    {flipped.has(i) ? (
                      <ChevronUp className="h-3 w-3 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-3 w-3 text-muted-foreground" />
                    )}
                  </div>
                  <p className={`text-xs leading-relaxed flex-1 ${flipped.has(i) ? "text-green-400" : "text-foreground"}`}>
                    {flipped.has(i) ? card.answer : card.question}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">{flipped.has(i) ? "Answer ✓" : "Tap to flip"}</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Review mode overlay */}
      <AnimatePresence>
        {reviewing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
            onClick={() => setReviewing(false)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="bg-card border border-border rounded-2xl w-full max-w-md shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-5 py-3 border-b border-border">
                <span className="text-sm font-semibold">{deck.deckTitle}</span>
                <span className="text-xs text-muted-foreground">
                  {cardIdx + 1} / {deck.flashcards.length}
                </span>
              </div>

              <div className="p-6">
                {/* Progress */}
                <div className="w-full bg-muted rounded-full h-1 mb-6">
                  <div
                    className="bg-primary h-1 rounded-full transition-all"
                    style={{ width: `${((cardIdx + 1) / deck.flashcards.length) * 100}%` }}
                  />
                </div>

                <div
                  onClick={() => toggleFlip(cardIdx)}
                  className={`min-h-[160px] flex flex-col items-center justify-center text-center p-6 rounded-xl border cursor-pointer transition-all ${
                    flipped.has(cardIdx)
                      ? "border-green-500/40 bg-green-500/5"
                      : "border-border bg-muted hover:border-primary/30"
                  }`}
                >
                  <p className={`text-sm leading-relaxed ${flipped.has(cardIdx) ? "text-green-400 font-medium" : "text-foreground font-semibold"}`}>
                    {flipped.has(cardIdx)
                      ? deck.flashcards[cardIdx].answer
                      : deck.flashcards[cardIdx].question}
                  </p>
                  <p className="text-xs text-muted-foreground mt-4">
                    {flipped.has(cardIdx) ? "Answer" : "Tap to reveal answer"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 px-5 pb-5">
                <button
                  onClick={() => { setCardIdx(Math.max(0, cardIdx - 1)); }}
                  disabled={cardIdx === 0}
                  className="flex-1 py-2 bg-muted border border-border rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground disabled:opacity-40 transition-colors"
                >
                  Previous
                </button>
                {cardIdx < deck.flashcards.length - 1 ? (
                  <button
                    onClick={() => { setCardIdx(cardIdx + 1); setFlipped(new Set()); }}
                    className="flex-1 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
                  >
                    Next
                  </button>
                ) : (
                  <button
                    onClick={() => setReviewing(false)}
                    className="flex-1 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
                  >
                    Done!
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function Flashcards() {
  const { decks, loading, fetchDecks, deleteDeck } = useDeckStore();

  useState(() => { fetchDecks(); });

  return (
    <AppLayout>
      <div className="h-full flex flex-col p-6 overflow-hidden">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">Flashcard Decks</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {decks.length} saved deck{decks.length !== 1 ? "s" : ""} — generate more from the Workspace
          </p>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-16 bg-card border border-border rounded-xl animate-pulse" />
              ))}
            </div>
          ) : decks.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-card border border-border flex items-center justify-center">
                <BookOpen className="h-8 w-8 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium text-foreground">No flashcard decks yet</p>
                <p className="text-muted-foreground text-sm mt-1">
                  Go to the Workspace, open a document, and click{" "}
                  <span className="text-primary font-medium">Flashcards → Save Deck</span>
                </p>
              </div>
            </div>
          ) : (
            <motion.div layout className="space-y-3 pb-6">
              <AnimatePresence>
                {decks.map((deck) => (
                  <DeckCard
                    key={deck.id}
                    deck={deck}
                    onDelete={() => deleteDeck(deck.id)}
                  />
                ))}
              </AnimatePresence>
            </motion.div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
