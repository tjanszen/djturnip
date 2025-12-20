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
        console.log("Generating 9 creative recipe alternatives...");
        
        const response = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: "You are a creative chef. Generate exactly 9 unique recipe alternatives inspired by the given recipe URL. Return a JSON array with objects containing: title (creative name), description (one sentence), cuisine (type of cuisine). Be creative and diverse in your suggestions."
            },
            {
              role: "user",
              content: `Generate 9 creative recipe alternatives inspired by this recipe: ${input.url}`
            }
          ],
          response_format: { type: "json_object" },
          max_tokens: 1500,
        });

        const content = response.choices[0]?.message?.content || "{}";
        let alternatives: { title: string; description: string; cuisine: string }[] = [];
        
        try {
          const parsed = JSON.parse(content);
          alternatives = parsed.alternatives || parsed.recipes || [];
          
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
