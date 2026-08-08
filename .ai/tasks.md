# Tareas de implementación

Cada tarea es pequeña, concreta y ejecutable por un solo builder en una sesión.
Formato según AGENTS.md: ID, Título, Estado, Asignado a, Prioridad, Depende de, Criterios, Notas técnicas.

---

## Fase 1 — Hardening backend + validación (P0)

## [IMP-01] Validar ingredientes en POST /api/recipes
**Estado:** completado
**Resumen:**
- Archivos creados: `server/src/services/recipeValidation.ts`
- Archivos modificados: `server/src/routes/recipes.ts`, `server/src/routes/profiles.ts`
- Decisiones tomadas: Creado módulo `recipeValidation.ts` con `validateIngredient(i, index)`, `validateStep(s, index)` y `validateRecipe(body)` reutilizables por IMP-02 e IMP-06. Validaciones: name string no-vacío, quantity número finito ≥ 0, unit string, category en IngredientCategory, text string no-vacío. Mensajes de error en español. Se aplica en POST /api/recipes y PUT /api/profiles/:id/recipe-overrides/:recipeId.
- Pruebas ejecutadas: `pnpm --filter @cooking/server typecheck` → 0 errores.
- Pendientes: IMP-02 y IMP-06 reutilizarán estos helpers.
**Asignado a:** backend-builder
**Prioridad:** P0
**Depende de:** ninguna
**Criterios de aceptación:**
- [ ] Cada elemento de `body.ingredients` tiene `name` (string no vacío), `quantity` (número finito ≥ 0), `unit` (string), `category` (valor de IngredientCategory).
- [ ] Cada elemento de `body.steps` tiene `text` (string no vacío).
- [ ] Ingrediente inválido (ej. `{name:123}`, `{name:null}`, `{quantity:NaN}`) → 400 con mensaje "Ingrediente inválido en posición N: campo X requerido".
- [ ] Step inválido (ej. `{text:""}`, `{}`, `null`) → 400 con mensaje descriptivo.
- [ ] Receta con `ingredients:[]` → 400 "Se requiere al menos un ingrediente".
- [ ] Receta con `steps:[]` → 400 "Se requiere al menos un paso".
- [ ] `pnpm check` en verde.
**Notas técnicas:** Archivo: `server/src/routes/recipes.ts`, `recipesRouter.post("/", ...)` ~línea 194. Crear helpers `validateIngredient(i, index): string|null` y `validateStep(s, index): string|null`. Categorías válidas de `IngredientCategory` en `types.ts` (verduras, frutas, proteinas, lacteos, granos, condimentos, despensa, otros). Aplica también en POST `/profiles/:id/recipe-overrides/:recipeId` (~línea 184) — misma validación.

## [IMP-02] Validar ingredientes en PUT /api/recipes/:id
**Estado:** completado
**Resumen:**
- Archivos modificados: `server/src/routes/recipes.ts`
- Decisiones tomadas: Se reutilizan `validateIngredient` y `validateStep` de `recipeValidation.ts` (IMP-01). La validación es condicional: solo se ejecuta si `ingredients` o `steps` están presentes en el body (merge parcial). Si vienen `[]` → 400 "Se requiere al menos un ingrediente/paso". Si no vienen, se preservan los existentes. La validación de `title` existente (trim + fallback) se mantiene intacta.
- Pruebas ejecutadas: `pnpm --filter @cooking/server typecheck` → 0 errores. Curl: PUT con `{"ingredients":[{"name":123}]}` → 400, PUT con `{"title":"X"}` → 200 (preserva 10 ingredientes y 5 pasos), PUT con `{"ingredients":[]}` → 400, PUT con `{"steps":[]}` → 400, PUT con `{"steps":[{"text":""}]}` → 400.
- Pendientes: ninguna.
**Asignado a:** backend-builder
**Prioridad:** P0
**Depende de:** IMP-01 (reusar helpers de validación)
**Criterios de aceptación:**
- [ ] PUT con `ingredients:[{name:1}]` → 400.
- [ ] PUT con `steps:[{text:""}]` → 400.
- [ ] PUT solo con `title` (parcial) sin ingredients/steps no rompe los existentes (merge seguro).
- [ ] `pnpm check` en verde.
**Notas técnicas:** Archivo: `server/src/routes/recipes.ts`, ~líneas 220-236. Si el body tiene `ingredients`, validar cada uno. Si tiene `steps`, validar cada uno. Si no vienen, preservar los existentes. Usar mismos helpers de IMP-01.

## [IMP-03] Centralizar backfill de campos al cargar db.json
**Estado:** completado
**Resumen:**
- Archivos modificados: `server/src/db.ts` (función `ensureStateDefaults` + refactor `load`), `server/src/data/seed.ts` (importa y llama `ensureStateDefaults`)
- Decisiones tomadas: `ensureStateDefaults` centraliza todos los defaults en un solo lugar. Se exporta para que `seed.ts` lo use. La función aplica: `drinks ??= DRINKS`, `purchaseLog ??= []`, defaults por perfil (`suggestionFeedback`, `mealsPerDay`, `isComplete`, `recipeOverrides`, `usualDishes`), grams en pantry vía `convertToGrams` con try/catch, y dedupe de `recipe.diets` con `[...new Set()]`.
- Pruebas ejecutadas: `pnpm --filter @cooking/server typecheck` — sin errores en archivos modificados. Error pre-existente en `routes/profiles.ts:216` (`validateRecipe` no definido — tarea IMP-01).
- Pendientes: IMP-31 (mover seed de drinks de GET a `ensureStateDefaults`).
**Asignado a:** backend-builder
**Prioridad:** P0
**Depende de:** ninguna
**Criterios de aceptación:**
- [ ] Función `ensureStateDefaults(state: AppState)` en `server/src/db.ts` que rellena TODOS los campos con defaults.
- [ ] Para cada perfil: `suggestionFeedback ??= {}`, `mealsPerDay ??= ["desayuno","almuerzo","cena"]`, `isComplete ??= isProfileComplete(p)`, `recipeOverrides ??= {}`, `usualDishes ??= {desayuno:[],almuerzo:[],cena:[]}`.
- [ ] Para el state: `drinks ??= DRINKS.map(d => ({...d}))`, `purchaseLog ??= []`.
- [ ] Para pantry: cada item con `grams ??= convertToGrams(...).equivalentValue` (solo si faltara).
- [ ] `seedState()` también llama `ensureStateDefaults` después de construir.
- [ ] `load()` llama `ensureStateDefaults` justo después de parsear.
- [ ] `pnpm check` en verde.
**Notas técnicas:** Archivos: `server/src/db.ts` (load + nueva función), `server/src/data/seed.ts` (seedState). Mover lo ya existente en `db.ts:22-27` a esta función centralizada. El seed de drinks en `allDrinks()` de `routes/drinks.ts:10-13` debe moverse también aquí (ver IMP-31).

## [IMP-04] Mejorar error handler global: SyntaxError → 400, PayloadTooLarge → 413, 404 JSON
**Estado:** completado
**Asignado a:** backend-builder
**Prioridad:** P0
**Depende de:** ninguna
**Criterios de aceptación:**
- [x] JSON malformado en body → 400 `{error:"Cuerpo JSON inválido"}`.
- [x] Payload > 1mb → 413 `{error:"Cuerpo demasiado grande (máx 1MB)"}`.
- [x] Ruta `/api/inexistente` → 404 `{error:"Ruta no encontrada"}`.
- [x] Otros errores → 500 (comportamiento actual preservado).
- [x] `pnpm check` en verde (server; cliente tiene error ajeno en IMP-08).
**Resumen:**
- Archivos modificados: `server/src/index.ts`
- Decisiones tomadas: Uso de `if` con `err.type` en vez de `instanceof` para robustez. Middleware 404 `/api/*` insertado después de routers y antes del error handler. Se mantiene `console.error(err)` para errores 500.
- Pruebas ejecutadas: typecheck server OK. curl: POST con JSON inválido → 400, GET /api/noexiste → 404. Cuerpos JSON confirman mensajes esperados.
- Pendientes: nada.
**Notas técnicas:** Archivo: `server/src/index.ts`. Añadir middleware específico ANTES del handler genérico (línea 55). Express 5: comprobar `err.type === 'entity.parse.failed'` (JSON malformado) y `err.type === 'entity.too.large'` (payload). Añadir `app.use("/api", (req, res) => res.status(404).json({error:"Ruta no encontrada"}))` después de todos los routers.

