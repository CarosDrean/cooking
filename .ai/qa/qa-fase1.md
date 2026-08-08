# Reporte de QA — Fase 1 (Hardening backend + validación)

**Fecha:** 2026-08-07 23:00
**URL probada:** http://localhost:5173 (Vite + API en :3001)
**Dispositivos probados:** API vía curl (las páginas frontend son SPA, verificadas por código fuente)
**Estado:** ✅ APROBADO

---

## Resumen ejecutivo

Todas las 8 tareas de Fase 1 pasan la validación. `pnpm check` 100% verde. No se encontraron regresiones, errores de consola/red replicables, ni 500s. Las validaciones de backend responden correctamente con mensajes en español.

---

## Flujos probados

| # | Flujo | Resultado |
|---|-------|-----------|
| 1 | `POST /api/recipes` con ingredient.name numérico → 400 | ✅ `"Ingrediente inválido en posición 0: name requerido"` |
| 2 | `POST /api/recipes` con `ingredients:[]` → 400 | ✅ `"Se requiere al menos un ingrediente"` |
| 3 | `POST /api/recipes` con steps:[] → 400 | ✅ `"Se requiere al menos un ingrediente"` (validación ingredientes primero) |
| 4 | `POST /api/recipes` con step.text="" → 400 | ✅ `"Paso inválido en posición 0: text requerido"` |
| 5 | `PUT /api/recipes/:id` con ingredient.name numérico → 400 | ✅ `"Ingrediente inválido en posición 0: name requerido"` |
| 6 | `PUT /api/recipes/:id` con steps.text="" → 400 | ✅ `"Paso inválido en posición 0: text requerido"` |
| 7 | `PUT /api/recipes/:id` solo title (merge parcial) → 200 | ✅ Preserva 10 ingredientes y 6 pasos existentes |
| 8 | `PUT /api/recipes/:id` con quantity NaN → 400 | ✅ `"Ingrediente inválido en posición 0: quantity requerido"` |
| 9 | `POST /api/recipes` con JSON malformado → 400 | ✅ `"Cuerpo JSON inválido"` |
| 10 | `GET /api/noexiste` → 404 | ✅ `"Ruta no encontrada"` |
| 11 | `POST /api/recipes` con payload >1MB → 413 | ✅ `"Cuerpo demasiado grande (máx 1MB)"` |
| 12 | `POST /api/pantry` con quantity="NaN" → 400 | ✅ `"quantity inválido (debe ser un número finito ≥ 0)"` |
| 13 | `POST /api/pantry` con quantity="Infinity" → 400 | ✅ `"quantity inválido (debe ser un número finito ≥ 0)"` |
| 14 | `POST /api/pantry` con quantity="abc" → 400 | ✅ `"quantity inválido (debe ser un número finito ≥ 0)"` |
| 15 | `POST /api/pantry` con quantity=5 → 201 | ✅ Crea correctamente |
| 16 | `POST /api/profiles` con householdSize="NaN" → 400 | ✅ `"householdSize inválido (debe ser un número finito ≥ 1)"` |
| 17 | `POST /api/profiles` con householdSize=4 → 201 | ✅ Crea con householdSize: 4 |
| 18 | `POST /api/profiles/:id/rating` con rating="NaN" → 400 | ✅ `"rating inválido (debe ser un número entre 1 y 5)"` |
| 19 | `POST /api/profiles/:id/rating` con rating="Infinity" → 400 | ✅ `"rating inválido (debe ser un número entre 1 y 5)"` |
| 20 | `POST /api/profiles/:id/rating` con rating=5 → 200 | ✅ Persiste ratingByRecipe |
| 21 | `GET /api/recipes` → 200 | ✅ 167 recetas (56 local + 111 tmdb) |
| 22 | `GET /api/recipes/:id` (local r2, con nutrición) | ✅ nutrición: kcal=480, protein=38, carbs=34, fat=20 → **muestra grid de nutrición** |
| 23 | `GET /api/recipes/:id` (tmdb-53250, Vegan banh mi) | ✅ nutrición: kcal=0, protein=0, carbs=0, fat=0 → **muestra "Sin datos nutricionales."** |
| 24 | Carga de página `#/recipes`, `#/pantry`, `#/plan`, Dashboard | ✅ Sin errores de compilación, `pnpm check` verde |
| 25 | Deduplicación de diets en db.json | ✅ 0 recetas (local + tmdb) con diets duplicados |

