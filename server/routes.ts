import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // Fridge Cleanout endpoint - generate recipes from ingredients
  app.post(api.recipes.fridge.path, async (req, res) => {
    try {
      const input = api.recipes.fridge.input.parse(req.body);
      
      console.log("Received ingredients:", input.ingredients);
      console.log("ALT_RECIPES flag:", process.env.ALT_RECIPES || "off");

      if (process.env.ALT_RECIPES === "on") {
        console.log("Generating fridge cleanout recipes...");
        
        const response = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: `You are a creative, pragmatic professional chef who specializes in turning leftover or forgotten fridge/pantry ingredients into surprisingly delicious but realistic dishes. You emphasize "surprise and delight" while respecting home-kitchen constraints. You explicitly avoid forced or incompatible ingredient usage. Your tone balances comfort food, light creativity, and practical execution in a standard home kitchen.

STRICT REQUIREMENTS:
1. Return a JSON object with a "recipes" array containing EXACTLY 6 recipes. This is mandatory - you MUST generate 6 different recipes, no fewer.
2. Each recipe MUST have these exact fields:
   - "title": A descriptive recipe name (3-6 words)
   - "category": One of "main", "appetizer", "snack", "breakfast", "lunch", "dinner", "side", "dessert"
   - "used_ingredients": Array of ingredients from the user's list that are used
   - "skipped_ingredients": Array of objects with EXACTLY these keys: "ingredient" (string) and "reason" (string). Example: [{"ingredient": "pickles", "reason": "incompatible with Asian flavor profile"}]. NEVER output strings like ["pickles", "reason: incompatible"] - always use the object format!
   - "estimated_time_minutes": Number between 10-30 (target 25-30 min max)
   - "difficulty": One of "easy", "medium", "hard"
   - "summary": 1-2 sentence description of the dish
   - "ingredients": Full ingredient list with quantities (4-10 items)
   - "steps": Array of 3-10 clear, simple cooking steps
   - "adjustment_tags": Optional array like ["make it spicier", "simpler version", "lighter", "flavor boost", "lower-carb", "gluten-free"]

INGREDIENT RULES:
- Use the provided ingredients as the PRIMARY inspiration
- For the first 2-3 recipes, make a best effort to include ALL provided ingredients, even if the result is slightly more creative or unexpected
- Prioritize ingredients that naturally work together
- Do NOT force incompatible ingredients
- If an ingredient truly does not belong in a recipe, it may be excluded only if the resulting dish is meaningfully better
- If excluding an ingredient, briefly note why in skipped_ingredients

TIME & COMPLEXITY:
- Target 25-30 minutes total cooking time
- Prefer 3-10 clear, simple steps (simpler recipes can have fewer steps)
- Avoid advanced techniques, marinating, or multi-day prep

EQUIPMENT ASSUMPTIONS:
- Assume a standard U.S. home kitchen: stove, oven, pots, pans, knives, blender/mixer, grill, crockpot
- Avoid specialty equipment
- If optional equipment improves the recipe, include a simple fallback method in the steps

PANTRY STAPLES (assumed available):
- Oils, butter, salt, pepper
- Flour, sugar
- Garlic, onions
- Common spices and dried herbs (paprika, cumin, oregano, basil, thyme, cinnamon, etc.)
- Common condiments (soy sauce, mustard, hot sauce, vinegar, mayo, ketchup)
- Do NOT introduce niche or hard-to-find ingredients

FLAVOR QUALITY RULE:
Each recipe MUST include at least one intentional "flavor move":
- Acid (lemon, lime, vinegar)
- Heat (chili, pepper, spice)
- Texture contrast (crispy + creamy, crunchy + soft)
- Aromatic finish (fresh herbs, garlic butter, toasted sesame)

VARIETY: Ensure recipes are visually and conceptually distinct. Include a mix of meal types.

RECIPE GENERATION STRATEGY (to ensure you generate 6 recipes):
Think of different cooking methods and meal contexts:
1. A quick stovetop dish
2. A baked or roasted option
3. A salad or cold dish
4. A comfort food classic
5. Something with an international twist (Asian, Mediterranean, Mexican, etc.)
6. A breakfast or brunch idea

FINAL REMINDER: You MUST return exactly 6 recipes in the "recipes" array. Fewer than 6 is unacceptable.`
            },
            {
              role: "user",
              content: `Create delicious recipes using these ingredients from my fridge/pantry: ${input.ingredients}

Remember: Prioritize flavor and practicality over using every single ingredient. Skip ingredients that don't work well together.`
            }
          ],
          response_format: { type: "json_object" },
          max_tokens: 4000,
        });

        let content = response.choices[0]?.message?.content || "{}";
        let recipes: Array<{
          title: string;
          category: string;
          used_ingredients: string[];
          skipped_ingredients?: Array<{ ingredient: string; reason: string }>;
          estimated_time_minutes: number;
          difficulty: string;
          summary: string;
          ingredients: string[];
          steps: string[];
          adjustment_tags?: string[];
        }> = [];
        
        const MIN_RECIPES = 6;
        let attempts = 0;
        const MAX_ATTEMPTS = 2;
        
        while (attempts < MAX_ATTEMPTS) {
          try {
            const parsed = JSON.parse(content);
            recipes = parsed.recipes || [];
            
            // Normalize skipped_ingredients to handle malformed AI responses
            recipes = recipes.map(recipe => {
              if (recipe.skipped_ingredients && Array.isArray(recipe.skipped_ingredients)) {
                recipe.skipped_ingredients = recipe.skipped_ingredients
                  .map((item: unknown) => {
                    if (typeof item === 'object' && item !== null && 'ingredient' in item && 'reason' in item) {
                      return item as { ingredient: string; reason: string };
                    }
                    if (typeof item === 'string') {
                      const colonIndex = item.indexOf(':');
                      if (colonIndex > 0) {
                        return {
                          ingredient: item.substring(0, colonIndex).trim(),
                          reason: item.substring(colonIndex + 1).trim()
                        };
                      }
                      return { ingredient: item, reason: 'not used in this recipe' };
                    }
                    return null;
                  })
                  .filter((item: unknown): item is { ingredient: string; reason: string } => item !== null);
              }
              return recipe;
            });
            
            // Trim to exactly 6 recipes if we got more
            if (recipes.length > MIN_RECIPES) {
              console.log(`Trimming from ${recipes.length} to ${MIN_RECIPES} recipes`);
              recipes = recipes.slice(0, MIN_RECIPES);
            }
            
            console.log(`Generated ${recipes.length} Fridge Cleanout Recipes (attempt ${attempts + 1}):`);
            recipes.forEach((recipe, i) => {
              console.log(`  ${i + 1}. ${recipe.title} (${recipe.category}, ${recipe.estimated_time_minutes} min, ${recipe.difficulty})`);
            });
            
            // Check if we have enough recipes
            if (recipes.length >= MIN_RECIPES) {
              break;
            }
            
            // Not enough recipes - retry with a stronger prompt
            attempts++;
            if (attempts < MAX_ATTEMPTS) {
              console.log(`Only got ${recipes.length} recipes, retrying to get ${MIN_RECIPES}...`);
              const retryResponse = await openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [
                  {
                    role: "system",
                    content: `You are a creative chef. Generate EXACTLY 6 quick recipes using the given ingredients. You MUST return a JSON object with a "recipes" array containing exactly 6 items.

Each recipe needs: title, category (main/appetizer/snack/breakfast/lunch/dinner/side/dessert), used_ingredients (array), skipped_ingredients (array of {ingredient, reason} objects or empty array), estimated_time_minutes (10-30), difficulty (easy/medium/hard), summary, ingredients (array with quantities), steps (array of 3-10 steps), adjustment_tags (optional array).

Think of 6 different approaches: stovetop, baked, cold/salad, comfort food, international twist, breakfast option.`
                  },
                  {
                    role: "user",
                    content: `Create exactly 6 recipes using: ${input.ingredients}`
                  }
                ],
                response_format: { type: "json_object" },
                max_tokens: 4000,
              });
              content = retryResponse.choices[0]?.message?.content || "{}";
            }
          } catch (parseError) {
            console.error("Failed to parse OpenAI response:", parseError);
            break;
          }
        }
        
        // Log final result
        if (recipes.length < MIN_RECIPES) {
          console.log(`Warning: Only ${recipes.length} recipes generated after ${attempts + 1} attempts. Proceeding with available recipes.`);
        }

        res.status(200).json({ 
          message: "Recipes generated from your ingredients!",
          recipes,
        });
      } else {
        res.status(200).json({ 
          message: "Recipe generation is disabled.",
          recipes: [],
        });
      }
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      console.error("Error generating fridge recipes:", err);
      throw err;
    }
  });

  // Recipe Remix endpoint
  app.post(api.recipes.process.path, async (req, res) => {
    try {
      const input = api.recipes.process.input.parse(req.body);
      
      console.log("Received Recipe URL:", input.url);
      console.log("ALT_RECIPES flag:", process.env.ALT_RECIPES || "off");

      await storage.createRecipe({ url: input.url });

      // Check if ALT_RECIPES is enabled
      if (process.env.ALT_RECIPES === "on") {
        const style = input.style || 'creative';
        console.log(`Generating 9 ${style} recipe alternatives...`);
        
        const basePrompt = `You are a helpful chef assistant. Analyze the recipe at the given URL and generate exactly 9 different ways to modify or enhance it.

STRICT REQUIREMENTS:
1. Return a JSON object with an "alternatives" array containing exactly 9 items.
2. Each item MUST have exactly these fields:
   - "title": A short category name (4-6 words max, e.g., "Make it a Main Dish", "Cheese Upgrade")
   - "changes": An array with EXACTLY 2 or 3 objects, each containing:
     - "action": A brief action label (2-4 words, e.g., "Add Protein", "Make it Creamy")
     - "details": Specific ingredient names and amounts (e.g., "Layer in slices of Italian sausage or grilled chicken", "Add 1 cup cannellini beans for vegan protein")

3. Be SPECIFIC: Instead of "add flavor", say "Add 1 tsp crushed red pepper or Calabrian chili flakes".
4. Every alternative MUST have 2-3 changes. Never return an empty changes array.`;

        const styleInstructions: Record<string, string> = {
          creative: "Focus on creative twists: fusion cuisines, unexpected ingredient pairings, presentation changes, and cooking method variations.",
          umami: "Focus on adding umami depth: miso paste, parmesan, sun-dried tomatoes, mushrooms, fish sauce, soy sauce, anchovies, or aged cheeses.",
          protein: "Focus on adding protein: meats (chicken, sausage, bacon), legumes (white beans, chickpeas, lentils), eggs, cheese, nuts, or tofu.",
          seasonal: "Focus on seasonal ingredients for the current season. Use hearty root vegetables and warming spices for fall/winter, or fresh produce and light herbs for spring/summer.",
        };
        
        const response = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: `${basePrompt}\n\nStyle focus: ${styleInstructions[style]}`
            },
            {
              role: "user",
              content: `Analyze this recipe and suggest 9 actionable modifications: ${input.url}`
            }
          ],
          response_format: { type: "json_object" },
          max_tokens: 2000,
        });

        const content = response.choices[0]?.message?.content || "{}";
        let alternatives: { title: string; changes: { action: string; details: string }[] }[] = [];
        
        try {
          const parsed = JSON.parse(content);
          alternatives = parsed.alternatives || parsed.recipes || parsed.modifications || [];
          
          // Log each recipe title to console as requested
          console.log("Generated Recipe Alternatives:");
          alternatives.forEach((alt, i) => {
            console.log(`  ${i + 1}. ${alt.title}`);
          });
        } catch (parseError) {
          console.error("Failed to parse OpenAI response:", parseError);
        }

        res.status(200).json({ 
          message: "Recipe URL processed with alternatives.",
          url: input.url,
          alternatives,
        });
      } else {
        res.status(200).json({ 
          message: "Recipe URL received and logged.",
          url: input.url,
        });
      }
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      console.error("Error processing recipe:", err);
      throw err;
    }
  });

  return httpServer;
}
