# Implementation Plan — URL Remix V2 Variations v2 (10–15, Protein Flex, Combinable) — Revised

## Phase 0 — Spec Lock
- alternatives length: 10–15
- add `id` (alt_1..alt_N) + `combines_with` (0–2 ids)
- protein/diet axis: required *when applicable*, with an explicit “sweet/dessert escape hatch”
- contradiction detection for combines_with: log-only, not hard validation

---

## Phase 1 — Backward-Compatible Schema + Types (Optional Fields)
Goal: ship schema/types without breaking current V2 prompt.

- shared/routes.ts:
  - Add OPTIONAL fields with defaults:
    - alternative.id?: string
    - alternative.combines_with?: string[]
- server/validation/urlRemixV2.zod.ts:
  - Do NOT enforce 10–15 yet (keep current count rule until prompt is updated), OR allow both temporarily:
    - accept 9 (legacy) OR 10–15 (new)
  - Do NOT require `id` / `combines_with` yet; default:
    - id: derive if missing (alt_1..alt_N based on index)
    - combines_with: []
  - Add validation helpers but keep them non-failing until Phase 3.

Proof:
- V2 still succeeds with current prompt output.
- No increase in fallback.

---

## Phase 2 — Prompt Update (Enable New Behavior)
Goal: update `server/prompts/urlRemixV2.ts` to produce new behavior.

Prompt changes:
1) Count:
   - “Return between 10 and 15 alternatives.”
   - “Choose N based on recipe complexity:
      - simple → 10–11
      - medium → 12–13
      - complex → 14–15”

2) IDs:
   - “Use ids exactly alt_1 through alt_N in order.”

3) Protein / diet axis with escape hatch:
   - “Include at least 3 protein/diet variations IF the dish is savory.”
   - “If the dish is sweet/dessert, protein swaps are optional; focus on mix-ins, texture, flavor, and presentation.”
   (Keep dish identity recognizable.)

4) combines_with:
   - “combines_with: 0–2 ids of compatible alternatives.”
   - “Avoid obvious conflicts (e.g., vegan + add sausage), but this is best-effort.”

5) Keep existing strictness:
   - why_this_works before changes
   - 2–3 changes
   - details must include measurement/time/temp
   - unique titles

Proof:
- API responses now include 10–15 alternatives (varies by recipe complexity).
- IDs are alt_1..alt_N with no gaps.
- combines_with appears (may be empty for many).
- Some savory dishes include protein swaps/additions.

---

## Phase 3 — Tighten Validation (Make It Strict Once Stable)
Goal: enforce new rules after prompt is stable.

- Enforce alternatives length 10–15.
- Require:
  - id present AND exactly alt_1..alt_N sequence
  - combines_with present (can be empty) and valid ids, max len 2
- Kind distribution:
  - basic >= 60%
  - delight >= 3
  - delight <= 40%
- Protein axis enforcement:
  - If savory: proteinVariations >= 3 (heuristic detection based on changes mentioning meat/beans/tofu/eggs/cheese etc.)
  - If sweet: proteinVariations check becomes log-only
  (Alternatively: keep protein axis log-only entirely if you want maximum stability.)

- Contradiction checks: log-only warnings (do not fail)

Proof:
- Known savory URLs pass without fallback.
- Dessert URLs do not fail due to protein requirements.

---

## Phase 4 — Frontend Compatibility (No UX change required)
- Render N cards (10–15), no assumptions about 9.
- Ignore combin
