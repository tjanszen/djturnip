import { useMutation } from "@tanstack/react-query";
import { api, type RecipeStyle } from "@shared/routes";

export function useProcessRecipe() {
  return useMutation({
    mutationFn: async ({ url, style }: { url: string; style: RecipeStyle }) => {
      const validatedInput = api.recipes.process.input.parse({ url, style });

      const res = await fetch(api.recipes.process.path, {
        method: api.recipes.process.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validatedInput),
      });

      if (!res.ok) {
        if (res.status === 400) {
          const error = await res.json();
          const parsedError = api.recipes.process.responses[400].safeParse(error);
          if (parsedError.success) {
            throw new Error(parsedError.data.message || "Invalid URL provided");
          }
        }
        throw new Error("Failed to process recipe");
      }

      return api.recipes.process.responses[200].parse(await res.json());
    },
  });
}
