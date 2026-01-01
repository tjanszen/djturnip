# Implementation Plan: Flavor Completeness Framework (V3 Homecook)

Owner: DJ Turnip team  
Mode: Architect (solo builder; tightly scoped, low blast radius)  
Scope: Prompting + generation-quality guardrails  
Status: Phase 0 complete

---

## Snapshot / Current State

- Phase 0 (Flavor Calibration) is complete:
  - A curated fixture list exists
  - Baseline outputs have been generated and reviewed
  - Known failure modes identified:
    - Bland or underdeveloped components
    - Over-reliance on “mix and warm”
    - Weak handling of mild ingredients and dairy-heavy components

- The system currently:
  - Produces schema-valid recipes
  - Uses PROMPT_V3_HOMECOOK for higher-quality generation
  - Lacks a generalized, component-level flavor reasoning framework
  - Has no guardrail encouraging transformative cooking actions

This plan formalizes the next steps to improve **culinary completeness** without introducing new system behavior prematurely.

---

## Non-goals

- No schema changes
- No UI changes
- No retries or linting in Phase 1
- No model or temperature changes
- No free-form critique or scoring
- No user-facing experimentation
- No increase in prompt verbosity beyond concise principles

---

## Core Idea

Replace sauce-specific flavor rules with a **component-agnostic flavor completeness framework** that is:

- Concise
- Principle-based
- Cuisine-agnostic
- Prompt-only

Instead of reasoning:
> “If there is a sauce, add aromatics and acid”

The system should reason:
> “Each major component (protein, vegetable, starch, sauce, topping) should feel intentional, balanced, and transformed.”

---

## Phase 0 — Flavor Calibration (COMPLETE, ONGOING)

### Purpose
Prevent subjective drift and regressions when iterating on prompts.

### What exists
- A fixture list of known-hard ingredient sets
- Saved baseline outputs
- Qualitative labels based on gut-check (“complete” vs “thin / unfinished”)

### Required fixture coverage
When validating changes, the fixture set must include at least:
- One **dairy-heavy** input (e.g., cottage cheese, yogurt)
- One **mild protein** input (e.g., tofu, chicken breast)
- One **bland starch** input (e.g., plain rice, pasta)

### Ongoing use
- Re-run a small subset of fixtures before and after prompt changes
- Compare outputs side-by-side
- Decisions are based on specific improvements or regressions, not memory

> Phase 0 is a permanent calibration practice, not a one-time step.

---

## Phase 1 — Prompt Update: Prescriptive Component-Agnostic Flavor Framework (TERSE)

### Goal
Eliminate the most common bland or underdeveloped recipes using **prompt-only changes**, while minimizing instruction density and interpretation risk.

### Scope (IMPORTANT)
This phase:
- Modifies **only** the PROMPT_V3_HOMECOOK guidance text
- Does **not** add retries, linting, or new logic
- Does **not** change schema, UI, remix behavior, or model settings

The Replit agent must behave like an **editor**, not an inventor.

---

### Work

Update PROMPT_V3_HOMECOOK to include a **concise, bullet-based framework**:

- **Component reasoning:** think in protein, vegetable, starch, sauce, topping (as applicable)
- **Flavor axes:**  
  - Aromatics  
  - Seasoning beyond salt  
  - Acid or umami  
  - Fat or richness  
  - Texture contrast
- **Completeness rule:** each major component should intentionally hit **at least two** axes
- **Transformations:** prefer transformative cooking actions over simple mixing or warming
  - e.g. sear, roast, char, bloom spices, deglaze, reduce, blend/emulsify
- **Step wording:** steps should include at least one **transformative verb** for the main component
- **Mild/creamy rule (single sentence):**  
  Mild or creamy components should include contrast (acid, crunch, heat, or char)
- Preserve all existing JSON, schema, remix, image prompt, and validation rules unchanged

Guidance must remain:
- Concise
- Principle-based
- Non-enumerative (avoid long ingredient lists or examples)

---

### Constraints (Do NOT)

Phase 1 must NOT:
- Add schema fields
- Add retries, linting, or self-critique loops
- Change model, temperature, or token limits
- Introduce scoring or evaluation language
- Alter remix counts, logic, or semantics
- Expand prompt verbosity significantly

---

### Deliverables

- Revised PROMPT_V3_HOMECOOK text (bullet form)
- Prompt version tag (e.g., `PROMPT_V3_HOMECOOK_FLAVOR_AXES_V1`)

---

### Optional Addendum (Recommended, Low Risk)

Add a single console log when this prompt variant is active:

```text
console.log("prompt_v3_flavor_axes_v1_active");
```

Purpose:
- Correlate Phase 0 calibration outputs with the active prompt version
- No behavior change; purely diagnostic

---

### Acceptance Criteria

- Phase 0 fixtures (including dairy-heavy, mild protein, bland starch) show clear improvement
- Recipes feel more complete and intentional
- Transformative actions appear in steps where appropriate
- No increase in schema validation failures
- No novelty-driven or off-theme ingredient additions
- Prompt diff is isolated to V3 Homecook guidance text only

---

## Phase 2 — Optional: Post-Generation Flavor Lint (Deferred)

### Goal
Catch remaining incomplete recipes deterministically, if Phase 1 proves insufficient.

### Status
Deferred. Only justified if specific failure patterns persist after Phase 1.

---

## Phase 3 — Optional: Targeted Repair Retry (Deferred)

### Goal
Fix specific deficiencies without destabilizing otherwise good recipes.

---

## Phase 4 — Optional: Telemetry (Later)

### Goal
Add observability once recipe generation volume increases beyond solo usage.

---

## Phase 5 — Optional: Remix-Level Flavor Elevation

### Goal
Provide a user-facing “boost flavor” remix even when base recipes pass quality checks.

---

## Risks & Mitigations

### Risk: Agent introduces unintended changes
Mitigation: Phase 1 is strictly prompt-text-only with explicit constraints.

### Risk: Over-seasoned or busy recipes
Mitigation: Require balance (≥2 axes), not maximal intensity.

### Risk: Regressions over time
Mitigation: Continuous use of Phase 0 fixtures.

---

## Rollback Plan

- Revert to previous PROMPT_V3_HOMECOOK version
- Keep Phase 0 fixtures for comparison
- No structural rollback required

---

## Readiness Checks

- Phase 0 complete? ✅
- Next action clear? → Implement Phase 1 prompt update
- Evidence defined? → Fixture before/after comparisons
