# Reporte de QA - Revisión Completa

**Fecha:** 2026-08-07
**URL probada:** http://localhost:5173 (Vite client, proxy /api → Express :3001)
**Dispositivos probados:** escritorio 1440px, tablet 768px, móvil 375px (simulación vía CSS media queries y análisis de código)

---

## Resumen ejecutivo

| Severidad | Cantidad |
|-----------|----------|
| Critical  | 0 |
| Major     | 4 |
| Minor     | 4 |
| Cosmetic  | 4 |

La aplicación funciona correctamente en sus flujos principales. No se encontraron crashes, APIs rotas para funcionalidad core, ni errores de compilación. Los problemas más graves son: (1) todas las recetas importadas de TheMealDB tienen nutrición en cero, (2) 12 recetas tienen dietas duplicadas, (3) contraste de accesibilidad bajo en texto secundario, y (4) falta de dimensiones explícitas en imágenes causando layout shift.

---

## Flujos probados

### 1. Dashboard (#/dashboard)
- [x] Carga inicial — HTTP 200, estado cargado correctamente (1 perfil, 5 items despensa, 119 recetas)
- [x] Stats bar — renderiza 4 stats: recetas, despensa, comidas planeadas, próx. caducidad
- [x] Quick actions — 3 botones funcionales (despensa, plan, recetas)
- [x] Tip card — `useDailyTip()` llama a `/api/tips/daily` (HTTP 200), botón de refresco con `tip.refetch()`
- [x] Expiring stat — `useExpiring(1)` llama a `/api/pantry/expiring?days=1` (HTTP 200)
- [x] Recomendaciones — `useRecommendations(6)` llama a `/api/recommendations?limit=6` (HTTP 200)
- [x] Today's plan — muestra slots del plan del día actual

### 2. Recetas (#/recipes)
- [x] Listado — 119 recetas cargadas (8 locales + 111 TMDB)
- [x] Búsqueda — `/api/recipes?q=pollo` (HTTP 200), filtro funcional
- [x] Filtro por dieta — `/api/recipes?diet=sin-gluten` (HTTP 200)
- [x] Filtro makeable — `/api/recipes?makeable=true` (HTTP 200)
- [x] Sort y filtros combinados — query params aceptados por API
- [x] RecipeCard — emoji fallback cuando no hay imagen, lazy loading en imágenes

### 3. Detalle de receta (#/recipes/:id)
- [x] Hero con imagen — `<img>` con `alt={r.title}`, overlay, meta (tiempo, raciones)
- [x] Hero sin imagen — emoji fallback (`r.emoji ?? "🍲"`)
- [x] Diet badges — usa `dietLabel()` para etiquetas legibles
- [x] Ingredientes con servings stepper — botones +/- funcionales, escala cantidades
- [x] Indicador de ingredientes faltantes — vía `useMissing()`
- [x] Pasos — lista ordenada de pasos
- [x] Consejos — `useRecipeTips()` cargando desde `/api/tips?recipeId=...`
- [x] Nutrición — grid de 4 valores (kcal, proteína, carbs, grasa)
- [x] Rating con estrellas — `useSetRating` interactivo
- [x] Botón favorito — toggle ☆/★ con `useSetFavorite`
- [x] Modo cocina — botón "▶ Modo cocina" navega a `#/cook/:id`
- [x] Adaptar receta — abre RecipeEditModal con overrides
- [x] Buscar imagen — abre ImagePicker con búsqueda Openverse
- [x] Añadir al plan — modal con selectores de día/comida
- [x] Ya lo comí — registra en historial vía `useAddHistory`

### 4. Crear receta (#/recipes/new)
- [x] Formulario completo — título, emoji, raciones, prep, cocción, descripción, imagen URL, dietas, comidas aptas, cocina, región, protagonista, temporadas, ingredientes, pasos, tips, nutrición
- [x] Generar con IA — textarea + botón, llama a `/api/recipes/generate` (POST)
- [x] Ingredientes dinámicos — add/remove filas con nombre, cantidad, unidad, categoría
- [x] Pasos dinámicos — add/remove con texto y tip opcional
- [x] Validación — título obligatorio, al menos un ingrediente, al menos un paso
- [x] Submit — `useCreateRecipe` → POST `/api/recipes`

