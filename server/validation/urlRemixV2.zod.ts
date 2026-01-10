import { z } from "zod";

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
});

export const v2ResponseSchema = z.object({
  what_is_this: z.string().min(1, "what_is_this cannot be empty"),
  why_this_works: z.string().min(1, "why_this_works cannot be empty"),
  alternatives: z.array(alternativeSchema).length(9),
}).superRefine((data, ctx) => {
  const basicCount = data.alternatives.filter(a => a.kind === "basic").length;
  const delightCount = data.alternatives.filter(a => a.kind === "delight").length;

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

  const titles = data.alternatives.map(a => a.title.toLowerCase().trim());
  const uniqueTitles = new Set(titles);
  if (uniqueTitles.size !== titles.length) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "All titles must be unique",
      path: ["alternatives"],
    });
  }

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