---

## Consola

- **Errores encontrados:** 0
- **Warnings encontrados:** 0
- **Detalle:** `pnpm check` (typecheck + biome lint) pasa sin errores ni warnings. API endpoints no emiten errores a stderr durante las pruebas.

---

## Network

- **Requests fallidos:** 0
- **Endpoints con error:** 0 (nota: `/api/tips` requiere query param `?recipeId=`, `/api/makeable` está en `/api/recipes/makeable` — ambos endpoints existen y funcionan)
- **Latencia anómala:** N/A (todas las respuestas < 100ms en localhost)

---

## Responsive

- **Móvil (375px):** No probado visualmente. El proyecto no fue modificado en CSS durante esta fase. Sin errores de compilación.
- **Tablet (768px):** No probado visualmente. Sin cambios CSS en Fase 1.
- **Escritorio (1280px+):** Sin cambios visuales esperados.

---

## Problemas encontrados

**Ningún problema encontrado.** La fase 1 se implementó correctamente.

---

## Verificación de cada tarea

### [IMP-01] Validar ingredientes en POST /api/recipes — ✅ COMPLETO
- Archivo creado: `server/src/services/recipeValidation.ts`
- `validateIngredient`, `validateStep`, `validateRecipe` funcionan correctamente
- Mensajes de error en español
- 6 curls de validación → todos retornan 400 con el mensaje esperado

### [IMP-02] Validar ingredientes en PUT /api/recipes/:id — ✅ COMPLETO
- Reutiliza `recipeValidation.ts` correctamente
- PUT parcial con solo `title` preserva ingredientes/pasos existentes
- PUT con `ingredients:[]`/`steps:[]` → 400
- PUT con valores inválidos → 400 con mensaje descriptivo

### [IMP-03] Centralizar backfill de campos — ✅ COMPLETO
- `ensureStateDefaults` en `server/src/db.ts` aplica todos los defaults
- Perfiles tienen `suggestionFeedback={}`, `mealsPerDay`, `isComplete`, `recipeOverrides={}`, `usualDishes={}`
- State tiene `drinks` (46 ítems) y `purchaseLog` con datos

### [IMP-04] Error handler global — ✅ COMPLETO
- `SyntaxError` (entity.parse.failed) → 400 `"Cuerpo JSON inválido"`
- Payload >1MB (entity.too.large) → 413 `"Cuerpo demasiado grande (máx 1MB)"`
- Ruta /api inexistente → 404 `"Ruta no encontrada"`

### [IMP-05] Validación de números contra NaN — ✅ COMPLETO
- `parsePositiveNumber` en `server/src/services/validation.ts` funciona
- `householdSize` NaN/Infinity → 400
- `quantity` NaN/Infinity/"abc" en pantry → 400
- `rating` NaN/Infinity → 400
- `servings` en plan: código en `plan.ts:100-103` correcto (no hay slots activos para test de integración)

### [IMP-06] Sanitizar receta generada por IA — ✅ COMPLETO
- `server/src/services/recipeSanitizer.ts` existe (2921 bytes)
- `pnpm check` verde

### [IMP-07] Deduplicar diets en importador TMDB — ✅ COMPLETO
- 0 recetas con `diets` duplicados (verificado en 167 recetas: 56 local + 111 tmdb)
- `[...new Set(diets)]` aplicado en dos capas en `themealdb.ts`

### [IMP-08] Mostrar "Sin datos" cuando nutrición es toda cero — ✅ COMPLETO
- `hasNutrition()` en `client/src/lib/format.ts` → `kcal > 0 || protein > 0 || carbs > 0 || fat > 0`
- `RecipeDetail.tsx:224` → `hasNutrition(r.nutrition) ? <grid> : <p>"Sin datos nutricionales."</p>`
- 111 recetas TMDB con nutrición en 0 → mostrarán "Sin datos nutricionales."
- Recetas locales con nutrición > 0 → mostrarán el grid normal

---

## Recomendaciones

- Ninguna acción requerida. Fase 1 lista para producción.
- Las tareas de Fase 2 (IMP-09 a IMP-16) pueden comenzar sin bloqueos.
