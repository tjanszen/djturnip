import type { ExtractedRecipe } from "../recipeExtractor";

/**
 * =============================================================================
 * V2 URL REMIX PROMPT — COPY CONTRACT
 * =============================================================================
 * Reference: docs/agent_memory/imp_plans/updated_what_is_this_011126.md
 *
 * This prompt generates two top-level editorial fields plus 9 alternatives.
 * The fields have DISTINCT responsibilities and should NOT overlap:
 *
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │ WHAT IS THIS?                                                               │
 * ├─────────────────────────────────────────────────────────────────────────────┤
 * │ PURPOSE: Answers "Am I in the right place?"                                 │
 * │                                                                             │
 * │ MUST cover:                                                                 │
 * │   - Dish identity (what kind of food is this?)                              │
 * │   - Base ingredients in plain words                                         │
 * │   - Why it's easy to customize / make your own                              │
 * │                                                                             │
 * │ MUST NOT cover:                                                             │
 * │   - Why it tastes good (that's why_this_works)                              │
 * │   - Texture/flavor reasoning or technique                                   │
 * │   - Steps, tools, or cooking process                                        │
 * └─────────────────────────────────────────────────────────────────────────────┘
 *
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │ WHY THIS WORKS                                                              │
 * ├─────────────────────────────────────────────────────────────────────────────┤
 * │ PURPOSE: Answers "Why do people love this and keep making it?"              │
 * │                                                                             │
 * │ MUST cover:                                                                 │
 * │   - Flavor/texture payoff (why it's satisfying)                             │
 * │   - Why it endured / comfort factor / contrast that makes it craveable      │
 * │                                                                             │
 * │ MUST NOT cover:                                                             │
 * │   - Defining the dish (that's what_is_this)                                 │
 * │   - Listing ingredients                                                     │
 * │   - Mentioning "customize" or "tweak" (that's what_is_this territory)       │
 * └─────────────────────────────────────────────────────────────────────────────┘
 *
 * TONE GOALS (Phase 1 implemented):
 * - "Smart-simple": readable by anyone, not condescending to foodies
 * - Tweet-length: 1-2 short sentences each
 * - Plain language: avoid jargon (umami, aromatics, legumes, emulsify, acid)
 *   or translate immediately (e.g., "tangy" instead of "acid")
 * - Complementary overlap only: if both mention an element, each should add
 *   something the other doesn't
 *
 * Phase 1 COMPLETED:
 * - [x] Tweet-length constraints in prompt text
 * - [x] Plain-language guardrails (jargon bans + translations)
 * - [x] Anti-duplication instructions between the two fields
 * - [x] "Vary phrasing" instruction for customizability language
 * =============================================================================
 *
 * =============================================================================
 * V2 ALTERNATIVES EXPANSION — CONTRACT (Phase 0 Locked)
 * =============================================================================
 * Reference: docs/agent_memory/imp_plans/variations_10_15_protein_combinable.md
 *
 * UPCOMING CHANGES (Phases 1-3):
 * - alternatives count: 10–15 (variable based on recipe complexity)
 *   - Simple dishes: 10–11
 *   - Medium complexity: 12–13
 *   - Complex dishes: 14–15
 *
 * - New fields per alternative:
 *   - `id`: "alt_1", "alt_2", ..., "alt_N" (1-indexed, sequential, no gaps)
 *   - `combines_with`: string[] (0–2 ids of compatible variations)
 *
 * - Kind distribution:
 *   - basic ≥ 60%, delight ≥ 3, delight ≤ 40%
 *
 * - Protein/diet axis (savory dishes only):
 *   - At least 3 alternatives involve protein add/swap or vegan flip
 *   - At least 1 addresses fat+protein balance
 *   - ESCAPE HATCH: desserts/baking skip protein axis entirely
 *
 * - Combinability:
 *   - `combines_with` references must be valid alternative ids
 *   - No self-reference
 *   - Contradiction detection is LOG-ONLY (not hard validation)
 *
 * CURRENT STATE: 9 fixed alternatives (5 basic + 4 delight)
 * This contract documents the target state; no code changes yet.
 * =============================================================================
 */

export const V2_SYSTEM_PROMPT = `You are a chef assistant. Your job is to provide context about a recipe and propose swipe-card modifications that elevate it.

You will receive:
- Recipe title
- Ingredients list
- Instructions/steps

Return a JSON object with this EXACT structure:

{
  "what_is_this": "<see WHAT_IS_THIS rules below>",
  "why_this_works": "<see WHY_THIS_WORKS rules below>",
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

---
WHAT_IS_THIS RULES (top-level field):
- Length: 1–2 sentences max (tweet-length, readable at a glance)
- Tone: friendly, plain language, readable by non-foodies
- MUST cover:
  * What kind of dish this is
  * What it's usually made from (everyday words only: "beans" not "legumes", "tangy" not "acidic")
  * Why it's easy to change or make your own — but VARY the phrasing by dish type:
    - "absorbs whatever flavors you add"
    - "pairs with lots of toppings"
    - "works with what you have in the fridge"
    - "changes a lot depending on the sauce or spices"
    - Do NOT repeat "easy to adapt" or "highly customizable" in every recipe
- MUST NOT cover:
  * Why it tastes good (save that for why_this_works)
  * Texture or flavor payoff
  * Cooking techniques, steps, or tools
- Avoid jargon: acid, legume, umami, aromatics, emulsify. If a concept is needed, explain it simply.

---
WHY_THIS_WORKS RULES (top-level field):
- Length: 1–2 sentences max (tweet-length)
- Tone: simple, conversational, not academic
- MUST cover:
  * Why the textures and flavors are satisfying (comfort, contrast, balance)
  * Why people keep making this type of dish (it's familiar, it rewards patience, it hits the spot)
- MUST NOT cover:
  * Defining the dish (that's what_is_this)
  * Listing ingredients
  * Talking about customization or flexibility (that's what_is_this territory)
- Focus on: comfort, contrast (soft/crunchy, rich/fresh, sweet/savory), slow payoff, balance, or familiarity
- Use plain cause-and-effect language, no jargon

---
ANTI-DUPLICATION: what_is_this and why_this_works must NOT repeat the same idea. If both mention an element, each must add something the other doesn't.

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
1. "what_is_this" — tweet-length (1–2 sentences): what kind of dish + main ingredients + why it's flexible (vary phrasing, no jargon)
2. "why_this_works" — tweet-length (1–2 sentences): why the flavors/textures satisfy + why people keep making it (no definitions, no ingredients list, no "customize")
3. Exactly 9 swipe-card alternatives (5 basic + 4 delight)

Recipe title: ${recipe.title}

Ingredients:
${ingredientsList}

Instructions:
${instructionsList}

Remember:
- what_is_this and why_this_works must NOT overlap or repeat the same idea
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
