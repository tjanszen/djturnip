import { z } from "zod";

/**
 * =============================================================================
 * V2 VALIDATION — EXPANSION ROADMAP (Phase 0 Locked)
 * =============================================================================
 * Reference: docs/agent_memory/imp_plans/variations_10_15_protein_combinable.md
 *
 * CURRENT STATE (Phase 1 implemented):
 * - Accepts 9 alternatives (legacy) OR 10-15 (new mode)
 * - `id` and `combines_with` are optional with defaults (alt_N, [])
 * - Legacy mode (9): enforces 5 basic + 4 delight
 * - New mode (10-15): enforces basic ≥60%, delight ≥3, delight ≤40%
 *
 * PHASE 1 (Schema Updates): ✅ COMPLETE
 * - Add `id` and `combines_with` as OPTIONAL fields with defaults
 * - Accept both 9-count (legacy) and 10-15 (new)
 * - Transform populates default `id` and `combines_with` if missing
 *
 * PHASE 2 (Prompt Update):
 * - Prompt updated to emit 10–15 alternatives with new fields
 * - Prompt includes complexity-based count selection
 * - Prompt includes protein/diet axis requirements (savory) + dessert escape hatch
 * - Prompt includes combinability metadata instructions
 *
 * PHASE 3 (Validation Tightening):
 * - alternatives.length: 10–15 (no longer fixed 9)
 * - `id` required, format: /^alt_\d+$/, unique, sequential
 * - `combines_with` required, 0–2 entries, valid references, no self-ref
 * - Kind distribution: basic ≥ 60%, delight ≥ 3, delight ≤ 40%
 * - Contradiction detection for combines_with: LOG-ONLY (not hard fail)
 *
 * DO NOT CHANGE validation behavior until Phase 3.
 * =============================================================================
 */

const SPECIFICITY_PATTERN = /(\d|½|¼|¾|⅓|⅔|tsp|tbsp|tablespoon|teaspoon|cup|cups|oz|ounce|g\b|gram|kg|ml|liter|litre|pinch|minute|min\b|°F|°C|\bF\b|\bC\b)/i;

function hasSpecificDetails(details: string): boolean {
  return SPECIFICITY_PATTERN.test(details);
}

const changeSchema = z.object({
  action: z.string().min(1, "action cannot be empty"),
  details: z.preprocess(
    (val) => {
      if (typeof val === "object" && val !== null) {
        return JSON.stringify(val);
      }
      return val;
    },
    z.string().min(1, "details cannot be empty")
  ),
});

const alternativeSchema = z.object({
  kind: z.enum(["basic", "delight"]),
  title: z.string().min(1, "title cannot be empty"),
  why_this_works: z.string().min(1, "why_this_works cannot be empty"),
  changes: z.array(changeSchema).min(2).max(3),
  id: z.string().optional(),
  combines_with: z.array(z.string()).optional(),
});

const rawResponseSchema = z.object({
  what_is_this: z.string().min(1, "what_is_this cannot be empty"),
  why_this_works: z.string().min(1, "why_this_works cannot be empty"),
  alternatives: z.array(alternativeSchema).refine(
    (alts) => alts.length === 9 || (alts.length >= 10 && alts.length <= 15),
    (alts) => ({ message: `Expected 9 or 10-15 alternatives, got ${alts.length}` })
  ),
});

export const v2ResponseSchema = rawResponseSchema.transform((data) => {
  const alternativesWithDefaults = data.alternatives.map((alt, index) => ({
    ...alt,
    id: alt.id || `alt_${index + 1}`,
    combines_with: alt.combines_with || [],
  }));
  
  return {
    ...data,
    alternatives: alternativesWithDefaults,
  };
}).superRefine((data, ctx) => {
  const isLegacyMode = data.alternatives.length === 9;
  const basicCount = data.alternatives.filter(a => a.kind === "basic").length;
  const delightCount = data.alternatives.filter(a => a.kind === "delight").length;

  if (isLegacyMode) {
    if (basicCount !== 5) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Expected exactly 5 basic cards, got ${basicCount}`,
        path: ["alternatives"],
      });
    }

    if (delightCount !== 4) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Expected exactly 4 delight cards, got ${delightCount}`,
        path: ["alternatives"],
      });
    }
  } else {
    const total = data.alternatives.length;
    const minBasic = Math.ceil(total * 0.60);
    if (basicCount < minBasic) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Expected at least ${minBasic} basic cards (60%), got ${basicCount}`,
        path: ["alternatives"],
      });
    }
    if (delightCount < 3) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Expected at least 3 delight cards, got ${delightCount}`,
        path: ["alternatives"],
      });
    }
    const maxDelight = Math.floor(total * 0.40);
    if (delightCount > maxDelight) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Expected at most ${maxDelight} delight cards (40%), got ${delightCount}`,
        path: ["alternatives"],
      });
    }
  }

  const titles = data.alternatives.map(a => a.title.toLowerCase().trim());
  const uniqueTitles = new Set(titles);
  if (uniqueTitles.size !== titles.length) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "All titles must be unique",
      path: ["alternatives"],
    });
  }

  const idSet = new Set(data.alternatives.map(a => a.id));
  for (let i = 0; i < data.alternatives.length; i++) {
    const alt = data.alternatives[i];
    
    for (let j = 0; j < alt.changes.length; j++) {
      const details = alt.changes[j].details;
      if (typeof details === "string" && !hasSpecificDetails(details)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Change details must include a number, unit, or time/temp (card ${i + 1}, change ${j + 1})`,
          path: ["alternatives", i, "changes", j, "details"],
        });
      }
    }
    
    if (alt.combines_with.length > 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `combines_with must have 0-2 entries, got ${alt.combines_with.length}`,
        path: ["alternatives", i, "combines_with"],
      });
    }
    
    for (const refId of alt.combines_with) {
      if (refId === alt.id) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `combines_with cannot self-reference (${refId})`,
          path: ["alternatives", i, "combines_with"],
        });
      }
      if (!idSet.has(refId)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `combines_with references unknown id: ${refId}`,
          path: ["alternatives", i, "combines_with"],
        });
      }
    }
  }
});

export type V2ValidatedResponse = z.infer<typeof v2ResponseSchema>;

export interface ValidationResult {
  success: boolean;
  data?: V2ValidatedResponse;
  error?: string;
  issues?: string[];
}

export function validateV2Response(content: string): ValidationResult {
  try {
    const parsed = JSON.parse(content);
    const result = v2ResponseSchema.safeParse(parsed);
    
    if (result.success) {
      return { success: true, data: result.data };
    }
    
    const issues = result.error.issues.map(issue => 
      `${issue.path.join('.')}: ${issue.message}`
    );
    
    console.log("url_remix_v2_validation_details", issues.slice(0, 5));
    
    return {
      success: false,
      error: result.error.issues[0]?.message || "Validation failed",
      issues,
    };
  } catch (err) {
    return {
      success: false,
      error: "JSON parse error",
      issues: [err instanceof Error ? err.message : "Unknown parse error"],
    };
  }
}
