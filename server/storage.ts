import { type Recipe, type InsertRecipe } from "@shared/schema";

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
