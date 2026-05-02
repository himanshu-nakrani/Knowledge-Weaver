import { pgTable, text, serial, timestamp, integer, jsonb } from "drizzle-orm/pg-core";

export const flashcardDecksTable = pgTable("flashcard_decks", {
  id: serial("id").primaryKey(),
  documentId: integer("document_id").notNull(),
  documentTitle: text("document_title").notNull(),
  deckTitle: text("deck_title").notNull(),
  flashcards: jsonb("flashcards").notNull(),
  cardCount: integer("card_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type FlashcardDeck = typeof flashcardDecksTable.$inferSelect;
