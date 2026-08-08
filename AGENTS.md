# AGENTS.md

PNPM workspaces monorepo (`server` + `client`), app in Spanish (UI strings, types, seed). No test framework; verification = `pnpm check`.

## Commands

- `pnpm dev` — runs `server` (Express, tsx watch, port 3001) and `client` (Vite, port 5173, proxies `/api` → 3001) via concurrently.
- `pnpm check` — the verification gate: `pnpm typecheck` + `pnpm lint` (biome) + `pnpm security:audit`. Run this after any change.
- Single package: `pnpm --filter @cooking/server dev`, etc.
- Dependencies are exact-pinned (`save-exact=true` in `.npmrc`); add with `pnpm add --filter <pkg>`.

## Architecture

- `server/` is the source of truth for all state. Express 5 REST under `/api` (profiles, recipes, pantry, plan, history, shopping, recommendations, settings, tips, themealdb). Routes in `server/src/routes/`, logic in `server/src/services/`.
- State lives in `server/data/db.json`, which **is git-tracked and NOT gitignored**. The server reads it once (`getState()`) and writes atomically (tmp+rename) on a 150ms debounce (`saveState()`). Mutations must go through routes that call `saveState()`.
- Seed: `server/src/data/seed.ts` reads `server/data/recipes.json`; a fresh/corrupt `db.json` is rebuilt from seed. `biome.json` excludes `server/data`, but changing `AppState` means updating `seed.ts`, `db.json`, and both type files (below).
- **Types are duplicated**: `client/src/types.ts` is a hand-copied mirror of `server/src/types.ts`. Any change to server types must be mirrored in the client or it will typecheck-fail.
- TheMealDB integration uses the free public API (no key). Imported recipes get ids `tmdb-<idMeal>` (no collision with local UUID ids).
- `DELETE /api/recipes/:id` cascades: removes the recipe from `weeklyPlan.slots`, `history`, and profile `favoriteRecipeIds`.

## Conventions

- Server is ESM `NodeNext`: relative imports must use the `.js` extension (`import ... from "../db.js"`).
- Biome style: 4-space indent, double quotes, semicolons, 120-col width. Run `pnpm lint`/`biome format` to match.
- Both packages: TypeScript strict. Client has `noUnusedLocals`/`noUnusedParameters` — unused vars fail `typecheck`.
- Day/week keys and meal types use lowercase Spanish identifiers (e.g. `"lunes"`, `"almuerzo"`), defined in `types.ts` with `DAY_LABELS`/`MEAL_LABELS` maps.
- Recipe availability/season logic lives in `server/src/types.ts` (`seasonFit`, `availability`, `normalizeText`).

## Subagent orchestration

When delegating work to subagents via `task`, the parent agent MUST pass explicit context in the prompt. Do NOT assume the subagent knows what to do just by reading files.

### Required context per subagent

| Subagent | Must include in prompt |
|---|---|
| `planner` | Project/feature description, stack, constraints |
| `backend-builder` | Task ID (from `.ai/tasks.md`), relevant files |
| `frontend-builder` | Task ID (from `.ai/tasks.md`), relevant files |
| `test-runner` | Task IDs to validate, which commands to run |
| `browser-qa` | App URL, specific flows/features to test, completed task IDs |
| `fixer` | Report file paths, error details, related task IDs |

### Workflow sequence

1. **Planner** → generates `.ai/tasks.md` with task IDs
2. **Builder** (frontend/backend) → reads task by ID, marks `en_progreso`, implements, marks `completado`
3. **Test-runner** → receives task IDs, runs `pnpm check`, generates validation report
4. **QA** (browser-qa) → receives URL + flows, tests manually, generates QA report
5. **Fixer** → receives report paths + errors, fixes issues, re-runs validation

Each subagent's `.opencode/agents/*.md` file lists the exact context it expects.
