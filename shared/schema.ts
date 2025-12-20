import { pgTable, text, serial, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const recipes = pgTable("recipes", {
  id: serial("id").primaryKey(),
  url: text("url").notNull(),
  isProcessed: boolean("is_processed").default(false),
});

export const insertRecipeSchema = createInsertSchema(recipes).pick({
  url: true,
});

export type Recipe = typeof recipes.$inferSelect;
export type InsertRecipe = z.infer<typeof insertRecipeSchema>;