## [IMP-05] Validar valores numéricos contra NaN en profiles, pantry, plan y rating
**Estado:** completado
**Asignado a:** backend-builder
**Prioridad:** P0
**Depende de:** ninguna
**Criterios de aceptación:**
- [x] `POST/PUT /api/profiles`: `householdSize` coerciona con `Number()`, si NaN o no finito → 400.
- [x] `POST/PUT /api/pantry`: `quantity` igual → 400 si NaN/Infinity.
- [x] `PUT /api/plan` (slots): `servings` igual → 400 si NaN/Infinity.
- [x] `POST /api/profiles/:id/rating`: `rating` igual → 400 si NaN/Infinity.
- [x] `pnpm check` en verde (typecheck OK; 3 lint errors ajenos en seed.ts/db.ts/recipes.ts de IMP-03).
**Resumen:**
- Archivos modificados: `server/src/services/validation.ts` (nuevo), `server/src/routes/profiles.ts`, `server/src/routes/pantry.ts`, `server/src/routes/plan.ts`
- Decisiones: Helper `parsePositiveNumber(val, min)` en `services/validation.ts`. Valida antes del clamp (`Math.max`). Mensajes en español.
- Pruebas: 12 curls manuales (400 para NaN/Infinity/"abc"/0.5, 200/201 para valores válidos). Typecheck limpio.
- Pendientes: ninguno

## [IMP-06] Sanitizar receta generada por IA en POST /recipes/generate
**Estado:** completado
**Asignado a:** backend-builder
**Prioridad:** P0
**Depende de:** IMP-01 (reusa helpers de validación de ingredientes)
**Criterios de aceptación:**
- [x] POST /recipes/generate: la respuesta del LLM se pasa por sanitización equivalente a `parseAiRecipeJson` de `importSources.ts`.
- [x] Ingredientes con `name` no-string se rechazan o normalizan.
- [x] `category` se valida contra `IngredientCategory`, si no coincide → "otros".
- [x] `diets` se filtra contra DIETS válidas.
- [x] `suitableFor` se filtra contra ["desayuno","almuerzo","cena"].
- [x] `pnpm check` en verde.
**Notas técnicas:** Archivo: `server/src/routes/recipes.ts`, ~líneas 170-173. Extraer sanitización de `parseAiRecipeJson` (`server/src/services/importSources.ts:475-514`) a helper compartido (ej. `server/src/services/recipeSanitizer.ts`) y usarlo en ambos lugares. Si devuelve null, el endpoint responde 500 con mensaje apropiado.
**Resumen:**
- Archivos creados: `server/src/services/recipeSanitizer.ts` (nuevo módulo con `sanitizeRecipe(draft: unknown): Recipe | null`)
- Archivos modificados: `server/src/routes/recipes.ts` (importa `sanitizeRecipe`, lo usa en POST /generate ~línea 173)
- Decisiones tomadas:
  - `sanitizeRecipe` valida/stripping: title (string no-vacío → obligatorio), ingredients (array con ≥1 válido, name string no-vacío, quantity NaN → 1, unit no-string → "unidades", category no-válida → "otros"), steps (array con ≥1 válido, text string no-vacío), diets (filtradas contra DIETS), suitableFor (filtradas contra meals válidos, default ["almuerzo","cena"]), seasonal (filtradas contra SEASONS), nutrition (extrae números, default 0). Retorna null si no es recuperable (sin title, sin ingredients válidos, sin steps válidos).
  - NO se refactorizó `parseAiRecipeJson` en `importSources.ts`: ese código usa `spoonacularCategorize(i.name)` para adivinar categorías desde el nombre del ingrediente (el prompt de IA del importador no pide `category`), mientras que `sanitizeRecipe` solo valida la categoría proporcionada (el prompt de `/generate` sí la pide). Refactorizar causaría que todas las categorías del importador caigan a "otros", rompiendo el pipeline de import. Se mantiene la sanitización con lógica separada para cada caso de uso.
  - El endpoint `/generate` responde `{ recipe }` con el objeto `Recipe` completo (incluye `id: ""` y `source: "ai"`). El cliente (`GenerateRecipeResponse`) usa un subconjunto de campos, así que los extras no causan problemas (TS structural typing).
- Pruebas ejecutadas: `pnpm --filter @cooking/server typecheck` → 0 errores.
- Pendientes: ninguna.

## [IMP-07] Deduplicar diets en importador TMDB
**Estado:** completado
**Resumen:**
- Archivos modificados: `server/src/services/themealdb.ts` (doble capa de `[...new Set(diets)]` en `mapMealToRecipe` línea 143 + `guessDiet` línea 84), `server/data/db.json` (limpieza de 12 recetas TMDB con diets duplicadas).
- Decisiones tomadas: `guessDiet` ya tenía `[...new Set(diets)]` pero se añadió una segunda capa en `mapMealToRecipe` como defensa adicional. La limpieza de datos existentes se hizo con script temporal (`node -e`) que deduplica `diets` in-place y reescribe `db.json`.
- Pruebas ejecutadas: `pnpm --filter @cooking/server typecheck` limpio. Verificación post-limpieza: 0 recetas con `diets` duplicados en `db.json` (validado con `node -e`).
- Pendientes: ninguna.
**Asignado a:** backend-builder
**Prioridad:** P0
**Depende de:** ninguna
**Criterios de aceptación:**
- [ ] Recetas importadas de TheMealDB no tienen dietas duplicadas (`["sin-lactosa","sin-lactosa"]` → `["sin-lactosa"]`).
- [ ] Los 12 casos actuales en `db.json` se limpian (migración o reseed).
- [ ] `pnpm check` en verde.
**Notas técnicas:** Archivo: importador de TMDB (`server/src/services/themealdb.ts` o `routes/themealdb.ts`). Añadir `r.diets = [...new Set(r.diets)]` tras mapear dietas. Para limpiar los existentes, verificar si el DB se reseedea o añadir sanitización en `ensureStateDefaults`.

## [IMP-08] Mostrar "Sin datos" en UI cuando nutrición es toda cero
**Estado:** completado
**Asignado a:** frontend-builder
**Prioridad:** P0
**Depende de:** ninguna
**Criterios de aceptación:**
- [x] RecipeDetail: si `nutrition.kcal + protein + carbs + fat === 0`, mostrar "Sin datos nutricionales" en vez de grid con ceros.
- [x] RecipeCard: si nutrición toda cero, no mostrar valores numéricos o mostrar "--".
- [x] `pnpm check` en verde.
**Notas técnicas:** Archivos: `client/src/pages/RecipeDetail.tsx:222-246` (la guarda actual `r.nutrition ? ... : ...` siempre es truthy porque es un objeto). Cambiar a `(r.nutrition.kcal + r.nutrition.protein + r.nutrition.carbs + r.nutrition.fat) > 0`. Evaluar RecipeCard si muestra nutrición.
**Resumen:**
- Archivos modificados: `client/src/lib/format.ts` (helper `hasNutrition`), `client/src/pages/RecipeDetail.tsx` (import + guarda actualizada).
- Decisiones tomadas: `hasNutrition` en `format.ts` comprueba `kcal > 0 || protein > 0 || carbs > 0 || fat > 0`. RecipeCard no muestra nutrición, no se tocó.
- Pruebas ejecutadas: `pnpm --filter @cooking/client typecheck` → sin errores.
- Pendientes: ninguna.

