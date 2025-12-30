# Implementation Plan: Recipe Remixes (V2-only) — Structured, Pre-Generated Adjustments

Owner: DJ Turnip team  
Mode: Architect (phased rollout; controlled change)  
Incorporates current codebase realities: V2-only Zod schema (`shared/schema.ts`), prompt assembly in `server/routes.ts` (`/api/recipes/generate-single`), Cook Mode reads from `generatedRecipe` state, `recipeKey` currently hashes `name + ingredients + steps`, telemetry is console.log strings, substitutions use `workingIngredients`.

## Snapshot / Assumptions (confirmed via Replit)
- Steps currently have **no IDs**; we will add `steps[].id` to enable robust patch operations.
- V2 recipe schema is `recipeDTOV2Schema` in `shared/schema.ts`.
- Recipe generation prompt is assembled in `server/routes.ts` within `/api/recipes/generate-single`.
- Cook Mode consumes steps directly from `generatedRecipe` state and maps `ingredient_ids` to `workingIngredients`.
- Image caching uses `recipeKey` computed from `name + ingredients + steps`; we do **not** want remixes to trigger image regeneration.
- Telemetry is emitted via `console.log()` event strings (no centralized utility).
- `generatedRecipe` is immutable; `workingIngredients` tracks substitutions locally.

## Non-goals
- No free-form “type what you want” remix prompting (remixes are pre-generated).
- No stacking multiple remixes (one active remix at a time).
- No recipe renaming.
- No removal of core ingredients (optional/garnish-level only, but we will avoid remove ops initially).
- No “Surprise me” randomization.
- No new persistence layer / DB storage.
- No new analytics SDK (stick to console.log telemetry pattern).
- No image regeneration when a remix is applied (keep base image for cost/latency).

---

## Key Decisions

### D1: Remixes are stored on the recipe object, applied as reversible patches
- Recipe JSON includes `remixes: Remix[]`.
- UI applies one remix at a time by producing a derived “current” recipe variant.
- Undo restores the base recipe.

### D2: Add `steps[].id` to support safe step patching
- Patch operations reference `step_id` rather than array index or text matching.

### D3: Keep substitutions working with remixes
- Remixes may update ingredient amounts and add 2–3 ingredients.
- Substitutions remain supported via `workingIngredients`.

### D4: Pantry staples are “assumed available” and do not count toward new ingredient limits
- Model can assume oils, vinegars, soy sauce, mustard, common spices, etc.
- Remixes may add up to 2–3 non-pantry ingredients.

### D5: Time/calories updates are optional and only when obvious
- Remixes can include meta updates, but only if clearly impacted.

### D6: recipeKey should remain based on the base recipe (not the remixed variant)
- Remixes should not invalidate image caching or trigger image regeneration.
- If needed, we’ll compute a separate “variant key” later (not in scope now).

---

## Proposed Data Model Changes (V2 only)

### Step IDs
- Add `id: string` to each `steps[]` item.

### Remixes
Add `remixes: Remix[]` to the recipe DTO. Minimal viable `Remix` shape:

- `id: string`
- `title: string` (short, user-facing label)
- `description: string` (1 sentence; what changes + why)
- `patch: {`
  - `ingredient_overrides?: Array<{ ingredient_id: string; amount?: string }>`
  - `add_ingredients?: Array<{ id: string; name: string; amount: string }>` (max 2–3)
  - `step_ops?: Array<`
    - `{ op: "add_after"; after_step_id: string; step: { id; text; ingredient_ids; time_minutes? } }`
    - `{ op: "replace"; step_id: string; step: { id; text; ingredient_ids; time_minutes? } }`
    - `{ op: "remove"; step_id: string }`
  - `meta_updates?: { time_minutes?: number; calories_per_serving?: number }`
- `}`

Notes:
- No `rename` field.
- No “remove ingredient” patch type.

---

## Prompting Changes (Recipe Generation)

### Step IDs
- Require each step to include a stable unique `id` string.

### Remixes generation rules
- Output exactly 3–4 remixes, each single-axis (texture/sauce OR flavor emphasis OR technique/format).
- Preserve dish identity; do not change recipe name; do not remove core ingredients.
- Each remix must be a small patch:
  - Touch at most 2–3 ingredients/steps.
  - Add at most 2–3 non-pantry ingredients.
- Pantry staples can be assumed and do not count toward new ingredient limit.
- Time/calories updates only when obviously affected.
- Remixes must be represented as patch operations referencing step IDs (no indices).

---

## UI Changes: Remix Cards + Apply + Undo (no stacking)

### Placement
- Add a “Remix this recipe” section in the Recipe Detail page (recommended below Ingredients).

### Behavior
- Render 3–4 remix cards (title + description).
- Tap to apply one remix:
  - Derived “current recipe variant” is computed by applying patch to base recipe.
  - UI updates to reflect patched ingredients + patched steps (Cook Mode later).
- Undo:
  - Clears active remix; restores base recipe variant.

### State approach (aligned to current architecture)
- Keep `generatedRecipe` immutable.
- Add UI state:
  - `activeRemixId: string | null`
  - `remixedRecipe: RecipeDTO | null` (derived)
- Keep substitutions (`workingIngredients`) as-is, but integrate remix changes (see next phase).

### Image behavior
- Do not regenerate the hero image when applying a remix.
- Ensure image caching continues to use base `recipeKey`.

---

## Working Ingredients Integration (Substitutions + Remix)

