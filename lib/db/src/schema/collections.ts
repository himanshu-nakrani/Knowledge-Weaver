import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";

export const collectionsTable = pgTable("collections", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  color: text("color").notNull().default("#6366f1"),
  icon: text("icon"),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type Collection = typeof collectionsTable.$inferSelect;
