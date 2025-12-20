import { useState } from "react";
import { useProcessRecipe } from "@/hooks/use-recipes";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { Link2, ArrowRight, Loader2, ChefHat } from "lucide-react";
import { z } from "zod";

export default function Home() {
  const [url, setUrl] = useState("");
  const { mutate, isPending } = useProcessRecipe();
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Basic client-side validation using zod
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

    // Log to console as requested
    console.log("Processing Recipe URL:", url);

    mutate(url, {
      onSuccess: (data) => {
        toast({
          title: "Recipe Processed",
          description: data.message,
        });
        setUrl(""); // Clear input on success
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

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-4 md:p-8 bg-[url('https://images.unsplash.com/photo-1495195134817-aeb325a55b65?q=80&w=2952&auto=format&fit=crop')] bg-cover bg-center relative">
      {/* Overlay to ensure readability on background image */}
      <div className="absolute inset-0 bg-white/90 backdrop-blur-[2px] z-0" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="w-full max-w-xl relative z-10"
      >
        <div className="bg-card/80 backdrop-blur-xl border border-white/20 shadow-xl rounded-2xl overflow-hidden">
          <div className="p-8 md:p-12 space-y-8">
            <div className="space-y-4 text-center">
              <div className="mx-auto w-12 h-12 bg-primary/5 rounded-full flex items-center justify-center mb-6">
                <ChefHat className="w-6 h-6 text-primary" />
              </div>
              <h1 className="text-3xl md:text-4xl font-serif font-medium text-primary tracking-tight">
                Recipe Parser
              </h1>
              <p className="text-muted-foreground text-balance">
                Enter a recipe URL below to extract ingredients and instructions instantly.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
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
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isPending || !url}
                className="w-full py-4 px-6 rounded-xl bg-primary text-primary-foreground font-medium text-lg shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5 active:translate-y-0 active:shadow-md disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none transition-all duration-200 flex items-center justify-center gap-2 group"
              >
                {isPending ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <span>Extract Recipe</span>
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </form>
          </div>
          
          <div className="px-8 py-4 bg-secondary/50 border-t border-border/50 text-center">
            <p className="text-xs text-muted-foreground">
              Supports most major cooking websites and blogs.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