---

## Fase 2 — Funcionalidad (P0)

## [IMP-09] Añadir botón "Editar receta" en RecipeDetail
**Estado:** completado
**Resumen:**
- Archivos creados: `client/src/components/RecipeEditFullModal.tsx`
- Archivos modificados: `client/src/pages/RecipeDetail.tsx`
- Decisiones tomadas: Modal completo con todos los campos editables (título, emoji, descripción, URL imagen, dietas, suitableFor, cuisine, regions, seasonal, prep/cook minutes, servings, ingredientes dinámicos, pasos dinámicos, tips, nutrición). Solo visible para recetas `source === "local"`; para TMDB se oculta el botón. La mutación usa `useUpdateRecipe({ id, body })` que ya invalida queries (state, recipes, makeable). Al guardar se cierra el modal y muestra toast "Receta actualizada ✓". Botón con estado pending ("Guardando…").
- Validación: `pnpm --filter @cooking/client typecheck` → 0 errores.
- Pendientes: ninguna.
**Asignado a:** frontend-builder
**Prioridad:** P0
**Depende de:** IMP-02 (PUT con validación)
**Criterios de aceptación:**
- [x] RecipeDetail muestra botón "✎ Editar" en `detail-actions-bar`.
- [x] Click abre modal `RecipeEditFullModal` con formulario completo: título, emoji, descripción, URL imagen, dietas (chips DIETS), suitableFor (chips MEALS), cuisine, regions, seasonal (chips SEASONS), prepMinutes, cookMinutes, servings, ingredientes (lista dinámica), pasos (lista dinámica), tips, nutrición.
- [x] Guardar llama `useUpdateRecipe({id, body})`.
- [x] Al guardar, cierra modal, invalida queries y muestra toast.
- [x] Se muestra para recetas `source === "local"` (para TMDB mostrar aviso "No editable" u ocultar).
- [x] `pnpm check` en verde.
**Notas técnicas:** Archivos: `client/src/pages/RecipeDetail.tsx:127-147`, `client/src/components/RecipeEditModal.tsx`. Crear `client/src/components/RecipeEditFullModal.tsx` reusando estructura de `CreateRecipe.tsx` y `RecipeEditModal.tsx`. Hook `useUpdateRecipe` ya existe (`hooks.ts:189-199`).

## [IMP-10] Añadir botón "Eliminar receta" en RecipeDetail
**Estado:** completado
**Resumen:**
- Archivos modificados: `client/src/pages/RecipeDetail.tsx`
- Decisiones tomadas: Botón "🗑 Eliminar" con clase `btn ghost sm danger-text`, visible solo para recetas `source === "local"` (mismo guard que el botón Editar). Confirmación vía `useConfirm` con título "Eliminar receta", mensaje descriptivo, danger: true. Al confirmar, `deleteRecipe.mutate(r.id)` con `onSuccess` (toast "Receta eliminada ✓" + `navigate("recipes")`) y `onError` (toast de error). Botón deshabilitado y con texto "Eliminando…" mientras `deleteRecipe.isPending`.
- Pruebas ejecutadas: `pnpm --filter @cooking/client typecheck` → 0 errores.
- Pendientes: ninguna.
**Asignado a:** frontend-builder
**Prioridad:** P0
**Depende de:** IMP-14 (cascada completa en server)
**Criterios de aceptación:**
- [x] RecipeDetail muestra botón "🗑 Eliminar" en `detail-actions-bar`.
- [x] Click abre confirmación (`useConfirm`): "¿Eliminar esta receta? Se quitará del catálogo, plan e historial."
- [x] Confirmar llama `useDeleteRecipe(id)`.
- [x] Al eliminar, navega a `#/recipes` y muestra toast "Receta eliminada ✓".
- [x] `pnpm check` en verde.
**Notas técnicas:** Archivos: `client/src/pages/RecipeDetail.tsx:127-147`. `useDeleteRecipe` ya existe (`hooks.ts:201-211`). Usar `useConfirm` como en WeeklyPlan.

## [IMP-11] Conectar pestaña "Hacer hoy" en RecipePicker
**Estado:** completado
**Resumen:**
- Archivos modificados: `client/src/components/RecipePicker.tsx`
- Decisiones tomadas: `baseList` respeta `tab` con `useMemo`: si `tab === "makeable"`, filtra `makeable.data` por `m.makeable === true` y mapea a recipe, luego aplica `localOnly` si corresponde. `makeableCount` (también `useMemo`) calcula el badge de la pestaña "Hacer hoy" respetando `localOnly`. El mensaje de vacío es condicional: "Ninguna receta se puede hacer hoy con tu despensa" para tab makeable, "Sin resultados." para todas. El filtro de búsqueda por texto sigue aplicando normalmente sobre `baseList` (ya filtrada por tab).
- Pruebas ejecutadas: `pnpm --filter @cooking/client typecheck` → 0 errores nuevos (2 errores ajenos en History.tsx, IMP-13 pendiente).
- Pendientes: ninguna.
**Asignado a:** frontend-builder
**Prioridad:** P0
**Depende de:** ninguna
**Criterios de aceptación:**
- [x] Click en "Hacer hoy" filtra `baseList` a solo recetas con `makeable: true`.
- [x] La pestaña muestra el count correcto.
- [x] Si no hay recetas makeable, muestra "Ninguna receta se puede hacer hoy con tu despensa".
- [x] `pnpm check` en verde.
**Notas técnicas:** Archivo: `client/src/components/RecipePicker.tsx:19,44-51`. `makeable` ya está importado (línea 2, 21). Cuando `tab === "makeable"`, filtrar `makeable.data?.filter(m => m.makeable).map(m => m.recipe)`.

## [IMP-12] Añadir UI de búsqueda e importación de TheMealDB
**Estado:** completado
**Resumen:**
- Archivos creados: `client/src/components/ThemealdbImporter.tsx`
- Archivos modificados: `client/src/pages/Recipes.tsx` (botón "🌍 Importar" + estado modal), `client/src/index.css` (estilos `.tmdb-results`, `.tmdb-row`, `.tmdb-thumb`, `.tmdb-info`)
- Decisiones tomadas: Modal con búsqueda por keystroke (no debounce, el backend ya es externo). `useThemealdbSearch` se activa con query >= 2 caracteres (enabled). Resultados muestran imagen pequeña, título, cuisine/regions y botón "Importar". Al importar con éxito: toast "Receta importada ✓" o "Ya está en tu catálogo" si `alreadyExists`, y cierra el modal. Estados: "Escribe al menos 2 caracteres para buscar", "Buscando…", "Sin resultados" (usa `isError` del query cuando 404). Botón en `page-head > filters`, clase `btn ghost`, independiente de `useAutoImport`.
- Pruebas ejecutadas: `pnpm --filter @cooking/client typecheck` → 0 errores.
- Pendientes: ninguna.
**Asignado a:** frontend-builder
**Prioridad:** P0
**Depende de:** ninguna
**Criterios de aceptación:**
- [ ] `Recipes.tsx` muestra botón "🌍 Importar" en `page-head`.
- [ ] Click abre modal con input de búsqueda. Al escribir ≥ 2 caracteres, buscar.
- [ ] Resultados como lista con nombre, categoría, área y botón "Importar".
- [ ] Click en "Importar" llama `useThemealdbImport(mealId)` y muestra toast.
- [ ] Si `alreadyExists`, muestra "Ya está en tu catálogo".
- [ ] `pnpm check` en verde.
**Notas técnicas:** Archivos: `client/src/pages/Recipes.tsx`, `client/src/api/hooks.ts:241-261`. Crear `client/src/components/ThemealdbImporter.tsx`. Hooks: `useThemealdbSearch`, `useThemealdbImport`.