### 5. Plan semanal (#/plan)
- [x] Grid 7 días × 3 comidas — con DAY_LABELS y MEAL_LABELS
- [x] Slots con recetas asignadas — nombre, servings, bebida
- [x] Generar semana — confirm modal → POST `/api/plan/generate`
- [x] Añadir/Quitar recetas — via RecipePicker y confirm modal
- [x] Cambiar bebida — `cycleDrink()` rota entre bebidas aptas
- [x] "Ya la comí" — registra en historial y regenera slot
- [x] "Solo mis recetas" — toggle de filtro localOnly
- [x] Mini thumbnails en slots con lazy loading

### 6. Despensa (#/pantry)
- [x] Lista de items — 5 items con nombre, cantidad, precio, fecha caducidad
- [x] Añadir item — formulario con autocomplete (datalist), selector de unidad, modo precio (unit/total), fecha
- [x] VoiceButton — componente retorna `null` cuando `!voice.supported` (sin errores)
- [x] Expiry badges — "caduca en X d", "caduca hoy", "caducó hace X d", clases urgent para ≤2 días
- [x] Búsqueda — input con filtro por nombre
- [x] Editar item — PantryEditModal
- [x] Eliminar — confirm modal → optimista con `onMutate`
- [x] Toggle precios — localStorage `pantry.hidePrices`
- [x] Equivalencias — `useEquivalent()` para conversiones de unidades
- [x] Catálogo de ingredientes — sugerencias desde `/api/ingredients`

### 7. Lista de compras (#/shopping)
- [x] Estado vacío — mensaje y botón "Generar lista"
- [x] Generar lista — POST `/api/shopping/generate` (HTTP 200, 46 items generados)
- [x] Items agrupados por categoría — con `CATEGORY_ORDER` y `CATEGORY_LABELS`
- [x] Checkboxes — toggle checked vía `useToggleShoppingItem`
- [x] Items "ya en despensa" — resaltados con clase `.have`
- [x] Vaciar lista — confirm modal → DELETE `/api/shopping`
- [x] Regenerar — botón secundario

### 8. Gastos (#/spending)
- [x] Pestañas de período — semana/mes/año con `useSpending(period)`
- [x] Stats — gastado (S/ 157.75 semana), consumido, N compras
- [x] Tendencia — barras verticales con `maxTrend` normalizado
- [x] Por ingrediente — barras horizontales con `maxIngredient`
- [x] Donut chart — CSS `conic-gradient` con segmentos por categoría y leyenda
- [x] Movimientos — lista de purchase/consumo con fechas, cantidades, precios
- [x] Datos para semana, mes y año — todos retornan datos válidos

### 9. Perfiles (#/profiles)
- [x] Lista de perfiles — 1 perfil (Oscar, activo)
- [x] Activar perfil — `useActivateProfile`
- [x] Editar — formulario con ProfileFields, restricciones, platos usuales
- [x] Eliminar — deshabilitado si solo hay 1 perfil
- [x] Wizard modal — ProfileWizard abre desde botón "+ Nuevo perfil"
- [x] Badge "Incompleto" — si `!p.isComplete`

### 10. Bebidas (#/drinks)
- [x] Grid de bebidas — 46 bebidas cargadas
- [x] Filtros por tipo (refresco/mate/jugo/bebida caliente) y comida (desayuno/almuerzo/cena)
- [x] Vista agrupada por comida cuando no hay filtros activos
- [x] Nueva bebida — modal con nombre, emoji, tipo, comidas aptas
- [x] Editar y eliminar — modales con confirmación

### 11. Ajustes (#/settings)
- [x] Ubicación — país (con datalist de países), ciudad, botón "Usar mi ubicación" (geolocalización)
- [x] Temporada actual — banner con emoji de estación, hint de temporada, mensaje de ingredientes locales
- [x] Claves API — 5 campos tipo password (OpenAI, Anthropic, Google, Spoonacular, Ollama), indicadores ✓
- [x] Guardar ubicación — PUT `/api/settings`
- [x] Guardar claves — PUT `/api/settings/keys`

