# Phased Implementation Plan — Persisted Remix Pages + Library (Replit Postgres, Deterministic IDs)

## Snapshot
We will upgrade URL Remix results from in-memory React state to **durable, deep-linkable pages** stored in **existing Replit Postgres**, creating a persistent **library of generated remix pages**.

Locked decisions:
- Storage: **Replit Postgres** (already available)
- Save policy: **store every generated page** (automatic)
- Dedupe: **no dedupe** (multiple generations per same URL are allowed)
- ID strategy: **deterministic hash of normalized URL** + deterministic run suffix to allow multiple pages per URL
- Frontend routing: `/remix/:pageId` for a saved page; `/library` to browse all pages
- Refresh/deep links must work (fetch from DB on route mount)

---

## Phase 0 — Simplify + Connection Setup
**Goal:** Use existing Replit Postgres and document connection.

### Tasks
- Confirm `DATABASE_URL` is available in Replit environment for Postgres.
- Add a short note to repo docs (e.g., `replit.md`) stating:
  - “Using existing Replit Postgres”
  - Which env var is required (`DATABASE_URL`)
  - How migrations are run (whatever mechanism the repo uses)

### Acceptance criteria
- App boots with DB configured in dev/prod.
- Documentation exists for DB connection and migration command.

---

## Phase 1 — Schema: Single Table with Future-Safe Fields
**Goal:** Create a minimal durable schema that stores complete pages + metadata.

### Table: `remix_pages`
Recommended columns:
- `id` TEXT PRIMARY KEY  
- `payload_version` TEXT NOT NULL DEFAULT 'v2'
- `source_url` TEXT NOT NULL
- `source_url_normalized` TEXT NOT NULL
- `source_url_hash` TEXT NOT NULL
- `source_domain` TEXT NULL
- `title` TEXT NOT NULL
- `created_at` TIMESTAMPTZ NOT NULL DEFAULT now()
- `payload` JSONB NOT NULL

### Indexes
- `created_at` (descending) for library listing
- `source_url_hash` (for future “show all remixes from this URL”)

### ID strategy (deterministic, no-dedupe safe)
We need deterministic IDs but also allow multiple runs of the same URL.
Use **deterministic base + deterministic suffix**:

- `normalizedUrl = normalize(source_url)`
- `base = sha256(normalizedUrl)` (shortened for URL safety, e.g., first 12–16 hex chars)
- `run = sha256(normalizedUrl + ":" + createdAtISO)` (shortened)
- `pageId = base + "_" + run`

Also store:
- `source_url_hash = base` (indexed)

### Acceptance criteria
- Migration creates the table and indexes successfully.
- `payload_version` is present from day 1 (default 'v2').

---

## Phase 2 — Backend: Persist on Generation + Clear Response Contract
**Goal:** On successful generation, write to DB and return a stable `pageId`.

### Storage module
Create a small storage abstraction (to keep code tidy and future-migratable):
- `createRemixPage({ sourceUrl, title, domain, payload, payloadVersion }): { pageId }`
- `getRemixPage(pageId): { metadata..., payload } | null`
- `listRemixPages(limit, offset): [{ pageId, title, createdAt, sourceUrl, sourceDomain }]`

### Update generation endpoint
In `POST /api/recipes/process` (V2 success path):
- After V2 validation succeeds, attempt DB insert:
  - Compute normalizedUrl, base hash, pageId
  - Insert into `remix_pages`
- Response contract:
  - Return `pageId` at the **top level** alongside existing top-level fields, e.g.:

    {
      "pageId": "...",
      "message": "...",
      "extractedRecipe": {...},
      "what_is_this": "...",
      "why_this_works": "...",
      "alternatives": [...]
    }

### Critical error state: DB write fails after generation succeeds
If DB insert fails:
- Log the error with enough context (domain, normalizedUrl hash, error message)
- Return HTTP 200 with the full generated payload **but set `pageId: null`**
- Do NOT fail the request (user should still see the results)
- The frontend should NOT navigate to `/remix/:pageId` in this case (since it wasn’t saved)

