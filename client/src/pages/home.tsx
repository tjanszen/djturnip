import { useState, useRef } from "react";
import { useProcessRecipe, useFridgeRecipes } from "@/hooks/use-recipes";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { Link2, Loader2, ChefHat, Utensils, Sparkles, Flame, Dumbbell, Leaf, ArrowLeft, X, Heart, RotateCcw, Clock, Refrigerator, TrendingUp, Star, Repeat, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { RecipeAlternative, RecipeStyle, FridgeRecipe } from "@shared/routes";

import turkishPastaImg from "@assets/turkish_pasta_1766420895437.png";
import gigiHadidPastaImg from "@assets/gigi_hadid_pasta_1766420895438.png";
import marryMeChickenSoupImg from "@assets/merry_me_chicken_soup_1766420895433.png";

const featuredRecipes = [
  {
    id: "turkish-pasta",
    title: "Turkish Pasta",
    url: "https://foolproofliving.com/turkish-pasta/",
    image: turkishPastaImg,
    tag: "Trending",
    tagIcon: TrendingUp,
  },
  {
    id: "gigi-hadid-pasta",
    title: "Gigi Hadid Pasta",
    url: "https://healthyfitnessmeals.com/gigi-hadid-pasta/",
    image: gigiHadidPastaImg,
    tag: "Popular",
    tagIcon: Star,
  },
  {
    id: "marry-me-chicken-soup",
    title: "Marry Me Chicken Soup",
    url: "https://www.allrecipes.com/marry-me-chicken-soup-recipe-8421914",
    image: marryMeChickenSoupImg,
    tag: "Most Remixed",
    tagIcon: Repeat,
  },
];

type ViewState = "search" | "swiping" | "saved";
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
  
  const carouselRef = useRef<HTMLDivElement>(null);
  
  const { mutate: processRecipe, isPending: isProcessingRecipe } = useProcessRecipe();
  const { mutate: generateFridgeRecipes, isPending: isGeneratingFridge } = useFridgeRecipes();
  const { toast } = useToast();
  
  const scrollCarousel = (direction: "left" | "right") => {
    if (carouselRef.current) {
      const firstCard = carouselRef.current.querySelector('[data-testid^="card-featured-"]');
      const scrollAmount = firstCard ? (firstCard as HTMLElement).offsetWidth + 16 : 280;
      carouselRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };
  
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
                    Recipe Remix
                  </h1>
                  <p className="text-muted-foreground text-balance">
                    Remix any recipe for any occasion.
                  </p>
                </div>

                <div className="space-y-4" data-testid="form-recipe">
                  <div className="space-y-2">
                    <label
                      htmlFor="url-input"
                      className="text-xs font-semibold uppercase tracking-wider text-muted-foreground ml-1"
                    >
                      Recipe Link
                    </label>
                    <div className="relative group">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors duration-200">
                        <Link2 className="w-5 h-5" />
                      </div>
                      <input
                        id="url-input"
                        type="url"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        placeholder="https://cooking.nytimes.com/..."
                        className="w-full pl-12 pr-4 py-4 bg-secondary/50 border border-transparent rounded-xl text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:bg-background focus:border-primary/20 focus:ring-4 focus:ring-primary/5 transition-all duration-200"
                        autoComplete="off"
                        data-testid="input-url"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      onClick={() => handleRemixSubmit('creative')}
                      disabled={isPending || !url}
                      className="py-6"
                      data-testid="button-creative"
                    >
                      {isProcessingRecipe && activeStyle === 'creative' ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Sparkles className="w-4 h-4" />
                      )}
                      <span>Creative</span>
                    </Button>
                    <Button
                      onClick={() => handleRemixSubmit('umami')}
                      disabled={isPending || !url}
                      className="py-6"
                      data-testid="button-umami"
                    >
                      {isProcessingRecipe && activeStyle === 'umami' ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Flame className="w-4 h-4" />
                      )}
                      <span>Umami</span>
                    </Button>
                    <Button
                      onClick={() => handleRemixSubmit('protein')}
                      disabled={isPending || !url}
                      className="py-6"
                      data-testid="button-protein"
                    >
                      {isProcessingRecipe && activeStyle === 'protein' ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Dumbbell className="w-4 h-4" />
                      )}
                      <span>More Protein</span>
                    </Button>
                    <Button
                      onClick={() => handleRemixSubmit('seasonal')}
                      disabled={isPending || !url}
                      className="py-6"
                      data-testid="button-seasonal"
                    >
                      {isProcessingRecipe && activeStyle === 'seasonal' ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Leaf className="w-4 h-4" />
                      )}
                      <span>Seasonal</span>
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Featured Recipes Carousel */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-foreground">Try a quick remix</h3>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => scrollCarousel("left")}
                    data-testid="button-carousel-left"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => scrollCarousel("right")}
                    data-testid="button-carousel-right"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </Button>
                </div>
              </div>
              
              <div
                ref={carouselRef}
                className="flex gap-4 overflow-x-auto scrollbar-hide pb-2 -mx-4 px-4 snap-x snap-mandatory"
                style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
              >
                {featuredRecipes.map((recipe) => (
                  <div
                    key={recipe.id}
                    className="flex-shrink-0 w-64 snap-start"
                    data-testid={`card-featured-${recipe.id}`}
                  >
                    <Card className="overflow-hidden h-full">
                      <div className="relative aspect-square">
                        <img
                          src={recipe.image}
                          alt={recipe.title}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute top-3 left-3">
                          <Badge variant="secondary" className="gap-1 bg-background/90 backdrop-blur-sm">
                            <recipe.tagIcon className="w-3 h-3" />
                            {recipe.tag}
                          </Badge>
                        </div>
                      </div>
                      <CardContent className="p-4 space-y-3">
                        <h4 className="font-medium text-foreground leading-tight">
                          {recipe.title}
                        </h4>
                        <Button
                          onClick={() => handleQuickRemix(recipe.url, recipe.id)}
                          disabled={isPending || activeQuickRemix !== null}
                          className="w-full"
                          data-testid={`button-remix-${recipe.id}`}
                        >
                          {activeQuickRemix === recipe.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Sparkles className="w-4 h-4" />
                          )}
                          <span>Remix It</span>
                        </Button>
                      </CardContent>
                    </Card>
                  </div>
                ))}
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
                          <div className="flex items-center gap-2">
                            <Utensils className="w-5 h-5 text-primary shrink-0" />
                            <CardTitle className="text-xl font-medium leading-tight" data-testid="text-fridge-title">
                              {currentFridgeRecipe.title}
                            </CardTitle>
                          </div>
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Clock className="w-4 h-4" />
                            <span className="text-sm">{currentFridgeRecipe.cookTimeMinutes} min</span>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <p className="text-sm font-medium text-foreground mb-2">Ingredients</p>
                          <ul className="text-sm text-muted-foreground space-y-1">
                            {currentFridgeRecipe.ingredients.map((ingredient, i) => (
                              <li key={i} className="pl-3 border-l-2 border-border">{ingredient}</li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground mb-2">Instructions</p>
                          <ol className="text-sm text-muted-foreground space-y-2">
                            {currentFridgeRecipe.instructions.map((step, i) => (
                              <li key={i} className="pl-3 border-l-2 border-primary/30">
                                <span className="font-medium text-foreground">{i + 1}.</span> {step}
                              </li>
                            ))}
                          </ol>
                        </div>
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
                className="w-16 h-16 rounded-full"
                onClick={() => handleSwipe("left")}
                data-testid="button-swipe-left"
              >
                <X className="w-8 h-8 text-muted-foreground" />
              </Button>
              <Button
                size="lg"
                className="w-16 h-16 rounded-full bg-primary"
                onClick={() => handleSwipe("right")}
                data-testid="button-swipe-right"
              >
                <Heart className="w-8 h-8" />
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
                            <div className="flex items-center gap-2">
                              <Heart className="w-4 h-4 text-primary shrink-0 fill-primary" />
                              <CardTitle className="text-base font-medium leading-tight">
                                {recipe.title}
                              </CardTitle>
                            </div>
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <Clock className="w-4 h-4" />
                              <span className="text-sm">{recipe.cookTimeMinutes} min</span>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div>
                            <p className="text-sm font-medium text-foreground mb-2">Ingredients</p>
                            <ul className="text-sm text-muted-foreground space-y-1">
                              {recipe.ingredients.map((ingredient, i) => (
                                <li key={i} className="pl-3 border-l-2 border-border">{ingredient}</li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground mb-2">Instructions</p>
                            <ol className="text-sm text-muted-foreground space-y-2">
                              {recipe.instructions.map((step, i) => (
                                <li key={i} className="pl-3 border-l-2 border-primary/30">
                                  <span className="font-medium text-foreground">{i + 1}.</span> {step}
                                </li>
                              ))}
                            </ol>
                          </div>
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
