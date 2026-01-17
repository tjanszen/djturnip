# Recipe Alternatives Generator

## Overview

A web application that processes recipe URLs and generates creative recipe alternatives using AI. Users submit a recipe URL, and when the `ALT_RECIPES` environment variable is enabled, the system uses OpenAI to generate 9 unique recipe variations inspired by the original recipe.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack React Query for server state and caching
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS variables for theming
- **Animations**: Framer Motion for smooth entry animations and micro-interactions
- **Build Tool**: Vite for development and production builds

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **API Design**: RESTful endpoints with Zod schema validation
- **Route Definitions**: Shared route contracts in `shared/routes.ts` with input/output schemas
- **AI Integration**: OpenAI API (via Replit AI Integrations) for generating recipe alternatives
- **Storage**: In-memory storage (`MemStorage` class) for development, with Drizzle ORM schema ready for PostgreSQL

### Data Layer
- **ORM**: Drizzle ORM with PostgreSQL dialect
- **Schema Location**: `shared/schema.ts` contains all database table definitions
- **Schema Validation**: drizzle-zod for generating Zod schemas from database tables
- **Tables**: recipes, conversations, messages (chat functionality scaffolded)

### Project Structure
```
client/           # React frontend
  src/
    components/ui/  # shadcn/ui components
    hooks/          # Custom React hooks
    pages/          # Page components
    lib/            # Utilities and query client
server/           # Express backend
  routes.ts         # API route handlers
  storage.ts        # Data storage abstraction
  replit_integrations/  # AI integration utilities (batch, chat, image)
shared/           # Shared code between frontend and backend
  schema.ts         # Database schema definitions
  routes.ts         # API route contracts
```

### Key Design Decisions

1. **Shared Route Contracts**: API routes are defined once in `shared/routes.ts` with Zod schemas for both input validation and response typing, ensuring type safety across the full stack.

2. **Feature Flag Pattern**: The `ALT_RECIPES` environment variable controls whether AI-generated alternatives are returned, allowing easy toggling of the feature.

3. **Storage Abstraction**: The `IStorage` interface in `server/storage.ts` abstracts data persistence, currently using in-memory storage but designed for easy PostgreSQL migration.

4. **Component Library**: Full shadcn/ui component set is installed, providing consistent, accessible UI primitives.

## External Dependencies

### AI Services
- **OpenAI API**: Used via Replit AI Integrations for generating recipe alternatives
  - Environment variables: `AI_INTEGRATIONS_OPENAI_API_KEY`, `AI_INTEGRATIONS_OPENAI_BASE_URL`
  - Model: `gpt-4o-mini` for recipe generation, `gpt-image-1` for image generation (scaffolded)

### Database
- **PostgreSQL**: Configured via `DATABASE_URL` environment variable
- **Drizzle Kit**: For database migrations (`npm run db:push`)

### Environment Variables
- `DATABASE_URL`: PostgreSQL connection string
- `AI_INTEGRATIONS_OPENAI_API_KEY`: OpenAI API key
- `AI_INTEGRATIONS_OPENAI_BASE_URL`: OpenAI API base URL
- `ALT_RECIPES`: Set to "on" to enable AI recipe alternatives generation (V1)
- `ALT_RECIPES_V2`: Set to "on" to enable V2 recipe remix with categorized alternatives (basic elevations + delightful twists). Takes precedence over ALT_RECIPES when enabled.
- `FRIDGE_NEW_FLOW_V1`: Set to "on" to enable single recipe generation endpoint
- `FRIDGE_SINGLE_RECIPE_SCREEN_V1`: Set to "on" to enable consolidated Crumb-style single-screen UI
- `PROMPT_V3_HOMECOOK`: Set to "on" to enable thoughtful home-cook style prompts with Flavor Axes Framework (component-level reasoning: protein/vegetable/starch/sauce/topping, each hitting 2+ flavor axes: aromatics, seasoning, acid/umami, fat/richness, texture contrast)

## Recipe Data Structure (V2-Only)

Recipe generation and rendering use exclusively the V2 structured format. V1 has been deprecated and removed from the codebase. All generation code paths use `recipeDTOV2Schema` for Zod validation, and the frontend uses a single `GeneratedRecipe` interface.

The `/api/recipes/generate-single` endpoint returns structured recipe data with the following format:
- **name**: Recipe title
- **description**: Brief recipe description
- **servings**: Number of servings
- **time_minutes**: Total cooking time
- **calories_per_serving**: Estimated calories (optional)
- **explanation**: 1-3 sentences explaining why the recipe works (flavor, texture, or technique rationale)
- **Ingredients**: Array of objects with `id`, `name`, `amount`, and `substitutes[]` (each substitute has `id`, `name`, `amount`)
- **Steps**: Array of objects with `id`, `text` (includes ingredient amounts in parentheses), `ingredient_ids[]`, and `time_minutes`
- **remixes**: Array of 1+ remix objects, each containing:
  - `id`, `title`, `description`
  - `patch`: Object with optional fields:
    - `ingredient_overrides`: Array of `{ ingredient_id, amount? }`
    - `add_ingredients`: Array of `{ id, name, amount }` (max 2-3 non-pantry)
    - `step_ops`: Array of step operations (`add_after`, `replace`, `remove`)
    - `meta_updates`: Optional `{ time_minutes?, calories_per_serving? }`