### 12. Modo cocina (#/cook/:id)
- [x] Hero con imagen/emoji
- [x] Servings stepper — ajusta cantidades de ingredientes
- [x] Timer — botones rápidos 1/5/10 min, pausar/reanudar, reset
- [x] Navegación de pasos — dots numerados, botón Anterior/Siguiente
- [x] Marcar paso como hecho — toggle con check visual
- [x] Cronometrar desde paso — detecta tiempos en texto del paso (ej. "30-35 minutos")
- [x] Botón "Terminar" en último paso → navega a detalle de receta
- [x] Ingredientes escalados a servings actuales

### 13. Responsive (CSS media queries ≤900px)
- [x] Hamburger menu — `.menu-toggle` se muestra, 3 barras, aria-label dinámico
- [x] Sidebar — `translateX(-100%)` → `translateX(0)` al abrir, overlay oscuro
- [x] Grid 2-columnas → 1 columna (`.grid-2`, `.cooking-grid`)
- [x] Recipe grid → 1 columna
- [x] Hero images — max-height reducido (320px/280px)
- [x] Main padding ajustado: 60px 16px 60px
- [x] No hay overflow horizontal en análisis estático

### 14. Accesibilidad spot-checks
- [x] `<html lang="es">` — correcto
- [x] `<title>Cocina Inteligente</title>` — correcto
- [x] Favicon — SVG emoji 🍳 inline
- [x] `meta viewport` — presente y correcto
- [x] Menu toggle — aria-label "Abrir menú" / "Cerrar menú"
- [x] Campos de formulario — mayoría con `<label>` o `<span>` descriptivo
- [x] Botones — muchos con `title` o `aria-label` en icon buttons
- [x] Input focus — `outline: 2px solid var(--accent-soft)` visible
- [ ] **Ver issues abajo** sobre contraste y alt text

### 15. Documento HTML
- [x] `<html lang="es">` — correcto
- [x] `<title>Cocina Inteligente</title>` — presente y descriptivo
- [x] Favicon — `data:image/svg+xml` con emoji 🍳
- [x] Charset UTF-8

### 16. Performance (análisis estático)
- [x] Lazy loading — `loading="lazy"` en imágenes de RecipeCard, Dashboard, WeeklyPlan mini-thumbs
- [x] React Query — staleTime configurado (15s default, 30s para state/settings)
- [ ] **CLS risk** — imágenes sin `width`/`height` explícitos (ver issue M-4)
- [x] Sin render-blocking — Vite con ESM, sin scripts externos bloqueantes

### 17. Textos en español e inconsistencias
- [x] UI completamente en español
- [x] Sin mezcla de idiomas detectada
- [ ] Diet keys se muestran raw en CreateRecipe ("sin-gluten" en vez de "Sin gluten") — issue M-5
- [x] Nombres de comidas y días en español correcto (lunes, almuerzo, etc.)

---

## Consola (errores esperados en runtime)

Dado que no se ejecutó un navegador real, se analizó el código fuente para anticipar errores de consola:

- **Sin errores esperados en carga inicial.** Las queries de React Query manejan loading/error states.
- **`useDailyTip`** — llama a `/api/tips/daily` que responde HTTP 200. Sin errores.
- **`useExpiring`** — llama a `/api/pantry/expiring?days=N` que responde HTTP 200 (aunque vacío). Sin errores.
- **`VoiceButton`** — retorna `null` cuando `!voice.supported`, no lanza errores ni warnings.
- **Posible warning en consola:** React Query `initialData` puede causar warning si la data del cache difiere del estado fresco. Esto ocurre en `usePantry()` y `useShopping()` que usan `initialData: data?.pantry` / `data?.shoppingList`.

---

## Network

### Endpoints y su estado

