# Roadmap

Fases nuevas derivadas de la revisión completa de código + QA (agosto 2026). Agrupan hardening, funcionalidad, UX, rendimiento, estética/a11y y deuda técnica. UI y tipos en español (convención del repo). No se usan APIs de pago. Verificación: `pnpm check`.

---

## Fase 1 — Hardening de backend y validación de datos (CRÍTICO)
**Prioridad:** P0
**Depende de:** ninguna
**Criterio de hecho:** `pnpm check` en verde + requests maliciosos devuelven 400/413, no 500.

Validación estricta de datos que entran al servidor, manejo de errores correcto, migración de datos legacy y limpieza de datos corruptos. Esta fase previene crasheos en producción.

### 1.1 Validar ingredientes y pasos en create/update de recetas
- **Estado actual:** `POST /api/recipes` solo valida `Array.isArray(ingredients)`. `PUT` no valida nada. `ingredients:[null]`, `[{name:1}]` o steps inválidos crashean /makeable, /recommendations y /shopping/generate (500).
- **Cambio:** validar cada ingrediente (name string no-vacío, quantity `Number.isFinite` ≥ 0, unit string, category en `IngredientCategory`). Validar cada step (text string). En POST y PUT.
- **Aceptación:** `POST` con `ingredients:[{name:1}]` → 400 con mensaje descriptivo.

### 1.2 Completar migración/backfill de campos nuevos al cargar db.json
- **Estado actual:** `server/src/db.ts:22-27` rellena `purchaseLog`, `isComplete`, `recipeOverrides`, `usualDishes` pero no `suggestionFeedback`, `mealsPerDay`, `drinks`, `grams`. Un db.json legacy crashea el auto-import (`importScoring.ts:190`).
- **Cambio:** centralizar función `ensureStateDefaults(state)` usada por `load()` y `seedState()`. Ejecutar backfill para todos los campos del tipo actual.
- **Aceptación:** cargar un db.json sin `suggestionFeedback` no crashea al hacer auto-import.

### 1.3 Mejorar error handler global del servidor
- **Estado actual:** `server/src/index.ts:55-58` atrapa todo como 500. JSON malformado, payload grande, rutas `/api` inexistentes → todos 500.
- **Cambio:** añadir handler para `SyntaxError` (JSON malformado → 400) y `PayloadTooLargeError` (→ 413). Añadir fallback 404 JSON para cualquier ruta `/api/*` no manejada.
- **Aceptación:** `curl -X POST localhost:3001/api/recipes -H 'Content-Type: application/json' -d 'not json'` → 400. Ruta `/api/noexiste` → 404 JSON.

### 1.4 Validar valores numéricos contra NaN en rutas
- **Estado actual:** `Math.max(1, body.householdSize)` (`routes/profiles.ts:61,93`), `Math.max(0, body.quantity)` (`routes/pantry.ts:92,160`), `routes/plan.ts:37`, `routes/profiles.ts:164` (rating). Valores NaN pasan como NaN.
- **Cambio:** coercionar con `Number(value)` + validar `Number.isFinite()` → 400 si no. Aplicar en profiles, pantry, plan y rating.
- **Aceptación:** `POST /api/profiles` con `householdSize:"abc"` → 400.

### 1.5 Sanitizar receta generada por IA en POST /recipes/generate
- **Estado actual:** `routes/recipes.ts:170-173` hace `JSON.parse(jsonStr)` y devuelve el objeto crudo sin sanitizar campos (type, category, valores).
- **Cambio:** reusar la sanitización de `parseAiRecipeJson` (`importSources.ts:475-514`) en el endpoint `/recipes/generate`.
- **Aceptación:** respuesta de IA con `ingredients:[{name:123}]` o `category:"invalid"` se normaliza/rechaza.