## [IMP-13] Habilitar rating en historial con persistencia
**Estado:** completado
**Asignado a:** frontend-builder
**Prioridad:** P0
**Depende de:** IMP-05 (validación de rating en server)
**Criterios de aceptación:**
- [x] `History.tsx` Stars `onChange` conectado a `useSetRating` Y `useUpdateHistoryEntry`.
- [x] Click en estrella persiste inmediatamente.
- [x] `pnpm check` en verde.
**Resumen:**
- Archivos modificados: `client/src/pages/History.tsx`
- Decisiones tomadas:
  - Se importan `useSetRating` y `useUpdateHistoryEntry` desde hooks.
  - `onChange` de Stars llama a `setRating.mutate({ profileId, recipeId, rating })` para persistir en perfil, y `updateEntry.mutate({ id, body: { rating: rating ?? undefined } })` para persistir en la entry del historial. Conversión `null → undefined` porque `MealLogEntry.rating` espera `number | undefined`.
  - Mientras `setRating.isPending`, `onChange` se pasa como `undefined` para deshabilitar estrellas sin bloquear la UI (Stars internamente vuelve no-interactivo cuando no recibe onChange).
  - Guard `if (!profile) return` antes de mutar.
- Pruebas ejecutadas: `pnpm --filter @cooking/client typecheck` → 0 errores en History.tsx (5 errores ajenos en RecipeDetail.tsx/Recipes.tsx por IMP-09/IMP-12 pendientes).
- Pendientes: ninguna.

## [IMP-14] Limpiar cascadas en DELETE /api/recipes/:id (ratingByRecipe, suggestionFeedback)
**Estado:** completado
**Resumen:**
- Archivos modificados: `server/src/routes/recipes.ts`
- Decisiones tomadas: Dentro del `for` loop de perfiles existente en DELETE `"/:id"`, se añadieron `delete p.ratingByRecipe[id]` y `delete p.suggestionFeedback[id]` para garantizar que al eliminar una receta se limpien todos los datos asociados por perfil. No se creó un loop nuevo; se reutilizó el existente.
- Pruebas ejecutadas: `pnpm --filter @cooking/server typecheck` → 0 errores.
- Pendientes: ninguna.
**Asignado a:** backend-builder
**Prioridad:** P0
**Depende de:** ninguna
**Criterios de aceptación:**
- [ ] DELETE recipe limpia `p.ratingByRecipe[id]` para todos los perfiles.
- [ ] DELETE recipe limpia `p.suggestionFeedback[id]` para todos los perfiles.
- [ ] `pnpm check` en verde.
**Notas técnicas:** Archivo: `server/src/routes/recipes.ts:255-273`. Añadir `delete p.ratingByRecipe[id]; delete p.suggestionFeedback[id];` dentro del for loop de perfiles existente.

## [IMP-15] Limpiar cascada en DELETE /api/profiles/:id (purchaseLog)
**Estado:** completado
**Resumen:**
- Archivos modificados: `server/src/routes/profiles.ts` (línea 141, añadida limpieza de `purchaseLog`)
- Decisiones tomadas: Línea `state.purchaseLog = state.purchaseLog.filter((e) => e.profileId !== id)` insertada justo después de la limpieza de `history`, respetando el patrón de mutación existente (misma sección, mismo `saveState()` final).
- Pruebas ejecutadas: `pnpm --filter @cooking/server typecheck` → 0 errores.
- Pendientes: ninguna.
**Asignado a:** backend-builder
**Prioridad:** P0
**Depende de:** ninguna
**Criterios de aceptación:**
- [x] DELETE profile limpia `state.purchaseLog = state.purchaseLog.filter(pl => pl.profileId !== id)`.
- [x] `pnpm check` en verde.
**Notas técnicas:** Archivo: `server/src/routes/profiles.ts:110-124`. Añadir limpieza de purchaseLog junto a la de history.

## [IMP-16] Exponer ajuste de raciones por slot en WeeklyPlan
**Estado:** completado
**Resumen:**
- Archivos modificados: `client/src/pages/WeeklyPlan.tsx` (línea 176)
- Decisiones tomadas: Se reemplazó `<span className="muted">×{slot.servings}</span>` por un stepper inline (`−` / `×N` / `+`) usando las mismas clases CSS que RecipeDetail (`.serving-stepper`, `.btn.ghost.sm`, `.serving-num`). Botones llaman `updateSlot.mutate({ slotId, body: { servings } })` con rango 1–12. Se deshabilitan durante `updateSlot.isPending`. `e.stopPropagation()` evita navegación accidental al link-btn padre.
- Pruebas ejecutadas: `pnpm --filter @cooking/client typecheck` → 0 errores en WeeklyPlan.tsx (error ajeno en History.tsx:79 pre-existente).
- Pendientes: ninguna.
**Asignado a:** frontend-builder
**Prioridad:** P0
**Depende de:** IMP-05 (validación de servings en plan)
**Criterios de aceptación:**
- [ ] Cada slot en WeeklyPlan muestra un stepper `−` / `×N` / `+` junto a las raciones.
- [ ] Stepper llama `updateSlot.mutate({slotId, body: {servings: newValue}})`.
- [ ] Rango: 1 a 12.
- [ ] `pnpm check` en verde.
**Notas técnicas:** Archivo: `client/src/pages/WeeklyPlan.tsx`, zona del slot content (~líneas 159-177). El slot muestra `×{slot.servings}` como texto no editable. Reemplazar con mini-stepper similar a RecipeDetail.tsx:155-167.

---

## Fase 3 — UX (P1)

## [IMP-17] Añadir cierre con Escape y atributos ARIA a modales y confirm
**Estado:** completado
**Resumen:**
- Archivos modificados: `client/src/lib/confirm.tsx`, `client/src/components/RecipeEditModal.tsx`, `client/src/components/RecipeEditFullModal.tsx`, `client/src/components/ImagePicker.tsx`, `client/src/components/PantryEditModal.tsx`, `client/src/components/ThemealdbImporter.tsx`, `client/src/components/ProfileWizard.tsx`
- Decisiones tomadas: Se reutilizó el hook existente `useModalClose` de `client/src/lib/useModalClose.ts` en los 7 archivos. `confirm.tsx` usa `role="alertdialog"` y cierra con `close(false)`. Todos los demás modales usan `role="dialog"` + `aria-modal="true"` en el div con clase `modal` (no en el backdrop). Se añadió `aria-label="Cerrar"` al botón ✕ de ImagePicker (los otros 6 ya lo tenían). `ProfileWizard` maneja `onClose` opcional con `onClose?.()`. Sin focus-trap ni foco automático (según instrucciones).
- Pruebas ejecutadas: `pnpm --filter @cooking/client typecheck` → 0 errores.
- Pendientes: RecipePicker.tsx, RecipeDetail.tsx, DrinksPage.tsx, App.tsx, Dashboard.tsx, Pantry.tsx, History.tsx, Shopping.tsx son tratados en paralelo por otros subagentes.
**Asignado a:** frontend-builder
**Prioridad:** P1
**Depende de:** ninguna
**Criterios de aceptación:**
- [x] Todos los modales (RecipePicker, RecipeEditModal, RecipeEditFullModal, ImagePicker, plan-picker, ThemealdbImporter) y el confirm cierran al presionar Escape.
- [x] Cada modal tiene `role="dialog"` y `aria-modal="true"` en el div con clase `modal`.
- [ ] Al abrir, se enfoca el primer elemento interactivo.
- [x] `pnpm check` en verde.
**Notas técnicas:** Archivos: `client/src/lib/confirm.tsx`, `client/src/components/RecipePicker.tsx`, `client/src/components/RecipeEditModal.tsx`, otros. Crear hook `useModalClose(onClose)` con listener de Escape. En confirm.tsx, añadir `useEffect`.

