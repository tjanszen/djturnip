# Updated Implementation Plan: V2-Only Image Prompt + Reuse Existing gpt-image-1 Integration

Owner: DJ Turnip team  
Mode: Architect (small, controlled change)  
Incorporates Replit feedback: reuse existing image scaffolding, clarify Generate Again behavior, remove “negative prompt” dependency, specify aspect ratio, reduce cost via per-recipe-instance caching.

## Snapshot / Assumptions (confirmed via Replit)
- V1 is being removed; **V2-only** generation + rendering.
- Recipe output is validated via `recipeDTOV2Schema` in `shared/schema.ts`.
- Validation occurs during AI response parsing in `server/routes.ts`.
- Recipes are ephemeral (React state).
- Image generation scaffolding exists in `server/replit_integrations/` using **OpenAI `gpt-image-1`**.

## Non-goals (unchanged)
- No new diversification logic for “Generate Again”.
- No persistence/DB for recipes.
- No feature flags.
- No background jobs, CDN pipeline, or multi-image gallery.

---

## Key Decisions (to address Replit feedback)

### D1: Reuse existing image generation wrapper
- Do **not** build a new provider wrapper from scratch.
- Prefer minimal new glue code: route handler + UI call + state cache.

### D2: No separate negative prompt field (provider constraint)
- OpenAI image APIs don’t support “negative prompts” the same way as SD.
- We’ll bake constraints (“no garnish, no extra ingredients…”) into `image_prompt`.
- Optional: keep `image_negative_prompt` out of schema for now to avoid confusion.

### D3: Generate Again behavior
- When user clicks **Generate Again** (new recipe instance), **generate a new image** for that new recipe.
- Within a single recipe instance, generate image only once (avoid regenerating on re-render).

### D4: Aspect ratio
- Use a consistent landscape format suitable for recipe hero (recommend **4:3** or **16:9**).
- Pick one and standardize the call (suggest **4:3** as a safe “dish-focused” composition).

### D5: Cost control
- Generate images only on the recipe detail view.
- Cache per recipe instance via a stable `recipeKey` (hash) in client state to avoid repeat charges during re-renders.

---

## Proposed Data Model Changes (V2 only)

### Schema change (`shared/schema.ts`)
Add:
- `image_prompt: string` (required)

Rationale:
- Ensures every recipe has the data needed to generate an image.
- Keeps output strictly JSON and parseable.

### Frontend type change
Add `image_prompt: string` to the canonical V2 recipe type/interface.

Note:
- We are **not** adding `image_negative_prompt` at this time due to provider mismatch. If we later move to a provider that supports it, we can add it then.

---

## Prompting Changes (Recipe Generation)

### What changes
Update recipe-generation instructions to require `image_prompt` inside the JSON.

### `image_prompt` requirements (baked-in “no garnish” constraints)
Instruct the model:

- Output `image_prompt` as a single paragraph (max ~80–120 words).
- Photorealistic, home-cooked, approachable.
- Describe finished dish using only ingredients in the recipe.
- Must mention:
  - cooking method (baked/roasted/sautéed/etc.)
  - vessel (skillet/sheet pan/bowl/pot/baking dish)
  - 2–4 hero ingredients
  - 1–2 texture cues (browned/blistered/glossy/creamy/crisp)
  - camera + lighting: 45-degree angle, natural window light, neutral background, minimal props
- Must include explicit prohibitions:
  - “No garnishes, no herbs not listed, no lemon slices unless listed, no extra vegetables, no utensils/hands/people, no text, no watermark, not restaurant plated.”

Also add (important):
- “Return STRICT JSON only. No text before/after JSON.”

---

## Image Generation Flow (Reuse Existing Integration)

### Backend
- Confirm the existing `server/replit_integrations/` OpenAI image generation helper:
  - accepts a prompt string
  - returns a URL (or base64 that you already upload/serve)
  - supports setting size/aspect (if available in your wrapper; otherwise choose the closest supported size)

Minimal additions:
- A small server route (if not already present) that:
  - accepts `{ prompt: string, aspect?: "4:3" | "16:9" }`
  - calls the existing wrapper
  - returns `{ image_url: string }`

If a route already exists, reuse it and just standardize payload.

### Aspect ratio choice
- Default: **4:3 landscape**
- If the wrapper requires explicit pixel sizes, choose a consistent size aligned to UI (e.g., 1024×768 or nearest supported).
- Document the chosen size in code comment + in `replit.md` (small note).

---

## UI Changes (Usage + Caching + Generate Again)

### UI behavior
- Recipe text renders immediately.
- Image loads asynchronously and does not block.