### 1.6 Limpiar datos duplicados y nutrición en cero
- **Estado actual:** 12 recetas TMDB con `sin-lactosa` duplicado en `diets`. 111 recetas con `nutrition:{kcal:0,protein:0,carbs:0,fat:0}`.
- **Cambio:** deduplicar `diets` en el importador de TMDB. En el cliente, mostrar "Sin datos" cuando nutrition.kcal + protein + carbs + fat === 0.
- **Aceptación:** recetas importadas no tienen dietas duplicadas. UI muestra "Sin datos nutricionales" en vez de ceros.

---

## Fase 2 — Funcionalidad: editar/eliminar recetas y features huérfanas
**Prioridad:** P0
**Depende de:** Fase 1 (validación backend necesaria para editar)
**Criterio de hecho:** botones editar/eliminar visibles y funcionales, pestaña "Hacer hoy" filtra, rating en historial funciona.

### 2.1 Editar y eliminar receta desde RecipeDetail
- **Estado actual:** `useUpdateRecipe` y `useDeleteRecipe` existen sin uso en la UI. RecipeDetail solo tiene "Adaptar a mi familia" (override) y "Buscar imagen".
- **Cambio:** añadir botones "✎ Editar" y "🗑 Eliminar" en RecipeDetail. "Editar" abre un modal con formulario completo que llama `useUpdateRecipe`. "Eliminar" abre confirmación y llama `useDeleteRecipe`.
- **Aceptación:** editar una receta local cambia sus datos. Eliminar una receta con confirmación la quita del catálogo, plan e historial.

### 2.2 Conectar pestaña "Hacer hoy" en RecipePicker
- **Estado actual:** `RecipePicker.tsx:19,44-51`: `tab` se setea pero el filtro `makeable` nunca se usa.
- **Cambio:** cuando `tab === "makeable"`, filtrar por recetas con `makeable: true`. O quitar la pestaña si no se considera útil.
- **Aceptación:** click en "Hacer hoy" muestra solo recetas con 0 ingredientes faltantes.

### 2.3 Decidir futuro de TheMealDB: añadir UI o eliminar endpoints
- **Estado actual:** hooks `useThemealdbSearch/Import/AutoImport` existen sin superficie en la UI.
- **Cambio:** añadir en `Recipes.tsx` un botón "🌍 Importar" con modal de búsqueda TheMealDB. O eliminar hooks/rutas si no se quiere mantener.
- **Aceptación:** el usuario puede buscar e importar de TheMealDB desde la UI, o la funcionalidad se elimina limpiamente.

### 2.4 Habilitar rating y edición en el historial
- **Estado actual:** `History.tsx:68`: `Stars` con `onChange={() => {}}`. `useUpdateHistoryEntry` sin uso.
- **Cambio:** conectar `onChange` a `useSetRating` + `useUpdateHistoryEntry`.
- **Aceptación:** click en estrellas en historial persiste el rating.

### 2.5 Completar cascadas en eliminación de recetas y perfiles
- **Estado actual:** `DELETE /api/recipes/:id` no limpia `ratingByRecipe` ni `suggestionFeedback`. `DELETE /api/profiles/:id` no limpia `purchaseLog`.
- **Cambio:** añadir limpieza de `ratingByRecipe` y `suggestionFeedback` en recipe DELETE. Añadir limpieza de `purchaseLog` en profile DELETE.
- **Aceptación:** eliminar receta no deja datos fantasma huérfanos. Eliminar perfil limpia sus purchaseLog entries.

### 2.6 Exponer ajuste de raciones por slot en el plan semanal
- **Estado actual:** `WeeklyPlan.tsx:83`: nuevos slots con `servings: 2` hardcodeado. `updateSlot` ya soporta `servings`, pero la UI no lo expone.
- **Cambio:** mostrar un stepper `±` de servings por slot conectado a `useUpdateSlot({servings})`.
- **Aceptación:** el usuario puede cambiar raciones por slot de 1 a 12, y el cambio persiste.

---

