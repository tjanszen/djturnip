import * as cheerio from 'cheerio';

export interface ExtractedRecipe {
  title: string;
  ingredients: string[];
  instructions: string[];
  sourceUrl: string;
}

export interface ExtractionResult {
  success: boolean;
  recipe?: ExtractedRecipe;
  error?: string;
  method?: 'json-ld' | 'html-heuristics' | 'fallback';
}

const FETCH_TIMEOUT_MS = 8000;
const MAX_HTML_SIZE = 2 * 1024 * 1024; // 2MB

export async function extractRecipeFromUrl(url: string): Promise<ExtractionResult> {
  const domain = new URL(url).hostname;
  console.log(`url_remix_v2_extract_start domain=${domain}`);

  try {
    const html = await fetchHtml(url);
    if (!html) {
      console.log(`url_remix_v2_extract_fail reason=fetch_failed domain=${domain}`);
      return { success: false, error: 'Failed to fetch recipe page' };
    }

    const $ = cheerio.load(html);

    // Try JSON-LD first (primary path)
    const jsonLdResult = extractFromJsonLd($, url);
    if (jsonLdResult.success && jsonLdResult.recipe) {
      console.log(`url_remix_v2_extract_success method=json-ld ingredient_count=${jsonLdResult.recipe.ingredients.length} instruction_count=${jsonLdResult.recipe.instructions.length}`);
      return { ...jsonLdResult, method: 'json-ld' };
    }

    // Fallback to HTML heuristics
    const htmlResult = extractFromHtmlHeuristics($, url);
    if (htmlResult.success && htmlResult.recipe) {
      console.log(`url_remix_v2_extract_success method=html-heuristics ingredient_count=${htmlResult.recipe.ingredients.length} instruction_count=${htmlResult.recipe.instructions.length}`);
      return { ...htmlResult, method: 'html-heuristics' };
    }

    console.log(`url_remix_v2_extract_fail reason=no_recipe_found domain=${domain}`);
    return { success: false, error: 'Could not parse recipe from URL' };

  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    console.log(`url_remix_v2_extract_fail reason=exception error=${errorMsg} domain=${domain}`);
    return { success: false, error: errorMsg };
  }
}

async function fetchHtml(url: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; RecipeRemix/1.0)',
        'Accept': 'text/html,application/xhtml+xml',
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.log(`url_remix_v2_fetch_error status=${response.status}`);
      return null;
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html') && !contentType.includes('application/xhtml')) {
      console.log(`url_remix_v2_fetch_error reason=invalid_content_type type=${contentType}`);
      return null;
    }

    const text = await response.text();
    if (text.length > MAX_HTML_SIZE) {
      console.log(`url_remix_v2_fetch_error reason=page_too_large size=${text.length}`);
      return null;
    }

    return text;
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      console.log('url_remix_v2_fetch_error reason=timeout');
    }
    return null;
  }
}

function extractFromJsonLd($: cheerio.CheerioAPI, sourceUrl: string): ExtractionResult {
  const scripts = $('script[type="application/ld+json"]');
  
  for (let i = 0; i < scripts.length; i++) {
    try {
      const content = $(scripts[i]).html();
      if (!content) continue;

      const data = JSON.parse(content);
      const recipe = findRecipeInJsonLd(data);
      
      if (recipe) {
        const extracted = parseJsonLdRecipe(recipe, sourceUrl);
        if (extracted && extracted.ingredients.length > 0 && extracted.instructions.length > 0) {
          return { success: true, recipe: extracted };
        }
      }
    } catch {
      // JSON parse error, try next script
    }
  }

  return { success: false };
}

