import { useState } from "react";
import { useProcessRecipe } from "@/hooks/use-recipes";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { Link2, Loader2, ChefHat, Utensils, Sparkles, Flame, Dumbbell, Leaf, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { RecipeAlternative, RecipeStyle } from "@shared/routes";

export default function Home() {
  const [url, setUrl] = useState("");
  const [alternatives, setAlternatives] = useState<RecipeAlternative[]>([]);
  const [activeStyle, setActiveStyle] = useState<RecipeStyle | null>(null);
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

  return (
    <div className="min-h-screen w-full flex flex-col items-center p-4 md:p-8 bg-background">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
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

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
        className="w-full max-w-3xl mt-12"
      >
        <p className="text-center text-sm text-muted-foreground mb-6">See the magic in action</p>
        <div className="grid grid-cols-1 md:grid-cols-[1fr,auto,1fr] gap-4 items-center">
          <Card className="h-full" data-testid="card-example-original">
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

          <Card className="h-full border-primary/20 bg-primary/5" data-testid="card-example-remix">
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

      <AnimatePresence>
        {alternatives.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
            className="w-full max-w-6xl mt-12"
          >
            <h2 className="text-2xl font-serif font-medium text-center mb-8" data-testid="text-alternatives-title">
              Recipe Modifications
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {alternatives.map((alt, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: index * 0.05 }}
                >
                  <Card className="h-full" data-testid={`card-recipe-${index}`}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-2">
                        <Utensils className="w-4 h-4 text-primary shrink-0" />
                        <CardTitle className="text-base font-medium leading-tight" data-testid={`text-recipe-title-${index}`}>
                          {alt.title}
                        </CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {alt.changes && alt.changes.length > 0 ? (
                        alt.changes.map((change, changeIndex) => (
                          <div key={changeIndex} className="space-y-1">
                            <p className="text-sm font-medium text-foreground" data-testid={`text-action-${index}-${changeIndex}`}>
                              {change.action}
                            </p>
                            <p className="text-sm text-muted-foreground pl-3 border-l-2 border-border" data-testid={`text-details-${index}-${changeIndex}`}>
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
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