### Acceptance criteria
- Successful save returns `pageId` populated.
- Simulated DB failure still returns generated payload with `pageId: null` and logs an error.

---

## Phase 3 — Read APIs (MVP Pagination)
**Goal:** Retrieve saved pages and list library entries.

### Endpoints
- `GET /api/remix-pages/:pageId`
  - 200 + stored payload
  - 404 if not found

- `GET /api/remix-pages?limit=50&offset=0`
  - MVP pagination: **limit + offset** only (no cursor yet)
  - Returns metadata for library list

### Acceptance criteria
- Can fetch any saved page by ID.
- Library list returns newest-first entries with limit/offset.

---

## Phase 4 — Frontend Routing & State (Always Fetch from DB)
**Goal:** Deep links work reliably; refresh does not lose results.

### Routing updates
- Add wouter route: `/remix/:pageId`
- Add wouter route: `/library`

### Navigation behavior
- On successful generation:
  - If `pageId` is present:
    - Navigate immediately to `/remix/${pageId}`
  - If `pageId` is null (DB failed):
    - Stay on current results view (in-memory), show a subtle non-blocking “Not saved” notice (copy TBD)
    - Do not navigate

### Data loading on `/remix/:pageId`
- Always fetch from DB on route mount:
  - `GET /api/remix-pages/:pageId`
- Do not rely on cached in-memory generation data for rendering.
  - (This keeps behavior consistent whether you arrive from library, refresh, or direct link.)

### What happens to existing `viewState`?
- Keep `viewState` for the search experience as needed.
- The remix results should be renderable via route-based state.
- If the app currently uses `viewState="remix-result"` for results:
  - It can remain for the non-saved “DB failed” edge case
  - But the canonical “saved page” path is `/remix/:pageId`

### Acceptance criteria
- Refreshing `/remix/:pageId` shows the same page.
- Direct deep-link works.
- DB failure case still shows results but does not navigate.

---

## Phase 5 — Library UX (Scan-friendly)
**Goal:** Browse all generated pages quickly.

### Library UI
- Display list of saved pages (newest first) using `GET /api/remix-pages?limit&offset`
- Each entry shows:
  - Title
  - Created date/time (humanized)
  - Subtitle: **“Generated from: domain.com”**
- Clicking entry navigates to `/remix/:pageId`

### Future nice-to-have (defer)
- Filter/search by domain

### Acceptance criteria
- Library is usable and scan-friendly.
- Clicking an item loads the saved page.

---

## Phase 6 — Hardening + Pruning Telemetry
**Goal:** Prevent unbounded growth and make pruning observable.

### Pruning policy
- Set a cap (e.g., keep last 1,000 pages) or max age (e.g., 90 days) — pick one.
- On insert, if cap exceeded:
  - Delete oldest rows until under cap

### Telemetry/logging
- When pruning happens, emit a log event:
  - `remix_pages_pruned`
  - include `deleted_count`, `remaining_count`

### Acceptance criteria
- Pruning works and is visible in logs.
- Library does not grow forever unnoticed.

---

## MVP Verification Checklist
1) Generate a remix:
   - Response includes `pageId` (usually)
   - DB row exists with `payload_version='v2'`
2) Navigate to `/remix/:pageId`:
   - Page loads from DB
   - Refresh works
3) Visit `/library`:
   - Shows entries with “Generated from: domain.com”
4) Simulate DB failure:
   - Generation still returns payload
   - `pageId: null`
   - App does not navigate to `/remix/:pageId`

---

## Notes / Tradeoffs
- Deterministic base hash (`source_url_hash`) makes future “group by URL” trivial without dedupe.
- Limit+offset pagination is fine for MVP; cursor pagination can be added later if the library grows large.
- Always fetching from DB on route mount keeps state logic simple and consistent.
