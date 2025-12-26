import { useState, useEffect, useCallback } from "react";
import { useProcessRecipe, useFridgeRecipes } from "@/hooks/use-recipes";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { Link2, Loader2, ChefHat, Utensils, Sparkles, ArrowLeft, Heart, RotateCcw, Clock, Refrigerator, TrendingUp, Star, Repeat, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { RecipeAlternative, RecipeStyle, FridgeRecipe } from "@shared/routes";

const FRIDGE_NEW_FLOW_V1 = import.meta.env.VITE_FRIDGE_NEW_FLOW_V1 === "on";

type CleanoutStatus = "processing" | "prefs" | "confirm" | "generating" | "done" | "error";

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

type ViewState = "search" | "swiping" | "saved" | "fridge-processing" | "fridge-prefs";
type RecipeMode = "remix" | "fridge";

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
  
  const { mutate: processRecipe, isPending: isProcessingRecipe } = useProcessRecipe();
  const { mutate: generateFridgeRecipes, isPending: isGeneratingFridge } = useFridgeRecipes();
  const { toast } = useToast();
  
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
        allow_extras: false,
        status: "processing",
        error_message: null,
      };
      
      console.log(`fridge_flow_v1 session_id=${session.session_id} status=processing normalized_count=${normalized.length}`);
      
      setCleanoutSession(session);
      setViewState("fridge-processing");
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
        setCleanoutSession(prev => prev ? { ...prev, status: "prefs" } : null);
        console.log(`fridge_flow_v1 session_id=${cleanoutSession.session_id} status=prefs normalized_count=${cleanoutSession.normalized_ingredients.length}`);
        setViewState("fridge-prefs");
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
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-foreground">Servings</p>
                    <p className="text-lg text-muted-foreground" data-testid="text-prefs-servings">{cleanoutSession.prefs.servings}</p>
                  </div>
                  
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-foreground">Time</p>
                    <p className="text-lg text-muted-foreground" data-testid="text-prefs-time">{cleanoutSession.prefs.time}</p>
                  </div>
                  
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-foreground">Cuisine</p>
                    <p className="text-lg text-muted-foreground" data-testid="text-prefs-cuisine">{cleanoutSession.prefs.cuisine}</p>
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
                    toast({
                      title: "Phase 1 Complete",
                      description: "Preferences screen working! Continue to Phase 2 for ingredient confirmation.",
                    });
                  }}
                >
                  Continue
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
    </div>
  );
}
