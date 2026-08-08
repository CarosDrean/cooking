# AGENTS.md

PNPM workspaces monorepo (`server` + `client`), app in Spanish (UI strings, types, seed). No test framework; verification = `pnpm check`.

## Commands

- `pnpm dev` — runs `server` (Express, tsx watch, port 3001) and `client` (Vite, port 5173, proxies `/api` → 3001) via concurrently.
- `pnpm check` — the verification gate: `pnpm check:types-sync` + `pnpm typecheck` + `pnpm lint` (biome) + `pnpm security:audit`. Run this after any change.
- `pnpm sync-types` — regenerates `client/src/types.ts` from `server/src/types.ts` (server is the source of truth). Run after editing server types.
- `pnpm check:types-sync` — fails if client/server types have drifted.
- Package-scoped: `pnpm --filter @cooking/server dev`, etc. For fast validation: `pnpm --filter @cooking/<pkg> typecheck`.
- Format before finishing: `npx biome check --write <archivos modificados>`.
- Dependencies are exact-pinned (`save-exact=true` in `.npmrc`); add with `pnpm add --filter <pkg>`.

## Architecture

- `server/` is the source of truth for all state. Express 5 REST under `/api` (profiles, recipes, pantry, plan, history, shopping, recommendations, settings, tips, themealdb). Routes in `server/src/routes/`, logic in `server/src/services/`.
- State lives in `server/data/db.json`, which **is git-tracked and NOT gitignored**. The server reads it once (`getState()`) and writes atomically (tmp+rename) on a 150ms debounce (`saveState()`). Mutations must go through routes that call `saveState()`. Editing `db.json` directly while the server runs is lost on the next `saveState()` — prefer mutations through routes/API.
- **Migrations/defaults are centralized** in `ensureStateDefaults()` (`server/src/db.ts`), called by `load()` and `seedState()`. Adding a field = update types (server + `pnpm sync-types`) + the default in `ensureStateDefaults`.
- **Types are synced, not hand-copied**: `client/src/types.ts` is generated from `server/src/types.ts` via `pnpm sync-types` (`// @client-omit-start/end` markers for server-only blocks). `pnpm check` fails on drift.
- **Pantry is per-profile** (`PantryItem.profileId`). Routes/services filter by `state.activeProfileId`; `pantryTotals()` (the choke point for makeable/recommendations/plan/shopping) filters too.
- TheMealDB integration uses the free public API (no key). Imported recipes get ids `tmdb-<idMeal>` (no collision with local UUID ids).
- `DELETE /api/recipes/:id` cascades: removes the recipe from `weeklyPlan.slots`, `history`, `favoriteRecipeIds`, `recipeOverrides`, `ratingByRecipe` and `suggestionFeedback`.
- `PUT /api/history/:id` with a `rating` also syncs the profile's `ratingByRecipe` (one source of truth for a meal's rating).

## Conventions

- Server is ESM `NodeNext`: relative imports must use the `.js` extension (`import ... from "../db.js"`).
- Biome style: 4-space indent, double quotes, semicolons, 120-col width. Run `pnpm lint` or `npx biome check --write <files>` to match.
- Both packages: TypeScript strict. Client has `noUnusedLocals`/`noUnusedParameters` — unused vars fail `typecheck`.
- Day/week keys and meal types use lowercase Spanish identifiers (e.g. `"lunes"`, `"almuerzo"`), defined in `types.ts` with `DAY_LABELS`/`MEAL_LABELS` maps.
- Recipe availability/season logic lives in `server/src/types.ts` (`seasonFit`, `availability`, `normalizeText`).
- Data/product decisions (e.g. migration mapping of legacy data, defaults) should be surfaced in the builder's final report with rationale.

## Subagent orchestration

When delegating work to subagents via `task`, the parent agent MUST pass explicit context in the prompt. Do NOT assume the subagent knows what to do just by reading files.

### Required context per subagent

| Subagent | Must include in prompt |
|---|---|
| `planner` | Project/feature description, stack, constraints |
| `backend-builder` | Task ID (from `.ai/tasks.md`), relevant files, **files NOT to touch** (parallel agents), verification command |
| `frontend-builder` | Task ID (from `.ai/tasks.md`), relevant files, **files NOT to touch** (parallel agents), verification command |
| `test-runner` | Task IDs to validate, which commands to run |
| `browser-qa` | App URL, specific flows/features to test, completed task IDs |
| `fixer` | Report file paths, error details, related task IDs |

### Parallel work — rules

- Assign **disjoint files** per agent. Tell each agent which files are theirs and which to NOT touch.
- If several tasks must touch the same file, run them sequentially or split file ownership explicitly.
- Agents MUST ignore typecheck/lint errors in files they don't own (another agent may be mid-edit) and MUST NOT "fix" them.
- Builders only run package-scoped `typecheck` + format their own files; the **parent** runs full `pnpm check` at the end of each batch.

### Verification roles

- `test-runner` is **manual-only** (invoked by the user, not the parent). Between batches the parent runs `pnpm check` itself.
- `browser-qa`/`fixer` may write reports under `.ai/qa/`, but **`.ai/` is ephemeral and may be deleted** — the agent's final message is the real deliverable; keep it complete.
- Builders must report the exact command they ran + output; never claim "green" without running it.

### Hotfix path (small bugs)

- For isolated bug fixes (1–2 files), the parent may implement directly or delegate to a single builder **without** the full planner→tasks→QA sequence. Document the fix in the commit / final message.

### Workflow sequence

1. **Planner** → generates `.ai/tasks.md` with task IDs
2. **Builder** (frontend/backend) → reads task by ID, marks `en_progreso`, implements, marks `completado`
3. **Parent** → runs `pnpm check` between batches (test-runner is manual-only)
4. **QA** (browser-qa) → receives URL + flows, tests manually, generates report (file optional; final message required)
5. **Fixer** → receives report paths + errors, fixes issues, re-runs validation

Each subagent's `.opencode/agents/*.md` file lists the exact context it expects.
