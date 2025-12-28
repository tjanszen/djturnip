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
- `ALT_RECIPES`: Set to "on" to enable AI recipe alternatives generation
- `FRIDGE_NEW_FLOW_V1`: Set to "on" to enable single recipe generation endpoint
- `FRIDGE_SINGLE_RECIPE_SCREEN_V1`: Set to "on" to enable consolidated Crumb-style single-screen UI
- `RECIPE_DETAIL_V2`: Set to "on" to enable structured RecipeDTO V2 with ingredient substitutions

### RecipeDTO V2 (RECIPE_DETAIL_V2)
When `RECIPE_DETAIL_V2=on`, the `/api/recipes/generate-single` endpoint returns structured recipe data:
- **Ingredients**: Objects with `id`, `name`, `amount`, and `substitutes[]` (each substitute has `id`, `name`, `amount`)
- **Steps**: Objects with `text` (includes ingredient amounts in parentheses), `ingredient_ids[]`, and `time_minutes`
- ID-based ingredient references enable substitution without step text replacement
- Validation ensures all `ingredient_ids` in steps reference actual ingredient IDs

**Frontend V2 Features**:
- **Recipe Summary Screen**: 2-column ingredient layout (name | amount), hidden steps, "Let's Cook!" and "Generate again" CTAs
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
- **V2 Navigation Rules**:
  - Recipe Summary back arrow returns to consolidated "New Recipe" (fridge-single) and clears substitutions
  - "Edit Ingredients" on Recipe Summary navigates to New Recipe and clears substitutions
  - "Generate again" regenerates using original ingredients/prefs (ignores substitutions)
  - Cook Mode back arrow returns to Recipe Summary (preserves substitutions)
  - Substitutions are ephemeral (UI-local working copy only, never mutate original RecipeDTO)
- **V2 Telemetry logs**:
  - `recipe_detail_v2 nav_back_to_new_recipe`, `nav_edit_to_new_recipe`, `nav_to_cook_mode`, `nav_back_to_summary`
  - `recipe_detail_v2 generate_again_click`, `substitutions_cleared`

### Key NPM Packages
- `@tanstack/react-query`: Data fetching and caching
- `drizzle-orm` / `drizzle-zod`: Database ORM and schema validation
- `zod`: Runtime type validation
- `openai`: OpenAI SDK for AI integrations
- `framer-motion`: Animation library
- `wouter`: Lightweight React router