# URL Remix V2 Variations v2 — 10–15, Protein Flex, Combinable

## Status: Phase 1 Complete (Backward-Compatible Schema)

## Overview
Update URL Remix V2 generation to produce **10–15 alternatives** (variable based on recipe complexity), support **protein/diet axis** coverage, and include **combinability metadata** for future "pairs well with" UI.

---

## Phase 0 Decisions (Locked)

### 1. Alternatives Count
- **Range**: 10–15 inclusive
- **Selection Rule**: Model chooses N based on recipe complexity:
  - Simple dishes (few ingredients, basic technique): 10–11
  - Medium complexity: 12–13
  - Complex dishes (many components, layered flavors): 14–15
- **Rationale**: Fixed counts feel rigid; complexity-aware counts provide more meaningful variations for elaborate recipes without overwhelming simple ones.

### 2. New Fields Per Alternative
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `id` | string | Yes | Format: `alt_1`, `alt_2`, ..., `alt_N` (1-indexed, no gaps, in order) |
| `combines_with` | string[] | Yes | 0–2 other alternative ids that pair well together |

### 3. ID Format Requirements
- Must match regex: `/^alt_\d+$/`
- Must be 1-indexed and sequential (alt_1, alt_2, ..., alt_N)
- No gaps allowed
- Order must match array position

### 4. Kind Distribution Constraints
| Constraint | Rule | Example (12 cards) |
|------------|------|-------------------|
| basic minimum | ≥ 60% of total | ≥ 8 |
| delight minimum | ≥ 3 | ≥ 3 |
| delight maximum | ≤ 40% of total | ≤ 4 |

### 5. Protein/Diet Axis Coverage
- **For savory dishes**:
  - At least **3 alternatives** must involve a protein change (add protein, swap protein, or vegan ↔ non-vegan flip)
  - At least **1** of those must address fat+protein balance (e.g., thighs vs breast, sausage richness)
- **Escape hatch for sweet/dessert**:
  - If dish category is dessert/baking, protein axis is **not required**
  - "Protein-adjacent" options (nuts, eggs, dairy) count only if contextually appropriate
  - Model should skip protein variations rather than force nonsensical ones

### 6. Combinability Validation
- `combines_with` entries must reference valid alternative ids
- No self-reference allowed (alt_3 cannot combine with alt_3)
- **Contradiction detection is LOG-ONLY** (not hard validation)
  - Example: vegan + add sausage is contradictory but won't fail validation
  - Will log warning for debugging
  - Hard validation deferred to future phase if needed

---

## Phase Roadmap

### Phase 1 — Schema + Type Updates ✅ COMPLETE
- Added `id` and `combines_with` as **optional** fields with defaults
- Accepts both 9-count (legacy) and 10-15 (new mode)
- Transform populates `alt_1`...`alt_N` and `[]` if missing
- Legacy mode (9): enforces 5 basic + 4 delight
- New mode (10-15): enforces basic ≥60%, delight ≥3, delight ≤40%
- Validates `combines_with` references (0-2 entries, no self-ref, valid ids)

### Phase 2 — Prompt Update
- Update prompt to emit 10–15 alternatives
- Add complexity-based count selection instruction
- Add protein/diet axis requirements with dessert escape hatch
- Add combinability metadata instructions
- Make new fields required in prompt output

### Phase 3 — Validation Tightening
- Update Zod schema to require new fields
- Add 10–15 count range validation
- Add kind distribution validation
- Add id format and uniqueness validation
- Add combines_with reference validation (log contradictions, don't fail)

### Phase 4 — Frontend Compatibility
- Ensure UI renders N cards (10–15) without assuming 9
- Ignore `id` and `combines_with` for now (no display)

### Phase 5 — QA Suite
- Test across recipe types (vegan base, chicken, pasta, dessert)
- Verify protein axis coverage where appropriate
- Verify combines_with references are valid
- Check fallback rate

---

## Backward Compatibility Notes
- `kind: "basic" | "delight"` remains unchanged
- Existing top-level `what_is_this` and `why_this_works` unchanged
- Existing per-alternative `why_this_works` (mechanism-based) unchanged
- Changes array (2–3 items with measurements) unchanged
- Retry-once + fallback-to-V1 policy unchanged

---

## Files Referencing This Plan
- `server/prompts/urlRemixV2.ts` — contract comments near alternatives section
- `server/validation/urlRemixV2.zod.ts` — phase roadmap comments

---

## Date
Phase 0 locked: 2026-01-13
