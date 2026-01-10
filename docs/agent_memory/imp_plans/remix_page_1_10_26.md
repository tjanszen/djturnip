# Phased Implementation Plan — Remix Page Structure VNext (URL Remix V2 Only)

## Snapshot of Decisions
- Single LLM call generates: `what_is_this`, `why_this_works`, and **9 variations** (5 basic + 4 delight).
- “What is this” + “Why this works” are inferred from the **URL recipe content** (grounded by extracted title/ingredients/instructions).
- Applies to **V2 only** (`ALT_RECIPES_V2` path). V1 unchanged.
- Each variation includes a new field: `why_this_works` (**1 sentence max**, mechanism-based).
- Page title is composed in the **frontend**:  
  `[Recipe Name] + {variation_count} + Chef tips to make it better`
- Ingredients are **collapsed by default**.
- CTA “Remix your own recipes” exists but is a placeholder (no-op).
- FAQ section stays as previously planned (ignore the “coming soon” alternative per your note).
- “You might also like” shows headers only.
- Back button from results returns to input screen (current behavior preserved).
- No recipe_key, canonicalUrl, or sourceDomain.

---

## Key Implementation Notes From Review (Integrated)
1) **Rename `viewState` carefully**  
   `viewState === "swiping"` is currently shared across URL Remix and Fridge Cleanout (distinguished by `recipeMode`). We will:
   - Introduce `viewState === "remix-result"` for URL Remix only.
   - Keep Fridge Cleanout using its existing state (`"swiping"` or whatever it currently uses) to avoid regressions.
   - Update conditional rendering so Fridge Cleanout logic is untouched.

2) **Prompt ordering for per-variation rationale**
   In the schema for each variation, place `why_this_works` **before** `changes[]` so the model writes rationale first, then details.

3) **Split the biggest phase**
   Phase 2 is split into:
   - **2a** Backend contract + prompt updates (testable via API)
   - **2b** Frontend layout + section rendering

4) **Error handling added**
   If AI output fails validation for any required field (including new fields), the response should **fail entirely**, not render partial content:
   - Retry once (existing behavior).
   - If still invalid, fallback to V1 (existing behavior) or return error per current V2 policy (you currently do fallback).
   - UI shows inline error if request fails (no partial page render).

5) **Back button behavior**
   From `remix-result`, browser/app back should return to input screen. Preserve current behavior; do not add new navigation UI.

---

## Phase 0 — Response Model + State Strategy (Low-Risk Prep)
**Goal:** Lock down the contracts and state transitions so implementation doesn’t break Fridge Cleanout.

### Tasks
- Document (in code comments near the Home viewState reducer/logic) the plan:
  - URL Remix uses `viewState="remix-result"`
  - Fridge Cleanout continues using existing `viewState="swiping"` path
- Identify all places where `viewState === "swiping"` is used and confirm which are:
  - URL Remix only
  - Fridge Cleanout only
  - Shared (gated by `recipeMode`)

### Acceptance Criteria
- No behavior changes yet.
- Engineers know exactly what’s safe to rename vs what must remain.

---

## Phase 1 — Backend Contract Extension (V2 Only, Strict)
**Goal:** Extend V2 payload to include new top-level fields and per-variation rationale.

### Contract (V2 only)
Add to V2 response:
- `what_is_this: string` (1–2 sentences)
- `why_this_works: string` (1–2 sentences)

Extend each alternative:
- `why_this_works: string` (1 sentence max, mechanism-based)

Keep existing:
- `extractedRecipe.title`
- `extractedRecipe.ingredients: string[]`
- `alternatives[]` exact 9, 5 basic + 4 delight, **unique titles**, changes length 2–3

### Zod validation (strict)
Update `server/validation/urlRemixV2.zod.ts`:
- Require `what_is_this` and `why_this_works`
- Require each alternative `why_this_works`
- Keep existing validations (counts, uniqueness, specificity, retry, fallback)

### Error handling behavior (no partials)
- If the new fields are missing/invalid → treat as validation failure:
  - Retry once
  - If still invalid → fallback to V1 (existing Option A), or return 502 if that’s the current codepath (but you stated fallback exists)

