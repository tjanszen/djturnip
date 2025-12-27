# Implementation Plan — Single-Screen Preferences + Ingredients (Crumb-style) V1

Owner: TBD  
Status: Draft (rev w/ Crumb spec notes)  
Feature flag: FRIDGE_SINGLE_RECIPE_SCREEN_V1 (OFF by default)  
Scope: Replace the current **2-step** “Preferences → Confirm Ingredients” with **one consolidated screen** that matches the Crumb layout:
Top: **card tiles** (Guests / Time / Cuisine w/ icons + value + chevron)  
Bottom: **ingredient rows** (subtle background + trash right) + **+ Add more** button → expands input row + **Allow other ingredients** toggle + **Create my recipe** CTA  
**No changes to underlying logic** (same state, same payload, same generate call).

---

## Snapshot / Assumptions

- This is primarily a **frontend UX/UI refactor**.
- Existing state and logic already exist for:
  - servings
  - time (best/15/30/60)
  - cuisine (any/…)
  - ingredients add/remove/normalize
  - allow_extras toggle
  - generate recipe action
- Consolidated screen reuses the **same handlers** and **same request payload** as current Confirm screen.
- Existing 2-step flow remains untouched when flag is OFF.
- “Yesterday’s build” exists; we’ll **reshape what exists** rather than rewrite from scratch.

---

## Goals

1. Ship a **single consolidated screen** behind one feature flag.
2. Preserve existing behavior (payload parity) end-to-end.
3. Match Crumb UI patterns: tiles + list rows + header + gold CTA.
4. Maintain rollback path (flag OFF → old 2-step).

---

## Non-Goals (V1)

- Changing generation logic, prompts, or payload structure.
- Adding new filters or structured ingredient parsing.
- New persistence beyond what already exists.
- Reworking the recipe result screen.

---

## Visual Spec (Crumb-style)

### Header / Navigation
- Top-left: **Back arrow**
- Title: **“New Recipe”** (or “New recipe” to match your type scale)
- No extra subheader; keep it clean.

### Top Controls (Tiles)
- Layout: 3 tiles in a row (wrap on small screens).
- Each tile is a **card-like button**:
  - Rounded corners
  - Light background (tinted/cream)
  - Soft border or shadow
  - Icon at top (person/clock/globe)
  - Label (Guests/Time/Cuisine)
  - Value row with current selection + **chevron**
- Interaction: tapping tile opens a selector (ActionSheet/Popover/Modal/Select menu).

**Important:** Servings becomes a **dropdown selector** (not +/- stepper) to match Crumb:
- Guests: values e.g. 1–8 (or whatever range you support today)
- Default stays 2

### Ingredients List (Rows)
- Rows are **not chips**:
  - Full-width rounded pill/row container
  - Subtle background
  - Ingredient text left-aligned
  - Trash icon button right-aligned
- Spacing between rows consistent; feel “listy” and editable.

### Add More UX
- “+ Add more” is a **button** aligned right of “Ingredients” header.
- Clicking it **expands an input row** directly under the header (or at top of list):
  - Text input placeholder: “Add ingredient (e.g. 1 tbsp soy sauce)”
  - “Add” button on the right
  - Enter key also adds
- Reuses existing add handler + normalization.

### Toggle Copy
- Label: **“Allow other ingredients?”**
- Helper: “Recipe may include common pantry items”
- State maps to existing `allow_extras` boolean (no behavior change).

### Primary CTA
- Button text: **“Create my recipe”**
- Styling: gold/yellow fill, rounded, centered near bottom.
- Disabled when ingredient list empty or while generating.

---

## UX Flow (V1)

**Current**
1. Preferences screen
2. Continue → Confirm Ingredients screen
3. Generate Recipe

**New (flag ON)**
1. Single “New Recipe” screen:
   - Header (“< New Recipe”)
   - Tiles: Guests / Time / Cuisine
   - Ingredients list w/ trash
   - + Add more button → expand input row
   - Allow other ingredients toggle
   - Create my recipe CTA
2. Recipe result screen (unchanged)

---

## State & Data (No changes expected)

Re-use the same existing fields (names may differ):
- servings: number
- time: "best" | "15" | "30" | "60"
- cuisine: string
- ingredients: string[] (normalized list)
- allow_extras: boolean
- generate(): existing function/action

**Invariant:** final “Create my recipe” must produce **identical payload** to the legacy Confirm path.

---

## Phase 1 — Inventory & Flag Gate

**Intent:** Establish a safe, reversible switch and identify the minimal integration point.

Deliverables:
- Feature flag `FRIDGE_SINGLE_RECIPE_SCREEN_V1` added (OFF by default).
- Entry routing behavior updated:
  - Flag OFF → current 2-screen flow
  - Flag ON → consolidated screen route/component

Scope:
- Add flag plumbing (env/config + in-app access).
- Identify:
  - current Preferences screen component
  - current Confirm Ingredients screen component
  - current generate action invocation point
- Add log token when flag path is active.

Acceptance:
- Flag OFF: existing flow unchanged.
- Flag ON: navigates to consolidated screen.
- Logs: `single_screen_v1 enter`.

---

## Phase 2 — Consolidated Screen Skeleton + Header

**Intent:** Create structure and navigation treatment first.

Deliverables:
- Consolidated screen renders:
  - Header with back arrow + “New Recipe”
  - 3 tile placeholders (Guests/Time/Cuisine)
  - Ingredients header + “+ Add more” button (disabled for now ok)
  - Ingredient rows (read-only ok)
  - Toggle row (read-only ok)
  - Bottom CTA (wired later)

