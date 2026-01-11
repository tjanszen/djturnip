# Implementation Plan (Delta) — Improve “What is this?” + “Why this works” Copy Style (V2)

## Goal
Update the LLM generation for:
- `what_is_this` (tweet-length, plain language, identity + customizability)
- `why_this_works` (tweet-length, plain language, flavor/texture payoff + why it stuck around)

…while keeping your current Remix Page Structure VNext architecture intact:
- Single call generates both fields + 9 alternatives
- Strict Zod validation + retry + V1 fallback
- V2 only (ALT_RECIPES_V2 path)

## Non-goals
- No UI/layout changes (Phase 2b remains as implemented)
- No schema changes beyond what already shipped (Phase 1 already added the fields)
- No new endpoints or persistence

---

## Phase 0 — Copy Contract & Jargon Guardrails (Prompt-only alignment)
**Purpose:** Prevent “recipe summary” outputs and prevent What/Why from duplicating.

### Tasks
1) Add explicit “semantic boundaries” to the SYSTEM prompt:
   - `what_is_this` MUST cover: dish identity + base ingredients (plain words) + why it’s customizable
   - `what_is_this` MUST NOT cover: why it tastes good / texture/flavor reasoning / technique
   - `why_this_works` MUST cover: why people love it (texture/flavor/comfort) + why it’s endured
   - `why_this_works` MUST NOT define the dish or list ingredients or mention “customize/tweak”

2) Add “tweet-length” constraints:
   - Both fields: 1–2 sentences each
   - Encourage short sentences, readable like a tweet

3) Add optional guardrails (jargon bans + translations) directly to SYSTEM prompt:
   - Avoid these words unless translated into plain language in the same sentence:
     - acid, legume, umami, aromatics, emulsify
   - Preferred simple words:
     - beans (instead of legumes), tangy/bright (instead of acid), savory (instead of umami)

4) Add a “vary phrasing” instruction for customizability to reduce same-y outputs:
   - Instead of repeating “easy to adapt/tweak,” vary by dish using lenses like:
     - “pairs with lots of toppings”
     - “soaks up flavor”
     - “works with what you have”
     - “changes a lot depending on sauce/spices”

**Acceptance criteria**
- Prompt text clearly separates What vs Why responsibilities.
- Prompt text discourages jargon and recipe-summary tone.

---

## Phase 1 — Update the V2 Prompt (server/prompts/urlRemixV2.ts)
**Purpose:** Implement the new copy style in the existing, already-working single-call V2 prompt.

### Tasks
1) Update ONLY the text instructions for `what_is_this` and top-level `why_this_works`:
   - Keep your existing requirements for alternatives unchanged (9 cards, 5/4 split, per-alternative why_this_works, specificity, etc.)
   - Do not change the output JSON shape (Phase 1 schema already expects these fields)

2) Drop in these exact requirements (recommended wording) into the SYSTEM prompt:

   For `what_is_this`:
   - 1–2 sentences max, tweet-length
   - Explain what kind of dish it is + what it’s usually made from using everyday words
   - Include a quick “why it’s easy to make your own”
   - Do NOT mention steps/tools or taste/texture reasons

   For `why_this_works`:
   - 1–2 sentences max, tweet-length
   - Explain why people keep making it: flavor/texture payoff + comfort/contrast
   - Do NOT define the dish or list ingredients
   - Do NOT mention “customize/tweak”

3) Ensure grounding still holds:
   - Continue passing extracted title/ingredients/instructions as context
   - Keep the “do not invent base ingredients” rule

**Acceptance criteria**
- V2 still validates on attempt 1 for known URLs.
- `what_is_this` reads like a smart tweet and includes customizability without repeating stock phrases.
- `why_this_works` explains the payoff without restating what the dish is.

---

## Phase 2 — Add Lightweight “Non-duplication” QA (No new hard validation)
**Purpose:** Catch drift without increasing fallback frequency.

### Tasks
1) Add a debug-only log (or telemetry field) capturing:
   - `what_is_this`
   - `why_this_works`
   for a few test runs in dev/staging so you can eyeball overlap.
2) Optional soft heuristic (log-only):
   - If the two strings share too many repeated phrases (e.g., identical 4+ word spans), log: `url_remix_v2_copy_overlap_warning`

Do NOT fail validation for overlap in this phase.

**Acceptance criteria**
- You can observe overlap issues if they happen, without breaking the flow.

---

## Phase 3 — Content QA Pass (Human spot-check)
**Purpose:** Confirm tone is right across dish categories.

### Test set (minimum 6 URLs)
- stew/soup (lentil stew)
- pasta
- salad
- chicken dish
- dessert/baking
- sandwich/spread

### Checks
- What is this:
  - identity + plain ingredients + customizability
  - no “slow cooker does the work” filler
- Why this works:
  - payoff and “why people return”
  - not a definition, not ingredients list, not customization

**Acceptance criteria**
- Consistently readable for non-foodies
- Educated users won’t feel patronized
- Minimal repetition across recipes

---

## Rollback / Safety
- No schema changes and no UI changes => minimal risk.
- If prompt changes cause validation failures:
  - Existing retry + V1 fallback already protects UX.
  - Revert prompt text changes only.

---

## Deliverables
- Updated prompt text in `server/prompts/urlRemixV2.ts`
- (Optional) dev-only logs/telemetry for overlap warnings
- Short QA notes (6 URL spot-check results)

