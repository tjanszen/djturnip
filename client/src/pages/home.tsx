import { useState } from "react";
import { useProcessRecipe } from "@/hooks/use-recipes";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { Link2, Loader2, ChefHat, Utensils, Sparkles, Flame, Dumbbell, Leaf, ArrowRight, ArrowLeft, X, Heart, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { RecipeAlternative, RecipeStyle } from "@shared/routes";
import steamedBroccoliImg from "@assets/generated_images/plain_steamed_broccoli.png";
import cheesyBroccoliImg from "@assets/generated_images/cheesy_garlic_roasted_broccoli.png";

type ViewState = "search" | "swiping" | "saved";

export default function Home() {
  const [url, setUrl] = useState("");
  const [alternatives, setAlternatives] = useState<RecipeAlternative[]>([]);
  const [activeStyle, setActiveStyle] = useState<RecipeStyle | null>(null);
  const [viewState, setViewState] = useState<ViewState>("search");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [savedRecipes, setSavedRecipes] = useState<RecipeAlternative[]>([]);
  const [swipeDirection, setSwipeDirection] = useState<"left" | "right" | null>(null);
  const { mutate, isPending } = useProcessRecipe();
  const { toast } = useToast();

  const handleSubmit = (style: RecipeStyle) => {
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

    console.log(`Processing Recipe URL with style "${style}":`, url);
    setActiveStyle(style);

    mutate({ url, style }, {
      onSuccess: (data) => {
        toast({
          title: "Recipe Processed",
          description: data.message,
        });
        
        if (data.alternatives && data.alternatives.length > 0) {
          console.log("Generated Recipe Alternatives:");
          data.alternatives.forEach((alt, i) => {
            console.log(`  ${i + 1}. ${alt.title}`);
          });
          setAlternatives(data.alternatives);
          setCurrentIndex(0);
          setSavedRecipes([]);
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

  const handleSwipe = (direction: "left" | "right") => {
    const currentRecipe = alternatives[currentIndex];
    setSwipeDirection(direction);
    
    if (direction === "right" && currentRecipe) {
      setSavedRecipes(prev => [...prev, currentRecipe]);
    }
    
    setTimeout(() => {
      setSwipeDirection(null);
      if (currentIndex < alternatives.length - 1) {
        setCurrentIndex(prev => prev + 1);
      } else {
        setViewState("saved");
      }
    }, 300);
  };

  const handleBackToSearch = () => {
    setViewState("search");
    setAlternatives([]);
    setCurrentIndex(0);
    setSavedRecipes([]);
  };

  const currentRecipe = alternatives[currentIndex];

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
            className="w-full max-w-xl mt-8"
          >
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
                      onClick={() => handleSubmit('creative')}
                      disabled={isPending || !url}
                      className="py-6"
                      data-testid="button-creative"
                    >
                      {isPending && activeStyle === 'creative' ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Sparkles className="w-4 h-4" />
                      )}
                      <span>Creative</span>
                    </Button>
                    <Button
                      onClick={() => handleSubmit('umami')}
                      disabled={isPending || !url}
                      className="py-6"
                      data-testid="button-umami"
                    >
                      {isPending && activeStyle === 'umami' ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Flame className="w-4 h-4" />
                      )}
                      <span>Umami</span>
                    </Button>
                    <Button
                      onClick={() => handleSubmit('protein')}
                      disabled={isPending || !url}
                      className="py-6"
                      data-testid="button-protein"
                    >
                      {isPending && activeStyle === 'protein' ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Dumbbell className="w-4 h-4" />
                      )}
                      <span>More Protein</span>
                    </Button>
                    <Button
                      onClick={() => handleSubmit('seasonal')}
                      disabled={isPending || !url}
                      className="py-6"
                      data-testid="button-seasonal"
                    >
                      {isPending && activeStyle === 'seasonal' ? (
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
          </motion.div>
        )}

        {viewState === "swiping" && currentRecipe && (
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
                {currentIndex + 1} of {alternatives.length}
              </p>
              <div className="w-9" />
            </div>

            <div className="relative w-full">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentIndex}
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
                          {currentRecipe.title}
                        </CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {currentRecipe.changes && currentRecipe.changes.length > 0 ? (
                        currentRecipe.changes.map((change, changeIndex) => (
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
              Skip or save this remix
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
                Your Saved Remixes
              </h2>
              <div className="w-24" />
            </div>

            {savedRecipes.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {savedRecipes.map((recipe, index) => (
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
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {viewState === "search" && alternatives.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
            className="w-full max-w-3xl mt-12"
          >
            <p className="text-center text-sm text-muted-foreground mb-6">See the magic in action</p>
            <div className="grid grid-cols-1 md:grid-cols-[1fr,auto,1fr] gap-4 items-center">
              <Card className="h-full overflow-hidden" data-testid="card-example-original">
                <div className="aspect-[4/3] overflow-hidden">
                  <img 
                    src={steamedBroccoliImg} 
                    alt="Plain steamed broccoli" 
                    className="w-full h-full object-cover"
                  />
                </div>
                <CardHeader className="pb-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Original</p>
                  <CardTitle className="text-lg font-medium">Steamed Broccoli</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>Broccoli florets</li>
                    <li>Water</li>
                    <li>Salt</li>
                  </ul>
                </CardContent>
              </Card>

              <div className="hidden md:flex items-center justify-center">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <ArrowRight className="w-5 h-5 text-primary" />
                </div>
              </div>

              <Card className="h-full border-primary/20 bg-primary/5 overflow-hidden" data-testid="card-example-remix">
                <div className="aspect-[4/3] overflow-hidden">
                  <img 
                    src={cheesyBroccoliImg} 
                    alt="Cheesy garlic roasted broccoli" 
                    className="w-full h-full object-cover"
                  />
                </div>
                <CardHeader className="pb-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-primary">Remixed</p>
                  <CardTitle className="text-lg font-medium">Cheesy Garlic Roasted Broccoli</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-foreground">Add Cheese</p>
                    <p className="text-sm text-muted-foreground pl-3 border-l-2 border-primary/30">
                      Top with shredded parmesan and broil until golden
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-foreground">Roast with Garlic</p>
                    <p className="text-sm text-muted-foreground pl-3 border-l-2 border-primary/30">
                      Toss with olive oil, minced garlic, and roast at 425F
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
