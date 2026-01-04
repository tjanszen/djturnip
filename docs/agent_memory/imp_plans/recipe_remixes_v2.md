# URL Recipe Remix V2 (Elevations + Delight) — Revised Implementation Plan

## Goal
Replace the current “9 generic remixes” for recipe URLs with a higher-quality system that generates:
- **Basic Elevations**: familiar, reliable improvements that make the recipe taste better
- **Delightful Twists**: novel/surprising but still plausible changes that would delight

The output must remain compatible with the existing **swipe-card UI**.

---

## Key Design Decisions (Incorporating Feedback)

### Decision A — Simplify counts (reduce validation edge cases)
Choose ONE of these and enforce it strictly (recommended: A1).

**A1 (Recommended): Exactly 8 total**
- **4 basic + 4 delight = 8 cards**
- Pros: simplest validation, consistent output, fewer retries
- Cons: fewer cards than today (if UI expects 9, verify)

**A2: Match today’s 9 total**
- **5 basic + 4 delight = 9 cards**
- Pros: preserves “9 cards” expectation
- Cons: slightly less symmetric, still simple validation

This plan assumes **A2 (9 cards)** by default, because it preserves current user expectations. Switching to A1 is a one-line change (counts/validation).

### Decision B — URL fetching reality
GPT models **do not fetch URLs**. If the backend does not scrape the page, the model will “guess” from URL patterns.

Therefore, V2 should explicitly operate on **parsed recipe content** (title, ingredients, steps) extracted by your backend. If you currently do not scrape, add scraping now (minimal: JSON-LD extraction + fallback HTML parse). If scraping is intentionally out of scope for MVP, you can ship V2 with “best-effort guessing,” but quality will be inconsistent.

This plan assumes: **backend extracts recipe text/structure** and passes it to the model.

### Decision C — Style parameter usage
- **Basics** should be mostly style-agnostic “universal improvements.”
- **Delights** should be biased more heavily by `style` (creative/umami/protein/seasonal).
We will implement this in the prompt as a rule: “style influences delight more than basics.”

### Decision D — Change scope per card
Keep the swipe-card format with **2–3 changes per card**.
- Basics: 2–3 changes, typically 1–2 ingredients + 1 technique tweak
- Delights: still 2–3 changes, but can be “bigger” (e.g., sauce + topping + serving format)
If you want to allow bigger delight swings later, add a V3 option. For now, keep the constraint for consistency and UI brevity.

---

## Output Contract (Swipe-Compatible)

### Response Shape (V2)
Return JSON:
- `alternatives`: array of cards

Each card:
- `kind`: `"basic"` or `"delight"` (recommended; optional for UI)
- `title`: short (4–7 words)
- `changes`: array of exactly 2–3 objects:
  - `action`: 2–5 words
  - `details`: specific ingredients + amounts and/or specific technique directions

Example:
    {
      "alternatives": [
        {
          "kind": "basic",
          "title": "Brighten and sharpen flavor",
          "changes": [
            { "action": "Add acid", "details": "Stir in 1–2 tsp lemon juice or 1 tsp vinegar; taste and adjust salt." },
            { "action": "Boost aromatics", "details": "Add 2 tbsp minced scallion or 1 tbsp minced red onion." }
          ]
        }
      ]
    }

### Count Rules (pick one)
Default (A2):
- Total cards: **9**
- Basics: **5**
- Delights: **4**

Alternative (A1):
- Total cards: **8**
- Basics: **4**
- Delights: **4**

---

## API / Flow Changes

### Current Flow (V1)
- Frontend POST `/api/recipes/process` with `{ url, style }`
- Backend calls OpenAI, returns `alternatives[]`

### V2 Flow (recommended)
1. Frontend POST `/api/recipes/process` with `{ url, style }`
2. Backend fetches + parses recipe page into structured content:
   - `source_title`
   - `ingredients[]` (strings are OK)
   - `steps[]` (strings are OK)
   - optional: `yield`, `time`, `notes`
3. Backend calls OpenAI with extracted content (NOT just URL)
4. Backend validates and returns `alternatives[]`

If scraping already exists, reuse it. If not, add minimal scraping (see Phase 1).

---

## Phase 0 — Feature Flag & Routing

### Tasks
- Add feature flag `ALT_RECIPES_V2` (default off).
- In `/api/recipes/process`:
  - If `ALT_RECIPES_V2=on`, run V2 path
  - Else, preserve V1

