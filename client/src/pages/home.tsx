import { useState, useEffect, useCallback, useRef } from "react";
import { useProcessRecipe, useFridgeRecipes } from "@/hooks/use-recipes";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { Link2, Loader2, ChefHat, Utensils, Sparkles, ArrowLeft, Heart, RotateCcw, Clock, Refrigerator, TrendingUp, Star, Repeat, ChevronLeft, ChevronRight, Minus, Plus, X, User, Globe, ChevronDown, Trash2, Carrot, Apple, Egg, Salad, Check, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter, DrawerClose } from "@/components/ui/drawer";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { RecipeAlternative, RecipeStyle, FridgeRecipe } from "@shared/routes";
import type { IngredientItemV2, StepItemV2, SubstituteItemV2, RemixV2 } from "@shared/schema";

// In-memory image cache (persists across re-renders but not page refreshes)
const imageByRecipeKey: Record<string, string> = {};

// Simple hash function for stable recipe key
function computeRecipeKey(recipe: { name: string; ingredients: { name: string }[]; steps: { text: string }[] }): string {
  const ingredientStr = recipe.ingredients.map(i => i.name).join("|");
  const stepStr = recipe.steps.map(s => s.text).join("|");
  const combined = `${recipe.name}::${ingredientStr}::${stepStr}`;
  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `recipe-${Math.abs(hash).toString(36)}`;
}

// Recipe Hero Image component with loading state and caching
function RecipeHeroImage({ recipe }: { recipe: { name: string; ingredients: { name: string }[]; steps: { text: string }[]; image_prompt: string } }) {
  const recipeKey = computeRecipeKey(recipe);
  const [imageUrl, setImageUrl] = useState<string | null>(imageByRecipeKey[recipeKey] || null);
  const [isLoading, setIsLoading] = useState(!imageByRecipeKey[recipeKey]);
  const fetchedRef = useRef<string | null>(null);

  useEffect(() => {
    if (imageByRecipeKey[recipeKey]) {
      setImageUrl(imageByRecipeKey[recipeKey]);
      setIsLoading(false);
      return;
    }

    if (fetchedRef.current === recipeKey) {
      return;
    }
    fetchedRef.current = recipeKey;

    const generateImage = async () => {
      setIsLoading(true);
      try {
        const response = await fetch('/api/recipes/generate-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: recipe.image_prompt }),
        });
        const data = await response.json();
        if (data.image_url) {
          console.log(`recipe_image_gen_success recipeKey=${recipeKey}`);
          imageByRecipeKey[recipeKey] = data.image_url;
          setImageUrl(data.image_url);
        }
      } catch (err) {
        console.error("recipe_image_gen_client_error", err);
      } finally {
        setIsLoading(false);
      }
    };

    generateImage();
  }, [recipeKey, recipe.image_prompt]);

  if (isLoading) {
    return (
      <div className="w-full aspect-[4/3] overflow-hidden" data-testid="image-skeleton">
        <Skeleton className="w-full h-full" />
      </div>
    );
  }

  if (!imageUrl) {
    return null;
  }

  return (
    <div className="w-full aspect-[4/3] overflow-hidden" data-testid="recipe-hero-image-container">
      <img 
        src={imageUrl} 
        alt={recipe.name}
        className="w-full h-full object-cover"
        data-testid="recipe-hero-image"
      />
    </div>
  );
}

const FRIDGE_NEW_FLOW_V1 = import.meta.env.VITE_FRIDGE_NEW_FLOW_V1 === "on";

type CleanoutStatus = "processing" | "prefs" | "confirm" | "generating" | "done" | "error" | "single";

interface CleanoutSession {
  session_id: string;
  raw_ingredients: string[];
  normalized_ingredients: string[];
  prefs: {
    servings: number;
    time: "best" | "15" | "30" | "60";
    cuisine: string;
  };
  allow_extras: boolean;
  status: CleanoutStatus;
  error_message: string | null;
}

function normalizeIngredients(raw: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  
  for (const item of raw) {
    const trimmed = item.trim();
    if (trimmed.length === 0) continue;
    
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    
    seen.add(key);
    result.push(trimmed);
  }
  
  return result;
}

