# Implementation Plan — Recipe Summary + Cook Mode V2 (Revised)

Owner: TBD  
Status: Draft (updated per Replit agent feedback)  
Feature flag: RECIPE_DETAIL_V2 (OFF by default)  
Scope: Redesign the generated recipe experience into:
1) A **Recipe Summary screen** (review + swap ingredients)  
2) A **Cook Mode screen** (steps-focused, post “Let’s Cook!”)

---

## Snapshot / Assumptions

- Builds on top of the **New Recipe** consolidated flow (FRIDGE_SINGLE_RECIPE_SCREEN_V1).
- This plan is gated separately under **RECIPE_DETAIL_V2** (distinct feature, separate rollout).
- Recipe generation will return a **new, richer RecipeDTO** before any UI work begins.
- Ingredient substitutions are:
  - Generated once during recipe generation
  - Static + curated
  - Client-side only (no regeneration required)
- “Generate Again” always uses the **original ingredient list**.
- “Edit Ingredients” always returns to **New Recipe**, without substitutions.
- Steps are displayed on a **separate screen/page** (Cook Mode).

---

## Goals

1. Get the backend/LLM contract right first (no UI retrofitting).
2. Improve readability and scannability of generated recipes.
3. Introduce safe ingredient substitution without regeneration.
4. Separate “review” from “cook” mental modes.
5. Prepare data model for future dietary constraints and logic.

---

## Non-Goals (V1)

- Regenerating recipes after ingredient swaps
- Dietary filters or constraints
- Shopping lists or pantry tracking
- Step timers or step-by-step progression
- Accessibility optimizations (out of scope for now)

---

## Data Model — RecipeDTO V2

### RecipeDTO

    RecipeDTO {
      name: string
      description: string
      servings: number
      time_minutes: number | null
      calories_per_serving: number | null

      ingredients: IngredientItem[]
      steps: StepItem[]
    }

### IngredientItem

    IngredientItem {
      id: string                 // stable ID for step references
      name: string               // exact string (e.g. "red onion")
      amount: string | null      // "½ cup, chopped" | null for "to taste"
      substitutes: SubstituteItem[]
    }

### SubstituteItem

    SubstituteItem {
      id: string
      name: string               // "shallot"
      amount: string             // "¼ cup, chopped"
    }

### StepItem

    StepItem {
      text: string               // fully rendered instruction text
      ingredient_ids: string[]   // references IngredientItem.id
      time_minutes: number | null
    }

---

## UX Flow (V2)

1. New Recipe → Generate  
2. Recipe Summary Screen  
   - Review recipe  
   - Swap ingredients  
   - Primary CTA: Let’s Cook!  
3. Cook Mode Screen  
   - Step-by-step instructions with times  
   - Bottom CTAs: Favorite | Done  

---

## Phase 1 — Generation Prompt + Model Updates (FIRST)

**Intent:** Lock the correct RecipeDTO shape before building UI.

### Deliverables

- Update OpenAI generation prompt to output RecipeDTO V2.
- Ingredients returned as structured objects with:
  - id
  - name
  - amount
  - substitutes (static list)
- Steps returned as structured StepItem objects:
  - text includes ingredient amounts in parentheses
  - ingredient_ids references IngredientItem.id (Option B)
  - time_minutes provided per step (minutes, nullable)

### Guardrails

- Substitutes must not materially change cooking method.
- If no reasonable substitute exists, return empty substitutes array.
- Steps must not rely on string replacement for substitutions.

### Acceptance

- RecipeDTO validates reliably against schema.
- No best-effort parsing required in UI.
- Step text + ingredient references are consistent.

---

## Phase 2 — Recipe Summary Screen (Read-Only)

**Intent:** Replace the existing recipe result screen with the new summary layout.

### Deliverables

- New Recipe Summary screen (flagged under RECIPE_DETAIL_V2).
- Content order:
  1. Recipe Name
  2. Short Description
  3. Metadata row: Servings | Time | Cals
  4. Ingredients section (2-column layout)
  5. Primary CTA: Let’s Cook!
  6. Secondary CTA: Generate Again

### Ingredients Layout

- Two-column grid:
  - Column 1: Ingredient name
  - Column 2: Amount (empty if null)

### Acceptance

- Screen renders using RecipeDTO V2.
- No steps displayed.
- Let’s Cook CTA may be no-op initially.

---

## Phase 3 — Ingredient Substitution (Bottom Sheet)

**Intent:** Allow users to swap ingredients safely without regeneration.

### Deliverables

- Ingredient rows become conditionally tappable:
  - If substitutes.length > 0 → row shows chevron and is tappable
  - If substitutes.length === 0 → no chevron; row is not tappable
- Bottom sheet on tap:
  - Header: Ingredient name + amount
  - Radio list of substitutes
  - Original ingredient included as an option (for revert)
  - CTA: Swap

### Behavior Rules

- Swaps update a local “working copy” of IngredientItem.
- Original RecipeDTO remains untouched.
- If no substitutes exist:
  - Bottom sheet does NOT open
  - Visual affordance communicates non-swappable state.

### Acceptance

- User can swap and revert ingredients.
- UI updates immediately.
- Generate Again ignores substitutions.

---

## Phase 4 — Let’s Cook → Cook Mode Screen

**Intent:** Move steps into a focused, task-oriented cooking experience.

### Deliverables

- New Cook Mode screen/page.
- Navigation from Recipe Summary via Let’s Cook CTA.

### Cook Mode Layout

1. Recipe name (small)
2. Steps list:
   - Numbered
   - Step text rendered from StepItem.text
   - Time estimate appended (e.g. “~5 minutes”)
3. Bottom CTAs:
   - Favorite (placeholder)
   - Done (placeholder)

### Substitution Handling

- Step rendering uses ingredient_ids to determine which ingredient names/amounts to display.
- If a user swapped an ingredient:
  - Step text dynamically reflects the substituted ingredient (via ID mapping, not string replacement).

### Navigation Rules

- Back arrow → Recipe Summary
- No ingredient editing in Cook Mode

### Acceptance

- Steps render clearly with times (minutes).
- Ingredient substitutions are reflected correctly and safely.
- No generation or parsing logic runs here.

---

## Phase 5 — Navigation + State Integrity

**Intent:** Ensure predictable behavior across all user actions.

### Rules

- Edit Ingredients → New Recipe (original inputs only)
- Generate Again → regenerate with original ingredients/prefs
- Back navigation:
  - Cook Mode → Recipe Summary
  - Recipe Summary → New Recipe

### Acceptance

- No path leaks into legacy flows.
- Substitutions are ephemeral to summary + cook mode only.
- FRIDGE_SINGLE_RECIPE_SCREEN_V1 and RECIPE_DETAIL_V2 remain independent.

---

## Risks & Mitigations

- Model output inconsistency  
  → Strict schema validation + retry

- Ingredient/step mismatch  
  → ID-based references (no string replacement)

- UX confusion around non-swappable ingredients  
  → Clear visual affordance (no chevron, no tap)

---

## Readiness Check

- Inputs ready?  
  - Yes — RecipeDTO evolution approved.
- Flags named?  
  - FRIDGE_SINGLE_RECIPE_SCREEN_V1 (flow)  
  - RECIPE_DETAIL_V2 (recipe detail UX)
- Evidence defined?  
  - Schema validation, visual verification, navigation correctness.

---

## Next Steps

- Write Replit agent prompt for **Phase 1 (Generation prompt + schema)**, or
- Write prompts for **Phase 2–3 (Recipe Summary + Substitution UX)**.
