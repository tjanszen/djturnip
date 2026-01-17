import { z } from 'zod';
import { insertRecipeSchema } from './schema';

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

export const recipeChangeSchema = z.object({
  action: z.string(),
  details: z.string(),
});

export const recipeAlternativeSchema = z.object({
  title: z.string(),
  kind: z.enum(['basic', 'delight']).optional(),
  why_this_works: z.string().optional(),
  changes: z.array(recipeChangeSchema),
});

export const recipeStyleSchema = z.enum(['creative', 'umami', 'protein', 'seasonal']);
export type RecipeStyle = z.infer<typeof recipeStyleSchema>;

export const fridgeRecipeCategorySchema = z.enum(['main', 'appetizer', 'snack', 'breakfast', 'lunch', 'dinner', 'side', 'dessert']);
export type FridgeRecipeCategory = z.infer<typeof fridgeRecipeCategorySchema>;

export const fridgeRecipeSchema = z.object({
  title: z.string(),
  category: fridgeRecipeCategorySchema,
  used_ingredients: z.array(z.string()).min(1),
  skipped_ingredients: z.array(z.object({
    ingredient: z.string(),
    reason: z.string(),
  })).optional(),
  estimated_time_minutes: z.number().min(10).max(30),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  summary: z.string(),
  ingredients: z.array(z.string()).min(4).max(10),
  steps: z.array(z.string()).min(3).max(10),
  adjustment_tags: z.array(z.string()).optional(),
});

export type FridgeRecipe = z.infer<typeof fridgeRecipeSchema>;

export const singleRecipeSchema = z.object({
  name: z.string().min(1),
  summary: z.string().min(1),
  servings: z.number().min(1),
  time_minutes: z.number().nullable(),
  calories_per_serving: z.number().nullable(),
  ingredients: z.array(z.string()).min(1),
  steps: z.array(z.string()).min(1),
  added_extras: z.array(z.string()).optional(),
});

export type SingleRecipe = z.infer<typeof singleRecipeSchema>;

export const api = {
  recipes: {
    process: {
      method: 'POST' as const,
      path: '/api/recipes/process',
      input: z.object({ 
        url: z.string().url(),
        style: recipeStyleSchema.default('creative'),
      }),
      responses: {
        200: z.object({ 
          message: z.string(), 
          url: z.string(),
          pageId: z.string().nullable().optional(),
          extractedRecipe: z.object({
            title: z.string(),
            ingredients: z.array(z.string()),
            ingredientCount: z.number(),
            instructionCount: z.number(),
            method: z.string().optional(),
          }).optional(),
          what_is_this: z.string().optional(),
          why_this_works: z.string().optional(),
          alternatives: z.array(recipeAlternativeSchema).optional(),
        }),
        400: errorSchemas.validation,
      },
    },
    fridge: {
      method: 'POST' as const,
      path: '/api/recipes/fridge',
      input: z.object({ 
        ingredients: z.string().min(1, "Please enter at least one ingredient"),
      }),
      responses: {
        200: z.object({ 
          message: z.string(),
          recipes: z.array(fridgeRecipeSchema),
        }),
        400: errorSchemas.validation,
      },
    },
    generateSingle: {
      method: 'POST' as const,
      path: '/api/recipes/generate-single',
      input: z.object({
        ingredients: z.array(z.string()).min(1),
        prefs: z.object({
          servings: z.number().min(1).max(12),
          time: z.enum(['best', '15', '30', '60']),
          cuisine: z.string(),
        }),
        allow_extras: z.boolean(),
      }),
      responses: {
        200: z.object({
          success: z.boolean(),
          recipe: singleRecipeSchema.optional(),
          error: z.string().optional(),
          parse_retry: z.number(),
        }),
        400: errorSchemas.validation,
      },
    },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}

export type RecipeChange = z.infer<typeof recipeChangeSchema>;
export type RecipeAlternative = z.infer<typeof recipeAlternativeSchema>;
export type ProcessRecipeResponse = z.infer<typeof api.recipes.process.responses[200]>;
export type FridgeRecipesResponse = z.infer<typeof api.recipes.fridge.responses[200]>;
export type GenerateSingleResponse = z.infer<typeof api.recipes.generateSingle.responses[200]>;
