Goal: Phase 1 — Add feature flag and gate entry into the new single-screen “New Recipe” flow without changing existing behavior.

Do:
- Add feature flag FRIDGE_SINGLE_RECIPE_SCREEN_V1 (default OFF).
- Locate the current navigation point where the user proceeds from ingredient entry into the recipe flow.
- Update routing/navigation logic so that:
  - If FRIDGE_SINGLE_RECIPE_SCREEN_V1 is OFF:
    - The existing 2-step flow (Preferences → Confirm Ingredients) runs unchanged.
  - If FRIDGE_SINGLE_RECIPE_SCREEN_V1 is ON:
    - Navigation routes to a new placeholder consolidated screen.
- Create a placeholder consolidated screen/component that:
  - Renders a header with title “New Recipe”.
  - Renders simple placeholder body text (e.g. “Single-screen flow placeholder”).
  - Does NOT include any preference controls, ingredient editing, toggles, or generate logic yet.
- Add a lightweight log when the flagged path is entered.

Do NOT:
- Modify existing Preferences or Confirm screen logic.
- Modify ingredient normalization, preferences state, or generate payloads.
- Trigger any backend calls or generation logic from the new screen.

Gate via feature flag:
- FRIDGE_SINGLE_RECIPE_SCREEN_V1 = OFF by default.

Proof:
- Logs include: "single_screen_v1 enter"
- Manual verification:
  - Flag OFF → existing Preferences → Confirm flow behaves exactly as before.
  - Flag ON → user is routed to the new placeholder consolidated screen.
- No changes observed in backend requests or generation behavior.

Goal: Phase 2 — Build the consolidated “New Recipe” screen skeleton to match Crumb’s structure (header + tiles region + ingredients section), without wiring any real interactions yet.

Do:
- In the consolidated screen created in Phase 1, implement the full layout skeleton:
  - Header:
    - Back arrow (uses existing navigation goBack)
    - Title: “New Recipe”
  - Top controls region:
    - Render 3 card-like tile placeholders in a row (wrap on small screens):
      - Guests (person icon)
      - Time (clock icon)
      - Cuisine (globe icon)
    - Each tile shows:
      - icon
      - label (Guests/Time/Cuisine)
      - value placeholder text (e.g., “2”, “Best”, “Any”) + chevron icon
    - Tiles are pressable visually, but onPress can be a no-op or temporary console log.
  - Ingredients section:
    - Section header row with title “Ingredients” (left)
    - “+ Add more” button (right) — pressable, but no behavior yet (no-op/log ok)
    - Below, render ingredient rows from the existing ingredient list if easily accessible; otherwise render 3–5 static placeholder rows.
    - Each ingredient row is a full-width rounded container with subtle background and a right-aligned trash icon button (trash onPress no-op/log ok).
  - Toggle row:
    - Render label “Allow other ingredients?” with a toggle control (can be disabled/no-op for now).
    - Optional helper text: “Recipe may include common pantry items”
  - Bottom CTA:
    - Render primary button “Create my recipe” in gold/yellow styling.
    - Button disabled and/or onPress no-op for now.

Constraints:
- Do NOT wire up real state changes yet (no preference setting, no ingredient add/remove, no toggle binding).
- Do NOT call generate or alter payload logic.
- Keep all existing legacy screens/flow unchanged and reachable when flag is OFF.

Gate via feature flag:
- FRIDGE_SINGLE_RECIPE_SCREEN_V1 = OFF by default.

Proof:
- With flag ON, screen renders with:
  - Back arrow + “New Recipe” header
  - 3 card tiles w icons + chevron
  - Ingredients header + “+ Add more” button
  - Ingredient rows styled as list rows w trash icon
  - “Allow other ingredients?” toggle row
  - “Create my recipe” CTA styled and present (no-op)
- With flag OFF, existing 2-step flow still works unchanged.
- Logs (or console) show taps on tiles/add more/trash (temporary) but no state/payload changes occur.


Goal: Phase 3 — Wire the top “tile” controls (Guests dropdown, Time selector, Cuisine selector) to existing state + setters, preserving defaults and payload parity.

Do:
- Implement (or finalize) a reusable TileButton component used by Guests/Time/Cuisine tiles:
  - Shows: icon + label + current value + chevron
  - Press opens a selector UI (ActionSheet/Modal/Popover/Select list depending on platform)
- Wire Guests tile to existing servings state:
  - Replace the stepper UI in this flow with a dropdown selector to match Crumb.
  - Options: use the same allowed servings range as current app (e.g., 1–8 or whatever exists today).
  - Default remains 2 (or whatever legacy default is).
  - On selection, call the existing servings setter/dispatch (do not create a new source of truth).
- Wire Time tile to existing time preference state:
  - Options map exactly to existing values: "best" | "15" | "30" | "60"
  - Display user-friendly labels (Best / 15 min / 30 min / 60 min) while storing the same underlying enum/string values.
  - On selection, call the existing time setter/dispatch.
- Wire Cuisine tile to existing cuisine state:
  - Options come from the same cuisine options list used in the legacy Preferences screen.
  - Default remains "any" (or legacy default).
  - On selection, call the existing cuisine setter/dispatch.
- Ensure the consolidated screen reads the current values and renders them in the tile value line (so it reflects state immediately).

Constraints:
- Do NOT change ingredient list behavior yet (no add/remove wiring in this phase).
- Do NOT change allow_extras toggle behavior yet (can remain no-op).
- Do NOT call generate or change any payload logic.
- Do NOT alter the legacy Preferences screen or its logic; consolidated screen should reuse the same state layer.