## Fase 3 — UX: modales, estados de carga, debounce
**Prioridad:** P1
**Depende de:** ninguna (independiente)
**Criterio de hecho:** Escape cierra modales, botones muestran pending, búsqueda no dispara requests por keystroke, no flickering.

### 3.1 Accesibilidad de modales: Escape, aria-modal, focus
- **Estado actual:** `confirm.tsx` y todos los `modal-backdrop` carecen de `role="dialog"`, `aria-modal="true"`, cierre con Escape ni focus management.
- **Cambio:** hook `useModalClose(onClose)` con listener de Escape. Añadir `role="dialog"`/`aria-modal` al div modal. Enfocar el primer elemento al abrir.
- **Aceptación:** presionar Escape cierra cualquier modal.

### 3.2 Botones con mutación: estado pending/disabled
- **Estado actual:** "Generar semana", "🎲 Otra", "Ya la comí", favoritos, "Añadir al plan" no muestran pending ni se deshabilitan.
- **Cambio:** añadir `disabled={mutation.isPending}` y texto condicional ("Generando…") en WeeklyPlan y RecipeDetail.
- **Aceptación:** al hacer click en "Generar semana", el botón queda disabled y muestra "Generando…" hasta que termine.

### 3.3 Debounce en búsquedas y equivalencias
- **Estado actual:** `useEquivalent` (`hooks.ts:328`) y búsqueda de recetas (`Recipes.tsx:41-48`) disparan requests por cada keystroke.
- **Cambio:** hook `useDebouncedValue(value, 300ms)`; envolver query de RecipePicker e ingrediente de `useEquivalent`.
- **Aceptación:** escribir rápido no dispara múltiples requests.

### 3.4 Aislar reloj en App.tsx y consolidar useExpiring en Dashboard
- **Estado actual:** `App.tsx:61-64` hace `setNow` cada 30s → re-render completo. `Dashboard.tsx:20-21` llama `useExpiring(1)` y `useExpiring(5)` → 2 requests.
- **Cambio:** extraer a componente `TopBarClock`. Consolidar en un solo `useExpiring(5)`.
- **Aceptación:** el reloj no re-renderiza el layout. Dashboard hace 1 request.

### 3.5 Prevenir flickering de empty-states durante carga
- **Estado actual:** Pantry, History, Shopping, Drinks muestran "sin datos" mientras `isLoading=true`.
- **Cambio:** gatear con `isLoading` → spinner/skeleton; empty-state solo cuando `!isLoading && data.length === 0`.
- **Aceptación:** al navegar a Despensa se ve "Cargando…" brevemente, luego items o "Despensa vacía".

---

## Fase 4 — Rendimiento
**Prioridad:** P1
**Depende de:** ninguna
**Criterio de hecho:** las recomendaciones no cambian de orden en cada refetch. RecipeCard usa memo.

### 4.1 Estabilizar orden de recomendaciones
- **Estado actual:** `recommender.ts:97` usa `Math.random()*0.4` → jitter en cada refetch. `pantryTotals` y Map de historial se recalculan por cada receta.
- **Cambio:** hash determinista de `recipe.id` en vez de random. Precomputar `pantryTotals` y Map de historial antes del loop.
- **Aceptación:** dos refetches consecutivos de `/api/recommendations` devuelven el mismo orden.

### 4.2 Envolver RecipeCard en React.memo
- **Estado actual:** `RecipeCard` se re-renderiza siempre que el padre cambia; `RecipeContextBadges` suscribe `useAppState` + `useSettings` por card.
- **Cambio:** `export default React.memo(RecipeCard)` y memoizar badges de contexto.
- **Aceptación:** al toggle de favorito solo re-renderiza esa card.

---

## Fase 5 — Estética y accesibilidad
**Prioridad:** P2
**Depende de:** ninguna
**Criterio de hecho:** sin CSS vars indefinidas, contraste WCAG AA en texto, imágenes con alt descriptivo, focus visible, español consistente.