### Client caching to avoid repeated generation
- Create a stable `recipeKey` for the current recipe instance:
  - e.g., hash of `(recipe.name + JSON.stringify(ingredients) + JSON.stringify(steps))`
  - or simpler: hash of the full recipe JSON (minus any image_url)
- Maintain a small in-memory map in state:
  - `imageByRecipeKey: Record<string, string>` mapping to `image_url`

Logic:
- When recipe changes:
  - compute `recipeKey`
  - if `imageByRecipeKey[recipeKey]` exists -> render it
  - else -> call image gen endpoint once, store URL under that key

### Generate Again behavior (explicit)
- Generate Again produces a new recipe object → new `recipeKey` → triggers a new image generation.
- No regeneration for the same `recipeKey` unless the user explicitly requests (not in scope).

### Failure mode
- If image generation fails:
  - show a neutral placeholder
  - allow a “Retry image” button (optional; if you want to keep scope tiny, skip the button and just allow refresh/regenerate recipe)

---

## Implementation Steps (PR-sized, V2-only)

### Step 0 — Confirm V2-only baseline is complete
- Verify V1 removed and V2 generation works.
Deliverable:
- Generate + Generate Again works; no V1 types/guards remain.

### Step 1 — Add `image_prompt` to V2 schema
- Update `recipeDTOV2Schema` in `shared/schema.ts`.
Deliverable:
- Zod parse passes with `image_prompt`.

### Step 2 — Update the V2 TS type/interface used by client
- Add `image_prompt: string`.
Deliverable:
- Typecheck passes.

### Step 3 — Update recipe generation prompt
- Require `image_prompt` and embed “no garnish / no extra ingredients” constraints in the main prompt text.
Deliverable:
- Generated JSON reliably includes non-empty `image_prompt`.

### Step 4 — Reuse existing image scaffolding
- Confirm existing helper in `server/replit_integrations/` works end-to-end with `gpt-image-1`.
- If an API route already exists, reuse it.
- If not, add minimal route that calls the existing helper and returns `image_url`.
- Add aspect ratio/size parameter (default 4:3).
Deliverable:
- `POST /image` (or existing endpoint) returns `{ image_url }` given a prompt.

### Step 5 — UI: render image + cache per recipeKey
- Add hero image area to recipe detail view.
- Implement `recipeKey` hashing + `imageByRecipeKey` cache.
- On new recipe: generate image once and store URL.
Deliverable:
- Image appears once per recipe instance; no repeated calls on re-render.

### Step 6 — Logging
Add tokens:
- `recipe_image_prompt_present` (after successful recipe parse)
- `recipe_image_gen_request` (with recipeKey)
- `recipe_image_gen_success` / `recipe_image_gen_fail` (with duration)
Deliverable:
- You can quickly see costs/failure rates.

---

## Acceptance Criteria (updated)

### Functional
- Every generated recipe includes `image_prompt`.
- Recipe validation still succeeds.
- Image generation works using existing `gpt-image-1` scaffolding.
- UI loads images asynchronously; recipe remains usable if image fails.

### Cost/behavior
- For a single recipe instance, image generation is called **once** (verified by logs).
- Generate Again triggers a new image generation for the new recipe (new recipeKey).

### Quality
- Images generally match hero ingredients and vessel/cooking method.
- Garnish hallucinations are reduced due to prompt prohibitions.

---

## Testing Plan

### Smoke tests
1) Generate recipe -> confirm `image_prompt` present in parsed JSON
2) Call image endpoint with `image_prompt` -> confirm URL returned
3) Open recipe detail -> image loads, recipe text not blocked
4) Trigger re-render (change UI state, scroll, etc.) -> confirm no additional image calls
5) Click Generate Again -> new recipeKey -> new image call happens exactly once

---

## Risks & Mitigations

### Provider limitations / prompt adherence
- Mitigation: keep prohibitions explicit and repeated once (“No garnishes… no extra ingredients…”).
- If model still adds garnish visually, tighten wording: “Do not add any herbs or garnish. Only show ingredients listed.”

### Latency
- Mitigation: async loading + skeleton; keep image generation off list view.

### Cost
- Mitigation: per-recipeKey cache; only generate on detail view.

---

## Rollback Plan
- If images cause issues:
  - Remove UI call/render (safe, quick).
- If `image_prompt` breaks parsing:
  - Make `image_prompt` optional temporarily and re-tighten after prompt tuning.

---

## Readiness Checks
- Inputs ready?
  - Confirm final V2-only schema + where prompt template lives; confirm existing `gpt-image-1` helper signature.
- Flags named?
  - None (by design).
- Evidence defined?
  - Logs + “once per recipeKey” guarantee + manual garnish spot-check.

Ready to prompt the Replit agent?
