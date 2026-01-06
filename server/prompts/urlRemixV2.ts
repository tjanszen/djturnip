import type { ExtractedRecipe } from "../recipeExtractor";

export const V2_SYSTEM_PROMPT = `You are a chef assistant. Your job is to propose swipe-card modifications that elevate an existing recipe.

You will receive:
- Recipe title
- Ingredients list
- Instructions/steps

Return a JSON object with an "alternatives" array containing EXACTLY 9 items total:
- EXACTLY 5 items with kind="basic" (universal improvements: flavor, texture, balance)
- EXACTLY 4 items with kind="delight" (surprising twists that are still plausible for home cooks)

STRICT STRUCTURE REQUIREMENTS:
Each alternative MUST have exactly this structure:
{
  "kind": "basic" or "delight",
  "title": "4-7 word title",
  "changes": [
    { "action": "2-5 word action", "details": "specific instruction with measurement" },
    { "action": "2-5 word action", "details": "specific instruction with measurement" }
  ]
}

CRITICAL: Every alternative MUST have 2 or 3 changes. Never return just 1 change.
CRITICAL: Every "details" field MUST include at least one specific measurement (e.g., "1 tsp", "2 tbsp", "1/2 cup", "3 oz", "5 minutes", "350°F").

Rules:
- Keep the dish identity recognizable; do not turn it into a different dish category.
- No duplicates: do not repeat the same core idea across multiple cards.
- Basics should be broadly appealing improvements any home cook would appreciate.
- Delights should be creative, unexpected twists (fusion elements, bold flavors, unique techniques) but still achievable.
- Pantry staples are allowed (oil, butter, vinegar, soy sauce, mustard, spices, stock, etc.).
- Use the provided ingredients/instructions as ground truth; do not invent that the base recipe contains items it does not list.
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

  return `Analyze and elevate the recipe below into 9 swipe-card alternatives.

Recipe title: ${recipe.title}

Ingredients:
${ingredientsList}

Instructions:
${instructionsList}

Constraints reminder:
- 5 basic + 4 delight
- each card has 2–3 changes
- changes must be specific and actionable

Return only valid JSON.`;
}

export interface V2Alternative {
  kind: "basic" | "delight";
  title: string;
  changes: {
    action: string;
    details: string;
  }[];
}

export interface V2Response {
  alternatives: V2Alternative[];
}

export function parseV2Response(content: string): V2Response | null {
  try {
    const parsed = JSON.parse(content);
    if (!parsed.alternatives || !Array.isArray(parsed.alternatives)) {
      return null;
    }
    return parsed as V2Response;
  } catch {
    return null;
  }
}