ID-based ingredient references enable substitution without step text replacement. Step IDs enable robust patch operations for remixes. Validation ensures all `ingredient_ids` in steps reference actual ingredient IDs.

### Frontend Features
- **Recipe Summary Screen**: 2-column ingredient layout (name | amount), hidden steps, "Let's Cook!" and "Generate again" CTAs
- **AI-Generated Hero Image**: Each recipe displays a hero image generated from `image_prompt`
  - Images are generated asynchronously (don't block recipe text rendering)
  - In-memory cache by stable `recipeKey` (hash of name + ingredients + steps)
  - One image generation per recipe instance; "Generate Again" creates new instance with new image
  - Skeleton placeholder shown while image loads
  - Endpoint: `POST /api/recipes/generate-image` with `{ prompt }` returns `{ image_url }`
  - Telemetry: `recipe_image_gen_success recipeKey=<key>` logged on client success
- **Ingredient Substitution**: Tappable ingredient rows with chevron if substitutes exist
  - Bottom sheet (Drawer) opens with radio list of substitute options + original
  - Swap updates a local "working copy" without modifying original recipe
  - Generate Again always uses original ingredients (ignores working copy)
  - IDs are preserved during substitution (only name/amount change)
- **Cook Mode**: Step-by-step cooking instructions screen
  - Accessed via "Let's Cook!" from Recipe Summary
  - Numbered steps with time estimates (~N minutes)
  - Ingredient badges show working copy names (reflects substitutions)
  - Back arrow returns to Recipe Summary
  - Placeholder CTAs: Favorite and Done (no-op)
- **Recipe Remixes** (Phase 3 complete): Pre-generated alternative variations of each recipe
  - 3-4 remix options displayed below Ingredients section as tappable cards
  - Each remix shows title and description (1-2 lines)
  - Apply one remix at a time by tapping; shows "Applied" badge
  - Undo button appears in section header when remix is active
  - Clicking different remix replaces current (no stacking)
  - Remixes apply patches: ingredient_overrides, add_ingredients, step_ops, meta_updates
  - `applyRemixPatch` helper computes derived recipe from base + patch
  - State: `activeRemixId`, `remixedRecipe` (derived), `displayRecipe` (remixed or base)
  - Hero image always uses base recipe for caching (no regeneration on apply/undo)
  - Graceful failure: missing IDs in patch log warning and stay on base recipe
  - Log: `recipe_remixes_phase3_ui_live`
- **Navigation Rules**:
  - Recipe Summary back arrow returns to consolidated "New Recipe" (fridge-single) and clears substitutions
  - "Remix Recipe" regenerates using original ingredients/prefs (ignores substitutions)
  - Cook Mode back arrow returns to Recipe Summary (preserves substitutions)
  - Substitutions are ephemeral (UI-local working copy only, never mutate original RecipeDTO)
- **Telemetry logs**:
  - `recipe_v2 nav_back_to_new_recipe`, `nav_to_cook_mode`, `nav_back_to_summary`
  - `recipe_v2 remix_recipe_click`, `substitutions_cleared`
  - `recipe_v2_generate_start`, `recipe_v2_parse_success`, `recipe_v2_parse_retry`, `recipe_v2_generate_error`

### Key NPM Packages
- `@tanstack/react-query`: Data fetching and caching
- `drizzle-orm` / `drizzle-zod`: Database ORM and schema validation
- `zod`: Runtime type validation
- `openai`: OpenAI SDK for AI integrations
- `framer-motion`: Animation library
- `wouter`: Lightweight React router

## Persisted Remix Pages (Planned)

Reference: `docs/agent_memory/imp_plans/persisted_page_urls.md`

### Overview
URL Remix results will become deep-linkable, durable pages stored in PostgreSQL. Every successful generation is persisted automatically, enabling a library of generated recipe pages.

### Database
- **Provider**: Replit Postgres (existing `DATABASE_URL`)
- **Planned Table**: `remix_pages`
  - `id` (deterministic hash of normalized URL + timestamp suffix)
  - `source_url`, `source_url_normalized`, `title`, `created_at`
  - `payload` (JSONB — full V2 response)
  - `payload_version` (e.g., "v2")
  - Indexes: `created_at DESC`, `source_url_hash`

### Planned Routes
- `/remix/:pageId` — Deep-linkable saved page (fetches from DB on mount)
- `/library` — List of all generated pages (newest first)

### Planned Endpoints
- `GET /api/remix-pages/:pageId` — Retrieve stored payload
- `GET /api/remix-pages?limit=50` — List metadata for library view

### Migration Command
```bash
npm run db:push
```

### Verify Table Exists
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema='public' AND table_name='remix_pages';
```

### Phase Summary
- **Phase 1: COMPLETE** - `remix_pages` table created with indexes
- Phase 2: Persist on V2 success + return `pageId`
- Phase 3: Add GET endpoints for retrieval/listing
- Phase 4: Add frontend routes `/remix/:pageId` and `/library`
- Phase 5: Library UI
- Phase 6: Storage limits + hardening
