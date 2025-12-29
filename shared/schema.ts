import { pgTable, text, serial, boolean, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { sql } from "drizzle-orm";

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

// Chat tables for OpenAI integration
export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  role: text("role").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const insertConversationSchema = createInsertSchema(conversations).omit({
  id: true,
  createdAt: true,
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  createdAt: true,
});

export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;

// Recipe alternative type
export interface RecipeAlternative {
  title: string;
  description: string;
  cuisine: string;
}

// Recipe DTO types (V2 is the only supported format)
export interface SubstituteItemV2 {
  id: string;
  name: string;
  amount: string;
}

export interface IngredientItemV2 {
  id: string;
  name: string;
  amount: string | null;
  substitutes: SubstituteItemV2[];
}

export interface StepItemV2 {
  text: string;
  ingredient_ids: string[];
  time_minutes: number | null;
}

export interface RecipeDTOV2 {
  name: string;
  description: string;
  explanation: string;
  servings: number;
  time_minutes: number | null;
  calories_per_serving: number | null;
  ingredients: IngredientItemV2[];
  steps: StepItemV2[];
  image_prompt: string;
}

// Zod schemas for V2 validation
export const substituteItemV2Schema = z.object({
  id: z.string(),
  name: z.string(),
  amount: z.string(),
});

export const ingredientItemV2Schema = z.object({
  id: z.string(),
  name: z.string(),
  amount: z.string().nullable(),
  substitutes: z.array(substituteItemV2Schema),
});

export const stepItemV2Schema = z.object({
  text: z.string(),
  ingredient_ids: z.array(z.string()),
  time_minutes: z.number().nullable(),
});

export const recipeDTOV2Schema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  explanation: z.string().min(1),
  servings: z.number().min(1),
  time_minutes: z.number().nullable(),
  calories_per_serving: z.number().nullable(),
  ingredients: z.array(ingredientItemV2Schema).min(1),
  steps: z.array(stepItemV2Schema).min(1),
  image_prompt: z.string().min(1),
});

// Log schema update for observability
console.log("schema_v2_image_prompt_added");
