Goal: Implement Phase 1 of the “Recipe Remixes” feature by updating the V2 recipe schema to support step IDs and remix patch objects.

Context:
- This work follows the implementation plan documented at:
  docs/agent_memory/imp_plans/recipe-remixes.md
- Before making changes, review that document to understand scope, non-goals, and design decisions.
- Phase 1 is schema-only. No prompt, UI, cook mode, or telemetry changes should be made in this step.

Do:
- Review docs/agent_memory/imp_plans/recipe-remixes.md (Phase 1 — Schema updates) to confirm intent and constraints.
- Update the V2 recipe schema in shared/schema.ts (recipeDTOV2Schema) to include:

  1) Step IDs
     - Add a required `id: string` field to each item in `steps[]`.
     - Keep all existing step fields unchanged (text, ingredient_ids, time_minutes).

  2) Remixes array
     - Add a new required field `remixes: Remix[]` to the recipe schema.
     - Define a Remix schema with:
       - id: string
       - title: string
       - description: string
       - patch: object supporting ONLY the following optional fields:
         - ingredient_overrides?: [{ ingredient_id: string, amount?: string }]
         - add_ingredients?: [{ id: string, name: string, amount: string }]
         - step_ops?: array of:
           - { op: "add_after", after_step_id: string, step: { id, text, ingredient_ids, time_minutes? } }
           - { op: "replace", step_id: string, step: { id, text, ingredient_ids, time_minutes? } }
           - { op: "remove", step_id: string }
         - meta_updates?: { time_minutes?: number, calories_per_serving?: number }

- Ensure the schema remains strict and consistent with existing validation patterns.
- Update any inferred TypeScript types derived from the schema (e.g., z.infer) so they reflect the new fields.

Do NOT:
- Modify recipe generation prompts
- Modify server routes or handlers beyond schema compilation fixes
- Add UI, cook mode, remix logic, or telemetry
- Add feature flags
- Make remixes optional unless strictly required to avoid breaking existing parsing (prefer required per the plan)

Proof:
- Logs include: "schema_v2_remixes_phase1_complete"
- TypeScript build passes with no unused or broken types
- Zod validation fails (expected) if:
  - a step is missing `id`
  - the recipe object is missing `remixes`
- No other runtime behavior changes are observed


Goal: Implement Phase 2 of the “Recipe Remixes” feature by updating the recipe generation prompt to emit step IDs and structured remixes that conform to the V2 schema.

Context:
- This work follows the implementation plan documented at:
  docs/agent_memory/imp_plans/recipe-remixes.md
- Before making changes, review that document to understand scope, constraints, and non-goals.
- Phase 2 is prompt-only. No schema, UI, cook mode, or telemetry changes should be made in this step.
- Phase 1 (schema changes) is assumed complete and available.

Do:
- Review docs/agent_memory/imp_plans/recipe-remixes.md (Phase 2 — Generation prompt updates).
- Locate the recipe generation prompt in:
  server/routes.ts under the /api/recipes/generate-single endpoint.
- Update the prompt instructions so that the AI MUST return JSON that includes:

  1) Step IDs
     - Each item in `steps[]` must include a required `id: string`.
     - IDs should be unique within the recipe.
     - Keep all existing step fields unchanged (text, ingredient_ids, time_minutes).

  2) Remixes array
     - Include a `remixes` array with EXACTLY 3–4 remix objects.
     - Each remix must include:
       - id: string
       - title: short, user-facing label (e.g., “Extra Saucy”, “Herb It Up”)
       - description: one sentence explaining what changes and why
       - patch: structured patch object that conforms exactly to the V2 schema:
         - ingredient_overrides?: [{ ingredient_id, amount? }]
         - add_ingredients?: [{ id, name, amount }] (max 2–3)
         - step_ops?: array of:
           - { op: "add_after", after_step_id, step }
           - { op: "replace", step_id, step }
           - { op: "remove", step_id }
         - meta_updates?: { time_minutes?, calories_per_serving? }