Scope:
- Layout + styling only.
- Use static icons initially if needed.

Acceptance:
- Screen matches Crumb hierarchy and spacing (even if controls are non-functional yet).
- Back arrow returns to prior route correctly.

---

## Phase 3 — Wire Tiles (Guests dropdown, Time, Cuisine)

**Intent:** Make top controls interactive, matching Crumb pattern.

Deliverables:
- TileButton component (reusable) with:
  - icon + label + value + chevron
  - onPress opens selector
- Guests tile uses **dropdown** selection (replacing +/- stepper in this flow):
  - still calls the same underlying setter used today
- Time tile selection maps to existing enum values.
- Cuisine tile selection maps to existing cuisine string.

Scope:
- Reuse existing state source (store/context/local state).
- Defaults remain as-is (2 / best / any).

Acceptance:
- Selecting guests/time/cuisine updates underlying state used by generation.
- Value displayed in tile updates immediately.

---

## Phase 4 — Ingredients Rows + Add More Expandable Input

**Intent:** Match Crumb list editing behavior.

Deliverables:
- Ingredients list rendered as rows w/ trash icon:
  - trash calls existing remove handler
- “+ Add more” button toggles an inline “add input row”
  - Input + Add button
  - Enter key submits
  - Cancel (optional): tap outside or small “x”

Scope:
- Add uses existing add handler + normalization:
  - trim
  - ignore empty
  - dedupe behavior unchanged
- Keep ingredient array source unchanged.

Guardrails:
- If ingredients empty → disable primary CTA and show inline empty-state text.

Acceptance:
- Remove works via trash; list updates.
- Add more expands input; adding inserts normalized item.

---

## Phase 5 — Toggle Copy + CTA Parity (“Create my recipe”)

**Intent:** Ensure consolidated screen is functionally identical to old Confirm step.

Deliverables:
- Toggle label updated to “Allow other ingredients?”
- Toggle bound to existing allow_extras boolean.
- Bottom CTA:
  - text: “Create my recipe”
  - calls the exact same generate action as legacy Confirm
  - disabled during async / when empty list

Scope:
- No payload changes allowed.
- Loading state and error handling remain as current.

Acceptance:
- Toggle persists and affects the same boolean used in the request.
- Generate triggers same call path / identical payload.

---

## Phase 6 — Retire / Hide Old Confirm Screen (Optional)

**Intent:** Reduce maintenance with a clean rollback story.

Deliverables:
- Flag ON path never navigates to Confirm screen.
- Confirm screen remains for flag OFF path.
- Optional later cleanup after stability window.

Acceptance:
- Flag ON never hits Confirm route.
- Flag OFF still uses Preferences → Confirm.

---

## Feature Flag & Rollout

- Flag: `FRIDGE_SINGLE_RECIPE_SCREEN_V1`
- OFF → legacy 2-screen flow
- ON → consolidated Crumb-style screen

Rollout:
1. Local/dev
2. Internal dogfood
3. Enable by default once stable

---

## Telemetry (POC-Friendly)

Log events:
- `single_screen_v1 enter`
- `single_screen_v1 prefs_change servings=<n> time=<t> cuisine=<c>`
- `single_screen_v1 ingredient_add`
- `single_screen_v1 ingredient_remove`
- `single_screen_v1 allow_other_ingredients=<true|false>`
- `single_screen_v1 generate_click`
- `single_screen_v1 generate_success=<true|false>`

---

## Risks & Mitigations

- **Payload drift**
  - Mitigation: dev log payload from legacy Confirm vs consolidated screen and diff.
- **Dropdown UX mismatch across platforms**
  - Mitigation: implement selectors using existing platform patterns (ActionSheet on iOS, modal list on Android/web).
- **Add-more input feels clunky**
  - Mitigation: keep input row inline and auto-focus; Enter submits.

---

## Readiness Check

- Inputs ready?
  - Existing pref + ingredient + generate handlers exist.
- Flags named?
  - `FRIDGE_SINGLE_RECIPE_SCREEN_V1`
- Evidence defined?
  - Logs + payload parity + manual flow test

---

## Replit Agent Prompt (Minimal)

Goal: Implement a Crumb-style single “New Recipe” screen that consolidates Preferences + Confirm Ingredients behind FRIDGE_SINGLE_RECIPE_SCREEN_V1, preserving logic and payload parity.

Do:
- Add FRIDGE_SINGLE_RECIPE_SCREEN_V1 (OFF by default)
- When flag ON, route to consolidated screen and skip Confirm screen
- Implement header: back arrow + “New Recipe”
- Implement top tile controls with icons + label/value/chevron:
  - Guests uses a dropdown selector (replace stepper in this flow)
  - Time + Cuisine selectors map to existing values
- Render ingredients as list rows with subtle background + right-aligned trash icon calling existing remove handler
- “+ Add more” button expands an inline input row (input + Add button) that reuses existing add+normalize logic
- Toggle label: “Allow other ingredients?” bound to existing allow_extras boolean
- Primary CTA: gold “Create my recipe” calling the same generate action/payload as legacy Confirm

Proof:
- Logs include: "single_screen_v1 enter" and "single_screen_v1 generate_click"
- Manual test:
  - Start with ["eggs","spinach","mushrooms"], remove "spinach", add "onion", toggle allow ON, generate succeeds
- Payload parity:
  - Confirm legacy payload and consolidated payload match in dev logs (same fields/values)
