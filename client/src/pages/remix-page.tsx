import { useQuery } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Loader2, ArrowLeft, AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RecipeResultsLayout } from "@/components/recipe-results-layout";
import type { RemixPageResponse } from "@shared/routes";

export default function RemixPage() {
  const { pageId } = useParams<{ pageId: string }>();
  const [, navigate] = useLocation();

  const { data, isLoading, isError, error, refetch } = useQuery<RemixPageResponse>({
    queryKey: ["/api/remix-pages", pageId],
    queryFn: async () => {
      const res = await fetch(`/api/remix-pages/${pageId}`);
      if (res.status === 404) {
        throw new Error("Page not found");
      }
      if (!res.ok) {
        throw new Error("Failed to load page");
      }
      return res.json();
    },
    retry: false,
    staleTime: 0,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-muted-foreground" />
          <p className="text-muted-foreground">Loading saved remix...</p>
        </div>
      </div>
    );
  }

  if (isError) {
    const is404 = error?.message === "Page not found";
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4 max-w-md px-4">
          <AlertCircle className="w-12 h-12 mx-auto text-muted-foreground" />
          <h1 className="text-xl font-medium text-foreground">
            {is404 ? "Page Not Found" : "Something went wrong"}
          </h1>
          <p className="text-muted-foreground">
            {is404 
              ? "This remix page doesn't exist or may have been removed."
              : "We couldn't load this page. Please try again."}
          </p>
          <div className="flex gap-3 justify-center pt-2">
            <Button 
              variant="outline" 
              onClick={() => navigate("/")}
              data-testid="button-back-home"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
            {!is404 && (
              <Button 
                onClick={() => refetch()}
                data-testid="button-retry"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const payload = data.payload as {
    extractedRecipe?: { title: string; ingredients: string[] };
    what_is_this?: string;
    why_this_works?: string;
    alternatives?: Array<{
      title: string;
      kind?: "basic" | "delight";
      why_this_works?: string;
      changes: Array<{ action: string; details: string }>;
    }>;
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/")}
            data-testid="button-back"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-muted-foreground truncate">
              {data.sourceDomain ? `From ${data.sourceDomain}` : "Saved Remix"}
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        <RecipeResultsLayout
          mode="readOnly"
          title={payload.extractedRecipe?.title || data.title}
          whatIsThis={payload.what_is_this}
          whyThisWorks={payload.why_this_works}
          ingredients={payload.extractedRecipe?.ingredients || []}
          remixCards={payload.alternatives}
          collapsibleIngredients={true}
          ingredientsDefaultCollapsed={true}
          testIdPrefix="remix-page"
        />
      </main>
    </div>
  );
}