| Endpoint | Método | HTTP | Notas |
|----------|--------|------|-------|
| `/api/state` | GET | 200 | OK |
| `/api/recipes` | GET | 200 | 119 recetas |
| `/api/recipes/:id` | GET | 200 | OK |
| `/api/recipes/makeable` | GET | 200 | 119 resultados |
| `/api/recipes/generate` | POST | - | Requiere OPENROUTER_API_KEY |
| `/api/profiles` | GET/POST/PUT/DELETE | 200 | OK |
| `/api/pantry` | GET/POST/PUT/DELETE | 200 | OK |
| `/api/pantry/expiring` | GET | 200 | Vacío (5 items sin fecha cercana) |
| `/api/plan` | GET/PUT | 200 | OK |
| `/api/plan/generate` | POST | 200 | 6 slots generados |
| `/api/plan/regenerate` | POST | 200 | OK |
| `/api/history` | GET/POST/DELETE | 200 | Vacío (sin registros) |
| `/api/shopping` | GET/DELETE | 200 | OK |
| `/api/shopping/generate` | POST | 200 | 46 items |
| `/api/spending` | GET | 200 | Datos para week/month/year |
| `/api/settings` | GET/PUT | 200 | Perú, Ica, invierno |
| `/api/settings/keys` | GET/PUT | 200 | OK |
| `/api/tips/daily` | GET | 200 | Consejo aleatorio |
| `/api/tips` | GET | 200 | Tips por recipeId |
| `/api/recommendations` | GET | 200 | 6 recomendaciones |
| `/api/recommendations/missing` | GET | 200 | OK |
| `/api/ingredients` | GET | 200 | Catálogo |
| `/api/ingredients/equivalent` | GET | 200 | Conversiones |
| `/api/drinks` | GET/POST/PUT/DELETE | 200 | 46 bebidas |
| `/api/themealdb/search` | GET | 200 | OK |
| `/api/themealdb/import` | POST | 200 | OK |
| `/api/openverse/search` | GET | 200 | OK |

**Requests fallidos:** 0 (todos los endpoints responden correctamente)
**Latencia anómala:** No detectada en pruebas con curl (respuestas <500ms)

---

## Responsive

### Móvil (375px, equivalente a media query ≤900px)
- **Hamburger menu:** Se muestra correctamente (`.menu-toggle` con `display: flex`). Sidebar con `transform: translateX(-100%)` → `translateX(0)` en estado `.open`. Overlay oscuro funcional.
- **Grid layouts:** `.grid-2`, `.cooking-grid`, `.recipe-grid` cambian a 1 columna.
- **Hero images:** max-height reducido (320px en recipe detail, 280px en cooking mode).
- **Topbar:** Padding ajustado (`60px 16px 60px`).
- **Sin overflow horizontal** — `min-width: 0` en múltiples contenedores, `max-width: 100%` en imágenes.

### Tablet (768px)
- Misma media query que móvil (≤900px). Comportamiento idéntico al mobile.
- Sidebar navegación vertical, sin brand ni sidebar-foot en mobile.

### Escritorio (1280px+)
- Layout sidebar + main con `flex-direction: row`.
- Sidebar fijo de 240px.
- `max-width: 1280px` en `.main`.
- Grids de 2 columnas para recipe detail, cooking mode, spending charts.

### Problemas detectados
- **No hay breakpoint intermedio para tablet** — el diseño colapsa a mobile en ≤900px, lo cual es abrupto para tablets de 768-900px (se pierde sidebar completo). Sin embargo, no es un bug, es una decisión de diseño.

---

## Problemas encontrados

### [M-1] Todas las recetas TMDB tienen nutrición en cero

- **Ubicación:** `server/data/db.json` — 111 recetas con id `tmdb-*`
- **Descripción:** Las 111 recetas importadas de TheMealDB tienen `nutrition: { kcal: 0, protein: 0, carbs: 0, fat: 0 }`. Esto hace que la sección "Nutrición" en `RecipeDetail` muestre todos ceros para cualquier receta importada.
- **Pasos para reproducir:** 1. Navegar a cualquier receta con id `tmdb-*`. 2. Observar la sección Nutrición — todos los valores son 0.
- **Comportamiento esperado:** Las recetas deberían tener valores nutricionales estimados (o al menos N/A en vez de 0).
- **Evidencia:** `curl http://localhost:3001/api/recipes/tmdb-53250 | jq .nutrition` → `{"kcal":0,"protein":0,"carbs":0,"fat":0}`
- **Sugerencia:** El seed de TMDB no incluye datos nutricionales (la API gratuita de TheMealDB no los proporciona). Se podría: (a) estimar nutrición por ingredientes, (b) mostrar "Sin datos nutricionales" para recetas sin datos reales, o (c) marcar el campo como opcional y ocultar la sección cuando es todo ceros.