function findRecipeInJsonLd(data: unknown): unknown | null {
  if (!data) return null;

  if (Array.isArray(data)) {
    for (const item of data) {
      const found = findRecipeInJsonLd(item);
      if (found) return found;
    }
    return null;
  }

  if (typeof data === 'object') {
    const obj = data as Record<string, unknown>;
    
    if (obj['@type'] === 'Recipe' || 
        (Array.isArray(obj['@type']) && obj['@type'].includes('Recipe'))) {
      return obj;
    }

    if (obj['@graph'] && Array.isArray(obj['@graph'])) {
      for (const item of obj['@graph']) {
        const found = findRecipeInJsonLd(item);
        if (found) return found;
      }
    }
  }

  return null;
}

function parseJsonLdRecipe(recipe: unknown, sourceUrl: string): ExtractedRecipe | null {
  const r = recipe as Record<string, unknown>;
  
  const title = normalizeText(String(r.name || 'Untitled Recipe'));
  
  // Parse ingredients
  const ingredients: string[] = [];
  const rawIngredients = r.recipeIngredient;
  if (Array.isArray(rawIngredients)) {
    for (const ing of rawIngredients) {
      const normalized = normalizeText(String(ing));
      if (normalized) ingredients.push(normalized);
    }
  }

  // Parse instructions
  const instructions: string[] = [];
  const rawInstructions = r.recipeInstructions;
  
  if (Array.isArray(rawInstructions)) {
    for (const step of rawInstructions) {
      if (typeof step === 'string') {
        const normalized = normalizeText(step);
        if (normalized) instructions.push(normalized);
      } else if (typeof step === 'object' && step !== null) {
        const stepObj = step as Record<string, unknown>;
        const text = stepObj.text || stepObj.name || '';
        const normalized = normalizeText(String(text));
        if (normalized) instructions.push(normalized);
      }
    }
  } else if (typeof rawInstructions === 'string') {
    // Sometimes instructions are a single string, split by newlines or periods
    const parts = rawInstructions.split(/\n|(?<=\.)\s+/).filter(p => p.trim().length > 10);
    for (const part of parts) {
      const normalized = normalizeText(part);
      if (normalized) instructions.push(normalized);
    }
  }

  return { title, ingredients, instructions, sourceUrl };
}

function extractFromHtmlHeuristics($: cheerio.CheerioAPI, sourceUrl: string): ExtractionResult {
  // Common ingredient selectors
  const ingredientSelectors = [
    '[itemprop="recipeIngredient"]',
    '.recipe-ingredients li',
    '.ingredients li',
    '.ingredient-list li',
    '[class*="ingredient"] li',
    '.wprm-recipe-ingredient',
    '.tasty-recipes-ingredients li',
  ];

  // Common instruction selectors
  const instructionSelectors = [
    '[itemprop="recipeInstructions"]',
    '.recipe-instructions li',
    '.instructions li',
    '.directions li',
    '.recipe-directions li',
    '[class*="instruction"] li',
    '.wprm-recipe-instruction',
    '.tasty-recipes-instructions li',
  ];

  const ingredients: string[] = [];
  const instructions: string[] = [];

  // Try to find ingredients
  for (const selector of ingredientSelectors) {
    const elements = $(selector);
    if (elements.length > 0) {
      elements.each((_, el) => {
        const text = normalizeText($(el).text());
        if (text && text.length > 3) ingredients.push(text);
      });
      if (ingredients.length >= 3) break;
    }
  }

  // Try to find instructions
  for (const selector of instructionSelectors) {
    const elements = $(selector);
    if (elements.length > 0) {
      elements.each((_, el) => {
        const text = normalizeText($(el).text());
        if (text && text.length > 10) instructions.push(text);
      });
      if (instructions.length >= 2) break;
    }
  }

  // Try to find title
  let title = normalizeText($('h1').first().text()) || 
              normalizeText($('[itemprop="name"]').first().text()) ||
              'Untitled Recipe';

  if (ingredients.length === 0 || instructions.length === 0) {
    return { success: false };
  }

  return {
    success: true,
    recipe: { title, ingredients, instructions, sourceUrl },
  };
}

function normalizeText(text: string): string {
  return text
    .replace(/\s+/g, ' ')
    .replace(/\n/g, ' ')
    .trim();
}
