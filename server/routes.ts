import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { recipeDTOV2Schema, type RecipeDTOV2 } from "@shared/schema";
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
   - "ingredients": Array of 4-10 STRINGS with quantity and ingredient (e.g., "2 cups diced chicken", "1 large carrot, sliced")
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
            
            // Normalize AI responses to handle malformed data
            recipes = recipes.map(recipe => {
              // Normalize ingredients: convert objects to strings, trim, filter empty
              if (recipe.ingredients && Array.isArray(recipe.ingredients)) {
                recipe.ingredients = recipe.ingredients
                  .map((item: unknown) => {
                    if (typeof item === 'string') {
                      return item.trim();
                    }
                    if (typeof item === 'object' && item !== null) {
                      const obj = item as Record<string, unknown>;
                      // Handle {name, quantity} or {ingredient, amount} formats
                      const name = String(obj.name || obj.ingredient || obj.item || '').trim();
                      const quantity = String(obj.quantity || obj.amount || '').trim();
                      if (quantity && name) {
                        return `${quantity} ${name}`;
                      }
                      return name || JSON.stringify(item);
                    }
                    return String(item).trim();
                  })
                  .filter((s: string) => s.length > 0);
              }
              
              // Normalize category to valid lowercase enum values
              const validCategories = ['main', 'appetizer', 'snack', 'breakfast', 'lunch', 'dinner', 'side', 'dessert'];
              const categoryLower = (recipe.category || '').toLowerCase();
              if (validCategories.includes(categoryLower)) {
                recipe.category = categoryLower;
              } else {
                // Map common variations to valid categories
                const categoryMap: Record<string, string> = {
                  'comfort food': 'main',
                  'comfort': 'main',
                  'entree': 'main',
                  'entrée': 'main',
                  'meal': 'main',
                  'brunch': 'breakfast',
                  'starter': 'appetizer',
                  'treat': 'dessert',
                  'sweet': 'dessert',
                };
                recipe.category = categoryMap[categoryLower] || 'main';
              }
              
              // Normalize skipped_ingredients to handle malformed AI responses
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

  // Single Recipe Generation endpoint (V2 only - structured ingredients with substitutes)
  app.post(api.recipes.generateSingle.path, async (req, res) => {
    try {
      const input = api.recipes.generateSingle.input.parse(req.body);
      const { ingredients, prefs, allow_extras } = input;
      
      if (process.env.FRIDGE_NEW_FLOW_V1 !== "on") {
        return res.status(200).json({
          success: false,
          error: "Recipe generation is disabled",
          parse_retry: 0,
        });
      }

      console.log("recipe_v2_generate_start");
      
      const timeInstruction = prefs.time === "best" 
        ? "Choose the most appropriate cooking time for the recipe" 
        : `Target cooking time: ${prefs.time} minutes`;
      
      const cuisineInstruction = prefs.cuisine === "any"
        ? "Choose any cuisine style that works well with the ingredients"
        : `Cuisine style: ${prefs.cuisine}`;

      console.log("recipe_schema_explanation_supported");
      
      const systemPrompt = `You are a creative home chef. Generate exactly ONE recipe based on the given ingredients and preferences.

STRICT REQUIREMENTS - Return a JSON object with these EXACT fields:

1. "name": Recipe name (string, 3-8 words)
2. "description": Brief description (string, 1-2 sentences)
3. "explanation": 1-3 concise sentences explaining why the core idea or twist works (in terms of flavor, texture, or technique)
4. "servings": Number of servings (must be ${prefs.servings})
5. "time_minutes": Total estimated cooking time in minutes (number or null)
6. "calories_per_serving": Estimated calories per serving (number or null)

7. "ingredients": Array of ingredient objects. Each object MUST have:
   - "id": Unique stable ID like "ing_1", "ing_2", etc.
   - "name": The ingredient name (e.g., "red onion", "chicken breast")
   - "amount": Quantity with unit (e.g., "1/2 cup, diced") or null for "to taste"
   - "substitutes": Array of substitute options (can be empty []). Each substitute has:
     - "id": Unique ID like "sub_1_1" (first sub for ing_1)
     - "name": Substitute ingredient name (e.g., "shallot")
     - "amount": Equivalent amount (e.g., "1/4 cup, minced")
   
   SUBSTITUTION RULES:
   - Only include substitutes that do NOT materially change the cooking method
   - If no reasonable substitute exists, use empty array []
   - 1-2 substitutes per ingredient is ideal

8. "steps": Array of step objects. Each object MUST have:
   - "id": Unique stable ID like "step_1", "step_2", etc.
   - "text": The full instruction text. MUST include ingredient amounts in parentheses after ingredient mentions (e.g., "Add the chicken (2 cups, diced) to the pan")
   - "ingredient_ids": Array of ingredient IDs used in this step (e.g., ["ing_1", "ing_3"])
   - "time_minutes": Time for this step in minutes (number or null)

9. "image_prompt": A single paragraph (max ~120 words) describing what the finished dish looks like for a photorealistic image.
   MUST include:
   - Cooking method and vessel (e.g., "baked in a cast iron skillet", "roasted on a sheet pan")
   - 2-4 hero ingredients visible in the final dish
   - 1-2 texture/doneness cues (e.g., "golden-brown crust", "glossy sauce", "charred edges")
   - Photography style: "photorealistic, home-cooked, natural window light, 45-degree angle, neutral background, shallow depth of field"
   MUST NOT include:
   - Any garnish, herbs, or ingredients NOT in the recipe
   - Lemon slices, parsley, microgreens, or decorative elements unless explicitly used
   - Hands, utensils, bread, wine glasses, or people
   - Text, watermarks, or restaurant plating

10. "remixes": Array with EXACTLY 3-4 remix objects. Each remix is a small, intent-preserving adjustment.
    Each remix object MUST have:
    - "id": Unique ID like "remix_1", "remix_2", etc.
    - "title": Short user-facing label (2-5 words, e.g., "Extra Saucy", "Herb It Up", "Mash the Potatoes")
    - "description": One sentence explaining what changes and why
    - "patch": Object with ONLY these optional fields:
      - "ingredient_overrides": Array of { "ingredient_id": string, "amount"?: string } to modify existing ingredient amounts
      - "add_ingredients": Array of { "id": string, "name": string, "amount": string } for new ingredients (MAX 2-3, pantry staples don't count)
      - "step_ops": Array of step operations:
        - { "op": "add_after", "after_step_id": string, "step": { "id": string, "text": string, "ingredient_ids": [], "time_minutes": number|null } }
        - { "op": "replace", "step_id": string, "step": { "id": string, "text": string, "ingredient_ids": [], "time_minutes": number|null } }
        - { "op": "remove", "step_id": string }
      - "meta_updates": { "time_minutes"?: number, "calories_per_serving"?: number } - only if obviously affected

    REMIX RULES:
    - Preserve the core identity of the dish - do NOT rename the recipe
    - Do NOT remove core ingredients (only optional/garnish-level ingredients)
    - Each remix should change only ONE axis: texture/sauce OR flavor emphasis OR technique/format
    - Each remix should touch at most 2-3 ingredients/steps
    - Pantry staples (oil, vinegar, soy sauce, mustard, common spices) can be assumed and don't count toward new ingredient limits
    - Time/calorie updates only when obviously impacted

EXAMPLE remix:
{
  "id": "remix_1",
  "title": "Extra Saucy",
  "description": "Double the sauce and add a splash of cream for a richer, more indulgent finish.",
  "patch": {
    "ingredient_overrides": [{ "ingredient_id": "ing_3", "amount": "1 cup" }],
    "add_ingredients": [{ "id": "ing_new_1", "name": "heavy cream", "amount": "2 tbsp" }],
    "step_ops": [
      { "op": "add_after", "after_step_id": "step_4", "step": { "id": "step_4a", "text": "Stir in heavy cream (2 tbsp) and simmer for 1 minute.", "ingredient_ids": ["ing_new_1"], "time_minutes": 1 } }
    ],
    "meta_updates": { "calories_per_serving": 380 }
  }
}

EXAMPLE ingredient:
{
  "id": "ing_1",
  "name": "red onion",
  "amount": "1/2 cup, diced",
  "substitutes": [
    { "id": "sub_1_1", "name": "shallot", "amount": "1/4 cup, minced" },
    { "id": "sub_1_2", "name": "yellow onion", "amount": "1/2 cup, diced" }
  ]
}

EXAMPLE step:
{
  "id": "step_1",
  "text": "Heat oil in a pan over medium heat. Add the red onion (1/2 cup, diced) and sauté until translucent, about 3 minutes.",
  "ingredient_ids": ["ing_1"],
  "time_minutes": 3
}

${timeInstruction}
${cuisineInstruction}

Keep unit system consistent throughout (don't mix cups and grams).
Return ONLY valid JSON. No markdown, no explanation.`;

        const isPromptV3 = process.env.PROMPT_V3_HOMECOOK === "on";
        
        const userPrompt = isPromptV3
          ? `You are an experienced, thoughtful home-cook assistant.

Create a recipe for ${prefs.servings} servings using these ingredients: ${ingredients.join(", ")}

The recipe should:
- Feel familiar and achievable for a confident home cook
- Include one clever but intuitive twist they likely wouldn't have thought of
- Use pantry staples freely for balance and depth
- Anchor itself in a recognizable dish or technique

Avoid novelty for its own sake. The result should feel obvious in hindsight.`
          : `Create a recipe for ${prefs.servings} servings using these ingredients: ${ingredients.join(", ")}`;
        
        if (isPromptV3) {
          console.log("recipe_user_prompt_v3_loaded");
        }

        let parseRetry = 0;
        let lastError = "";
        
        for (let attempt = 0; attempt < 2; attempt++) {
          try {
            const messages = attempt === 0 
              ? [
                  { role: "system" as const, content: systemPrompt },
                  { role: "user" as const, content: userPrompt }
                ]
              : [
                  { role: "system" as const, content: systemPrompt },
                  { role: "user" as const, content: userPrompt },
                  { role: "assistant" as const, content: lastError },
                  { role: "user" as const, content: `The previous response was invalid: ${lastError}. Fix the JSON to match the schema exactly. Return ONLY valid JSON.` }
                ];

            const response = await openai.chat.completions.create({
              model: "gpt-4o-mini",
              messages,
              response_format: { type: "json_object" },
              max_tokens: 3000,
            });

            const content = response.choices[0]?.message?.content || "";
            
            let parsed;
            try {
              parsed = JSON.parse(content);
            } catch {
              lastError = `Invalid JSON: ${content.substring(0, 200)}`;
              parseRetry = 1;
              console.log(`recipe_v2_parse_retry=${parseRetry}`);
              continue;
            }

            // Validate with Zod schema
            const validation = recipeDTOV2Schema.safeParse(parsed);
            if (!validation.success) {
              const errors = validation.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; ');
              lastError = `Schema validation failed: ${errors}`;
              parseRetry = 1;
              console.log(`recipe_v2_parse_retry=${parseRetry}`);
              continue;
            }

            const recipe: RecipeDTOV2 = validation.data;

            // Validate step IDs are present and unique
            const stepIds = new Set<string>();
            let hasStepIdIssue = false;
            for (const step of recipe.steps) {
              if (!step.id || step.id.trim() === '') {
                lastError = `Step missing required 'id' field`;
                parseRetry = 1;
                console.log(`recipe_v2_parse_retry=${parseRetry}`);
                hasStepIdIssue = true;
                break;
              }
              if (stepIds.has(step.id)) {
                lastError = `Duplicate step ID: ${step.id}`;
                parseRetry = 1;
                console.log(`recipe_v2_parse_retry=${parseRetry}`);
                hasStepIdIssue = true;
                break;
              }
              stepIds.add(step.id);
            }
            if (hasStepIdIssue) continue;

            // Validate ingredient_ids in steps reference actual ingredients
            const ingredientIds = new Set(recipe.ingredients.map(i => i.id));
            let hasInvalidRef = false;
            for (const step of recipe.steps) {
              for (const refId of step.ingredient_ids) {
                if (!ingredientIds.has(refId)) {
                  lastError = `Step references unknown ingredient ID: ${refId}`;
                  parseRetry = 1;
                  console.log(`recipe_v2_parse_retry=${parseRetry}`);
                  hasInvalidRef = true;
                  break;
                }
              }
              if (hasInvalidRef) break;
            }
            if (hasInvalidRef) continue;

            // Validate remixes reference valid step and ingredient IDs
            let hasRemixIssue = false;
            for (const remix of recipe.remixes) {
              if (remix.patch.ingredient_overrides) {
                for (const override of remix.patch.ingredient_overrides) {
                  if (!ingredientIds.has(override.ingredient_id)) {
                    lastError = `Remix ${remix.id} references unknown ingredient ID: ${override.ingredient_id}`;
                    parseRetry = 1;
                    console.log(`recipe_v2_parse_retry=${parseRetry}`);
                    hasRemixIssue = true;
                    break;
                  }
                }
              }
              if (hasRemixIssue) break;
              
              if (remix.patch.step_ops) {
                for (const op of remix.patch.step_ops) {
                  if (op.op === 'add_after' && !stepIds.has(op.after_step_id)) {
                    lastError = `Remix ${remix.id} references unknown step ID: ${op.after_step_id}`;
                    parseRetry = 1;
                    console.log(`recipe_v2_parse_retry=${parseRetry}`);
                    hasRemixIssue = true;
                    break;
                  }
                  if ((op.op === 'replace' || op.op === 'remove') && !stepIds.has(op.step_id)) {
                    lastError = `Remix ${remix.id} references unknown step ID: ${op.step_id}`;
                    parseRetry = 1;
                    console.log(`recipe_v2_parse_retry=${parseRetry}`);
                    hasRemixIssue = true;
                    break;
                  }
                }
              }
              if (hasRemixIssue) break;
            }
            if (hasRemixIssue) continue;

          console.log("recipe_v2_parse_success");
          console.log("recipe_image_prompt_generated");
          console.log("recipe_remixes_phase2_prompt_updated");
          
          return res.status(200).json({
            success: true,
            recipe,
            parse_retry: parseRetry,
          });
            
          } catch (apiError) {
            lastError = apiError instanceof Error ? apiError.message : "API call failed";
            parseRetry = 1;
            console.log(`recipe_v2_parse_retry=${parseRetry}`);
          }
        }

      // Both attempts failed
      console.log(`recipe_v2_generate_error error=${lastError}`);
      
      return res.status(200).json({
        success: false,
        error: lastError || "Failed to generate recipe after 2 attempts",
        parse_retry: parseRetry,
      });
      
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      console.error("Error generating single recipe:", err);
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

  // Recipe Image Generation endpoint
  app.post("/api/recipes/generate-image", async (req, res) => {
    try {
      const { prompt } = req.body;
      
      if (!prompt || typeof prompt !== "string") {
        return res.status(400).json({ error: "prompt is required" });
      }

      console.log("recipe_image_gen_request");
      
      const response = await openai.images.generate({
        model: "gpt-image-1",
        prompt,
        n: 1,
        size: "1024x1024", // Square format for recipe hero images
      });

      const imageData = response.data?.[0];
      
      if (!imageData) {
        console.log("recipe_image_gen_fail reason=no_data");
        return res.status(500).json({ error: "No image data returned" });
      }

      console.log("recipe_image_gen_success");
      
      // Return URL if available, otherwise base64
      res.json({
        image_url: imageData.url || `data:image/png;base64,${imageData.b64_json}`,
      });
    } catch (error) {
      console.error("recipe_image_gen_fail", error);
      res.status(500).json({ error: "Failed to generate image" });
    }
  });

  return httpServer;
}
