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
  changes: z.array(recipeChangeSchema),
});

export const recipeStyleSchema = z.enum(['creative', 'umami', 'protein', 'seasonal']);
export type RecipeStyle = z.infer<typeof recipeStyleSchema>;

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
          alternatives: z.array(recipeAlternativeSchema).optional(),
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