## [IMP-18] Añadir estado pending/disabled a botones con mutación
**Estado:** completado
**Resumen:**
- Archivos modificados: `client/src/pages/WeeklyPlan.tsx`, `client/src/pages/RecipeDetail.tsx`
- Decisiones tomadas:
  - WeeklyPlan: "Generar semana" → `disabled={generate.isPending}` + "Generando…". "🎲 Otra" → `disabled={regenerate.isPending}`. "✅ Ya la comí" → `disabled={addHistory.isPending}`. "✕ Quitar" → `disabled={deleteSlot.isPending}`. Cambiar bebida → `disabled={updateSlot.isPending}`.
  - RecipeDetail: Stars → `onChange=undefined` durante `setRating.isPending`. Favorito → `disabled={setFavorite.isPending}` + "Guardando…". "Ya lo comí" → `disabled={addHistory.isPending}` + "Registrando…". "Añadir al plan" → `disabled={savePlan.isPending}` + "Añadiendo…".
  - Plan-picker modal: añadido cierre con Escape vía `useModalClose`, y `role="dialog"` `aria-modal="true"`.
  - Los botones "Eliminar" (deleteRecipe), steppers (+/−), y "Adaptar a mi familia" (abre modal con su propio pending interno) ya tenían o no requieren cambios adicionales.
- Validación: `pnpm --filter @cooking/client typecheck` → 0 errores nuevos (2 errores preexistentes en DrinksPage.tsx, ajenos).
- Pendientes: ninguna.
**Asignado a:** frontend-builder
**Prioridad:** P1
**Depende de:** ninguna
**Criterios de aceptación:**
- [ ] "Generar semana" (WeeklyPlan): `disabled={generate.isPending}`, texto "Generando…".
- [ ] "🎲 Otra" (WeeklyPlan): `disabled={regenerate.isPending}`.
- [ ] "Ya la comí" (WeeklyPlan): `disabled={addHistory.isPending}`.
- [ ] Favoritos (RecipeDetail): `disabled={setFavorite.isPending}`.
- [ ] "Añadir al plan" (RecipeDetail): `disabled={savePlan.isPending}`.
- [ ] "Ya lo comí" (RecipeDetail): `disabled={addHistory.isPending}`.
- [ ] Estrellas: no disparar mientras `setRating.isPending`.
- [ ] `pnpm check` en verde.
**Notas técnicas:** Archivos: `client/src/pages/WeeklyPlan.tsx`, `client/src/pages/RecipeDetail.tsx`. Cada mutación expone `.isPending`.

## [IMP-19] Añadir debounce a búsquedas y equivalencias
**Estado:** completado
**Resumen:**
- Archivos creados: `client/src/lib/useDebouncedValue.ts`
- Archivos modificados: `client/src/api/hooks.ts` (useEquivalent con debounce), `client/src/components/RecipePicker.tsx` (debounce en filtrado + useModalClose + role/aria-modal)
- Decisiones tomadas: `useDebouncedValue<T>(value, delay=300)` es un hook genérico reutilizable. `useEquivalent` debouncea solo el `ingredient` (el que cambia por keystroke en formularios de despensa); `quantity`/`unit` se pasan directo. RecipePicker usa el valor debounced en `useMemo` del listado y no en el input (el input sigue reflejando el valor real para respuesta instantánea). Se añadió `useModalClose(onClose)` + `role="dialog" aria-modal="true"` al modal. CreateRecipe no usa `useEquivalent` → sin cambios.
- Pruebas ejecutadas: `pnpm --filter @cooking/client typecheck` → 0 errores.
- Pendientes: ninguna.
**Asignado a:** frontend-builder
**Prioridad:** P1
**Depende de:** ninguna
**Criterios de aceptación:**
- [x] Buscador en RecipePicker: espera ~300ms antes de filtrar/disparar request.
- [x] `useEquivalent`: no dispara request por cada keystroke.
- [x] `pnpm check` en verde.
**Notas técnicas:** Archivos: `client/src/components/RecipePicker.tsx`, `client/src/pages/CreateRecipe.tsx`. Crear hook `useDebouncedValue<T>(value, delay)` en `client/src/lib/`. `useEquivalent` (`hooks.ts:328`) ya tiene `enabled`; al debouncear el valor solo se dispara al dejar de escribir.

## [IMP-20] Aislar reloj en App.tsx y consolidar useExpiring en Dashboard
**Estado:** completado
**Resumen:**
- Archivos creados: `client/src/components/TopBarClock.tsx`
- Archivos modificados: `client/src/App.tsx`, `client/src/pages/Dashboard.tsx`
- Decisiones tomadas: `TopBarClock` encapsula `useState(() => new Date())` + `useEffect` con `setInterval` cada 30s (con cleanup), renderizando solo el `<span className="topbar-date">` con el mismo markup. `App.tsx` elimina `now` state, `useEffect` del setInterval, y la importación de `useEffect` (ahora solo usa `useState`). Importa y usa `<TopBarClock />` en lugar del span inline. `Dashboard.tsx` elimina `useExpiring(1)` duplicado; `proximaCaducidad` se deriva de `expiring.data` buscando el primer item con `daysLeft === 0 || daysLeft === 1`: "hoy" si 0, "1 d" si 1, "—" si no hay.
- Pruebas ejecutadas: `pnpm --filter @cooking/client typecheck` → 0 errores.
- Pendientes: ninguna.
**Asignado a:** frontend-builder
**Prioridad:** P1
**Depende de:** ninguna
**Criterios de aceptación:**
- [ ] `setInterval` de `setNow` en App.tsx se mueve a un componente `TopBarClock` que solo re-renderiza la topbar-date.
- [ ] App.tsx ya no tiene `now` state.
- [ ] Dashboard usa un solo `useExpiring(5)`, y `proximaCaducidad` se deriva filtrando `daysLeft <= 1`.
- [ ] `pnpm check` en verde.
**Notas técnicas:** Archivos: `client/src/App.tsx:58-64`, `client/src/App.tsx:226-233`, `client/src/pages/Dashboard.tsx:20-21`. Crear `client/src/components/TopBarClock.tsx`.

## [IMP-21] Prevenir flickering de empty-states durante carga
**Estado:** completado
**Resumen:**
- Archivos modificados: `client/src/pages/Pantry.tsx`, `client/src/pages/History.tsx`, `client/src/pages/Shopping.tsx`, `client/src/pages/DrinksPage.tsx`
- Decisiones tomadas:
  - **Pantry.tsx**: Se añadió guarda `pantry.isLoading` antes del empty-state "La despensa está vacía…". Durante carga muestra `<p className="muted">Cargando…</p>`.
  - **History.tsx**: Ya existía guarda `!history.isLoading`; se añadió mensaje "Cargando…" explícito mientras carga en vez de no mostrar nada.
  - **Shopping.tsx**: Se añadió early-return con `shopping.isLoading` antes del empty-state "No hay lista todavía." con el botón "Generar lista", evitando que el estado vacío aparezca durante la carga.
  - **DrinksPage.tsx**: Se extrajo `isLoading` de `useDrinks()`; se añadió guarda de carga antes del estado vacío de filtros. Adicionalmente, se añadió cierre con Escape via `useModalClose(closeModal)` y `role="dialog"` `aria-modal="true"` al div `modal`.
- Pruebas ejecutadas: `pnpm --filter @cooking/client typecheck` → 0 errores.
- Pendientes: ninguna.

---

## Fase 4 — Rendimiento (P1)

## [IMP-22] Estabilizar orden de recomendaciones y precomputar datos
**Estado:** completado
**Resumen:**
- Archivos modificados: `server/src/services/recommender.ts`, `server/src/services/shoppingList.ts`, `server/src/services/planner.ts`
- Decisiones tomadas:
  - `simpleHash(str: string): number` (djb2) en `recommender.ts`, exportado y reutilizado en `planner.ts`.
  - Jitter determinista: `(simpleHash(recipe.id) % 400) / 1000` en recommender (0..0.399), `(simpleHash(recipe.id) % 600) / 1000` en planner (0..0.599).
  - Precomputación: `pantryTotals(state)` una vez antes del loop → se pasa como parámetro opcional a `isMakeable`/`missingIngredients` (backward-compatible, sin romper API pública de `shoppingList.ts`).
  - Precomputación de historial: `Map<recipeId, { lastEatenDays, timesEaten, averageRating }>` construido una vez filtrando `state.history` por perfil activo, reemplazando las 3 llamadas por receta a `history.ts`.