- Enforce remix generation rules in the prompt:
  - Preserve the core identity of the dish.
  - Do NOT rename the recipe.
  - Do NOT remove core ingredients.
  - Each remix should change only ONE axis:
    - texture/sauce OR
    - flavor emphasis OR
    - technique/format.
  - Each remix should touch at most 2–3 ingredients/steps.
  - Remixes may add up to 2–3 non-pantry ingredients.
  - Pantry staples (oil, vinegar, soy sauce, mustard, common spices) may be assumed and do NOT count toward the new ingredient limit.
  - Time/calorie updates should be included ONLY when obviously impacted.

- Add or reinforce a strict output constraint:
  - “Return ONLY valid JSON that conforms to the schema. Do not include any text before or after the JSON object.”

- Keep all existing recipe fields, cuisine logic, and generation behavior unchanged aside from adding step IDs and remixes.

Do NOT:
- Modify shared/schema.ts
- Modify UI components
- Modify cook mode
- Add remix application logic
- Add feature flags
- Change model parameters (temperature, top_p, etc.) in this phase

Proof:
- Logs include: "recipe_remixes_phase2_prompt_updated"
- Generated recipes consistently:
  - include step IDs on every step
  - include 3–4 remixes
  - pass recipeDTOV2Schema validation without retries
- Remix patch objects reference valid step IDs and ingredient IDs
- No user-facing behavior changes yet


Goal: Implement Phase 3 of the “Recipe Remixes” feature by adding a Remix UI section to the Recipe Detail Page and supporting apply-one + undo behavior (no stacking), without changing Cook Mode or telemetry yet.

Context:
- This work follows the implementation plan documented at:
  docs/agent_memory/imp_plans/recipe-remixes.md
- Before making changes, review that document to confirm Phase 3 scope and non-goals.
- Phase 1 (schema) and Phase 2 (prompt output) are assumed complete, so generated recipes now include:
  - steps[].id
  - remixes[3–4] with patch objects
- Current architecture notes (from prior review):
  - generatedRecipe is immutable in React state
  - workingIngredients is managed separately for substitutions
  - Cook Mode reads from generatedRecipe state (do not change in this phase)
  - recipeKey is based on name + ingredients + steps; do not cause image regeneration on remix apply

Do:
- Review docs/agent_memory/imp_plans/recipe-remixes.md (Phase 3 — UI: remix section + apply/undo).
- In the Recipe Detail Page (“fridge-result” view) UI:
  - Add a new section titled “Remix this recipe” (or “Remix Recipe”) placed below the Ingredients section (preferred).
  - Render 3–4 remix options from `generatedRecipe.remixes` as tappable cards/rows showing:
    - remix.title
    - remix.description (1 line / short wrap)
- Add UI state to support one active remix:
  - activeRemixId: string | null
  - remixedRecipe: RecipeDTO | null
- Implement apply behavior:
  - On selecting a remix, compute a derived recipe object by applying the remix.patch to the base `generatedRecipe`:
    - Apply patch.ingredient_overrides to ingredient amounts by matching ingredient_id
    - Append patch.add_ingredients (ensure unique ingredient ids; do not remove core ingredients)
    - Apply patch.step_ops using step IDs (add_after / replace / remove) to produce a new steps[] array
    - Apply patch.meta_updates if present (time_minutes, calories_per_serving)
  - Store the derived result in `remixedRecipe` and set `activeRemixId`.
  - Update the Recipe Detail Page rendering to use:
    - `remixedRecipe` when active
    - `generatedRecipe` when no remix active
  - Ensure the base `generatedRecipe` remains unchanged.
- Implement Undo:
  - Provide an “Undo” control visible when a remix is active.
  - Undo clears activeRemixId and remixedRecipe and reverts the UI to the base recipe.
- UI affordances:
  - Selected remix card should show an “Applied” state (badge/check).
  - Tapping a different remix replaces the active remix (still no stacking).
- Guardrails:
  - If a remix patch cannot be applied safely (missing referenced step_id / ingredient_id), fail gracefully:
    - do not crash
    - show base recipe
    - optionally console.warn a message indicating patch apply failure

