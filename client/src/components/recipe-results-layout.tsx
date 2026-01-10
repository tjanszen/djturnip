/**
 * ==========================================================================
 * RecipeResultsLayout — Shared Editorial Results Component
 * See: docs/agent_memory/imp_plans/remix_result_layout.md
 * ==========================================================================
 * 
 * PURPOSE:
 * Provides a calm, editorial, vertical reading layout for recipe results.
 * Matches the fridge-result layout exactly, with mode-based interactivity.
 * 
 * DESIGN PRINCIPLES:
 * - Single-column, vertical reading flow
 * - Matches fridge-result styling: serif title, name+amount ingredient rows
 * - Hierarchy driven by spacing and typography, not affordances
 * - All content visible at once (no pagination/carousel)
 * 
 * MODES:
 * - interactive: Full Fridge Cleanout behavior (chevrons, click handlers)
 * - readOnly: URL Remix display (same styling, no interaction)
 * 
 * COLLAPSIBLE INGREDIENTS:
 * - collapsibleIngredients: enables accordion-style collapse
 * - ingredientsDefaultCollapsed: starts collapsed (URL Remix uses this)
 * ==========================================================================
 */

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronRight, ChevronDown } from "lucide-react";
import type { RecipeAlternative } from "@shared/routes";

interface IngredientItem {
  id: string;
  name: string;
  amount: string;
  hasSubstitutes?: boolean;
}

export interface RecipeResultsLayoutProps {
  mode: "interactive" | "readOnly";
  
  // Recipe title
  title: string;
  
  // Description (optional)
  description?: string;
  
  // V2 editorial fields (URL Remix only)
  whatIsThis?: string;
  whyThisWorks?: string;
  
  // Ingredients - can be simple strings or structured objects
  ingredients: string[] | IngredientItem[];
  
  // Remix cards (for URL Remix read-only mode)
  remixCards?: RecipeAlternative[];
  
  // Click handler for ingredient rows (interactive mode only)
  onIngredientClick?: (ingredient: IngredientItem, index: number) => void;
  
  // Collapsible ingredients behavior
  collapsibleIngredients?: boolean;
  ingredientsDefaultCollapsed?: boolean;
  
  testIdPrefix?: string;
}

export function RecipeResultsLayout({
  mode,
  title,
  description,
  whatIsThis,
  whyThisWorks,
  ingredients,
  remixCards,
  onIngredientClick,
  collapsibleIngredients = false,
  ingredientsDefaultCollapsed = false,
  testIdPrefix = "recipe-results",
}: RecipeResultsLayoutProps) {
  const isInteractive = mode === "interactive";
  const [ingredientsExpanded, setIngredientsExpanded] = useState(!ingredientsDefaultCollapsed);

  // Normalize ingredients to structured format
  const normalizedIngredients: IngredientItem[] = ingredients.map((ing, i) => {
    if (typeof ing === "string") {
      return { id: `ing-${i}`, name: ing, amount: "", hasSubstitutes: false };
    }
    return ing;
  });

  const ingredientCount = normalizedIngredients.length;

  return (
    <div className="w-full space-y-6" data-testid={`${testIdPrefix}-layout`}>
      {/* Title and Description - matches fridge-result styling */}
      <div>
        <h2 
          className="text-2xl font-serif font-medium text-foreground" 
          data-testid={`${testIdPrefix}-title`}
        >
          {title}
        </h2>
        {description && (
          <p className="text-muted-foreground mt-2" data-testid={`${testIdPrefix}-description`}>
            {description}
          </p>
        )}
      </div>

      {/* V2 Editorial Sections - URL Remix only */}
      {whatIsThis && (
        <div className="space-y-2" data-testid={`${testIdPrefix}-what-is-this-section`}>
          <h3 className="text-lg font-medium text-foreground">What is this?</h3>
          <p className="text-sm text-muted-foreground" data-testid={`${testIdPrefix}-what-is-this`}>
            {whatIsThis}
          </p>
        </div>
      )}

      {whyThisWorks && (
        <div className="space-y-2" data-testid={`${testIdPrefix}-why-this-works-section`}>
          <h3 className="text-lg font-medium text-foreground">Why this works</h3>
          <p className="text-sm text-muted-foreground" data-testid={`${testIdPrefix}-why-this-works`}>
            {whyThisWorks}
          </p>
        </div>
      )}

      {/* Ingredients section - matches fridge-result row styling exactly */}
      <div className="space-y-3">
        {collapsibleIngredients ? (
          <button
            type="button"
            onClick={() => setIngredientsExpanded(!ingredientsExpanded)}
            className="flex items-center justify-between w-full text-left hover-elevate active-elevate-2 py-1 -my-1 rounded-md"
            aria-expanded={ingredientsExpanded}
            data-testid={`${testIdPrefix}-ingredients-toggle`}
          >
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-medium text-foreground">Ingredients</h3>
              {!ingredientsExpanded && (
                <span className="text-sm text-muted-foreground">
                  ({ingredientCount})
                </span>
              )}
            </div>
            {ingredientsExpanded ? (
              <ChevronDown className="w-5 h-5 text-muted-foreground" />
            ) : (
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            )}
          </button>
        ) : (
          <h3 className="text-lg font-medium text-foreground">Ingredients</h3>
        )}
        
        {(!collapsibleIngredients || ingredientsExpanded) && (
          <div className="space-y-0" data-testid={`${testIdPrefix}-ingredients`}>
            {normalizedIngredients.map((ing, i) => {
              const isTappable = isInteractive && ing.hasSubstitutes;
              
              return (
                <div 
                  key={ing.id} 
                  className={`flex items-center justify-between py-3 border-b border-border last:border-b-0 ${isTappable ? 'cursor-pointer hover-elevate active-elevate-2' : ''}`}
                  onClick={isTappable && onIngredientClick ? () => onIngredientClick(ing, i) : undefined}
                  data-testid={`${testIdPrefix}-ingredient-row-${i}`}
                >
                  <span className="text-sm text-foreground flex-1" data-testid={`${testIdPrefix}-ingredient-name-${i}`}>
                    {ing.name}
                  </span>
                  <div className="flex items-center gap-2">
                    {ing.amount && (
                      <span className="text-sm text-muted-foreground text-right" data-testid={`${testIdPrefix}-ingredient-amount-${i}`}>
                        {ing.amount}
                      </span>
                    )}
                    {isTappable && (
                      <ChevronRight className="w-4 h-4 text-muted-foreground" data-testid={`${testIdPrefix}-chevron-${i}`} />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Remix cards - read-only mode only */}
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
                <CardContent className="pt-0 space-y-3">
                  {/* Per-alternative why_this_works - rendered above changes */}
                  {(remix as { why_this_works?: string }).why_this_works && (
                    <p 
                      className="text-sm italic text-muted-foreground"
                      data-testid={`${testIdPrefix}-remix-why-${index}`}
                    >
                      {(remix as { why_this_works?: string }).why_this_works}
                    </p>
                  )}
                  {remix.changes && remix.changes.length > 0 && (
                    <div className="space-y-2">
                      {remix.changes.map((change, changeIndex) => (
                        <div key={changeIndex} className="space-y-0.5">
                          <p className="text-sm font-medium text-foreground">
                            {change.action}
                          </p>
                          <p className="text-sm text-muted-foreground pl-3 border-l-2 border-border">
                            {change.details}
                          </p>
                        </div>
                      ))}
                    </div>
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