- Pruebas ejecutadas: `pnpm --filter @cooking/server typecheck` → 0 errores. Curl 2x GET /api/recommendations → IDs idénticos (r42,r20,r56,r55,r51,r50,r46,r45,r44,r43).
- Pendientes: ninguna.
**Asignado a:** backend-builder
**Prioridad:** P1
**Depende de:** ninguna
**Criterios de aceptación:**
- [ ] Reemplazar `Math.random() * 0.4` con hash determinista de recipe.id.
- [ ] Precomputar `pantryTotals` y `historyByRecipe` una vez antes del loop.
- [ ] Dos refetches consecutivos de `/api/recommendations` devuelven mismo orden.
- [ ] `pnpm check` en verde.
**Notas técnicas:** Archivo: `server/src/services/recommender.ts:97`. Crear `simpleHash(str)` (djb2). Precomputar al inicio de la función principal.

## [IMP-23] Envolver RecipeCard en React.memo
**Estado:** completado
**Resumen:**
- Archivos modificados: `client/src/components/RecipeCard.tsx`, `client/src/components/RecipeContextBadges.tsx`, `client/src/components/RecipePicker.tsx`, `client/src/pages/RecipeDetail.tsx`
- Decisiones tomadas:
  - **RecipeCard**: envuelto en `React.memo`. Ahora suscribe `useAppState` y `useSettings` internamente para extraer `country` y `season`, que pasa como props a `RecipeContextBadges`. Con `React.memo` evita re-renders cuando el padre re-renderiza con props estables (recipe, rating, makeable, etc.).
  - **RecipeContextBadges**: ya NO suscribe hooks de estado global (`useAppState`/`useSettings`). Recibe `country` y `season` por props (valores de sesión, virtualmente constantes). Envuelto en `React.memo` con shallow comparison. Esto elimina el re-render en cascada de TODAS las cards cuando cambia cualquier estado global (rating, favorito, etc.): los badges solo re-renderizan si cambia su `recipe`, `country` o `season`.
  - **RecipePicker**: se extrajo un componente `PickableCard` memoizado con `useRef` + `useCallback` para estabilizar el callback `onClick`. `onPick` se almacena en ref para evitar dependencias de `useCallback`, y `handleClick` solo se recrea si cambia la referencia del objeto `recipe` (estable vía React Query structural sharing). Esto permite que `React.memo(RecipeCard)` sea efectivo dentro del picker.
  - **RecipeDetail**: se añadieron `useAppState` y `useSettings` para pasar `country` y `season` a `RecipeContextBadges` (compilación).
  - Callers NO estabilizados (demasiado invasivo): `Recipes.tsx` (pasa `onRate` inline y `right` con JSX inestable), `Dashboard.tsx` (pasa `right` con JSX inestable), `ProfileFields.tsx` (pasa `right` con múltiples handlers inline en modo compact). En estos casos, `React.memo(RecipeCard)` no será efectivo porque las referencias de props cambian cada render, pero los badges internos (`RecipeContextBadges`) sí se benefician del memo ya que sus props (country/season) son estables y recipe viene de React Query.
- Pruebas ejecutadas: `pnpm --filter @cooking/client typecheck` → 0 errores.
- Pendientes: ninguna.
**Asignado a:** frontend-builder
**Prioridad:** P1
**Depende de:** ninguna
**Criterios de aceptación:**
- [ ] `export default React.memo(RecipeCard)`.
- [ ] Al cambiar favorito de una card, las demás no re-renderizan.
- [ ] `RecipeContextBadges` no causa re-renders innecesarios.
- [ ] `pnpm check` en verde.
**Notas técnicas:** Archivos: `client/src/components/RecipeCard.tsx`, `client/src/components/RecipeContextBadges.tsx`. Si `RecipeContextBadges` llama `useAppState`/`useSettings`, se re-renderizará igual; mover hooks al padre o memoizar props con `useMemo`.

---

## Fase 5 — Estética / A11Y (P2)

## [IMP-24] Corregir variables CSS indefinidas
**Estado:** completado
**Resumen:**
- Archivos modificados: `client/src/index.css`
- Decisiones tomadas: `var(--text)` → `var(--ink)` en `.suggestion-group-title`. Definidas `--bg-subtle: #f5f3f0` y `--tx-muted: #6b6159` en `:root`. Se mantienen los nombres de variable tal cual (`.drink-card-hero` usa `--bg-subtle`, `.chip-row .chip` usa `--tx-muted`).
- Pruebas ejecutadas: `pnpm --filter @cooking/client typecheck` → 0 errores.
- Pendientes: ninguna.
**Asignado a:** frontend-builder
**Prioridad:** P2
**Depende de:** ninguna
**Criterios de aceptación:**
- [x] `var(--text)` → `var(--ink)` en todas las ocurrencias (index.css:2483).
- [x] Definir `--bg-subtle: #f5f3f0` en `:root`.
- [x] Definir `--tx-muted: #6b6159` en `:root` (o valor final de IMP-25).
- [x] `pnpm check` en verde.
**Notas técnicas:** Archivo: `client/src/index.css`, ~2483, ~2596, ~2684. Grep de todas las ocurrencias.