### [M-2] 12 recetas TMDB tienen dietas duplicadas

- **Ubicación:** `server/data/db.json` — recetas: tmdb-53250, tmdb-53112, tmdb-53033, tmdb-53283, tmdb-53512, tmdb-53182, tmdb-53089, tmdb-53456, tmdb-53564, tmdb-53107, tmdb-53563, tmdb-53272
- **Descripción:** Estas 12 recetas tienen `"sin-lactosa"` duplicado en su array `diets`. Ej: `["vegano", "vegetariano", "sin-lactosa", "sin-lactosa"]`. Esto causa badges duplicados en el RecipeDetail y filtros inconsistentes.
- **Pasos para reproducir:** 1. Navegar a `#/recipes/tmdb-53250`. 2. Observar 2 badges "Sin lactosa" en el hero.
- **Comportamiento esperado:** Cada dieta debe aparecer una sola vez.
- **Evidencia:** `curl http://localhost:3001/api/recipes | python3 -c "..."` → 12 recetas con `len(diets) != len(set(diets))`
- **Sugerencia:** Dedeuplicar en el seed o en el endpoint de importación de TMDB con `[...new Set(diets)]`.

### [M-3] Contraste de accesibilidad insuficiente en texto secundario

- **Ubicación:** `client/src/index.css` — variable `--muted: #7a7068` sobre `--bg: #f7f4ee`
- **Descripción:** El color de texto secundario (`#7a7068`) sobre el fondo de página (`#f7f4ee`) tiene un ratio de contraste de aproximadamente 4.27:1, por debajo del mínimo WCAG AA de 4.5:1 para texto normal. Esto afecta a todos los textos con clase `.muted` en la página (descripciones, hints, labels secundarios).
- **Pasos para reproducir:** 1. Abrir cualquier página. 2. Inspeccionar un elemento `<p className="muted">`. 3. Verificar contraste en DevTools.
- **Comportamiento esperado:** Contraste ≥ 4.5:1 para cumplir WCAG AA.
- **Evidencia:** Cálculo de contraste: #7a7068 (luminancia ~0.179) vs #f7f4ee (luminancia ~0.927) = 4.27:1
- **Sugerencia:** Oscurecer `--muted` a algo como `#635b54` (ratio ~5.5:1) o `#5c544d` (ratio ~6:1).

### [M-4] Imágenes sin dimensiones explícitas causan CLS

- **Ubicación:** `client/src/components/RecipeCard.tsx` (líneas 33, 46), `client/src/pages/Dashboard.tsx` (línea 157), `client/src/pages/RecipeDetail.tsx` (línea 104), `client/src/pages/CookingMode.tsx` (línea 120), `client/src/pages/WeeklyPlan.tsx` (línea 167), `client/src/components/ImagePicker.tsx`
- **Descripción:** Ninguno de los elementos `<img>` en la aplicación tiene los atributos `width` y `height`, lo que causa Cumulative Layout Shift (CLS) cuando las imágenes cargan asíncronamente. Las imágenes de TMDB y Openverse tienen URLs externas con latencia variable.
- **Pasos para reproducir:** 1. Cargar el dashboard o lista de recetas. 2. Observar que el contenido se desplaza cuando las imágenes terminan de cargar.
- **Comportamiento esperado:** Imágenes con `width`/`height` y `aspect-ratio` en CSS para reservar espacio.
- **Sugerencia:** Añadir `width`/`height` en las etiquetas `<img>` con los valores del aspect ratio conocido o usar contenedores con `aspect-ratio` fijo en CSS. Para imágenes de recetas, se podría usar un aspect-ratio consistente (ej. 4:3 o 16:9).

### [m-5] Diet chips en CreateRecipe muestran keys en vez de labels

