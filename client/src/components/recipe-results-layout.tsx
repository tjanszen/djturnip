/**
 * ==========================================================================
 * RecipeResultsLayout — Shared Editorial Results Component
 * See: docs/agent_memory/imp_plans/remix_result_layout.md
 * ==========================================================================
 * 
 * PURPOSE:
 * Provides a calm, editorial, vertical reading layout for recipe results.
 * Used by both Fridge Cleanout (interactive mode) and URL Remix (read-only mode).
 * 
 * DESIGN PRINCIPLES (from Phase 0):
 * - Single-column, vertical reading flow
 * - Hierarchy driven by spacing and typography, not affordances
 * - Consistent section headers and visual rhythm
 * 
 * MODES:
 * - interactive: Full Fridge Cleanout behavior (badges, used ingredients, steps)
 * - readOnly: URL Remix display (title + ingredients + remix cards, no interaction)
 * 
 * Phase 3 will wire URL Remix to use this component in readOnly mode.
 * ==========================================================================
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Utensils, Clock } from "lucide-react";
import type { FridgeRecipe, RecipeAlternative } from "@shared/routes";

export interface RecipeResultsLayoutProps {
  mode: "interactive" | "readOnly";
  
  title: string;
  ingredients: string[];
  
  fridgeRecipe?: FridgeRecipe;
  
  remixCards?: RecipeAlternative[];
  
  testIdPrefix?: string;
}

export function RecipeResultsLayout({
  mode,
  title,
  ingredients,
  fridgeRecipe,
  remixCards,
  testIdPrefix = "recipe-results",
}: RecipeResultsLayoutProps) {
  const isInteractive = mode === "interactive";

  return (
    <div className="w-full space-y-6" data-testid={`${testIdPrefix}-layout`}>
      <Card className="w-full" data-testid={`${testIdPrefix}-card`}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <Utensils className="w-5 h-5 text-primary shrink-0" />
              <CardTitle className="text-xl font-medium leading-tight" data-testid={`${testIdPrefix}-title`}>
                {title}
              </CardTitle>
            </div>
            {isInteractive && fridgeRecipe && (
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="secondary" className="capitalize text-xs">
                  {fridgeRecipe.category}
                </Badge>
                <Badge variant="outline" className="capitalize text-xs">
                  {fridgeRecipe.difficulty}
                </Badge>
              </div>
            )}
          </div>
          
          {isInteractive && fridgeRecipe && (
            <>
              <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  <span>{fridgeRecipe.estimated_time_minutes} min</span>
                </div>
              </div>
              {fridgeRecipe.summary && (
                <p className="text-sm text-muted-foreground mt-2">{fridgeRecipe.summary}</p>
              )}
            </>
          )}
        </CardHeader>

        <CardContent className="space-y-4">
          {isInteractive && fridgeRecipe?.used_ingredients && fridgeRecipe.used_ingredients.length > 0 && (
            <div>
              <p className="text-sm font-medium text-foreground mb-2">Using your ingredients</p>
              <div className="flex flex-wrap gap-1">
                {fridgeRecipe.used_ingredients.map((ing, i) => (
                  <Badge key={i} variant="secondary" className="text-xs">{ing}</Badge>
                ))}
              </div>
            </div>
          )}

          {isInteractive && fridgeRecipe?.skipped_ingredients && fridgeRecipe.skipped_ingredients.length > 0 && (
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">Skipped</p>
              <ul className="text-xs text-muted-foreground space-y-0.5">
                {fridgeRecipe.skipped_ingredients.map((skip, i) => (
                  <li key={i}>{skip.ingredient}: {skip.reason}</li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <p className="text-sm font-medium text-foreground mb-2">Ingredients</p>
            <ul className="text-sm text-muted-foreground space-y-1">
              {ingredients.map((ingredient, i) => (
                <li 
                  key={i} 
                  className="pl-3 border-l-2 border-border"
                  data-testid={`${testIdPrefix}-ingredient-${i}`}
                >
                  {ingredient}
                </li>
              ))}
            </ul>
          </div>

          {isInteractive && fridgeRecipe?.steps && fridgeRecipe.steps.length > 0 && (
            <div>
              <p className="text-sm font-medium text-foreground mb-2">Steps</p>
              <ol className="text-sm text-muted-foreground space-y-2">
                {fridgeRecipe.steps.map((step, i) => (
                  <li key={i} className="pl-3 border-l-2 border-primary/30">
                    <span className="font-medium text-foreground">{i + 1}.</span> {step}
                  </li>
                ))}
              </ol>
            </div>
          )}

          {isInteractive && fridgeRecipe?.adjustment_tags && fridgeRecipe.adjustment_tags.length > 0 && (
            <div className="pt-2 border-t border-border">
              <div className="flex flex-wrap gap-1">
                {fridgeRecipe.adjustment_tags.map((tag, i) => (
                  <Badge key={i} variant="outline" className="text-xs">{tag}</Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {!isInteractive && remixCards && remixCards.length > 0 && (
        <div className="space-y-4" data-testid={`${testIdPrefix}-remix-section`}>
          <h3 className="text-lg font-medium text-foreground">Recipe Variations</h3>
          <div className="space-y-3">
            {remixCards.map((remix, index) => (
              <Card 
                key={index} 
                className="w-full"
                data-testid={`${testIdPrefix}-remix-card-${index}`}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-base font-medium leading-tight">
                      {remix.title}
                    </CardTitle>
                    {(remix as { kind?: string }).kind && (
                      <Badge variant="outline" className="text-xs shrink-0">
                        {(remix as { kind?: string }).kind === "basic" 
                          ? "Basic" 
                          : "Twist"}
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="pt-0 space-y-2">
                  {remix.changes && remix.changes.length > 0 && (
                    remix.changes.map((change, changeIndex) => (
                      <div key={changeIndex} className="space-y-0.5">
                        <p className="text-sm font-medium text-foreground">
                          {change.action}
                        </p>
                        <p className="text-sm text-muted-foreground pl-3 border-l-2 border-border">
                          {change.details}
                        </p>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