### Acceptance Criteria
- V1 behavior unchanged when `ALT_RECIPES_V2=off`
- Logs clearly identify version

---

## Phase 1 — Recipe Extraction (URL Scraping)

### Why
Quality hinges on passing the actual recipe content. Without scraping, the model will hallucinate.

### Implementation (Minimal Viable Scrape)
Try in this order:
1. Extract `application/ld+json` (Schema.org Recipe) if present
2. Fallback: common selectors for ingredients/instructions (site-specific heuristics)
3. Fallback: readable text extraction and attempt to segment ingredients/steps (last resort)

### Output of extractor
- `recipe.title` (string)
- `recipe.ingredients` (string[])
- `recipe.instructions` (string[])
- `recipe.rawText` (string, optional for context)

### Acceptance Criteria
- For 3–5 common recipe sites, extraction produces non-empty ingredients and instructions.
- If extraction fails, return a clear error or fallback to V1 (choose one policy).

Policy recommendation:
- If extraction fails: return 422 with message “Could not parse recipe page” (better than hallucinated output)
- Optional: fallback to V1 if you want “always returns something” behavior

---

## Phase 2 — Prompt Template (Exact Text)

### Prompt inputs
- `style`: one of { creative, umami, protein, seasonal }
- extracted `title`, `ingredients[]`, `instructions[]`

### System Prompt (V2)
You are a chef assistant. Your job is to elevate an existing recipe by proposing swipe-card modifications.

You will be given:
- The recipe title
- Ingredients list
- Instructions/steps
- A style focus (creative / umami / protein / seasonal)

Return a JSON object with an "alternatives" array containing EXACTLY 9 items.
You MUST produce EXACTLY:
- 5 items with kind="basic"
- 4 items with kind="delight"

Each alternative MUST have:
- "kind": "basic" or "delight"
- "title": 4–7 words max
- "changes": an array of EXACTLY 2 or 3 objects, each with:
  - "action": 2–5 words
  - "details": specific ingredient names AND quantities and/or exact technique instructions

Rules:
- Keep the dish identity recognizable (do not transform into a different dish category).
- No duplicates: do not repeat the same core idea across multiple cards.
- Basics are universal improvements (flavor, texture, balance) and should not depend heavily on the style.
- Delights should lean into the provided style more strongly and be surprising but plausible for home cooks.
- Pantry staples are allowed (oil, butter, vinegar, soy sauce, mustard, spices, stock, etc.).
- Be concrete: "Add 1 tsp smoked paprika" not "add smoky flavor".
- If the recipe already contains an element (e.g., lemon), do not propose the same exact addition; propose a complementary upgrade instead.
- Avoid rare equipment; assume standard home kitchen.
- Keep each card to 2–3 changes total.

### User Message (V2)
Analyze and elevate this recipe.

Style focus: {style}

Recipe title: {title}

Ingredients:
- {ingredient_1}
- {ingredient_2}
...

Instructions:
1. {step_1}
2. {step_2}
...

Return only valid JSON.

### Optional: If you choose the 8-card variant (A1)
Replace count constraints with:
- EXACTLY 8 items total
- EXACTLY 4 basic and 4 delight

---

## Phase 3 — Backend Validation & Retry Policy

### Zod schema changes (V2 path)
- `alternatives.length === 9` (or 8)
- each `kind` in union("basic","delight")
- count checks:
  - basicCount === 5 (or 4)
  - delightCount === 4 (or 4)
- each `changes.length` is 2 or 3
- enforce required fields and non-empty strings

### Retry policy
- If JSON invalid or schema fails: retry up to 1–2 times (as you do today).
- If counts wrong (e.g., 3 basic, 6 delight): retry once.
- If still wrong: hard-fail with 502 or fallback to V1 (choose policy).

Recommendation:
- For V2: retry once; if still invalid, fallback to V1 only if you want “never fail”.
- Otherwise return an explicit error (better for correctness and telemetry).

---

## Phase 4 — Frontend (Swipe Cards)

### Minimal (no UI changes)
- Render cards as you do today: `title` + `changes[]`.
- Ignore `kind`.

### Recommended enhancement (still minimal)
- Add a small badge based on `kind`:
  - Basic Elevation
  - Delightful Twist
- Order: basics first, then delights (preserve API order).

All UI changes should be gated by `ALT_RECIPES_V2`.

---

## Phase 5 — Telemetry (Consistent Naming)

Use consistent prefix: `url_remix_v2_*`

