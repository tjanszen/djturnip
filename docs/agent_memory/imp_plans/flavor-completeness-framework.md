# Flavor Completeness Framework (V3 Homecook)

## Status: Phase 1 Complete

## Overview
Component-agnostic flavor reasoning framework to improve recipe quality through prompt-only changes.

---

## Phase 0 — Flavor Calibration ✅ COMPLETE (Ongoing)
- Curated fixture list exists
- Baseline outputs generated and reviewed
- Known failure modes: bland components, over-reliance on "mix and warm", weak handling of mild/dairy

---

## Phase 1 — Prescriptive Component-Agnostic Flavor Framework ✅ COMPLETE

### Implementation
Updated PROMPT_V3_HOMECOOK user prompt in `server/routes.ts` with:

**New Requirements (Flavor Axes Framework):**
- Keep recipes familiar, achievable, and balanced; avoid novelty for its own sake
- Think in components: protein, vegetable, starch, sauce, topping (as applicable)
- Flavor axes: aromatics; seasoning beyond salt; acid or umami; fat or richness; texture contrast
- Each major component should intentionally hit at least 2 flavor axes
- Prefer transformative cooking actions over simple mixing or warming (sear, roast, char, bloom spices, deglaze, reduce, blend/emulsify)
- Cooking steps should include at least one transformative verb for the main component
- Mild or creamy components should include contrast (acid, crunch, heat, or char)
- Use pantry staples freely for depth and balance
- Include one clever but intuitive twist that feels obvious in hindsight

**Telemetry:**
- `prompt_v3_flavor_axes_v1_active` logged when V3 prompt is used

### What Did NOT Change
- Schema fields (no additions)
- Retry/linting logic
- Model, temperature, or token limits
- Remix behavior or counts
- System prompt (all changes in user prompt only)

### Verification
- Console shows `prompt_v3_flavor_axes_v1_active` when PROMPT_V3_HOMECOOK=on
- Diff isolated to user prompt text only
- Recipes remain schema-valid

---

## Phase 2 — Post-Generation Flavor Lint (Deferred)
Not required unless Phase 1 fails to address recurring failure modes.

## Phase 3 — Targeted Repair Retry (Deferred)
Fix specific deficiencies without destabilizing otherwise good recipes.

## Phase 4 — Telemetry (Deferred)
Provide observability once recipe generation volume increases.

## Phase 5 — Remix-Level Flavor Elevation (Deferred)
Provide a user-facing "boost flavor" remix even when base recipes pass quality checks.

---

## Rollback Plan
- Revert user prompt to previous version
- Keep Phase 0 fixtures for comparison
- No structural rollback required

---

## Test Fixtures (for Phase 0 validation)
Include at least:
- Dairy-heavy (cottage cheese, yogurt)
- Mild protein (tofu, chicken breast)
- Bland starch (plain rice, pasta)