- **Ubicación:** `client/src/pages/CreateRecipe.tsx` (línea 302)
- **Descripción:** El formulario de crear receta muestra las dietas como "vegetariano", "vegano", "sin-gluten", "keto", "alta-proteina", "sin-lactosa" (raw keys) en vez de "Vegetariano", "Vegano", "Sin gluten", "Keto", "Alta proteína", "Sin lactosa" (labels legibles).
- **Pasos para reproducir:** 1. Navegar a `#/recipes/new`. 2. Observar los chips de dieta.
- **Comportamiento esperado:** Usar `dietLabel(d)` del componente `DietBadge` para mostrar etiquetas en español con formato amigable.
- **Sugerencia:** Cambiar `{d}` por `{dietLabel(d)}` en la línea 302 de CreateRecipe.tsx.

### [m-6] Categorías de ingredientes muestran keys sin formato

- **Ubicación:** `client/src/pages/CreateRecipe.tsx` (líneas 405-409)
- **Descripción:** El `<select>` de categoría de ingredientes muestra valores como "verduras", "frutas", "proteinas", "lacteos", "granos", "condimentos", "despensa", "otros" sin capitalizar ni formatear. Sin embargo, el mismo archivo Pantry.tsx ya tiene `CATEGORY_LABELS` con versiones legibles (ej. "🥬 Verduras", "🍗 Proteínas").
- **Pasos para reproducir:** 1. Navegar a `#/recipes/new`. 2. Observar el dropdown de categoría en una fila de ingrediente.
- **Comportamiento esperado:** Usar las mismas etiquetas formateadas que el resto de la app.
- **Sugerencia:** Definir `CATEGORY_LABELS` en `types.ts` o reutilizarlo de Pantry, y usarlo en el select de CreateRecipe.

### [m-7] Potencial memory leak en timer de CookingMode

- **Ubicación:** `client/src/pages/CookingMode.tsx` (líneas 27-43)
- **Descripción:** El `useEffect` del timer depende solo de `[timerRunning]`. Si el componente se desmonta mientras el timer está corriendo (`timerRunning === true`), el cleanup se ejecuta correctamente. Sin embargo, si el timer se pausa (`timerRunning === false`) y luego el componente se desmonta, el intervalo ya se limpió en el efecto anterior. Esto es correcto en la práctica, pero la referencia `secondsRef` podría mantener una referencia al valor después del desmontaje.
- **Pasos para reproducir:** 1. Iniciar timer en modo cocina. 2. Navegar a otra página sin pausar. 3. Verificar que no hay intervalos huérfanos.
- **Comportamiento esperado:** El intervalo debe limpiarse al desmontar, independientemente del estado.
- **Sugerencia:** Añadir un `useEffect` de cleanup incondicional: `useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current) }, [])`. O usar `useRef` para `timerRunning` también.

### [m-8] Sin fallback para imágenes rotas

- **Ubicación:** `client/src/pages/RecipeDetail.tsx` (línea 104), `client/src/components/RecipeCard.tsx` (líneas 33, 46), `client/src/pages/Dashboard.tsx` (línea 157), `client/src/pages/CookingMode.tsx` (línea 120)
- **Descripción:** Ningún elemento `<img>` tiene un handler `onError` para mostrar un fallback cuando la imagen externa no carga. Si una URL de Openverse expira o TMDB cambia sus URLs, se mostrará un broken image icon.
- **Pasos para reproducir:** 1. Modificar temporalmente la URL de la imagen de una receta a una URL inválida. 2. Observar el icono de imagen rota.
- **Comportamiento esperado:** Mostrar el emoji de la receta como fallback.
- **Sugerencia:** Añadir `onError={(e) => { e.currentTarget.style.display = 'none'; /* mostrar emoji fallback */ }}` o usar un estado local `imgError` para switchear a emoji.

---

### [c-1] Alt text vacío en imágenes de recetas en Dashboard y RecipeCard