### Acceptance Criteria
- `/api/recipes/process` V2 returns new fields and passes validation for known URLs.
- Failures behave deterministically (retry → fallback), never “partial page.”

---

## Phase 2a — Prompt Updates (Single Call, Mechanism-First)
**Goal:** Update the V2 prompt to generate new fields and per-variation rationale cleanly.

### Prompt updates (`server/prompts/urlRemixV2.ts`)
- Add top-level output fields:
  - `what_is_this`
  - `why_this_works`
- For each variation object, ensure ordering:
  - `kind`
  - `title`
  - `why_this_works`  ← before `changes[]`
  - `changes[]`

### Content constraints
- `what_is_this`: 1–2 sentences, “spark notes”, answer “am I in the right place?”
- `why_this_works`: 1–2 sentences, base mechanism explanation (balance, browning, acid, fat, spice, etc.)
- per-variation `why_this_works`: 1 sentence max, must reference a mechanism

### Acceptance Criteria
- API responses show plausible, short `what_is_this` and `why_this_works`.
- Each variation includes `why_this_works` before `changes[]`.
- Validation succeeds without increasing fallback rate materially.

---

## Phase 2b — Frontend: New Remix Page Structure (Results Rendering)
**Goal:** Implement the new section layout and viewState transitions for URL Remix only.

### State changes (careful rename)
- Introduce `viewState = "remix-result"` for URL Remix success.
- Ensure Fridge Cleanout keeps using its existing result state (likely `"swiping"`).
- Update conditional rendering to avoid coupling:
  - URL Remix result branch triggers only when `viewState === "remix-result"`
  - Fridge Cleanout result branch remains as-is

### New page structure (in order)
1. **Title**
   - Frontend-composed:  
     `{extractedRecipe.title} + {alternatives.length} Chef tips to make it better`
2. **What is this**
   - Render `what_is_this`
3. **Why this works**
   - Render `why_this_works`
4. **Ingredients (collapsed by default)**
   - Accordion with chevron
   - Default collapsed
   - Expand shows ingredient list (read-only)
5. **Creative Variations**
   - Render 9 cards in the existing remix card style (non-interactive)
   - Each card shows:
     - Title
     - Variation `why_this_works` (1 sentence)
     - Changes list (`changes[]`)
6. **CTA: Remix your own recipes**
   - Placeholder button (no-op)
7. **FAQ**
   - Placeholder rendering as previously planned (ignore alternative suggestion)
   - Non-functional/placeholder only
8. **You might also like**
   - Header plus subsection headers only (no items)

### Error handling in UI
- If request fails (422/502/etc.), show inline error and stay on input screen.
- Do not render partial results.

### Back button behavior
- Ensure back returns to the input screen (existing behavior). No new navigation UI.

### Acceptance Criteria
- URL Remix results screen renders with the new sections in order.
- Ingredients are collapsed by default and expandable.
- Fridge Cleanout results still work unchanged.

---

## Phase 3 — Cleanup & UX Consistency
**Goal:** Remove legacy/conflicting elements from URL Remix results and keep the page “quiet.”

### Tasks
- Ensure no success toast (e.g., “Recipe Processed”) appears.
- Remove old swipe controls / skip-save UI for URL Remix results if any remain.
- Keep existing submit loading affordance (spinner/disabled button).

### Acceptance Criteria
- Results feel editorial and content-first; no extraneous system UI.

---

## Phase 4 — QA Matrix + Regression Checks
**Goal:** Confirm correctness and prevent regressions to Fridge Cleanout.

### Test URLs (minimum)
- 3 recipe sites (e.g., AllRecipes, Serious Eats, Bon Appetit)
- 1 non-recipe URL (expect inline error)

### Checks
- V2 payload includes all required new fields.
- Validation passes (or retry then fallback) with no partial page rendering.
- Title uses alternatives.length.
- Ingredients collapsed by default.
- Back returns to input.
- Fridge Cleanout flow unaffected.

---

## Open Items (None Required to Start)
- Future: deep-linking / stored pages (explicitly deferred)
- Future: FAQ answers and interactivity (deferred)
- Future: “You might also like” content generation (deferred)