Suggested events/fields:
- `url_remix_v2_generate` (event)
  - `url_domain`
  - `style`
  - `extract_success` (bool)
  - `openai_retries` (int)
  - `total_cards` (int)
  - `basic_count` (int)
  - `delight_count` (int)
  - `latency_ms` (int)
- `url_remix_v2_extract_fail` (event)
  - `url_domain`
  - `reason`

This keeps V2 cleanly separable from fridge cleanout metrics.

---

## Replit Agent Tasks (Copy/Paste)

### Task 1 — Add V2 Flag + Output Contract
Goal: Implement URL Remix V2 returning 9 swipe cards with 5 basic + 4 delight, preserving existing endpoint and UI compatibility.

Do:
1) Add feature flag ALT_RECIPES_V2 (off by default).
2) In POST /api/recipes/process: if ALT_RECIPES_V2=on, call V2 generator and return alternatives[] with fields kind/title/changes.
3) Keep V1 behavior unchanged when ALT_RECIPES_V2 is off.

Gate via feature flag: ALT_RECIPES_V2=off by default

Proof:
- Logs include "url_remix_v2 enabled"
- Endpoint returns 200 JSON with alternatives.length==9
- basic_count==5 and delight_count==4

### Task 2 — Implement Recipe Extraction (if not present)
Goal: Parse recipe pages from a URL into title + ingredients + instructions for the LLM prompt.

Do:
1) Fetch the URL server-side.
2) Extract Schema.org Recipe from JSON-LD when available; fallback to heuristics.
3) Return structured recipe content to the V2 prompt (not just the URL).

Gate via feature flag: ALT_RECIPES_V2=off by default

Proof:
- Logs include "url_remix_v2_extract_success" for known recipe URLs
- Extracted ingredients and instructions are non-empty for at least 3 popular sites

### Task 3 — Zod Validation + Retry Policy
Goal: Enforce strict V2 output and retry once on schema/count failure.

Do:
1) Add Zod schema for V2 alternatives with kind + title + changes[2..3]
2) Enforce exact counts (5 basic, 4 delight) and total (9)
3) Retry once if invalid; if still invalid, fallback to V1 or return error (choose and document)

Gate via feature flag: ALT_RECIPES_V2=off by default

Proof:
- Invalid outputs trigger exactly one retry
- Final outputs always meet counts when returned

### Task 4 — Frontend Badge (Optional)
Goal: Display kind badges on swipe cards when V2 is enabled.

Do:
1) If alternative.kind present, show badge "Basic" or "Delight"
2) Preserve rendering when kind missing
3) Keep card format otherwise unchanged

Gate via feature flag: ALT_RECIPES_V2=off by default

Proof:
- Badge appears for V2 responses
- No regression for V1 responses

---

## Verification Checklist

### Backend (Pass/Fail)
- ALT_RECIPES_V2=on:
  - alternatives.length == 9
  - basic_count == 5
  - delight_count == 4
  - each changes.length in {2,3}
  - no duplicate titles
- ALT_RECIPES_V2=off:
  - existing behavior unchanged (9 alternatives, current schema)

### Extraction (Pass/Fail)
- For at least 3 known recipe URLs:
  - extracted title non-empty
  - ingredients count >= 5 (or reasonable)
  - instructions count >= 3 (or reasonable)

### Frontend (Pass/Fail)
- Swipe cards render correctly for both V1 and V2
- Badges appear only when kind exists (or when flag enabled)

---

## Answers to “Questions to Consider”

1) Should delights ever touch more than 2–3 ingredients?
- Not initially. Keep 2–3 changes to match the card UI and avoid overly complex deltas.
- If you want bigger swings later, introduce a separate “Delight+” mode or allow 3 changes but make details richer (technique + 2 ingredients).

2) What happens if AI returns 3 basics and 5 delights?
- Retry once (count enforcement failure).
- If still wrong: fallback to V1 (if “always return something” is desired) OR return explicit 502 with error code for debugging. Prefer fallback for consumer UX; prefer error for strict correctness.

3) Will you want frontend to filter/sort by kind later?
- Probably yes. Keeping `kind` as a field now is future-proof and costs almost nothing.

---

## Readiness Check
- Inputs ready? (URL + scraper + structured recipe payload) ✅
- Flags named? (`ALT_RECIPES_V2`) ✅
- Evidence defined? (exact counts + schema + telemetry) ✅

Ready to prompt the Replit agent.