- **Ubicación:** `client/src/pages/Dashboard.tsx` (línea 157), `client/src/components/RecipeCard.tsx` (líneas 33, 46)
- **Descripción:** Las imágenes de recetas en el dashboard y las cards usan `alt=""`, tratándolas como decorativas. Sin embargo, estas imágenes son el principal identificador visual de la receta. Si la imagen no carga, el usuario de screen reader no tiene indicación de qué receta es hasta llegar al título.
- **Pasos para reproducir:** 1. Usar un screen reader en el dashboard. 2. Navegar por las recomendaciones. 3. Las imágenes se anuncian como "image" sin descripción.
- **Comportamiento esperado:** `alt={recipe.title}` para que el screen reader anuncie el nombre de la receta.
- **Sugerencia:** Cambiar `alt=""` por `alt={recipe.title}` en imágenes de recetas donde el título no está inmediatamente visible para el screen reader.

### [c-2] Botones solo-emoji en WeeklyPlan sin texto visible

- **Ubicación:** `client/src/pages/WeeklyPlan.tsx` (líneas 196-217)
- **Descripción:** Los botones de acción en slots del plan usan solo emojis o símbolos como contenido: "↻", "🎲", "✅", "✕". Si bien tienen `title` attributes, los usuarios que navegan con teclado o screen reader dependen exclusivamente de estos titles.
- **Pasos para reproducir:** 1. Navegar a `#/plan`. 2. Inspeccionar los botones de acción en cada slot. 3. Observar que el contenido textual es solo emojis.
- **Comportamiento esperado:** Idealmente añadir `aria-label` además de `title` para asegurar compatibilidad cross-browser con screen readers.
- **Sugerencia:** Añadir `aria-label` a estos botones (ya tienen `title`, añadir aria-label como respaldo).

### [c-3] Receta de mariscos etiquetada como vegana/vegetariana

- **Ubicación:** `server/data/db.json` — receta `tmdb-53182` ("Spanish seafood rice")
- **Descripción:** "Spanish seafood rice" tiene `diets: ["vegano", "vegetariano", "sin-lactosa", "sin-lactosa"]`, lo cual es incorrecto — una receta de mariscos no es ni vegana ni vegetariana.
- **Pasos para reproducir:** 1. Buscar "Spanish seafood rice" en recetas. 2. Observar los badges "Vegano" y "Vegetariano".
- **Comportamiento esperado:** Dietas correctas según los ingredientes reales. Probablemente "sin-gluten" y "sin-lactosa" serían más apropiadas.
- **Sugerencia:** Revisar la lógica de asignación de dietas en el importador de TMDB. Posiblemente el mapeo de categorías de TMDB a dietas tiene un bug.

### [c-4] Nutrición en cero se muestra como dato válido

- **Ubicación:** `client/src/pages/RecipeDetail.tsx` (líneas 222-247)
- **Descripción:** La condición `{r.nutrition ? ... : ...}` solo verifica si el objeto nutrition existe, no si tiene valores significativos. Como todas las recetas TMDB tienen `nutrition: {kcal: 0, protein: 0, carbs: 0, fat: 0}`, se muestra la grid de nutrición con puros ceros, lo cual es misleading.
- **Sugerencia:** Añadir validación: si todos los valores son 0, mostrar "Sin datos nutricionales" igual que cuando nutrition es null/undefined.

---

## Recomendaciones

1. **Alta prioridad — Datos TMDB:** Revisar el seed/importador de TheMealDB para corregir nutrición en cero y dietas duplicadas. Esto afecta a 111/119 recetas (93% del catálogo).
2. **Alta prioridad — Accesibilidad:** Oscurecer `--muted` para cumplir WCAG AA. Es un cambio de una línea en CSS con alto impacto.
3. **Media prioridad — CLS:** Añadir `width`/`height` en todas las etiquetas `<img>` o usar contenedores con `aspect-ratio` fijo en CSS.
4. **Media prioridad — UX formularios:** Usar `dietLabel()` en CreateRecipe diet chips y labels de categoría en el select de ingredientes.
5. **Baja prioridad — Robustez:** Añadir `onError` handlers en imágenes para fallback a emoji.
6. **Baja prioridad — Accesibilidad:** Revisar alt text en imágenes de recetas y añadir `aria-label` a botones solo-emoji.