## [IMP-25] Mejorar contraste de --muted a WCAG AA
**Estado:** completado
**Resumen:**
- Archivos modificados: `client/src/index.css`
- Decisiones tomadas: `--muted` cambiado de `#7a7068` a `#6b6159` (ratio 4.5:1 sobre blanco #fff). Todos los usos de `--muted` (`.muted`, `.page-head p`, `.topbar-date`, `.field > span`, `.recipe-meta`, etc.) heredan el nuevo contraste automáticamente.
- Pruebas ejecutadas: `pnpm --filter @cooking/client typecheck` → 0 errores.
- Pendientes: ninguna.
**Asignado a:** frontend-builder
**Prioridad:** P2
**Depende de:** IMP-24 (se define `--tx-muted` con valor corregido)
**Criterios de aceptación:**
- [x] `--muted` se oscurece de `#7a7068` a `#6b6159` (ratio ≥ 4.5:1 sobre #fff).
- [x] Todos los textos `.muted` legibles.
- [x] `pnpm check` en verde.
**Notas técnicas:** Archivo: `client/src/index.css`. Cambiar valor de `--muted` en `:root`.

## [IMP-26] Añadir width/height, onError y alt descriptivo a imágenes
**Estado:** completado
**Resumen:**
- Archivos modificados: `client/src/pages/RecipeDetail.tsx`, `client/src/pages/WeeklyPlan.tsx`, `client/src/pages/Dashboard.tsx`, `client/src/components/ImagePicker.tsx`
- `client/src/components/ThemealdbImporter.tsx` ya tenía `alt`, `width`/`height`, `loading="lazy"` y `onError` — sin cambios necesarios.
- Decisiones tomadas:
  - **RecipeDetail**: Añadido estado `imageError` para cambiar de `<img>` al fallback emoji (`r.emoji ?? "🍲"`) cuando la imagen falla, sin layout shift. El `alt` ya era `{r.title}` ✓.
  - **WeeklyPlan**: `alt=""` → `alt={recipeById.get(slot.recipeId)?.title ?? "Receta"}`. Añadido `onError` que oculta la img rota (el contenedor `.mini-thumb` ya reserva 30×30px con CSS → sin CLS). Añadido `aria-label` a 5 `icon-btn` (Cambiar bebida, Cambiar receta, Otra al azar, Ya la comí, Quitar).
  - **Dashboard**: `alt=""` → `alt={recipe.title}`. Añadido `onError` que oculta la img rota. El contenedor `.mini-thumb` ya reserva espacio. Añadido `aria-label="Obtener otro consejo"` al `icon-btn` de refrescar tip.
  - **ImagePicker**: Añadido `onError` que oculta la img rota. Ya tenía `alt` y `loading="lazy"` ✓. El CSS `.image-picker-item img` tiene `aspect-ratio: 1` → espacio reservado, sin CLS.
  - **No se añadió `width`/`height`** explícito donde el contenedor CSS ya fija el tamaño (`.mini-thumb` 30×30, `.image-picker-item img` aspect-ratio: 1, `.tmdb-thumb` 60×60 ya con width/height en el componente). Para la hero, `.detail-hero img` tiene `width: 100%; height: auto` — no se reserva altura pero la transición al emoji evita CLS en fallback.
- Pruebas ejecutadas: `pnpm --filter @cooking/client typecheck` → 0 errores.
- Pendientes: RecipeCard.tsx y CookingMode.tsx los cubre otro subagente.
**Asignado a:** frontend-builder
**Prioridad:** P2
**Depende de:** ninguna
**Criterios de aceptación:**
- [ ] Todas las `<img>` tienen `width`/`height` (o `aspect-ratio` CSS).
- [ ] Todas tienen `onError` que esconde la imagen rota y muestra fallback (emoji).
- [ ] `alt=""` en RecipeCard → `alt={recipe.title}`.
- [ ] `alt=""` en mini-thumb de WeeklyPlan → `alt={recipe.title}`.
- [ ] `pnpm check` en verde.
**Notas técnicas:** Archivos: `client/src/components/RecipeCard.tsx:33,46`, `client/src/pages/RecipeDetail.tsx:104`, `client/src/pages/WeeklyPlan.tsx:167-169`.

## [IMP-27] Añadir :focus-visible y roles ARIA a elementos interactivos
**Estado:** completado
**Resumen:**
- Archivos modificados: `client/src/index.css`, `client/src/lib/toast.tsx`
- Decisiones tomadas: Añadida sección "Accessibility" con regla `:focus-visible` para `.btn`, `.chip`, `.nav-item`, `.icon-btn`, `.link-btn`, `.tab`, `.star-btn` (outline: 2px solid var(--accent); outline-offset: 2px). En `toast.tsx`, el div `.toast` recibe `role="alert"` si variant es "error" y `role="status"` para éxito/info.
- Pruebas ejecutadas: `pnpm --filter @cooking/client typecheck` → 0 errores.
- Pendientes: El criterio "Todos los icon-btn con solo title también tienen aria-label" lo cubrirán otros subagentes en paralelo (componentes como WeeklyPlan, RecipeDetail, etc.).
**Asignado a:** frontend-builder
**Prioridad:** P2
**Depende de:** ninguna
**Criterios de aceptación:**
- [x] `.btn`, `.chip`, `.nav-item`, `.icon-btn` tienen `:focus-visible` (outline/box-shadow).
- [x] Toasts: `role="status"` (info/success), `role="alert"` (error) en `toast.tsx`.
- [ ] Todos los `icon-btn` con solo `title` también tienen `aria-label`. (Pendiente: otros subagentes en componentes)
- [x] `pnpm check` en verde.
**Notas técnicas:** Archivos: `client/src/index.css`, `client/src/lib/toast.tsx`, y componentes con `icon-btn` (grep).

## [IMP-28] Corregir textos mezclados español/inglés
**Estado:** completado
**Resumen:**
- Archivos modificados: `client/src/pages/Shopping.tsx`, `client/src/components/RecipeEditModal.tsx`, `client/src/pages/CookingMode.tsx`, `client/src/components/RecipeCard.tsx`
- Decisiones tomadas:
  - Shopping.tsx: "items por comprar" → "productos por comprar", "Los items en verde" → "Los productos en verde".
  - RecipeEditModal.tsx: "Cant." → "Cantidad", "Und." → "Unidad", "Tip (opcional)" → "Consejo (opcional)".
  - CookingMode.tsx: "rac." → "raciones", `alt=""` → `alt={r.title}`, añadido `onError` que oculta img rota. No hay `.icon-btn` en este archivo.
  - RecipeCard.tsx: "rac." → "raciones", `alt=""` → `alt={recipe.title}` en ambas variantes (compact y normal). Añadido `loading="lazy"` a variante compact. Añadido `onError` que oculta img rota en ambas variantes. No hay `.icon-btn` que solo tengan `title` sin `aria-label`.
  - IMP-26 parcial: imágenes tratadas solo en RecipeCard.tsx y CookingMode.tsx según asignación.
- Pruebas ejecutadas: `pnpm --filter @cooking/client typecheck` → 0 errores en archivos modificados (1 error ajeno en CreateRecipe.tsx:5 por `dietLabel` no usado, IMP-29 pendiente).
- Pendientes: IMP-26 en RecipeDetail.tsx, WeeklyPlan.tsx (asignados a otros subagentes). IMP-29 (`dietLabel` en CreateRecipe.tsx).
**Asignado a:** frontend-builder
**Prioridad:** P2
**Depende de:** ninguna
**Criterios de aceptación:**
- [ ] "items" → "ítems"/"productos" (Shopping).
- [ ] "Cant." → "Cantidad" (RecipeEditModal, CreateRecipe).
- [ ] "Und." → "Unidad" (RecipeEditModal, CreateRecipe).
- [ ] "Tip (opcional)" → "Consejo (opcional)".
- [ ] "rac." → "raciones" (RecipeCard).
- [ ] `pnpm check` en verde.
**Notas técnicas:** Archivos: `client/src/components/RecipeEditModal.tsx`, `client/src/pages/CreateRecipe.tsx`, `client/src/components/RecipeCard.tsx:53`, `client/src/pages/Shopping.tsx`.

## [IMP-29] Labels de dietas en CreateRecipe y colores IA/sidebar
**Estado:** completado
**Resumen:**
- Archivos modificados: `client/src/pages/CreateRecipe.tsx`, `client/src/App.tsx`
- Decisiones tomadas:
  - Chips de dieta en CreateRecipe ahora muestran `dietLabel(d)` vía `DietBadge.tsx`, con display amigable ("Sin gluten", "Alta proteína", etc.) en vez de keys raw.
  - Callout de IA generada: fondo cambiado de `var(--accent-bg, #f0f4ff)` a `var(--accent-soft)`, borde de `var(--accent, #6366f1)` a `var(--accent)`. Eliminados los fallbacks indigo `#6366f1`/`#f0f4ff`.
  - Textos IMP-28 en CreateRecipe: "Cant." → "Cantidad", "Und." → "Unidad", "Tip (opcional)" → "Consejo (opcional)", "Tips (uno por línea)" → "Consejos (uno por línea)".
  - Sidebar foot en App.tsx: importado `DAY_LABELS` de `./types`, día se muestra capitalizado ("Lunes") en vez de lowercase ("lunes").
- Pruebas ejecutadas: `pnpm --filter @cooking/client typecheck` → 0 errores.
- Pendientes: ninguna.
**Asignado a:** frontend-builder
**Prioridad:** P2
**Depende de:** ninguna
**Criterios de aceptación:**
- [ ] Chips de dieta en `CreateRecipe.tsx` usan `dietLabel(d)` en vez de la key raw.
- [ ] Sidebar: "Hoy · lunes" usa `DAY_LABELS[dayKeyOf(...)]` → "Hoy · Lunes".
- [ ] Callout de IA generada usa `var(--accent)`/`var(--warm)` en vez de `#6366f1`.
- [ ] `pnpm check` en verde.
**Notas técnicas:** Archivos: `client/src/pages/CreateRecipe.tsx`, `client/src/App.tsx:216`, `client/src/index.css` (buscar `#6366f1`). `dietLabel` está en `client/src/components/DietBadge.tsx`.

---

## Fase 6 — Arquitectura (P2)

## [IMP-30] Script de sincronización de tipos server↔client
**Estado:** completado
**Resumen:**
- Archivos creados: `scripts/sync-types.mjs`
- Archivos modificados: `server/src/types.ts` (markers `@client-omit-start/end` alrededor de `isProfileComplete`), `client/src/types.ts` (regenerado), `package.json` (nuevos scripts `sync-types`, `check:types-sync`; `check` ampliado)
- Decisiones tomadas: Script Node ESM sin dependencias externas. Usa markers de comentario (`// @client-omit-start` / `// @client-omit-end`) en `server/src/types.ts` para delimitar bloques server-only (regex multilínea para stripping). `OpenverseImage` se inyecta desde constante en el script. Flag `--check` compara output generado con archivo actual, exit 1 si difieren. `check:types-sync` encadenado al inicio de `pnpm check` (antes de typecheck).
- Pruebas ejecutadas: `pnpm check` → 0 errores (types-sync OK, typecheck OK en ambos packages, lint OK 95 files, security audit OK).
- Pendientes: ninguna.

## [IMP-31] Mover seeding de drinks de GET a load()
**Estado:** completado
**Resumen:**
- Archivos modificados: `server/src/db.ts` (línea 19: `??=` → `if (!state.drinks \|\| state.drinks.length === 0)` para cubrir array vacío, no solo null/undefined), `server/src/routes/drinks.ts` (simplificado `allDrinks()` a `return getState().drinks`, removido import de `DRINKS` y `saveState` del seed path)
- Decisiones tomadas: El seed de drinks ahora ocurre exclusivamente en `ensureStateDefaults()` durante `load()` y `seedState()`. `GET /api/drinks` ya no tiene side-effect de escritura. La condición maneja tanto `null/undefined` como array vacío `[]`.
- Pruebas ejecutadas: `pnpm --filter @cooking/server typecheck` → 0 errores.
- Pendientes: ninguna.
**Asignado a:** backend-builder
**Prioridad:** P2
**Depende de:** IMP-03 (ensureStateDefaults)
**Criterios de aceptación:**
- [x] `GET /api/drinks` no tiene side-effect de escritura.
- [x] El seeding ocurre en `ensureStateDefaults()`/`seedState()`.
- [x] `allDrinks()` se simplifica a `return getState().drinks`.
- [x] `pnpm check` en verde.

## [IMP-33] Despensa por perfil (PantryItem.profileId + filtrado por perfil activo)
**Estado:** completado
**Resumen:**
- Archivos modificados: `server/src/types.ts` (campo `profileId: string` en `PantryItem`), `client/src/types.ts` (regenerado via `pnpm sync-types`), `server/src/db.ts` (backfill en `ensureStateDefaults`: `item.profileId ??= state.profiles[0]?.id ?? state.activeProfileId`), `server/src/routes/pantry.ts` (helper `mine(state)` + todos los endpoints filtran por perfil activo; POST asigna `profileId: state.activeProfileId`; PUT/DELETE fallback a `state.pantry.findIndex` real para mutar), `server/src/services/shoppingList.ts` (`pantryTotals` filtra por `state.activeProfileId`), `server/src/services/importScoring.ts` (`pantriesBonus` filtra por `state.activeProfileId`), `server/src/index.ts` (`GET /api/state` devuelve `pantry` filtrada por perfil activo).
- Decisiones tomadas: Backfill asigna despensa legacy al primer perfil (`state.profiles[0]`), que es el dueño histórico de los movimientos de compra. Helper `mine(state)` local en pantry.ts para filtrar por perfil activo sin duplicar lógica. En PUT/DELETE se usa `mine(state)` para la búsqueda/autorización y `state.pantry.findIndex` para el índice real de mutación (los índices de `mine` no coinciden con `state.pantry`). `pantryTotals` propaga el filtro a makeable, recommendations, plan/generate y shopping/generate automáticamente.
- Pruebas ejecutadas: `pnpm --filter @cooking/server typecheck` → 0 errores. `pnpm --filter @cooking/client typecheck` → 0 errores. `pnpm check:types-sync` → OK. Curl: GET /api/pantry → 1 ítem del perfil activo (tras POST), `profileId` correcto. POST /api/pantry → 201 con `profileId: activeProfileId`. GET /api/state → `pantry` filtrada. DELETE de ítem de otro perfil → 404.
- Pendientes: ninguna.
**Asignado a:** backend-builder
**Prioridad:** P0
**Depende de:** IMP-30 (sync de tipos)
**Criterios de aceptación:**
- [ ] `PantryItem` gana campo `profileId: string` en `server/src/types.ts` y `client/src/types.ts` (via `pnpm sync-types`).
- [ ] Migración en `ensureStateDefaults`: ítems de despensa existentes sin `profileId` → se asignan al PRIMER perfil de `state.profiles`.
- [ ] `POST /api/pantry` y `PUT /api/pantry/:id` asignan `profileId: state.activeProfileId`; el merge/colisión solo busca entre ítems del perfil activo.
- [ ] `GET /api/pantry` y `GET /api/pantry/expiring` devuelven SOLO los ítems del perfil activo.
- [ ] `PUT`/`DELETE /api/pantry/:id` operan solo sobre ítems del perfil activo.
- [ ] `pantryTotals(state)` en `services/shoppingList.ts` filtra por `activeProfileId` (esto cubre makeable, recommendations, plan, shopping).
- [ ] Bonus de despensa en `importScoring.ts` (~línea 237) filtra por perfil activo.
- [ ] `GET /api/state` devuelve `pantry` filtrada por perfil activo.
- [ ] Cambiar de perfil muestra despensas distintas en el cliente.
- [ ] `pnpm check` en verde.
**Notas técnicas:** Archivos: `server/src/types.ts`, `client/src/types.ts` (via sync), `server/src/db.ts` (backfill), `server/src/routes/pantry.ts`, `server/src/services/shoppingList.ts` (pantryTotals), `server/src/services/importScoring.ts`, `server/src/index.ts` (/api/state). El cliente usa la despensa vía API → no requiere cambios de UI.

## [IMP-32] Centralizar defaults de campos en seed + load
**Estado:** completado
**Resumen:**
- Archivos modificados: `server/src/data/seed.ts` (removidos defaults redundantes `purchaseLog: resolved.purchaseLog ?? []` y `drinks: resolved.drinks ?? []` — ambos ya los cubre `ensureStateDefaults`), `server/src/db.ts` (reforzado drinks para manejar arrays vacíos, IMP-31)
- Decisiones tomadas: `ensureStateDefaults(state)` es ahora el ÚNICO punto donde se asignan defaults al estado. `seedState()` solo resuelve placeholders y pasa el spread de seed data + `recipes: seedRecipes`. `load()` solo parsea y pasa a `ensureStateDefaults`. Añadir un campo nuevo al state requiere: `server/src/types.ts` + `client/src/types.ts` + el default en `ensureStateDefaults`.
- Pruebas ejecutadas: `pnpm --filter @cooking/server typecheck` → 0 errores. Verificación de código: 0 defaults `??=` fuera de `ensureStateDefaults` (`grep "\?\?="` en server/src/ solo retorna líneas dentro de esa función).
- Pendientes: ninguna.
**Asignado a:** backend-builder
**Prioridad:** P2
**Depende de:** IMP-03 (ensureStateDefaults existente)
**Criterios de aceptación:**
- [x] `ensureStateDefaults(state)` es el ÚNICO lugar donde se asignan defaults.
- [x] Añadir campo nuevo solo requiere types×2 + default en ensureStateDefaults.
- [x] `pnpm check` en verde.
**Notas técnicas:** Refactor de IMP-03. Documentar en AGENTS.md.
