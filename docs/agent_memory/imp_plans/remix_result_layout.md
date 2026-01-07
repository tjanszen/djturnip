# Phased Implementation Plan — URL Remix UX (Fridge Cleanout–Style, Read-Only)

## Status: Visual Alignment Complete ✓
- Phase 0: UX Guardrails added (comments in home.tsx)
- Phase 1: Backend already returns title + ingredients
- Phase 2: RecipeResultsLayout created at `client/src/components/recipe-results-layout.tsx`
- Phase 3: URL Remix uses RecipeResultsLayout in read-only mode
- Phases 4-6: Complete (integrated with Phase 3 implementation)
- **Visual Alignment Fix**: RecipeResultsLayout now matches fridge-result styling exactly:
  - Title: `text-2xl font-serif font-medium` (matching fridge-result)
  - Ingredient rows: `py-3 border-b`, name left, amount right (matching fridge-result)
  - Container: `max-w-lg` with `px-4 py-6` inner spacing (matching fridge-result)
  - No Card wrapper around main content (matching fridge-result structure)
  - Read-only mode only removes chevrons/click handlers, keeps identical visual treatment

## Goal
Present URL Remix results in a **calm, editorial, read-only layout** inspired by Fridge Cleanout and the provided reference design.

The screen should feel:
- Informational, not interactive
- Easy to scan vertically
- Focused on comparison and inspiration, not decision-making

All behavior remains unchanged from the previously approved plan.

---

## Phase 0 — UX Principles Lock (Non-Functional)

**Purpose:** Prevent over-design or accidental interactivity.

### UX Principles (Explicit)
- Single-column, vertical reading flow
- Clear section headers (“Ingredients”, “Remix”)
- No primary actions on this screen
- Cards are informational, not selectable
- Use spacing and typography — not borders or affordances — to create hierarchy

These principles should be documented in comments near the layout component.

---

## Phase 1 — Backend Response Shaping (No Visual Impact)

_No changes from previous plan._

- Ensure response includes:
  - `extractedRecipe.title`
  - `extractedRecipe.ingredients: string[]`
  - `alternatives[]` (9 total, ordered)

No description field required.

---

## Phase 2 — Shared Layout Component (Editorial Structure)

**Purpose:** Reuse Fridge Cleanout layout with an editorial, non-interactive tone.

### Component Extraction
Extract a shared layout (e.g. `RecipeResultsLayout`) that supports:

- Title section
- Ingredients section
- Remix section

### Layout Rules
- Title appears at the top, visually dominant.
- Sections separated by **vertical spacing**, not dividers where possible.
- Avoid introducing any new UI chrome.

Fridge Cleanout continues to use this component with interactive props; URL Remix uses it in read-only mode.

---

## Phase 3 — Ingredients Section (Read-Only, List-First)

### Rendering
- Use the **same ingredient row styling** as Fridge Cleanout.
- Rows are informational only:
  - No chevrons
  - No dropdowns
  - No tap/click handlers

### Visual Intent
- Ingredients should feel like a *reference list*, not a configuration UI.
- Amounts aligned consistently, readable at a glance.

---

## Phase 4 — Remix Section (Editorial Cards)

### Card Structure
Each remix card shows:
- Title
- Changes list (action + details), exactly as returned today

### Visual Treatment
- Cards should:
  - Look identical to Fridge Cleanout cards visually
  - Feel **non-interactive**
- No hover, no active states, no selection affordances.
- Cursor should remain default.

### Ordering
- Preserve backend order:
  - Basics first
  - Delights second
- Do not label Basic vs Delight in UI at this time.

### Density
- All 9 cards visible in a vertical stack.
- Scrolling is expected and acceptable.

---

## Phase 5 — Loading & Error States (Minimal)

### Loading
- Simple loading state allowed:
  - Disable Remix button
  - Optional subtle text change (“Remixing…”)
- No skeletons or page loaders.

### Errors
- Inline error near input.
- Do not navigate away.
- Input remains editable.

---

## Phase 6 — Removal of Legacy URL Remix UI

Remove or disable for URL Remix results:
- Swipe controls
- Skip / Save UI
- “Generate Again”
- “Let’s Cook!” CTA

Navigation relies on standard Back behavior only.

---

## Out of Scope (Reconfirmed)
- No remix selection
- No cooking flow
- No persistence
- No analytics additions
- No style parameter usage
- No sticky headers or advanced scroll behavior

---

## Intended Result
The URL Remix results screen should feel:

- Like **reading a well-laid-out recipe page**
- Easy to compare ideas against original ingredients
- Calm, confident, and non-pushy

If users scroll, that’s expected.
If they pause and read, that’s success.
