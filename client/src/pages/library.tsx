import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { Loader2, ArrowLeft, BookOpen, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { RemixPageListResponse } from "@shared/routes";

type LibraryItem = RemixPageListResponse["items"][number];

function formatDate(isoDate: string): string {
  const date = new Date(isoDate);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return date.toLocaleDateString(undefined, { 
    month: "short", 
    day: "numeric",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined 
  });
}

export default function Library() {
  const [, navigate] = useLocation();
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isError, setIsError] = useState(false);
  const limit = 20;

  const fetchPage = async (pageOffset: number, append: boolean) => {
    try {
      if (append) {
        setIsLoadingMore(true);
      } else {
        setIsLoading(true);
      }
      setIsError(false);

      const res = await fetch(`/api/remix-pages?limit=${limit}&offset=${pageOffset}`);
      if (!res.ok) throw new Error("Failed to load library");
      
      const data: RemixPageListResponse = await res.json();
      
      if (append) {
        setItems(prev => [...prev, ...data.items]);
      } else {
        setItems(data.items);
      }
      setTotal(data.total);
      setOffset(pageOffset);
    } catch {
      setIsError(true);
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchPage(0, false);
  }, []);

  const handleLoadMore = () => {
    const nextOffset = offset + limit;
    fetchPage(nextOffset, true);
  };

  const hasMore = items.length < total;

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
          <h1 className="text-lg font-medium">Library</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        {isLoading && (
          <div className="text-center py-12">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-muted-foreground" />
            <p className="text-muted-foreground mt-4">Loading your library...</p>
          </div>
        )}

        {isError && !isLoading && (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">Failed to load library</p>
            <Button onClick={() => fetchPage(0, false)} data-testid="button-retry">
              Try Again
            </Button>
          </div>
        )}

        {!isLoading && !isError && items.length === 0 && (
          <div className="text-center py-12">
            <BookOpen className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-lg font-medium text-foreground mb-2">No pages yet</h2>
            <p className="text-muted-foreground mb-6">
              Remix a recipe to get started.
            </p>
            <Button onClick={() => navigate("/")} data-testid="button-start-remixing">
              Remix a Recipe
            </Button>
          </div>
        )}

        {!isLoading && !isError && items.length > 0 && (
          <div className="space-y-3">
            {items.map((item) => (
              <Link key={item.pageId} href={`/remix/${item.pageId}`}>
                <Card 
                  className="p-4 hover-elevate cursor-pointer"
                  data-testid={`library-item-${item.pageId}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-foreground truncate">
                        {item.title}
                      </h3>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                        <span>{formatDate(item.createdAt)}</span>
                        {item.sourceDomain && (
                          <>
                            <span className="text-muted-foreground/50">·</span>
                            <span className="truncate">From {item.sourceDomain}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                  </div>
                </Card>
              </Link>
            ))}

            {hasMore && (
              <div className="pt-4 text-center">
                <Button 
                  variant="outline" 
                  onClick={handleLoadMore}
                  disabled={isLoadingMore}
                  data-testid="button-load-more"
                >
                  {isLoadingMore ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    "Load More"
                  )}
                </Button>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