### 5.1 Corregir variables CSS indefinidas
- **Estado actual:** `index.css:2483,2596,2684` usa `--text` (→ `--ink`), `--bg-subtle`, `--tx-muted` no definidas.
- **Cambio:** reemplazar `var(--text)` por `var(--ink)`. Definir `--bg-subtle` y `--tx-muted` en `:root`.
- **Aceptación:** los estilos se aplican visiblemente.

### 5.2 Mejorar contraste de texto muted
- **Estado actual:** `--muted:#7a7068` no pasa WCAG AA (4.27:1 sobre blanco).
- **Cambio:** oscurecer a un valor con ratio ≥ 4.5:1 (ej. `#6b6159`).
- **Aceptación:** texto muted legible sobre fondo blanco.

### 5.3 Imágenes: width/height, fallback onError, alt descriptivo
- **Estado actual:** `<img>` en RecipeCard, Dashboard, RecipeDetail sin width/height (CLS), sin onError, `alt=""`.
- **Cambio:** `width`/`height` (o aspect-ratio), `onError` que esconde la imagen rota y muestra emoji, `alt={recipe.title}`.
- **Aceptación:** imágenes caídas no muestran icono roto. CLS ≤ 0.1.

### 5.4 Foco visible y roles ARIA en componentes interactivos
- **Estado actual:** sin `:focus-visible` en `.btn`, `.chip`, `.nav-item`, `.icon-btn`. Toasts sin `role`. Icon-buttons solo con `title`.
- **Cambio:** `:focus-visible`, `role="status"`/`"alert"` en toasts, `aria-label` en icon-btn.
- **Aceptación:** navegar con Tab muestra foco visible. Screen reader anuncia toasts.

### 5.5 Corregir textos mezclados español/inglés
- **Estado actual:** "items por comprar", "Cant.", "Und.", "Tip (opcional)", "rac.".
- **Cambio:** "ítems/productos", "Cantidad", "Unidad", "Consejo (opcional)", "raciones".
- **Aceptación:** toda la UI visible en español consistente.

### 5.6 Labels de dietas, color IA y sidebar day
- **Estado actual:** CreateRecipe muestra chips dieta con keys raw (`sin-gluten`). Callout IA en `#6366f1` fuera de paleta. Sidebar "Hoy · lunes" en minúscula.
- **Cambio:** usar `dietLabel(d)`, color IA con `var(--accent)`/`var(--warm)`, `DAY_LABELS[day]` en sidebar.
- **Aceptación:** chips muestran "Sin gluten". Sidebar muestra "Hoy · Lunes".

---

## Fase 6 — Arquitectura y deuda técnica
**Prioridad:** P2
**Depende de:** Fase 1 (se tocan tipos, mejor después de estabilizar)
**Criterio de hecho:** sincronización de tipos comprobable, sin side-effects en GET, defaults centralizados.

### 6.1 Sincronización de tipos server↔client
- **Estado actual:** tipos duplicados manualmente. Agregar campo = 4 lugares.
- **Cambio:** script `scripts/sync-types.ts` + `pnpm sync-types` + diff check en `pnpm check`.
- **Aceptación:** `pnpm check` falla si los tipos no están sincronizados.

### 6.2 Corregir GET con side-effects y PUT /settings/keys sin persistencia
- **Estado actual:** `GET /api/drinks` hace seed en cada GET. `PUT /api/settings/keys` solo modifica `process.env` (se pierde en restart).
- **Cambio:** mover seeding de drinks a `ensureStateDefaults()`. Persistir API keys (o su presencia) a `.env.local`/`db.json`.
- **Aceptación:** `GET /api/drinks` no escribe. Las API keys sobreviven a restart.

### 6.3 Centralizar defaults de nuevos campos
- **Estado actual:** añadir un campo requiere types.ts×2, seed.ts y db.ts load().
- **Cambio:** `ensureStateDefaults(state)` como ÚNICO lugar de defaults, llamado por load() y seedState().
- **Aceptación:** añadir un campo solo requiere types×2 + la función ensureStateDefaults.
