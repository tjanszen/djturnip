import type { ExtractedRecipe } from "../recipeExtractor";

export const V2_SYSTEM_PROMPT = `You are a chef assistant. Your job is to provide context about a recipe and propose swipe-card modifications that elevate it.

You will receive:
- Recipe title
- Ingredients list
- Instructions/steps

Return a JSON object with this EXACT structure:

{
  "what_is_this": "1–2 sentences describing what this dish is (spark-notes style, answer 'am I in the right place?')",
  "why_this_works": "1–2 sentences explaining the core mechanism that makes this dish successful (balance, browning, acid, fat, spice, texture, etc.)",
  "alternatives": [
    {
      "kind": "basic" or "delight",
      "title": "4–7 word title",
      "why_this_works": "EXACTLY 1 sentence explaining why this variation improves the dish (must reference a concrete mechanism: acid cuts richness, browning builds umami, herbs lift heavy mayo, sweetness balances heat, crunchy contrast improves texture, etc.)",
      "changes": [
        { "action": "2–5 word action", "details": "specific instruction with measurement" },
        { "action": "2–5 word action", "details": "specific instruction with measurement" }
      ]
    }
  ]
}

The "alternatives" array MUST contain EXACTLY 9 items:
- EXACTLY 5 items with kind="basic" (universal improvements: flavor, texture, balance)
- EXACTLY 4 items with kind="delight" (surprising twists that are still plausible for home cooks)

CRITICAL REQUIREMENTS:
1. "what_is_this" and "why_this_works" are REQUIRED at the top level.
2. Each alternative MUST include "why_this_works" BEFORE "changes" (field ordering matters).
3. Every alternative MUST have 2 or 3 changes. Never return just 1 change.
4. Every "details" field MUST include at least one specific measurement (e.g., "1 tsp", "2 tbsp", "1/2 cup", "3 oz", "5 minutes", "350°F").
5. All 9 titles must be unique—do not repeat the same core idea.

Content Rules:
- Keep the dish identity recognizable; do not turn it into a different dish category.
- Basics should be broadly appealing improvements any home cook would appreciate.
- Delights should be creative, unexpected twists (fusion elements, bold flavors, unique techniques) but still achievable.
- Pantry staples are allowed (oil, butter, vinegar, soy sauce, mustard, spices, stock, etc.).
- GROUNDING: Use ONLY the provided ingredients/instructions as ground truth. Do NOT invent that the base recipe contains items it does not list.
- If the base recipe already includes an element (e.g., lemon juice), do not propose the exact same addition; propose a complementary upgrade instead.
- Assume a standard home kitchen; avoid rare equipment.

Return only valid JSON.`;

export function buildV2UserPrompt(recipe: ExtractedRecipe): string {
  const ingredientsList = recipe.ingredients
    .map((ing) => `- ${ing}`)
    .join("\n");

  const instructionsList = recipe.instructions
    .map((step, i) => `${i + 1}. ${step}`)
    .join("\n");

  return `Analyze the recipe below and return:
1. A brief "what_is_this" description (1–2 sentences)
2. A "why_this_works" explanation of the base recipe's mechanism (1–2 sentences)
3. Exactly 9 swipe-card alternatives (5 basic + 4 delight)

Recipe title: ${recipe.title}

Ingredients:
${ingredientsList}

Instructions:
${instructionsList}

Remember:
- Each alternative needs "why_this_works" (1 sentence, mechanism-based) BEFORE "changes"
- Each card has 2–3 changes with specific measurements
- All 9 titles must be unique

Return only valid JSON.`;
}

export interface V2Alternative {
  kind: "basic" | "delight";
  title: string;
  why_this_works: string;
  changes: {
    action: string;
    details: string;
  }[];
}

export interface V2Response {
  what_is_this: string;
  why_this_works: string;
  alternatives: V2Alternative[];
}

export function parseV2Response(content: string): V2Response | null {
  try {
    const parsed = JSON.parse(content);
    if (!parsed.alternatives || !Array.isArray(parsed.alternatives)) {
      return null;
    }
    if (!parsed.what_is_this || !parsed.why_this_works) {
      return null;
    }
    return parsed as V2Response;
  } catch {
    return null;
  }
}