### Requirements
- When a remix is applied:
  - Update `workingIngredients` to reflect:
    - ingredient amount overrides
    - new ingredients added (2–3)
  - Preserve existing substitute options and substitution drawer behavior.
- Undo restores base ingredients and workingIngredients to base.

Implementation principle:
- Remixes should alter the “baseline ingredient list” that substitutions operate on, without deleting substitution functionality.

---

## Cook Mode Integration

### Requirement
- Cook Mode should use the correct step list:
  - If a remix is active: use `remixedRecipe.steps`
  - Else: use `generatedRecipe.steps`
- Ingredient references should continue to map `ingredient_ids` to `workingIngredients`.

Non-goal:
- No highlighting of changed steps (optional enhancement later).

---

## Telemetry

Maintain existing console.log style. Add:
- `recipe_v2 remixes_shown recipeKey=<key> count=<n>`
- `recipe_v2 remix_applied recipeKey=<key> remixId=<id>`
- `recipe_v2 remix_undone recipeKey=<key> remixId=<id>`
- `recipe_v2 remix_cook_started recipeKey=<key> remixId=<id>` (optional)

Ensure `recipeKey` used is base recipe key (stable across apply/undo).

---

## Phased Implementation Steps (PR-sized)

### Phase 1 — Schema updates
1) Add `steps[].id` to V2 schema.
2) Add `remixes` array and Remix patch schema to V2 schema.
Deliverable:
- V2 schema validates recipes with step IDs and remixes.

### Phase 2 — Generation prompt updates
3) Update `/api/recipes/generate-single` prompt to emit:
   - step IDs
   - 3–4 remixes matching schema
Deliverable:
- Generated recipes pass schema validation consistently with remixes.

### Phase 3 — UI: remix section + apply/undo (no stacking)
4) Render remix cards on recipe detail page.
5) Implement apply/undo state and patch application to derive `remixedRecipe`.
Deliverable:
- User can apply one remix and undo; base recipe remains intact.

### Phase 4 — Integrate with workingIngredients + substitutions ✅ COMPLETE
6) On apply: reconcile `workingIngredients` with remix ingredient changes while keeping substitution UX intact.
7) On undo: reset to base.
Deliverable:
- Remixes update ingredients while substitutions continue to work.
Implementation notes:
- `handleApplyRemix` updates `workingIngredients` with derived recipe's ingredients (includes overrides + added ingredients)
- `handleUndoRemix` resets `workingIngredients` back to base `generatedRecipe.ingredients`
- Switching between remixes recomputes from base + new patch (no accumulation)
- Fixed step_ops to use correct schema fields: `after_step_id` for add_after, `step` instead of `new_step`
- Updated guardrails: missing ingredient_id in overrides logs warning and continues (doesn't fail)
- Missing step_id in step_ops logs warning and continues (graceful failure)
- Log: `recipe_remixes_phase4_working_ingredients_integrated`

### Phase 5 — Cook Mode step source switching
8) Pass/consume steps from `remixedRecipe` when remix active; otherwise base.
Deliverable:
- Cook Mode instructions reflect the applied remix.

### Phase 6 — Telemetry
9) Add remix shown/applied/undone/cook-started logs with base recipeKey.
Deliverable:
- Events appear once per action; recipeKey stable across apply/undo.

---

## Acceptance Criteria

### Functional
- Recipe JSON includes valid `steps[].id` and `remixes[3–4]`.
- Apply a remix updates ingredients and cook steps; Undo restores base.
- No image regeneration on remix apply/undo.
- Generate Again still regenerates a new base recipe (as today).

### UX
- Remix options are clearly labeled, contextual, and “small tweaks,” not new recipes.
- Undo is obvious and reliable.
- Substitutions still function normally after remix apply.

### Telemetry
- `remixes_shown`, `remix_applied`, `remix_undone`, `remix_cook_started` logs fire correctly with stable base recipeKey.

---

## Testing Plan

### Smoke tests
- Generate recipe: confirm step IDs + 3–4 remixes present and schema-valid.
- Apply each remix: ingredients update; undo works.
- Substitution drawer works after applying a remix.
- Enter Cook Mode with remix active: steps reflect remix.
- Confirm image caching does not re-trigger on apply/undo.

### Regression tests (manual)
- Generate Again after applying remix: generates new recipe and resets remix state.
- Back navigation still clears substitution state as expected.

---

## Risks & Mitigations

### Token/output size growth may increase schema failures
- Mitigation: keep remixes to 3–4; constrain patch complexity; keep descriptions short.

### Step IDs introduce new required data; model might omit them
- Mitigation: prompt emphasis + schema enforcement; retries as needed.

### Remix patch ops could break ingredient_ids mapping
- Mitigation: require new steps to include correct ingredient_ids referencing existing or newly added ingredient IDs.

### recipeKey hashing includes steps/ingredients; remix application must not affect base key usage
- Mitigation: ensure image caching uses base recipe object (or compute recipeKey from base recipe only).

---

## Rollback Plan
- If remixes cause instability:
  - Hide remix UI while keeping schema fields (or temporarily make `remixes` optional).
  - Keep step IDs (still useful even without remixes).
- If schema validation breaks too often:
  - Make `remixes` optional temporarily and tighten prompt iteratively.

---

## Readiness Checks
- Inputs ready?
  - Confirm schema and prompt locations (already confirmed), and where recipe detail + cook mode state is managed.
- Flags named?
  - None (by design).
- Evidence defined?
  - Schema-valid outputs, apply/undo works, cook mode uses remixed steps, telemetry logs stable.