Gate via feature flag:
- FRIDGE_SINGLE_RECIPE_SCREEN_V1 = OFF by default.

Proof:
- Flag ON:
  - Guests tile opens a selector; selecting a value updates the tile display immediately.
  - Time tile opens a selector; selecting Best/15/30/60 updates display and underlying time state.
  - Cuisine tile opens a selector; selecting a cuisine updates display and underlying cuisine state.
- Flag OFF:
  - Legacy 2-step flow works unchanged.
- Dev logging (temporary is fine):
  - Log on selection: "single_screen_v1 prefs_change servings=<n> time=<t> cuisine=<c>"
- Confirm (by inspection or dev logs) that the same underlying state is being updated as in the legacy Preferences screen (no duplicate state introduced).

Goal: Phase 4 — Implement Ingredients editing in the consolidated screen using Crumb-style list rows (subtle background + right trash), plus “+ Add more” button that expands an inline input row. Reuse existing add/remove/normalize logic; do not change payload/generation.

Do:
- Wire the Ingredients section to the existing ingredient list used by the legacy Confirm Ingredients screen (same source of truth).
- Replace chip rendering with Crumb-style list rows:
  - Each ingredient renders in a full-width rounded row with subtle background.
  - Right-aligned trash icon button removes that ingredient.
  - Trash calls the existing remove handler/dispatch (do not reimplement removal logic).
- Implement “+ Add more” button behavior:
  - On press, expand an inline “add ingredient” input row directly under the Ingredients header (or as the first row above the list).
  - Input placeholder: “Add ingredient (e.g. 1 tbsp soy sauce)”
  - Include an “Add” button on the right; Enter/Return also submits.
  - After successful add: clear input, collapse input row (optional), and scroll to show the updated list if needed.
- Add uses the existing add + normalization rules from the legacy Confirm flow:
  - trim whitespace
  - ignore empty
  - preserve existing dedupe behavior (exact string match or whatever legacy does)
  - no schema changes (ingredients remain string[])
- Empty state + guardrails:
  - If ingredients list becomes empty, show a small inline empty-state message (e.g., “Add at least one ingredient to continue.”)
  - Do NOT wire the “Create my recipe” CTA yet unless already wired elsewhere; if it exists, keep it disabled when list is empty.

Constraints:
- Do NOT change preference logic (already wired in Phase 3).
- Do NOT wire allow_extras toggle behavior yet (can remain no-op if Phase 5 will handle it).
- Do NOT change generate/payload logic in this phase.
- Do NOT modify legacy Confirm screen behavior; consolidated screen must reuse existing handlers/state.

Gate via feature flag:
- FRIDGE_SINGLE_RECIPE_SCREEN_V1 = OFF by default.

Proof:
- Flag ON:
  - Ingredients render as list rows (not chips) with subtle background and right-aligned trash icon.
  - Tapping trash removes the ingredient and updates the list immediately.
  - Tapping “+ Add more” expands an inline input row.
  - Adding a non-empty ingredient inserts it using existing normalization/dedupe behavior.
  - Adding empty/whitespace does nothing (and does not insert blank rows).
  - If user removes all ingredients, empty-state message appears and primary CTA (if present) is disabled.
- Flag OFF:
  - Legacy 2-step flow works unchanged.
- Temporary logs (ok to remove later):
  - "single_screen_v1 ingredient_add"
  - "single_screen_v1 ingredient_remove"


Goal: Phase 5 — Wire “Allow other ingredients?” toggle + bottom “Create my recipe” CTA on the consolidated screen, ensuring payload parity with the legacy Confirm Ingredients flow.

Do:
- Update toggle copy on consolidated screen to exactly: “Allow other ingredients?”
  - Optional helper text: “Recipe may include common pantry items”
- Bind the toggle to the existing allow_extras (or equivalent) boolean used in the legacy Confirm screen:
  - Default value must remain identical to legacy (typically OFF).
  - Toggling must update the same source of truth (no duplicate state).
- Wire the bottom primary CTA:
  - Text: “Create my recipe”
  - Calls the exact same generate action/function used by the legacy Confirm screen.
  - Uses the same payload builder (or results in an identical request payload).
- Add guardrails:
  - Disable CTA if ingredient list is empty.
  - Disable CTA while generating (prevent double submits).
  - Show existing loading state behavior (spinner/disabled) consistent with legacy confirm->generate.
- Add minimal telemetry/logging:
  - On toggle change: "single_screen_v1 allow_other_ingredients=<true|false>"
  - On CTA press: "single_screen_v1 generate_click"
  - On generate resolution: "single_screen_v1 generate_success=<true|false>"

Constraints:
- Do NOT modify backend endpoints, prompt text, schema, or generation logic.
- Do NOT change the payload shape or field names.
- Do NOT alter legacy Confirm screen behavior; consolidated screen must reuse the same generate pathway.
- Keep FRIDGE_SINGLE_RECIPE_SCREEN_V1 gating intact (OFF by default).

Gate via feature flag:
- FRIDGE_SINGLE_RECIPE_SCREEN_V1 = OFF by default.

Proof:
- Flag ON:
  - Toggle is labeled “Allow other ingredients?” and updates the same allow_extras boolean used by legacy Confirm.
  - CTA “Create my recipe” triggers the same generate call path as legacy Confirm.
  - CTA is disabled when ingredient list empty and during in-flight generate.
  - No double-submit possible.
- Payload parity:
  - In dev logs, print payload from legacy Confirm path and consolidated path and confirm they match (same fields/values).
- Flag OFF:
  - Legacy 2-step flow remains unchanged and still generates successfully.