Do NOT:
- Modify the Ingredients section behavior or substitution drawer logic yet (keep it exactly as-is in this phase).
- Modify Cook Mode behavior (steps source switching happens in a later phase).
- Modify telemetry (events come in a later phase).
- Regenerate the hero image or change image caching behavior.
- Change schema or prompt in this phase.

Proof:
- Logs must include: "recipe_remixes_phase3_ui_live"
- Recipe detail page shows 3–4 remix options for a generated recipe that includes remixes.
- Selecting a remix updates the visible recipe content (e.g., meta/ingredients/steps where displayed) based on remixedRecipe.
- Undo restores the base recipe view reliably.
- No crashes if a remix patch references missing IDs (graceful fallback).
- No additional image generation occurs when applying/undoing a remix (base recipeKey remains the one used for image caching).


Goal: Implement Phase 4 of the “Recipe Remixes” feature by integrating remix ingredient changes with the existing `workingIngredients` substitution system, while keeping ingredient interactivity (drawer + substitutes) unchanged.

Context:
- This work follows the implementation plan documented at:
  docs/agent_memory/imp_plans/recipe-remixes.md
- Before making changes, review that document to confirm Phase 4 scope and non-goals.
- Phase 3 is assumed complete: remix UI exists and applying a remix produces `activeRemixId` and `remixedRecipe` (derived from base `generatedRecipe`).
- Current architecture:
  - `generatedRecipe` remains immutable
  - `workingIngredients` is a local state copy used for substitutions and ingredient display
  - Ingredient rows are interactive and open the substitution drawer (must remain)

Do:
- Review docs/agent_memory/imp_plans/recipe-remixes.md (Phase 4 — Integrate with workingIngredients + substitutions).
- When a remix is applied:
  - Update `workingIngredients` to reflect the remix ingredient changes so the Ingredients section (and substitution UX) stays coherent.
  - Specifically:
    1) Start from the base `generatedRecipe.ingredients`.
    2) Apply `patch.ingredient_overrides`:
       - Find the matching ingredient by `ingredient_id` and update its `amount` (do not change name/id).
       - Do not remove any existing ingredients.
    3) Apply `patch.add_ingredients`:
       - Append up to 2–3 new ingredient rows to `workingIngredients`.
       - Ensure each new ingredient has a unique `id`.
       - New ingredients should be non-interactive only if they have no substitutes; otherwise they behave like normal rows.
       - Do not break existing ingredient row testids/keys.
  - Preserve existing substitute data and drawer behavior for original ingredients.
  - Ensure the substitution drawer continues to update `workingIngredients` as it does today.

- When Undo is used (remix cleared):
  - Reset `workingIngredients` back to the base `generatedRecipe.ingredients` (and keep existing “clear substitutions” behavior consistent with current back navigation behavior).
  - Ensure no stale “added ingredients” remain.

- When switching from one remix to another (replace, not stack):
  - Recompute `workingIngredients` from base + the newly selected remix patch (not from the previously remixed workingIngredients), to avoid patch accumulation.

Guardrails:
- If an override references an ingredient_id not present in the base recipe:
  - Do not crash; ignore that override and console.warn with a clear message.
- If add_ingredients contains duplicate IDs:
  - Ensure uniqueness (e.g., prefix with remix id) before adding.

Do NOT:
- Remove or change the ingredient substitution UI, chevrons, or drawer mechanics.
- Persist remix-applied ingredients anywhere beyond local state.
- Change Cook Mode in this phase (that is Phase 5).
- Change schema or generation prompts in this phase.
- Trigger new image generation on remix apply/undo.

Proof:
- Logs must include: "recipe_remixes_phase4_working_ingredients_integrated"
- Applying a remix updates the Ingredients list to match the remix (amount overrides + any new ingredients appear).
- Existing ingredient substitution drawer still works for original ingredients after applying a remix.
- Undo restores the original Ingredients list (no added remix ingredients remain).
- Switching between remixes does not accumulate ingredients or amounts incorrectly.
