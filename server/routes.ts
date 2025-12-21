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
