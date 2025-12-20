import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  app.post(api.recipes.process.path, async (req, res) => {
    try {
      const input = api.recipes.process.input.parse(req.body);
      
      // Log to server console as requested
      console.log("Received Recipe URL:", input.url);
      console.log("ALT_RECIPES flag:", process.env.ALT_RECIPES || "off");

      // In the future, if ALT_RECIPES=on, we might do complex parsing here.
      // For now, we just acknowledge receipt.
      
      await storage.createRecipe({ url: input.url });

      res.status(200).json({ 
        message: "Recipe URL received and logged.",
        url: input.url 
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  return httpServer;
}
