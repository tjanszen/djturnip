import { type Recipe, type InsertRecipe } from "@shared/schema";

/**
 * =============================================================================
 * STORAGE LAYER — PERSISTENCE CONTRACT
 * =============================================================================
 * Reference: docs/agent_memory/imp_plans/persisted_page_urls.md
 *
 * CURRENT STATE:
 * - Using in-memory storage (MemStorage) for recipes
 * - Remix results are ephemeral (lost on refresh/redeploy)
 *
 * DATABASE CONNECTION:
 * - Replit Postgres is available via `DATABASE_URL` environment variable
 * - Drizzle ORM is configured in shared/schema.ts
 *
 * PLANNED EVOLUTION (Persisted Remix Pages):
 * - Phase 1: Create `remix_pages` table with:
 *   - id (deterministic hash), source_url, title, payload (JSONB), created_at
 *   - payload_version field for future schema migrations
 *   - source_url_hash index for "all remixes of URL" queries
 * - Phase 2: Add persistence methods to IStorage:
 *   - createRemixPage({ sourceUrl, normalizedUrl, title, payload }) -> pageId
 *   - getRemixPage(pageId) -> payload | null
 *   - listRemixPages({ limit, offset }) -> metadata[]
 * - Phase 3: Expose via REST endpoints
 * - Phase 4: Frontend routes /remix/:pageId and /library
 *
 * TODO Phase 1: Add remix_pages table schema + migration
 * TODO Phase 2: Add IRemixPageStorage interface + Postgres implementation
 * =============================================================================
 */

export interface IStorage {
  createRecipe(recipe: InsertRecipe): Promise<Recipe>;
}

export class MemStorage implements IStorage {
  private recipes: Map<number, Recipe>;
  private currentId: number;

  constructor() {
    this.recipes = new Map();
    this.currentId = 1;
  }

  async createRecipe(insertRecipe: InsertRecipe): Promise<Recipe> {
    const id = this.currentId++;
    const recipe: Recipe = { ...insertRecipe, id, isProcessed: false };
    this.recipes.set(id, recipe);
    return recipe;
  }
}

export const storage = new MemStorage();