function generateSessionId(): string {
  return `cleanout-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

import turkishPastaImg from "@assets/turkish_pasta_1766420895437.png";
import gigiHadidPastaImg from "@assets/gigi_hadid_pasta_1766420895438.png";
import marryMeChickenSoupImg from "@assets/merry_me_chicken_soup_1766420895433.png";
import porkDumplingLasagnaImg from "@assets/pork_dumpling_lasagna_1766424099051.png";

const featuredRecipes = [
  {
    id: "pork-dumpling-lasagna",
    title: "Pork Dumpling Lasagna",
    description: "A viral fusion of juicy pork dumplings layered lasagna-style with chili oil",
    url: "https://themodernnonna.com/viral-pork-dumpling-lasagna/",
    image: porkDumplingLasagnaImg,
    tag: "Trending",
    tagIcon: TrendingUp,
  },
  {
    id: "turkish-pasta",
    title: "Turkish Pasta",
    description: "Creamy tomato sauce with a hint of spice and fresh herbs",
    url: "https://foolproofliving.com/turkish-pasta/",
    image: turkishPastaImg,
    tag: "Popular",
    tagIcon: Star,
  },
  {
    id: "gigi-hadid-pasta",
    title: "Gigi Hadid Pasta",
    description: "The viral spicy vodka pasta that took social media by storm",
    url: "https://healthyfitnessmeals.com/gigi-hadid-pasta/",
    image: gigiHadidPastaImg,
    tag: "Popular",
    tagIcon: Star,
  },
  {
    id: "marry-me-chicken-soup",
    title: "Marry Me Chicken Soup",
    description: "Rich and comforting soup with sun-dried tomatoes and parmesan",
    url: "https://www.allrecipes.com/marry-me-chicken-soup-recipe-8421914",
    image: marryMeChickenSoupImg,
    tag: "Most Remixed",
    tagIcon: Repeat,
  },
];

type ViewState = "search" | "swiping" | "saved" | "fridge-processing" | "fridge-prefs" | "fridge-confirm" | "fridge-generating" | "fridge-result" | "fridge-error" | "fridge-single" | "cook-mode";
type RecipeMode = "remix" | "fridge";

// Generated recipe shape (structured V2 format)
interface GeneratedRecipe {
  name: string;
  description: string;
  explanation: string;
  servings: number;
  time_minutes: number | null;
  calories_per_serving: number | null;
  ingredients: IngredientItemV2[];
  steps: StepItemV2[];
  image_prompt: string;
  remixes: RemixV2[];
}

console.log("client_recipe_type_image_prompt_added");
console.log("recipe_remixes_phase3_ui_live");
console.log("recipe_remixes_phase4_working_ingredients_integrated");

export default function Home() {
  const [url, setUrl] = useState("");
  const [ingredients, setIngredients] = useState("");
  const [alternatives, setAlternatives] = useState<RecipeAlternative[]>([]);
  const [fridgeRecipes, setFridgeRecipes] = useState<FridgeRecipe[]>([]);
  const [activeStyle, setActiveStyle] = useState<RecipeStyle | null>(null);
  const [viewState, setViewState] = useState<ViewState>("search");
  const [recipeMode, setRecipeMode] = useState<RecipeMode>("remix");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [savedRemixes, setSavedRemixes] = useState<RecipeAlternative[]>([]);
  const [savedFridgeRecipes, setSavedFridgeRecipes] = useState<FridgeRecipe[]>([]);
  const [swipeDirection, setSwipeDirection] = useState<"left" | "right" | null>(null);
  const [activeQuickRemix, setActiveQuickRemix] = useState<string | null>(null);
  const [spotlightIndex, setSpotlightIndex] = useState(0);
  
  const [cleanoutSession, setCleanoutSession] = useState<CleanoutSession | null>(null);
  const [newIngredient, setNewIngredient] = useState("");
  const [confirmValidationError, setConfirmValidationError] = useState<string | null>(null);
  const [showAddIngredientInput, setShowAddIngredientInput] = useState(false);
  const [generatedRecipe, setGeneratedRecipe] = useState<GeneratedRecipe | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);
  
  // V2 ingredient substitution state
  const [workingIngredients, setWorkingIngredients] = useState<IngredientItemV2[]>([]);
  const [selectedIngredient, setSelectedIngredient] = useState<IngredientItemV2 | null>(null);
  const [selectedSubstituteId, setSelectedSubstituteId] = useState<string>("original");
  const [isSubstituteDrawerOpen, setIsSubstituteDrawerOpen] = useState(false);
  
  // Remix state
  const [activeRemixId, setActiveRemixId] = useState<string | null>(null);
  const [remixedRecipe, setRemixedRecipe] = useState<GeneratedRecipe | null>(null);
  
  const { mutate: processRecipe, isPending: isProcessingRecipe } = useProcessRecipe();
  const { mutate: generateFridgeRecipes, isPending: isGeneratingFridge } = useFridgeRecipes();
  const { toast } = useToast();
  
  useEffect(() => {
    if (viewState !== "fridge-generating" || !cleanoutSession) return;
    
    const singleScreenEnabled = import.meta.env.VITE_FRIDGE_SINGLE_RECIPE_SCREEN_V1 === "on";
    const MIN_LOADING_TIME = 5000;
    
    const generateRecipe = async () => {
      const startTime = Date.now();
      
      try {
        const response = await fetch('/api/recipes/generate-single', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ingredients: cleanoutSession.normalized_ingredients,
            prefs: cleanoutSession.prefs,
            allow_extras: cleanoutSession.allow_extras,
          }),
        });
        
        const data = await response.json();
        
        const elapsed = Date.now() - startTime;
        const remainingDelay = singleScreenEnabled ? Math.max(0, MIN_LOADING_TIME - elapsed) : 0;
        
        if (remainingDelay > 0) {
          await new Promise(resolve => setTimeout(resolve, remainingDelay));
        }
        
        if (data.success && data.recipe) {
          console.log("single_screen_v1 generate_success=true");
          setGeneratedRecipe(data.recipe);
          // Clear remix state when new recipe is generated
          setRemixedRecipe(null);
          setActiveRemixId(null);
          setCleanoutSession(prev => prev ? { ...prev, status: "done" } : null);
          setViewState("fridge-result");
        } else {
          console.log("single_screen_v1 generate_success=false");
          setGenerationError(data.error || "Failed to generate recipe");
          setCleanoutSession(prev => prev ? { ...prev, status: "error", error_message: data.error } : null);
          setViewState("fridge-error");
        }
      } catch (err) {
        const elapsed = Date.now() - startTime;
        const remainingDelay = singleScreenEnabled ? Math.max(0, MIN_LOADING_TIME - elapsed) : 0;
        
        if (remainingDelay > 0) {
          await new Promise(resolve => setTimeout(resolve, remainingDelay));
        }
        
        console.log("single_screen_v1 generate_success=false");
        const errorMsg = err instanceof Error ? err.message : "Network error";
        setGenerationError(errorMsg);
        setCleanoutSession(prev => prev ? { ...prev, status: "error", error_message: errorMsg } : null);
        setViewState("fridge-error");
      }
    };
    
    generateRecipe();
  }, [viewState, cleanoutSession?.session_id]);
  
  useEffect(() => {
    const singleScreenEnabled = import.meta.env.VITE_FRIDGE_SINGLE_RECIPE_SCREEN_V1 === "on";
    if (singleScreenEnabled && viewState === "fridge-confirm" && cleanoutSession) {
      console.log("single_screen_v1 confirm_redirected");
      setViewState("fridge-single");
    }
  }, [viewState, cleanoutSession]);
  
  // Initialize working copy when recipe is generated
  useEffect(() => {
    if (generatedRecipe) {
      // Deep copy the ingredients to create a working copy
      setWorkingIngredients(
        generatedRecipe.ingredients.map(ing => ({
          ...ing,
          substitutes: [...ing.substitutes],
        }))
      );
    }
  }, [generatedRecipe]);

  // Helper to get original ingredient from generatedRecipe by ID
  const getOriginalIngredient = useCallback((id: string): IngredientItemV2 | undefined => {
    if (!generatedRecipe) return undefined;
    return generatedRecipe.ingredients.find(ing => ing.id === id);
  }, [generatedRecipe]);

  // Handle opening the substitute drawer
  const handleIngredientTap = useCallback((ingredient: IngredientItemV2) => {
    if (ingredient.substitutes.length === 0) return;
    setSelectedIngredient(ingredient);
    // Find if current working ingredient differs from original
    const original = getOriginalIngredient(ingredient.id);
    if (original && (ingredient.name === original.name && ingredient.amount === original.amount)) {
      setSelectedSubstituteId("original");
    } else {
      // Find which substitute matches current state
      const matchingSub = original?.substitutes.find(
        sub => sub.name === ingredient.name && sub.amount === ingredient.amount
      );
      setSelectedSubstituteId(matchingSub?.id || "original");
    }
    setIsSubstituteDrawerOpen(true);
  }, [getOriginalIngredient]);

  // Handle swap confirmation
  const handleSwapConfirm = useCallback(() => {
    if (!selectedIngredient) return;
    const original = getOriginalIngredient(selectedIngredient.id);
    if (!original) return;

    setWorkingIngredients(prev => 
      prev.map(ing => {
        if (ing.id !== selectedIngredient.id) return ing;
        
        if (selectedSubstituteId === "original") {
          // Revert to original
          return {
            ...ing,
            name: original.name,
            amount: original.amount,
          };
        } else {
          // Apply substitute
          const substitute = original.substitutes.find(s => s.id === selectedSubstituteId);
          if (!substitute) return ing;
          return {
            ...ing,
            name: substitute.name,
            amount: substitute.amount,
          };
        }
      })
    );
    setIsSubstituteDrawerOpen(false);
    setSelectedIngredient(null);
  }, [selectedIngredient, selectedSubstituteId, getOriginalIngredient]);

  // Apply remix patch to base recipe and return derived recipe
  const applyRemixPatch = useCallback((remix: RemixV2, baseRecipe: GeneratedRecipe): GeneratedRecipe | null => {
    try {
      const { patch } = remix;
      
      // Start with a copy of base recipe
      let newIngredients = baseRecipe.ingredients.map(ing => ({
        ...ing,
        substitutes: [...ing.substitutes],
      }));
      let newSteps = baseRecipe.steps.map(step => ({
        ...step,
        ingredient_ids: [...step.ingredient_ids],
      }));
      let newTimeMinutes = baseRecipe.time_minutes;
      let newCaloriesPerServing = baseRecipe.calories_per_serving;
      
      // Apply ingredient_overrides
      if (patch.ingredient_overrides) {
        for (const override of patch.ingredient_overrides) {
          const idx = newIngredients.findIndex(ing => ing.id === override.ingredient_id);
          if (idx === -1) {
            console.warn(`Remix patch: ingredient_id ${override.ingredient_id} not found, skipping override`);
            continue; // Skip this override, don't fail the whole patch
          }
          if (override.amount !== undefined) {
            newIngredients[idx] = { ...newIngredients[idx], amount: override.amount };
          }
        }
      }
      
      // Add new ingredients
      if (patch.add_ingredients) {
        const existingIds = new Set(newIngredients.map(ing => ing.id));
        for (const addIng of patch.add_ingredients) {
          if (existingIds.has(addIng.id)) {
            console.warn(`Remix patch: duplicate ingredient_id ${addIng.id}`);
            continue;
          }
          newIngredients.push({
            id: addIng.id,
            name: addIng.name,
            amount: addIng.amount,
            substitutes: [],
          });
          existingIds.add(addIng.id);
        }
      }
      
      // Apply step_ops
      if (patch.step_ops) {
        for (const op of patch.step_ops) {
          if (op.op === "add_after") {
            const idx = newSteps.findIndex(s => s.id === op.after_step_id);
            if (idx === -1) {
              console.warn(`Remix patch: after_step_id ${op.after_step_id} not found for add_after, skipping`);
              continue;
            }
            if (op.step) {
              newSteps.splice(idx + 1, 0, {
                id: op.step.id,
                text: op.step.text,
                ingredient_ids: op.step.ingredient_ids || [],
                time_minutes: op.step.time_minutes || null,
              });
            }
          } else if (op.op === "replace") {
            const idx = newSteps.findIndex(s => s.id === op.step_id);
            if (idx === -1) {
              console.warn(`Remix patch: step_id ${op.step_id} not found for replace, skipping`);
              continue;
            }
            if (op.step) {
              newSteps[idx] = {
                id: op.step.id,
                text: op.step.text,
                ingredient_ids: op.step.ingredient_ids || [],
                time_minutes: op.step.time_minutes || null,
              };
            }
          } else if (op.op === "remove") {
            const idx = newSteps.findIndex(s => s.id === op.step_id);
            if (idx === -1) {
              console.warn(`Remix patch: step_id ${op.step_id} not found for remove, skipping`);
              continue;
            }
            newSteps.splice(idx, 1);
          }
        }
      }
      
      // Apply meta_updates
      if (patch.meta_updates) {
        if (patch.meta_updates.time_minutes !== undefined) {
          newTimeMinutes = patch.meta_updates.time_minutes;
        }
        if (patch.meta_updates.calories_per_serving !== undefined) {
          newCaloriesPerServing = patch.meta_updates.calories_per_serving;
        }
      }
      
      return {
        ...baseRecipe,
        ingredients: newIngredients,
        steps: newSteps,
        time_minutes: newTimeMinutes,
        calories_per_serving: newCaloriesPerServing,
      };
    } catch (err) {
      console.warn("Remix patch apply failed:", err);
      return null;
    }
  }, []);

  // Handle selecting a remix
  const handleApplyRemix = useCallback((remixId: string) => {
    if (!generatedRecipe) return;
    
    const remix = generatedRecipe.remixes?.find(r => r.id === remixId);
    if (!remix) {
      console.warn(`Remix ${remixId} not found`);
      return;
    }
    
    const derived = applyRemixPatch(remix, generatedRecipe);
    if (derived) {
      setRemixedRecipe(derived);
      setActiveRemixId(remixId);
      // Update working ingredients to reflect remixed recipe
      setWorkingIngredients(
        derived.ingredients.map(ing => ({
          ...ing,
          substitutes: [...ing.substitutes],
        }))
      );
    } else {
      // Patch failed - stay on base recipe
      console.warn(`Failed to apply remix ${remixId}`);
    }
  }, [generatedRecipe, applyRemixPatch]);

  // Handle undo remix
  const handleUndoRemix = useCallback(() => {
    if (!generatedRecipe) return;
    setRemixedRecipe(null);
    setActiveRemixId(null);
    // Reset working ingredients to base recipe
    setWorkingIngredients(
      generatedRecipe.ingredients.map(ing => ({
        ...ing,
        substitutes: [...ing.substitutes],
      }))
    );
  }, [generatedRecipe]);

  // Get the recipe to display (remixed or base)
  const displayRecipe = remixedRecipe || generatedRecipe;
  
  const handleQuickRemix = (recipeUrl: string, recipeId: string) => {
    setActiveQuickRemix(recipeId);
    setRecipeMode("remix");

    processRecipe({ url: recipeUrl, style: "creative" }, {
      onSuccess: (data) => {
        toast({
          title: "Recipe Processed",
          description: data.message,
        });
        
        if (data.alternatives && data.alternatives.length > 0) {
          setAlternatives(data.alternatives);
          setCurrentIndex(0);
          setSavedRemixes([]);
          setViewState("swiping");
        } else {
          setAlternatives([]);
        }
        
        setActiveQuickRemix(null);
      },
      onError: (error) => {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
        setActiveQuickRemix(null);
      },
    });
  };

  const handleRemixSubmit = (style: RecipeStyle) => {
    const urlSchema = z.string().url({ message: "Please enter a valid URL starting with http:// or https://" });
    const result = urlSchema.safeParse(url);

    if (!result.success) {
      toast({
        title: "Invalid URL",
        description: result.error.errors[0].message,
        variant: "destructive",
      });
      return;
    }

    setActiveStyle(style);
    setRecipeMode("remix");

    processRecipe({ url, style }, {
      onSuccess: (data) => {
        toast({
          title: "Recipe Processed",
          description: data.message,
        });
        
        if (data.alternatives && data.alternatives.length > 0) {
          setAlternatives(data.alternatives);
          setCurrentIndex(0);
          setSavedRemixes([]);
          setViewState("swiping");
        } else {
          setAlternatives([]);
        }
        
        setUrl("");
        setActiveStyle(null);
      },
      onError: (error) => {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
        setActiveStyle(null);
      },
    });
  };

  const handleFridgeSubmit = () => {
    if (!ingredients.trim()) {
      toast({
        title: "No ingredients",
        description: "Please enter at least one ingredient",
        variant: "destructive",
      });
      return;
    }

    setRecipeMode("fridge");

    if (FRIDGE_NEW_FLOW_V1) {
      const singleScreenEnabled = import.meta.env.VITE_FRIDGE_SINGLE_RECIPE_SCREEN_V1 === "on";
      const rawIngredients = ingredients.split(",").map(s => s.trim());
      const normalized = normalizeIngredients(rawIngredients);
      
      const session: CleanoutSession = {
        session_id: generateSessionId(),
        raw_ingredients: rawIngredients,
        normalized_ingredients: normalized,
        prefs: {
          servings: 2,
          time: "best",
          cuisine: "any",
        },
        allow_extras: true,
        status: singleScreenEnabled ? "single" : "processing",
        error_message: null,
      };
      
      console.log("cleanout_recipe_it_click");
      
      if (singleScreenEnabled) {
        console.log("single_screen_v1 direct_nav_to_single");
        setCleanoutSession(session);
        setViewState("fridge-single");
      } else {
        console.log(`fridge_flow_v1 session_id=${session.session_id} status=processing normalized_count=${normalized.length}`);
        setCleanoutSession(session);
        setViewState("fridge-processing");
      }
      setIngredients("");
      return;
    }

    generateFridgeRecipes({ ingredients }, {
      onSuccess: (data) => {
        toast({
          title: "Recipes Generated",
          description: data.message,
        });
        
        if (data.recipes && data.recipes.length > 0) {
          setFridgeRecipes(data.recipes);
          setCurrentIndex(0);
          setSavedFridgeRecipes([]);
          setViewState("swiping");
        } else {
          setFridgeRecipes([]);
        }
        
        setIngredients("");
      },
      onError: (error) => {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      },
    });
  };
  
  useEffect(() => {
    if (viewState === "fridge-processing" && cleanoutSession) {
      const timer = setTimeout(() => {
        const singleScreenEnabled = import.meta.env.VITE_FRIDGE_SINGLE_RECIPE_SCREEN_V1 === "on";
        
        if (singleScreenEnabled) {
          console.log("single_screen_v1 enter");
          setCleanoutSession(prev => prev ? { ...prev, status: "single" } : null);
          setViewState("fridge-single");
        } else {
          setCleanoutSession(prev => prev ? { ...prev, status: "prefs" } : null);
          console.log(`fridge_flow_v1 session_id=${cleanoutSession.session_id} status=prefs normalized_count=${cleanoutSession.normalized_ingredients.length}`);
          setViewState("fridge-prefs");
        }
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [viewState, cleanoutSession]);

  const handleSwipe = (direction: "left" | "right") => {
    setSwipeDirection(direction);
    
    if (direction === "right") {
      if (recipeMode === "remix") {
        const currentRecipe = alternatives[currentIndex];
        if (currentRecipe) {
          setSavedRemixes(prev => [...prev, currentRecipe]);
        }
      } else {
        const currentRecipe = fridgeRecipes[currentIndex];
        if (currentRecipe) {
          setSavedFridgeRecipes(prev => [...prev, currentRecipe]);
        }
      }
    }
    
    const totalRecipes = recipeMode === "remix" ? alternatives.length : fridgeRecipes.length;
    
    setTimeout(() => {
      setSwipeDirection(null);
      if (currentIndex < totalRecipes - 1) {
        setCurrentIndex(prev => prev + 1);
      } else {
        setViewState("saved");
      }
    }, 300);
  };

  const handleBackToSearch = () => {
    setViewState("search");
    setAlternatives([]);
    setFridgeRecipes([]);
    setCurrentIndex(0);
    setSavedRemixes([]);
    setSavedFridgeRecipes([]);
  };

  const currentRemix = alternatives[currentIndex];
  const currentFridgeRecipe = fridgeRecipes[currentIndex];
  const totalRecipes = recipeMode === "remix" ? alternatives.length : fridgeRecipes.length;
  const isPending = isProcessingRecipe || isGeneratingFridge;

  return (
    <div className="min-h-screen w-full flex flex-col items-center p-4 md:p-8 bg-background">
      <AnimatePresence mode="wait">
        {viewState === "search" && (
          <motion.div
            key="search"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="w-full max-w-xl mt-8 space-y-8"
          >
            {/* Recipe Remix Section */}
            <div className="bg-card border border-border shadow-lg rounded-2xl overflow-hidden">
              <div className="p-8 md:p-12 space-y-8">
                <div className="space-y-4 text-center">
                  <div className="mx-auto w-12 h-12 bg-primary/5 rounded-full flex items-center justify-center mb-6">
                    <ChefHat className="w-6 h-6 text-primary" />
                  </div>
                  <h1 className="text-3xl md:text-4xl font-serif font-medium text-primary tracking-tight">
                    Remix any recipe
                  </h1>
                </div>

                <div className="space-y-4" data-testid="form-recipe">
                  <div className="space-y-2">
                    <label
                      htmlFor="url-input"
                      className="text-xs font-semibold uppercase tracking-wider text-muted-foreground ml-1"
                    >
                      Recipe Link
                    </label>
                    <div className="flex gap-3">
                      <div className="relative group flex-1">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors duration-200">
                          <Link2 className="w-5 h-5" />
                        </div>
                        <input
                          id="url-input"
                          type="url"
                          value={url}
                          onChange={(e) => setUrl(e.target.value)}
                          placeholder="https://allrecipes.com/..."
                          className="w-full pl-12 pr-4 py-4 bg-secondary/50 border border-transparent rounded-xl text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:bg-background focus:border-primary/20 focus:ring-4 focus:ring-primary/5 transition-all duration-200"
                          autoComplete="off"
                          data-testid="input-url"
                        />
                      </div>
                      <Button
                        onClick={() => handleRemixSubmit('creative')}
                        disabled={isPending || !url}
                        className="px-6 py-4 h-auto"
                        data-testid="button-creative"
                      >
                        {isProcessingRecipe && activeStyle === 'creative' ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Sparkles className="w-4 h-4" />
                        )}
                        <span>Remix</span>
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Featured Recipe Spotlight */}
            <div className="space-y-6 py-4">
              <div className="text-center">
                <h3 className="text-xl font-serif font-medium text-foreground">
                  Try a quick remix
                </h3>
              </div>
              
              <div className="relative">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={featuredRecipes[spotlightIndex].id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                    className="flex flex-col items-center"
                    data-testid={`card-featured-${featuredRecipes[spotlightIndex].id}`}
                  >
                    <div className="w-full max-w-sm mx-auto">
                      <div className="relative rounded-2xl overflow-hidden shadow-lg bg-card">
                        <div className="aspect-[4/3] relative">
                          <img
                            src={featuredRecipes[spotlightIndex].image}
                            alt={featuredRecipes[spotlightIndex].title}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                          <div className="absolute top-4 left-4">
                            <Badge variant="secondary" className="gap-1.5 bg-background/95 backdrop-blur-sm shadow-sm">
                              {(() => {
                                const TagIcon = featuredRecipes[spotlightIndex].tagIcon;
                                return <TagIcon className="w-3 h-3" />;
                              })()}
                              {featuredRecipes[spotlightIndex].tag}
                            </Badge>
                          </div>
                        </div>
                        
                        <div className="p-6 space-y-4 text-center">
                          <div className="space-y-2">
                            <h4 className="text-xl font-medium text-foreground">
                              {featuredRecipes[spotlightIndex].title}
                            </h4>
                            <p className="text-sm text-muted-foreground">
                              {featuredRecipes[spotlightIndex].description}
                            </p>
                          </div>
                          
                          <Button
                            onClick={() => handleQuickRemix(featuredRecipes[spotlightIndex].url, featuredRecipes[spotlightIndex].id)}
                            disabled={isPending || activeQuickRemix !== null}
                            size="lg"
                            className="w-full rounded-full py-6 text-base font-medium shadow-md"
                            data-testid={`button-remix-${featuredRecipes[spotlightIndex].id}`}
                          >
                            {activeQuickRemix === featuredRecipes[spotlightIndex].id ? (
                              <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                              <Sparkles className="w-5 h-5" />
                            )}
                            <span>Remix This Recipe</span>
                          </Button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>
              
              <div className="flex items-center justify-center gap-4 pt-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setSpotlightIndex((prev) => (prev === 0 ? featuredRecipes.length - 1 : prev - 1))}
                  className="rounded-full"
                  data-testid="button-spotlight-prev"
                >
                  <ChevronLeft className="w-5 h-5" />
                </Button>
                
                <div className="flex items-center gap-2">
                  {featuredRecipes.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setSpotlightIndex(index)}
                      className={`w-2 h-2 rounded-full transition-all duration-200 ${
                        index === spotlightIndex 
                          ? "bg-primary w-6" 
                          : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
                      }`}
                      data-testid={`button-spotlight-dot-${index}`}
                    />
                  ))}
                </div>
                
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setSpotlightIndex((prev) => (prev === featuredRecipes.length - 1 ? 0 : prev + 1))}
                  className="rounded-full"
                  data-testid="button-spotlight-next"
                >
                  <ChevronRight className="w-5 h-5" />
                </Button>
              </div>
            </div>

            {/* Fridge Cleanout Section */}
            <div className="bg-card border border-border shadow-lg rounded-2xl overflow-hidden">
              <div className="p-8 md:p-12 space-y-8">
                <div className="space-y-4 text-center">
                  <div className="mx-auto w-12 h-12 bg-primary/5 rounded-full flex items-center justify-center mb-6">
                    <Refrigerator className="w-6 h-6 text-primary" />
                  </div>
                  <h2 className="text-3xl md:text-4xl font-serif font-medium text-primary tracking-tight">
                    Fridge Cleanout
                  </h2>
                  <p className="text-muted-foreground text-balance">
                    Use up what you have before it expires.
                  </p>
                </div>

                <div className="space-y-4" data-testid="form-fridge">
                  <div className="space-y-2">
                    <label
                      htmlFor="ingredients-input"
                      className="text-xs font-semibold uppercase tracking-wider text-muted-foreground ml-1"
                    >
                      What's in your fridge?
                    </label>
                    <textarea
                      id="ingredients-input"
                      value={ingredients}
                      onChange={(e) => setIngredients(e.target.value)}
                      placeholder="eggs, spinach, cheese, leftover rice..."
                      rows={3}
                      className="w-full px-4 py-4 bg-secondary/50 border border-transparent rounded-xl text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:bg-background focus:border-primary/20 focus:ring-4 focus:ring-primary/5 transition-all duration-200 resize-none"
                      data-testid="input-ingredients"
                    />
                  </div>

                  <Button
                    onClick={handleFridgeSubmit}
                    disabled={isPending || !ingredients.trim()}
                    className="w-full py-6"
                    data-testid="button-recipe-it"
                  >
                    {isGeneratingFridge ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Utensils className="w-4 h-4" />
                    )}
                    <span>Recipe It</span>
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {viewState === "fridge-processing" && (
          <motion.div
            key="fridge-processing"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.4 }}
            className="w-full max-w-md mt-8 flex flex-col items-center justify-center min-h-[60vh]"
          >
            <div className="text-center space-y-6">
              <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-serif font-medium text-foreground" data-testid="text-processing-title">
                  Prepping your cleanout...
                </h2>
                <p className="text-muted-foreground">
                  Getting your ingredients ready
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {viewState === "fridge-prefs" && cleanoutSession && (
          <motion.div
            key="fridge-prefs"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
            className="w-full max-w-md mt-8"
          >
            <div className="bg-card border border-border shadow-lg rounded-2xl overflow-hidden">
              <div className="p-8 space-y-8">
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setViewState("search");
                      setCleanoutSession(null);
                    }}
                    data-testid="button-prefs-back"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </Button>
                  <h2 className="text-2xl font-serif font-medium text-foreground" data-testid="text-prefs-title">
                    Preferences
                  </h2>
                </div>

                <div className="space-y-6">
                  <div className="space-y-3">
                    <p className="text-sm font-medium text-foreground">Servings</p>
                    <div className="flex items-center gap-4">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => {
                          setCleanoutSession(prev => prev && prev.prefs.servings > 1 ? {
                            ...prev,
                            prefs: { ...prev.prefs, servings: prev.prefs.servings - 1 }
                          } : prev);
                        }}
                        disabled={cleanoutSession.prefs.servings <= 1}
                        data-testid="button-servings-minus"
                      >
                        <Minus className="w-4 h-4" />
                      </Button>
                      <span className="text-2xl font-medium min-w-[3ch] text-center" data-testid="text-prefs-servings">
                        {cleanoutSession.prefs.servings}
                      </span>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => {
                          setCleanoutSession(prev => prev && prev.prefs.servings < 12 ? {
                            ...prev,
                            prefs: { ...prev.prefs, servings: prev.prefs.servings + 1 }
                          } : prev);
                        }}
                        disabled={cleanoutSession.prefs.servings >= 12}
                        data-testid="button-servings-plus"
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <p className="text-sm font-medium text-foreground">Time</p>
                    <div className="flex flex-wrap gap-2">
                      {(["best", "15", "30", "60"] as const).map((time) => (
                        <Button
                          key={time}
                          variant={cleanoutSession.prefs.time === time ? "default" : "outline"}
                          size="sm"
                          onClick={() => {
                            setCleanoutSession(prev => prev ? {
                              ...prev,
                              prefs: { ...prev.prefs, time }
                            } : prev);
                          }}
                          data-testid={`button-time-${time}`}
                        >
                          {time === "best" ? "Best" : `${time} min`}
                        </Button>
                      ))}
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <p className="text-sm font-medium text-foreground">Cuisine</p>
                    <div className="flex flex-wrap gap-2">
                      {["any", "American", "Italian", "Asian", "Mexican"].map((cuisine) => (
                        <Button
                          key={cuisine}
                          variant={cleanoutSession.prefs.cuisine === cuisine ? "default" : "outline"}
                          size="sm"
                          onClick={() => {
                            setCleanoutSession(prev => prev ? {
                              ...prev,
                              prefs: { ...prev.prefs, cuisine }
                            } : prev);
                          }}
                          data-testid={`button-cuisine-${cuisine.toLowerCase()}`}
                        >
                          {cuisine === "any" ? "Any" : cuisine}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-border">
                  <p className="text-sm text-muted-foreground mb-4">
                    Ingredients ({cleanoutSession.normalized_ingredients.length}):
                  </p>
                  <div className="flex flex-wrap gap-2" data-testid="container-prefs-ingredients">
                    {cleanoutSession.normalized_ingredients.map((ing, i) => (
                      <Badge key={i} variant="secondary" data-testid={`badge-ingredient-${i}`}>{ing}</Badge>
                    ))}
                  </div>
                </div>

                <Button
                  className="w-full py-6"
                  data-testid="button-prefs-continue"
                  onClick={() => {
                    const singleScreenEnabled = import.meta.env.VITE_FRIDGE_SINGLE_RECIPE_SCREEN_V1 === "on";
                    console.log(`fridge_flow_v1 session_id=${cleanoutSession.session_id} status=prefs prefs.servings=${cleanoutSession.prefs.servings} prefs.time=${cleanoutSession.prefs.time} prefs.cuisine=${cleanoutSession.prefs.cuisine}`);
                    if (singleScreenEnabled) {
                      console.log("single_screen_v1 confirm_bypassed");
                      setCleanoutSession(prev => prev ? { ...prev, status: "confirm" } : null);
                      setViewState("fridge-single");
                    } else {
                      setCleanoutSession(prev => prev ? { ...prev, status: "confirm" } : null);
                      console.log(`fridge_flow_v1 session_id=${cleanoutSession.session_id} status=confirm`);
                      setViewState("fridge-confirm");
                    }
                  }}
                >
                  Continue
                </Button>
              </div>
            </div>
          </motion.div>
        )}

        {/* LEGACY: Confirm Ingredients screen - only used when VITE_FRIDGE_SINGLE_RECIPE_SCREEN_V1 is OFF */}
        {viewState === "fridge-confirm" && cleanoutSession && (
          <motion.div
            key="fridge-confirm"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
            className="w-full max-w-md mt-8"
          >
            <div className="bg-card border border-border shadow-lg rounded-2xl overflow-hidden">
              <div className="p-8 space-y-6">
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setCleanoutSession(prev => prev ? { ...prev, status: "prefs" } : null);
                      setViewState("fridge-prefs");
                    }}
                    data-testid="button-confirm-back"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </Button>
                  <h2 className="text-2xl font-serif font-medium text-foreground" data-testid="text-confirm-title">
                    Confirm Ingredients
                  </h2>
                </div>

                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-foreground mb-3">
                      Your Ingredients ({cleanoutSession.normalized_ingredients.length}):
                    </p>
                    <div className="flex flex-wrap gap-2 min-h-[2.5rem]" data-testid="container-confirm-ingredients">
                      {cleanoutSession.normalized_ingredients.map((ing, i) => (
                        <Badge 
                          key={i} 
                          variant="secondary" 
                          className="flex items-center gap-1 pr-1"
                          data-testid={`badge-confirm-ingredient-${i}`}
                        >
                          {ing}
                          <button
                            onClick={() => {
                              setCleanoutSession(prev => {
                                if (!prev) return null;
                                const updated = prev.normalized_ingredients.filter((_, idx) => idx !== i);
                                console.log(`fridge_flow_v1 session_id=${prev.session_id} ingredient_deleted ingredients_count=${updated.length}`);
                                return { ...prev, normalized_ingredients: updated };
                              });
                              setConfirmValidationError(null);
                            }}
                            className="ml-1 rounded-full p-0.5 hover-elevate"
                            data-testid={`button-delete-ingredient-${i}`}
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                    {confirmValidationError && (
                      <p className="text-sm text-destructive mt-2" data-testid="text-validation-error">{confirmValidationError}</p>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newIngredient}
                      onChange={(e) => setNewIngredient(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          const trimmed = newIngredient.trim().toLowerCase();
                          if (!trimmed) return;
                          setCleanoutSession(prev => {
                            if (!prev) return null;
                            if (prev.normalized_ingredients.includes(trimmed)) return prev;
                            const updated = [...prev.normalized_ingredients, trimmed];
                            console.log(`fridge_flow_v1 session_id=${prev.session_id} ingredient_added ingredients_count=${updated.length}`);
                            return { ...prev, normalized_ingredients: updated };
                          });
                          setNewIngredient("");
                          setConfirmValidationError(null);
                        }
                      }}
                      placeholder="Add ingredient (e.g. 1 tbsp soy sauce)"
                      className="flex-1 px-3 py-2 rounded-md border border-input bg-background text-sm"
                      data-testid="input-add-ingredient"
                    />
                    <Button
                      variant="outline"
                      onClick={() => {
                        const trimmed = newIngredient.trim().toLowerCase();
                        if (!trimmed) return;
                        setCleanoutSession(prev => {
                          if (!prev) return null;
                          if (prev.normalized_ingredients.includes(trimmed)) return prev;
                          const updated = [...prev.normalized_ingredients, trimmed];
                          console.log(`fridge_flow_v1 session_id=${prev.session_id} ingredient_added ingredients_count=${updated.length}`);
                          return { ...prev, normalized_ingredients: updated };
                        });
                        setNewIngredient("");
                        setConfirmValidationError(null);
                      }}
                      disabled={!newIngredient.trim()}
                      data-testid="button-add-ingredient"
                    >
                      Add
                    </Button>
                  </div>

                  <div className="flex items-center justify-between py-3 border-t border-border">
                    <div>
                      <p className="text-sm font-medium text-foreground">Allow extra ingredients</p>
                      <p className="text-xs text-muted-foreground">Recipe may include common pantry items</p>
                    </div>
                    <button
                      onClick={() => {
                        setCleanoutSession(prev => prev ? { ...prev, allow_extras: !prev.allow_extras } : null);
                      }}
                      className={`relative w-11 h-6 rounded-full transition-colors ${cleanoutSession.allow_extras ? 'bg-primary' : 'bg-muted'}`}
                      data-testid="toggle-allow-extras"
                    >
                      <span 
                        className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${cleanoutSession.allow_extras ? 'translate-x-5' : ''}`}
                      />
                    </button>
                  </div>

                  <div className="text-xs text-muted-foreground pt-2 border-t border-border">
                    <p>Servings: {cleanoutSession.prefs.servings} | Time: {cleanoutSession.prefs.time === "best" ? "Best" : `${cleanoutSession.prefs.time} min`} | Cuisine: {cleanoutSession.prefs.cuisine === "any" ? "Any" : cleanoutSession.prefs.cuisine}</p>
                  </div>
                </div>

                <Button
                  className="w-full py-6"
                  data-testid="button-confirm-generate"
                  onClick={() => {
                    if (cleanoutSession.normalized_ingredients.length === 0) {
                      setConfirmValidationError("Add at least 1 ingredient.");
                      return;
                    }
                    console.log(`fridge_flow_v1 session_id=${cleanoutSession.session_id} status=confirm ingredients_count=${cleanoutSession.normalized_ingredients.length} allow_extras=${cleanoutSession.allow_extras}`);
                    console.log(`fridge_flow_v1 session_id=${cleanoutSession.session_id} status=generating ingredients_count=${cleanoutSession.normalized_ingredients.length} allow_extras=${cleanoutSession.allow_extras}`);
                    setCleanoutSession(prev => prev ? { ...prev, status: "generating" } : null);
                    setViewState("fridge-generating");
                  }}
                >
                  Generate Recipe
                </Button>
              </div>
            </div>
          </motion.div>
        )}

        {viewState === "fridge-generating" && cleanoutSession && (
          import.meta.env.VITE_FRIDGE_SINGLE_RECIPE_SCREEN_V1 === "on" ? (
            <motion.div
              key="fridge-generating-playful"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="w-full max-w-md mt-8"
            >
              <div className="bg-card border border-border shadow-lg rounded-2xl overflow-hidden">
                <div className="p-8 flex flex-col items-center justify-center min-h-[340px] relative">
                  <div className="relative w-40 h-40 flex items-center justify-center">
                    <motion.div
                      animate={{ y: [0, -8, 0] }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                      className="text-6xl"
                    >
                      <svg viewBox="0 0 100 100" className="w-24 h-24">
                        <circle cx="50" cy="60" r="28" fill="hsl(var(--primary))" opacity="0.9" />
                        <circle cx="50" cy="30" r="8" fill="hsl(142 76% 36%)" />
                        <circle cx="38" cy="22" r="6" fill="hsl(142 76% 36%)" />
                        <circle cx="62" cy="22" r="6" fill="hsl(142 76% 36%)" />
                        <circle cx="32" cy="32" r="5" fill="hsl(142 76% 36%)" />
                        <circle cx="68" cy="32" r="5" fill="hsl(142 76% 36%)" />
                        <circle cx="44" cy="16" r="4" fill="hsl(142 76% 36%)" />
                        <circle cx="56" cy="16" r="4" fill="hsl(142 76% 36%)" />
                        <circle cx="42" cy="55" r="3" fill="hsl(var(--background))" />
                        <circle cx="58" cy="55" r="3" fill="hsl(var(--background))" />
                        <path d="M 44 66 Q 50 72 56 66" stroke="hsl(var(--background))" strokeWidth="2" fill="none" strokeLinecap="round" />
                      </svg>
                    </motion.div>
                    
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                      className="absolute inset-0"
                    >
                      <motion.div 
                        className="absolute top-0 left-1/2 -translate-x-1/2 text-2xl"
                        animate={{ scale: [1, 1.1, 1] }}
                        transition={{ duration: 2, repeat: Infinity, delay: 0 }}
                      >
                        <Carrot className="w-6 h-6 text-orange-500" />
                      </motion.div>
                      <motion.div 
                        className="absolute top-1/2 right-0 -translate-y-1/2 text-2xl"
                        animate={{ scale: [1, 1.1, 1] }}
                        transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
                      >
                        <Apple className="w-6 h-6 text-red-500" />
                      </motion.div>
                      <motion.div 
                        className="absolute bottom-0 left-1/2 -translate-x-1/2 text-2xl"
                        animate={{ scale: [1, 1.1, 1] }}
                        transition={{ duration: 2, repeat: Infinity, delay: 1 }}
                      >
                        <Egg className="w-6 h-6 text-amber-100 fill-amber-100" />
                      </motion.div>
                      <motion.div 
                        className="absolute top-1/2 left-0 -translate-y-1/2 text-2xl"
                        animate={{ scale: [1, 1.1, 1] }}
                        transition={{ duration: 2, repeat: Infinity, delay: 1.5 }}
                      >
                        <Salad className="w-6 h-6 text-green-500" />
                      </motion.div>
                    </motion.div>
                  </div>
                  
                  <div className="text-center mt-6">
                    <h2 className="text-2xl font-serif font-medium text-foreground" data-testid="text-generating-title">
                      Crafting your recipe...
                    </h2>
                    <p className="text-muted-foreground mt-2" data-testid="text-generating-subtitle">
                      Creating something delicious with your ingredients
                    </p>
                  </div>
                  
                  <Button
                    variant="ghost"
                    className="mt-6"
                    onClick={() => {
                      console.log("single_screen_v1 generate_cancelled");
                      setCleanoutSession(prev => prev ? { ...prev, status: "confirm" } : null);
                      setViewState("fridge-single");
                    }}
                    data-testid="button-generate-cancel"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="fridge-generating"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
              className="w-full max-w-md mt-8"
            >
              <div className="bg-card border border-border shadow-lg rounded-2xl overflow-hidden">
                <div className="p-8 flex flex-col items-center justify-center space-y-6 min-h-[200px]">
                  <Loader2 className="w-12 h-12 text-primary animate-spin" />
                  <div className="text-center">
                    <h2 className="text-2xl font-serif font-medium text-foreground" data-testid="text-generating-title">
                      Generating Recipe
                    </h2>
                    <p className="text-muted-foreground mt-2" data-testid="text-generating-subtitle">
                      Creating something delicious with your {cleanoutSession.normalized_ingredients.length} ingredients...
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          )
        )}

        {viewState === "fridge-result" && generatedRecipe && (
          <motion.div
            key="fridge-result"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
            className="w-full max-w-lg"
          >
            {/* Back button overlay */}
            <div className="relative">
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-3 left-3 z-10 bg-background/80 backdrop-blur-sm"
                onClick={() => {
                  console.log("recipe_v2 nav_back_to_new_recipe");
                  console.log("recipe_v2 substitutions_cleared");
                  setWorkingIngredients([]);
                  setRemixedRecipe(null);
                  setActiveRemixId(null);
                  setViewState("fridge-single");
                  setCleanoutSession(prev => prev ? { ...prev, status: "confirm" } : null);
                }}
                data-testid="button-result-back"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              
              {/* Hero Image - always use base recipe for caching */}
              <RecipeHeroImage recipe={generatedRecipe} />
            </div>

            <div className="px-4 py-6 space-y-6">
              {/* Metadata badges - use displayRecipe for remixed values */}
              <div className="flex flex-wrap gap-3 text-sm">
                <Badge variant="secondary" data-testid="badge-servings">
                  {(displayRecipe?.servings ?? generatedRecipe.servings)} servings
                </Badge>
                {(displayRecipe?.time_minutes ?? generatedRecipe.time_minutes) && (
                  <Badge variant="secondary" data-testid="badge-time">
                    <Clock className="w-3 h-3 mr-1" />
                    {displayRecipe?.time_minutes ?? generatedRecipe.time_minutes} min
                  </Badge>
                )}
                {(displayRecipe?.calories_per_serving ?? generatedRecipe.calories_per_serving) && (
                  <Badge variant="secondary" data-testid="badge-calories">
                    {displayRecipe?.calories_per_serving ?? generatedRecipe.calories_per_serving} cal/serving
                  </Badge>
                )}
                {activeRemixId && (
                  <Badge variant="outline" data-testid="badge-remix-active">
                    <Check className="w-3 h-3 mr-1" />
                    Remixed
                  </Badge>
                )}
              </div>

              {/* Title and Description */}
              <div>
                <h2 className="text-2xl font-serif font-medium text-foreground" data-testid="text-recipe-name">
                  {generatedRecipe.name}
                </h2>
                <p className="text-muted-foreground mt-2" data-testid="text-recipe-summary">
                  {generatedRecipe.description}
                </p>
              </div>

              {/* Ingredients section - unchanged behavior */}
              <div className="space-y-3">
                <h3 className="text-lg font-medium text-foreground">Ingredients</h3>
                <div className="space-y-0" data-testid="list-ingredients">
                  {workingIngredients.map((ing, i) => {
                    const original = getOriginalIngredient(ing.id);
                    const hasSubstitutes = original && original.substitutes.length > 0;
                    const isTappable = hasSubstitutes;
                    
                    return (
                      <div 
                        key={ing.id} 
                        className={`flex items-center justify-between py-3 border-b border-border last:border-b-0 ${isTappable ? 'cursor-pointer hover-elevate active-elevate-2' : ''}`}
                        onClick={isTappable ? () => handleIngredientTap(ing) : undefined}
                        data-testid={`ingredient-row-${i}`}
                      >
                        <span className="text-sm text-foreground flex-1" data-testid={`text-ingredient-name-${i}`}>
                          {ing.name}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground text-right" data-testid={`text-ingredient-amount-${i}`}>
                            {ing.amount || ""}
                          </span>
                          {isTappable && (
                            <ChevronRight className="w-4 h-4 text-muted-foreground" data-testid={`chevron-ingredient-${i}`} />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Remix this recipe section */}
              {generatedRecipe.remixes && generatedRecipe.remixes.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-lg font-medium text-foreground">Remix this recipe</h3>
                    {activeRemixId && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleUndoRemix}
                        data-testid="button-undo-remix"
                      >
                        <Undo2 className="w-4 h-4 mr-1" />
                        Undo
                      </Button>
                    )}
                  </div>
                  <div className="space-y-2" data-testid="list-remixes">
                    {generatedRecipe.remixes.map((remix, i) => {
                      const isActive = activeRemixId === remix.id;
                      return (
                        <div
                          key={remix.id}
                          className={`p-3 rounded-md border cursor-pointer hover-elevate active-elevate-2 ${
                            isActive 
                              ? 'border-primary bg-primary/5' 
                              : 'border-border'
                          }`}
                          onClick={() => {
                            if (isActive) {
                              handleUndoRemix();
                            } else {
                              handleApplyRemix(remix.id);
                            }
                          }}
                          data-testid={`remix-card-${i}`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground" data-testid={`text-remix-title-${i}`}>
                                {remix.title}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-2" data-testid={`text-remix-description-${i}`}>
                                {remix.description}
                              </p>
                            </div>
                            {isActive && (
                              <Badge variant="secondary" className="flex-shrink-0" data-testid={`badge-remix-applied-${i}`}>
                                <Check className="w-3 h-3 mr-1" />
                                Applied
                              </Badge>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* CTAs: Let's Cook! (primary) + Generate Again (secondary) */}
              <div className="flex flex-col gap-3 pt-4">
                <Button
                  className="w-full"
                  onClick={() => {
                    console.log("recipe_v2 nav_to_cook_mode");
                    setViewState("cook-mode");
                  }}
                  data-testid="button-lets-cook"
                >
                  <ChefHat className="w-4 h-4 mr-2" />
                  Let's Cook!
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    console.log("recipe_v2 remix_recipe_click");
                    // Regenerate using original ingredients/prefs (ignores substitutions and remixes)
                    setWorkingIngredients([]);
                    setRemixedRecipe(null);
                    setActiveRemixId(null);
                    setViewState("fridge-generating");
                    setCleanoutSession(prev => prev ? { ...prev, status: "generating" } : null);
                  }}
                  data-testid="button-remix-recipe"
                >
                  <Repeat className="w-4 h-4 mr-2" />
                  Generate Again
                </Button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Cook Mode - step-by-step instructions */}
        {viewState === "cook-mode" && generatedRecipe && (() => {
          // Phase 5: Determine step source based on active remix
          let cookModeSteps = generatedRecipe.steps;
          if (activeRemixId !== null) {
            if (remixedRecipe) {
              cookModeSteps = remixedRecipe.steps;
              console.log(`recipe_remixes_phase5_steps_source=remix remixId=${activeRemixId}`);
            } else {
              console.warn("recipe_remixes_phase5_steps_source=fallback_missing_remixedRecipe");
              // Defensive fallback: use base recipe steps
            }
          } else {
            console.log("recipe_remixes_phase5_steps_source=base");
          }
          
          return (
          <motion.div
            key="cook-mode"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
            className="w-full max-w-lg mt-8"
          >
            <div className="bg-card border border-border shadow-lg rounded-2xl overflow-hidden">
              <div className="p-8 space-y-6">
                {/* Header with back button */}
                <div className="flex items-start gap-3">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      console.log("recipe_v2 nav_back_to_summary");
                      setViewState("fridge-result");
                    }}
                    data-testid="button-cook-mode-back"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </Button>
                  <div className="flex-1">
                    <h2 className="text-2xl font-serif font-medium text-foreground" data-testid="text-cook-mode-title">
                      {generatedRecipe.name}
                    </h2>
                    <p className="text-muted-foreground mt-1 text-sm">
                      Step-by-step cooking instructions
                    </p>
                  </div>
                </div>

                {/* Steps list */}
                {cookModeSteps.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground" data-testid="text-no-steps">
                      Unable to load steps
                    </p>
                    <Button
                      variant="outline"
                      className="mt-4"
                      onClick={() => setViewState("fridge-result")}
                      data-testid="button-no-steps-back"
                    >
                      Back to Recipe
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-6" data-testid="list-cook-steps">
                    {cookModeSteps.map((step, i) => {
                      // Map ingredient_ids to working copy names for display context
                      const referencedIngredients = step.ingredient_ids
                        .map(id => workingIngredients.find(ing => ing.id === id))
                        .filter((ing): ing is IngredientItemV2 => ing !== undefined);
                      
                      return (
                        <div 
                          key={i} 
                          className="flex gap-4"
                          data-testid={`cook-step-${i}`}
                        >
                          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
                            {i + 1}
                          </div>
                          <div className="flex-1 space-y-2">
                            <p className="text-sm text-foreground leading-relaxed" data-testid={`text-cook-step-${i}`}>
                              {step.text}
                            </p>
                            {step.time_minutes && (
                              <p className="text-xs text-muted-foreground" data-testid={`text-cook-step-time-${i}`}>
                                ~{step.time_minutes} minutes
                              </p>
                            )}
                            {referencedIngredients.length > 0 && (
                              <div className="flex flex-wrap gap-1 pt-1">
                                {referencedIngredients.map((ing, j) => (
                                  <Badge 
                                    key={ing.id} 
                                    variant="secondary" 
                                    className="text-xs"
                                    data-testid={`badge-step-ingredient-${i}-${j}`}
                                  >
                                    {ing.name}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Bottom CTAs: Favorite and Done */}
                {cookModeSteps.length > 0 && (
                  <div className="flex gap-3 pt-4 border-t border-border">
                    <Button
                      variant="outline"
                      className="flex-1"
                      disabled
                      data-testid="button-favorite"
                    >
                      <Heart className="w-4 h-4 mr-2" />
                      Favorite
                    </Button>
                    <Button
                      className="flex-1"
                      disabled
                      data-testid="button-done"
                    >
                      Done
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        );
        })()}

        {viewState === "fridge-error" && (
          <motion.div
            key="fridge-error"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
            className="w-full max-w-md mt-8"
          >
            <div className="bg-card border border-border shadow-lg rounded-2xl overflow-hidden">
              <div className="p-8 flex flex-col items-center justify-center space-y-6">
                <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
                  <X className="w-8 h-8 text-destructive" />
                </div>
                <div className="text-center">
                  <h2 className="text-2xl font-serif font-medium text-foreground" data-testid="text-error-title">
                    Generation Failed
                  </h2>
                  <p className="text-muted-foreground mt-2" data-testid="text-error-message">
                    {generationError || "We couldn't generate a recipe. Please try again."}
                  </p>
                </div>

                <div className="flex gap-3 w-full">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      const singleScreenEnabled = import.meta.env.VITE_FRIDGE_SINGLE_RECIPE_SCREEN_V1 === "on";
                      if (singleScreenEnabled) {
                        console.log("single_screen_v1 error_back_to_new_recipe");
                        setViewState("fridge-single");
                        setCleanoutSession(prev => prev ? { ...prev, status: "confirm" } : null);
                      } else {
                        setViewState("fridge-confirm");
                        setCleanoutSession(prev => prev ? { ...prev, status: "confirm" } : null);
                      }
                    }}
                    data-testid="button-error-back"
                  >
                    Back
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={() => {
                      setGenerationError(null);
                      setViewState("fridge-generating");
                      setCleanoutSession(prev => prev ? { ...prev, status: "generating" } : null);
                    }}
                    data-testid="button-error-retry"
                  >
                    Try Again
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {viewState === "fridge-single" && cleanoutSession && (
          <motion.div
            key="fridge-single"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
            className="w-full max-w-md mt-8"
          >
            <div className="bg-card border border-border shadow-lg rounded-2xl overflow-hidden">
              <div className="p-6 space-y-6">
                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setViewState("search");
                      setCleanoutSession(null);
                    }}
                    data-testid="button-single-back"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </Button>
                  <h2 className="text-xl font-serif font-medium text-foreground" data-testid="text-single-title">
                    New Recipe
                  </h2>
                </div>

                <div className="flex flex-wrap gap-3">
                  <div className="flex-1 min-w-[100px] bg-muted/50 rounded-xl p-3 flex flex-col items-center gap-1" data-testid="tile-guests">
                    <User className="w-5 h-5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Guests</span>
                    <Select
                      value={String(cleanoutSession.prefs.servings)}
                      onValueChange={(value) => {
                        const servings = parseInt(value, 10);
                        console.log(`single_screen_v1 prefs_change servings=${servings} time=${cleanoutSession.prefs.time} cuisine=${cleanoutSession.prefs.cuisine}`);
                        setCleanoutSession(prev => prev ? {
                          ...prev,
                          prefs: { ...prev.prefs, servings }
                        } : prev);
                      }}
                    >
                      <SelectTrigger className="h-7 w-16 border-0 bg-transparent text-sm font-medium justify-center gap-1 px-2" data-testid="select-guests">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((n) => (
                          <SelectItem key={n} value={String(n)} data-testid={`option-guests-${n}`}>{n}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex-1 min-w-[100px] bg-muted/50 rounded-xl p-3 flex flex-col items-center gap-1" data-testid="tile-time">
                    <Clock className="w-5 h-5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Time</span>
                    <Select
                      value={cleanoutSession.prefs.time}
                      onValueChange={(value: "best" | "15" | "30" | "60") => {
                        console.log(`single_screen_v1 prefs_change servings=${cleanoutSession.prefs.servings} time=${value} cuisine=${cleanoutSession.prefs.cuisine}`);
                        setCleanoutSession(prev => prev ? {
                          ...prev,
                          prefs: { ...prev.prefs, time: value }
                        } : prev);
                      }}
                    >
                      <SelectTrigger className="h-7 w-20 border-0 bg-transparent text-sm font-medium justify-center gap-1 px-2" data-testid="select-time">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="best" data-testid="option-time-best">Best</SelectItem>
                        <SelectItem value="15" data-testid="option-time-15">15 min</SelectItem>
                        <SelectItem value="30" data-testid="option-time-30">30 min</SelectItem>
                        <SelectItem value="60" data-testid="option-time-60">60 min</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex-1 min-w-[100px] bg-muted/50 rounded-xl p-3 flex flex-col items-center gap-1" data-testid="tile-cuisine">
                    <Globe className="w-5 h-5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Cuisine</span>
                    <Select
                      value={cleanoutSession.prefs.cuisine}
                      onValueChange={(value) => {
                        console.log(`single_screen_v1 prefs_change servings=${cleanoutSession.prefs.servings} time=${cleanoutSession.prefs.time} cuisine=${value}`);
                        setCleanoutSession(prev => prev ? {
                          ...prev,
                          prefs: { ...prev.prefs, cuisine: value }
                        } : prev);
                      }}
                    >
                      <SelectTrigger className="h-7 w-24 border-0 bg-transparent text-sm font-medium justify-center gap-1 px-2" data-testid="select-cuisine">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="any" data-testid="option-cuisine-any">Any</SelectItem>
                        <SelectItem value="American" data-testid="option-cuisine-american">American</SelectItem>
                        <SelectItem value="Italian" data-testid="option-cuisine-italian">Italian</SelectItem>
                        <SelectItem value="Asian" data-testid="option-cuisine-asian">Asian</SelectItem>
                        <SelectItem value="Mexican" data-testid="option-cuisine-mexican">Mexican</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-lg font-serif font-medium text-foreground">Ingredients</h3>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => {
                        setShowAddIngredientInput(true);
                        setNewIngredient("");
                      }}
                      data-testid="button-add-more"
                    >
                      + Add more
                    </Button>
                  </div>
                  
                  {showAddIngredientInput && (
                    <div className="flex gap-2 items-center bg-muted/30 rounded-xl px-3 py-2" data-testid="row-add-ingredient">
                      <input
                        type="text"
                        value={newIngredient}
                        onChange={(e) => setNewIngredient(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            const trimmed = newIngredient.trim().toLowerCase();
                            if (!trimmed) return;
                            setCleanoutSession(prev => {
                              if (!prev) return null;
                              if (prev.normalized_ingredients.includes(trimmed)) return prev;
                              console.log("single_screen_v1 ingredient_add");
                              return { ...prev, normalized_ingredients: [...prev.normalized_ingredients, trimmed] };
                            });
                            setNewIngredient("");
                            setShowAddIngredientInput(false);
                          } else if (e.key === "Escape") {
                            setShowAddIngredientInput(false);
                            setNewIngredient("");
                          }
                        }}
                        placeholder="Add ingredient (e.g. 1 tbsp soy sauce)"
                        className="flex-1 px-2 py-1.5 rounded-md border border-input bg-background text-sm"
                        autoFocus
                        data-testid="input-single-add-ingredient"
                      />
                      <Button
                        size="sm"
                        onClick={() => {
                          const trimmed = newIngredient.trim().toLowerCase();
                          if (!trimmed) return;
                          setCleanoutSession(prev => {
                            if (!prev) return null;
                            if (prev.normalized_ingredients.includes(trimmed)) return prev;
                            console.log("single_screen_v1 ingredient_add");
                            return { ...prev, normalized_ingredients: [...prev.normalized_ingredients, trimmed] };
                          });
                          setNewIngredient("");
                          setShowAddIngredientInput(false);
                        }}
                        disabled={!newIngredient.trim()}
                        data-testid="button-single-add-ingredient"
                      >
                        Add
                      </Button>
                    </div>
                  )}
                  
                  <div className="space-y-2">
                    {cleanoutSession.normalized_ingredients.length > 0 ? (
                      cleanoutSession.normalized_ingredients.map((ingredient, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between bg-muted/30 rounded-xl px-4 py-3"
                          data-testid={`row-ingredient-${index}`}
                        >
                          <span className="text-foreground">{ingredient}</span>
                          <button
                            type="button"
                            onClick={() => {
                              console.log("single_screen_v1 ingredient_remove");
                              setCleanoutSession(prev => {
                                if (!prev) return null;
                                const updated = prev.normalized_ingredients.filter((_, i) => i !== index);
                                return { ...prev, normalized_ingredients: updated };
                              });
                            }}
                            className="text-muted-foreground hover:text-destructive transition-colors p-1"
                            data-testid={`button-trash-${index}`}
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      ))
                    ) : (
                      <div className="text-sm text-muted-foreground py-4 text-center" data-testid="text-empty-ingredients">
                        Add at least one ingredient to continue.
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between bg-muted/30 rounded-xl px-4 py-3">
                  <div className="space-y-0.5">
                    <span className="text-foreground text-sm">Allow other ingredients?</span>
                    <p className="text-xs text-muted-foreground">Recipe may include common pantry items</p>
                  </div>
                  <Switch
                    checked={cleanoutSession.allow_extras}
                    onCheckedChange={(checked) => {
                      console.log(`single_screen_v1 allow_other_ingredients=${checked}`);
                      setCleanoutSession(prev => prev ? { ...prev, allow_extras: checked } : null);
                    }}
                    data-testid="toggle-allow-extras"
                  />
                </div>

                <Button
                  className="w-full py-6"
                  disabled={cleanoutSession.normalized_ingredients.length === 0 || cleanoutSession.status === "generating"}
                  onClick={() => {
                    console.log("single_screen_v1 generate_click");
                    console.log(`fridge_flow_v1 session_id=${cleanoutSession.session_id} status=generating ingredients_count=${cleanoutSession.normalized_ingredients.length} allow_extras=${cleanoutSession.allow_extras}`);
                    setCleanoutSession(prev => prev ? { ...prev, status: "generating" } : null);
                    setViewState("fridge-generating");
                  }}
                  data-testid="button-create-recipe"
                >
                  {cleanoutSession.status === "generating" ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create my recipe"
                  )}
                </Button>
              </div>
            </div>
          </motion.div>
        )}

        {viewState === "swiping" && (
          <motion.div
            key="swiping"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.4 }}
            className="w-full max-w-md mt-8 flex flex-col items-center"
          >
            <div className="w-full flex justify-between items-center mb-6">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleBackToSearch}
                data-testid="button-back"
              >
                <RotateCcw className="w-5 h-5" />
              </Button>
              <p className="text-sm text-muted-foreground">
                {currentIndex + 1} of {totalRecipes}
              </p>
              <div className="w-9" />
            </div>

            <div className="relative w-full">
              <AnimatePresence mode="wait">
                {recipeMode === "remix" && currentRemix && (
                  <motion.div
                    key={`remix-${currentIndex}`}
                    initial={{ opacity: 0, x: 50 }}
                    animate={{ 
                      opacity: 1, 
                      x: swipeDirection === "left" ? -300 : swipeDirection === "right" ? 300 : 0,
                      rotate: swipeDirection === "left" ? -10 : swipeDirection === "right" ? 10 : 0,
                    }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Card className="w-full" data-testid={`card-swipe-${currentIndex}`}>
                      <CardHeader className="pb-3">
                        <div className="flex items-center gap-2">
                          <Utensils className="w-5 h-5 text-primary shrink-0" />
                          <CardTitle className="text-xl font-medium leading-tight" data-testid="text-swipe-title">
                            {currentRemix.title}
                          </CardTitle>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {currentRemix.changes && currentRemix.changes.length > 0 ? (
                          currentRemix.changes.map((change, changeIndex) => (
                            <div key={changeIndex} className="space-y-1">
                              <p className="text-sm font-medium text-foreground" data-testid={`text-swipe-action-${changeIndex}`}>
                                {change.action}
                              </p>
                              <p className="text-sm text-muted-foreground pl-3 border-l-2 border-border" data-testid={`text-swipe-details-${changeIndex}`}>
                                {change.details}
                              </p>
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-muted-foreground italic">No specific changes available</p>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                )}

                {recipeMode === "fridge" && currentFridgeRecipe && (
                  <motion.div
                    key={`fridge-${currentIndex}`}
                    initial={{ opacity: 0, x: 50 }}
                    animate={{ 
                      opacity: 1, 
                      x: swipeDirection === "left" ? -300 : swipeDirection === "right" ? 300 : 0,
                      rotate: swipeDirection === "left" ? -10 : swipeDirection === "right" ? 10 : 0,
                    }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Card className="w-full" data-testid={`card-swipe-fridge-${currentIndex}`}>
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Utensils className="w-5 h-5 text-primary shrink-0" />
                            <CardTitle className="text-xl font-medium leading-tight" data-testid="text-fridge-title">
                              {currentFridgeRecipe.title}
                            </CardTitle>
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="secondary" className="capitalize text-xs">
                              {currentFridgeRecipe.category}
                            </Badge>
                            <Badge variant="outline" className="capitalize text-xs">
                              {currentFridgeRecipe.difficulty}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            <span>{currentFridgeRecipe.estimated_time_minutes} min</span>
                          </div>
                        </div>
                        {currentFridgeRecipe.summary && (
                          <p className="text-sm text-muted-foreground mt-2">{currentFridgeRecipe.summary}</p>
                        )}
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {currentFridgeRecipe.used_ingredients && currentFridgeRecipe.used_ingredients.length > 0 && (
                          <div>
                            <p className="text-sm font-medium text-foreground mb-2">Using your ingredients</p>
                            <div className="flex flex-wrap gap-1">
                              {currentFridgeRecipe.used_ingredients.map((ing, i) => (
                                <Badge key={i} variant="secondary" className="text-xs">{ing}</Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        {currentFridgeRecipe.skipped_ingredients && currentFridgeRecipe.skipped_ingredients.length > 0 && (
                          <div>
                            <p className="text-sm font-medium text-muted-foreground mb-1">Skipped</p>
                            <ul className="text-xs text-muted-foreground space-y-0.5">
                              {currentFridgeRecipe.skipped_ingredients.map((skip, i) => (
                                <li key={i}>{skip.ingredient}: {skip.reason}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        <div>
                          <p className="text-sm font-medium text-foreground mb-2">Ingredients</p>
                          <ul className="text-sm text-muted-foreground space-y-1">
                            {currentFridgeRecipe.ingredients.map((ingredient, i) => (
                              <li key={i} className="pl-3 border-l-2 border-border">{ingredient}</li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground mb-2">Steps</p>
                          <ol className="text-sm text-muted-foreground space-y-2">
                            {currentFridgeRecipe.steps.map((step, i) => (
                              <li key={i} className="pl-3 border-l-2 border-primary/30">
                                <span className="font-medium text-foreground">{i + 1}.</span> {step}
                              </li>
                            ))}
                          </ol>
                        </div>
                        {currentFridgeRecipe.adjustment_tags && currentFridgeRecipe.adjustment_tags.length > 0 && (
                          <div className="pt-2 border-t border-border">
                            <div className="flex flex-wrap gap-1">
                              {currentFridgeRecipe.adjustment_tags.map((tag, i) => (
                                <Badge key={i} variant="outline" className="text-xs">{tag}</Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="flex items-center justify-center gap-8 mt-8">
              <Button
                size="lg"
                variant="outline"
                className="w-16 h-16 rounded-full text-2xl"
                onClick={() => handleSwipe("left")}
                data-testid="button-swipe-left"
              >
                <span role="img" aria-label="Skip">🤮</span>
              </Button>
              <Button
                size="lg"
                className="w-16 h-16 rounded-full bg-primary text-2xl"
                onClick={() => handleSwipe("right")}
                data-testid="button-swipe-right"
              >
                <span role="img" aria-label="Save">😋</span>
              </Button>
            </div>

            <p className="text-xs text-muted-foreground mt-4">
              Skip or save this recipe
            </p>
          </motion.div>
        )}

        {viewState === "saved" && (
          <motion.div
            key="saved"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
            className="w-full max-w-4xl mt-8"
          >
            <div className="flex items-center justify-between mb-8">
              <Button
                variant="ghost"
                onClick={handleBackToSearch}
                data-testid="button-back-saved"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                New Recipe
              </Button>
              <h2 className="text-2xl font-serif font-medium" data-testid="text-saved-title">
                {recipeMode === "remix" ? "Your Saved Remixes" : "Your Saved Recipes"}
              </h2>
              <div className="w-24" />
            </div>

            {recipeMode === "remix" ? (
              savedRemixes.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {savedRemixes.map((recipe, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: index * 0.1 }}
                    >
                      <Card className="h-full" data-testid={`card-saved-${index}`}>
                        <CardHeader className="pb-3">
                          <div className="flex items-center gap-2">
                            <Heart className="w-4 h-4 text-primary shrink-0 fill-primary" />
                            <CardTitle className="text-base font-medium leading-tight" data-testid={`text-saved-title-${index}`}>
                              {recipe.title}
                            </CardTitle>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {recipe.changes && recipe.changes.length > 0 ? (
                            recipe.changes.map((change, changeIndex) => (
                              <div key={changeIndex} className="space-y-1">
                                <p className="text-sm font-medium text-foreground">
                                  {change.action}
                                </p>
                                <p className="text-sm text-muted-foreground pl-3 border-l-2 border-border">
                                  {change.details}
                                </p>
                              </div>
                            ))
                          ) : (
                            <p className="text-sm text-muted-foreground italic">No specific changes available</p>
                          )}
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-16">
                  <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                    <Heart className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-medium mb-2">No recipes saved</h3>
                  <p className="text-muted-foreground mb-6">
                    You didn't save any remixes this time. Try again with a new recipe!
                  </p>
                  <Button onClick={handleBackToSearch} data-testid="button-try-again">
                    Try Another Recipe
                  </Button>
                </div>
              )
            ) : (
              savedFridgeRecipes.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {savedFridgeRecipes.map((recipe, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: index * 0.1 }}
                    >
                      <Card className="h-full" data-testid={`card-saved-fridge-${index}`}>
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Heart className="w-4 h-4 text-primary shrink-0 fill-primary" />
                              <CardTitle className="text-base font-medium leading-tight">
                                {recipe.title}
                              </CardTitle>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge variant="secondary" className="capitalize text-xs">
                                {recipe.category}
                              </Badge>
                              <Badge variant="outline" className="capitalize text-xs">
                                {recipe.difficulty}
                              </Badge>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              <span>{recipe.estimated_time_minutes} min</span>
                            </div>
                          </div>
                          {recipe.summary && (
                            <p className="text-sm text-muted-foreground mt-2">{recipe.summary}</p>
                          )}
                        </CardHeader>
                        <CardContent className="space-y-4">
                          {recipe.used_ingredients && recipe.used_ingredients.length > 0 && (
                            <div>
                              <p className="text-sm font-medium text-foreground mb-2">Using your ingredients</p>
                              <div className="flex flex-wrap gap-1">
                                {recipe.used_ingredients.map((ing, i) => (
                                  <Badge key={i} variant="secondary" className="text-xs">{ing}</Badge>
                                ))}
                              </div>
                            </div>
                          )}
                          {recipe.skipped_ingredients && recipe.skipped_ingredients.length > 0 && (
                            <div>
                              <p className="text-sm font-medium text-muted-foreground mb-1">Skipped</p>
                              <ul className="text-xs text-muted-foreground space-y-0.5">
                                {recipe.skipped_ingredients.map((skip, i) => (
                                  <li key={i}>{skip.ingredient}: {skip.reason}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          <div>
                            <p className="text-sm font-medium text-foreground mb-2">Ingredients</p>
                            <ul className="text-sm text-muted-foreground space-y-1">
                              {recipe.ingredients.map((ingredient, i) => (
                                <li key={i} className="pl-3 border-l-2 border-border">{ingredient}</li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground mb-2">Steps</p>
                            <ol className="text-sm text-muted-foreground space-y-2">
                              {recipe.steps.map((step, i) => (
                                <li key={i} className="pl-3 border-l-2 border-primary/30">
                                  <span className="font-medium text-foreground">{i + 1}.</span> {step}
                                </li>
                              ))}
                            </ol>
                          </div>
                          {recipe.adjustment_tags && recipe.adjustment_tags.length > 0 && (
                            <div className="pt-2 border-t border-border">
                              <div className="flex flex-wrap gap-1">
                                {recipe.adjustment_tags.map((tag, i) => (
                                  <Badge key={i} variant="outline" className="text-xs">{tag}</Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-16">
                  <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                    <Heart className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-medium mb-2">No recipes saved</h3>
                  <p className="text-muted-foreground mb-6">
                    You didn't save any recipes this time. Try again with different ingredients!
                  </p>
                  <Button onClick={handleBackToSearch} data-testid="button-try-again">
                    Try Different Ingredients
                  </Button>
                </div>
              )
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Ingredient Substitution Bottom Sheet */}
      {selectedIngredient && (
        <Drawer open={isSubstituteDrawerOpen} onOpenChange={setIsSubstituteDrawerOpen}>
          <DrawerContent data-testid="drawer-substitute">
            <DrawerHeader>
              <DrawerTitle data-testid="drawer-title">{selectedIngredient.name}</DrawerTitle>
              {selectedIngredient.amount && (
                <DrawerDescription data-testid="drawer-amount">{selectedIngredient.amount}</DrawerDescription>
              )}
            </DrawerHeader>
            <div className="px-4 pb-4">
              <RadioGroup 
                value={selectedSubstituteId} 
                onValueChange={setSelectedSubstituteId}
                className="space-y-3"
                data-testid="radio-substitutes"
              >
                {/* Original ingredient option */}
                {(() => {
                  const original = getOriginalIngredient(selectedIngredient.id);
                  if (!original) return null;
                  return (
                    <div className="flex items-center space-x-3 py-2 px-3 rounded-md border border-border">
                      <RadioGroupItem value="original" id="substitute-original" data-testid="radio-original" />
                      <Label htmlFor="substitute-original" className="flex-1 cursor-pointer">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">{original.name}</span>
                          <span className="text-sm text-muted-foreground">{original.amount || ""}</span>
                        </div>
                      </Label>
                    </div>
                  );
                })()}
                
                {/* Substitute options */}
                {(() => {
                  const original = getOriginalIngredient(selectedIngredient.id);
                  if (!original) return null;
                  return original.substitutes.map((sub, i) => (
                    <div key={sub.id} className="flex items-center space-x-3 py-2 px-3 rounded-md border border-border">
                      <RadioGroupItem value={sub.id} id={`substitute-${sub.id}`} data-testid={`radio-substitute-${i}`} />
                      <Label htmlFor={`substitute-${sub.id}`} className="flex-1 cursor-pointer">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">{sub.name}</span>
                          <span className="text-sm text-muted-foreground">{sub.amount || ""}</span>
                        </div>
                      </Label>
                    </div>
                  ));
                })()}
              </RadioGroup>
            </div>
            <DrawerFooter className="flex-row gap-3">
              <DrawerClose asChild>
                <Button variant="outline" className="flex-1" data-testid="button-cancel-swap">
                  Cancel
                </Button>
              </DrawerClose>
              <Button className="flex-1" onClick={handleSwapConfirm} data-testid="button-confirm-swap">
                Swap
              </Button>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      )}
    </div>
  );
}
