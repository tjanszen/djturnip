import { useMutation } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { z } from "zod";

// We don't have a GET endpoint in the manifest for recipes list yet, 
// so we only implement the process mutation defined in the API contract.

export function useProcessRecipe() {
  return useMutation({
    mutationFn: async (url: string) => {
      // Validate input using the Zod schema from routes
      const validatedInput = api.recipes.process.input.parse({ url });

      const res = await fetch(api.recipes.process.path, {
        method: api.recipes.process.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validatedInput),
      });

      if (!res.ok) {
        // Handle 400 validation errors specifically if needed
        if (res.status === 400) {
          const error = await res.json();
          // Try to parse with the validation error schema
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
