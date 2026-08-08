# Roadmap

Fases ordenadas por impacto/esfuerzo. Cada ítem incluye el estado actual, qué cambiar y criterios de aceptación. UI y tipos en español (convención del repo). No se usan APIs de pago.

## ✅ Fase 1 — Menú, navegación y favicon — COMPLETADA

Completada el 2026-08-07. `pnpm check` en verde.

### ✅ 1.1 Favicon
- **Cambio**: añadir favicon inline SVG con emoji 🍳 en `client/index.html`.
- **✅ Completado**: `<link rel="icon">` con data URI SVG del emoji 🍳.

### ✅ 1.2 Iconos y agrupación en el menú lateral
- **Estado anterior**: 10 `NavItem` con solo texto, sin iconos ni separación visual.
- **Cambio**: añadir emoji a cada ítem (🏠📖📅🕒🧺🛒💰👥🧃⚙️) y agrupar en 3 secciones: **Principal** (Inicio, Recetas, Plan, Historial), **Cocina** (Despensa, Compras, Gastos), **Más** (Perfiles, Bebidas, Ajustes).
- **✅ Completado**: `NAV_ICONS`, `.nav-group-label`, `NavItem` con prop `icon`.

### ✅ 1.3 Menú hamburger en móvil
- **Estado anterior**: en ≤900px el sidebar se volvía barra horizontal con wrap, poco usable.
- **Cambio**: botón hamburger fijo (`.menu-toggle`), sidebar oculto con `translateX(-100%)`, overlay semitransparente, cierre al navegar o tocar fuera.
- **✅ Completado**: `menuOpen` state en `App.tsx`, `.menu-toggle`, `.menu-overlay`, media query actualizada.

## Fase 2 — Recetas compactas en editar perfil

### 2.1 Tarjetas de sugerencia más compactas
- **Estado actual**: `client/src/components/ProfileFields.tsx:297-365` renderiza sugerencias con `RecipeCard` completo (hero 16:10, cuerpo, meta detallada). Ocupa mucho espacio vertical.
- **Cambio**: añadir prop `compact?: boolean` a `RecipeCard`. En modo compacto: layout horizontal, solo emoji/imagen pequeña (40×40), título y matched meals/words. Sin hero, sin meta, sin diet chips.
- **Aceptación**: las sugerencias en editar perfil ocupan ~1/3 del espacio vertical actual; la información relevante sigue visible.

## Fase 3 — Crear recetas propias

### 3.1 Formulario de creación de receta
- **Estado actual**: existe `useCreateRecipe` y `POST /api/recipes`, pero **no hay UI** para crear recetas. Solo se importan (TheMealDB, seed). `RecipeEditModal` solo edita variantes.
- **Cambio**:
  - Crear `client/src/pages/CreateRecipe.tsx` con formulario completo:
    - Título, emoji, descripción, URL imagen, raciones, tiempos (prep/cook)
    - Dietas: chips toggle (DIETS)
    - Comidas aptas: chips toggle (MEALS)
    - Cocina, regiones, temporadas (SEASONS)
    - Ingredientes: lista dinámica (nombre, cantidad, unidad, categoría) — reusar patrón de `RecipeEditModal`
    - Pasos: lista dinámica (texto + tip) — reusar patrón de `RecipeEditModal`
    - Tips y nutrición (kcal, proteína, carbs, grasa)
    - Source: `"local"`
  - Ruta: `#/recipes/new` → `CreateRecipe`
  - Botón `+ Crear receta` en `Recipes.tsx` page-head
- **Aceptación**: crear receta desde cero con todos los campos; aparece en catálogo con source "local".

### 3.2 Botón visible en la página de recetas
- **Cambio**: botón `+ Crear receta` tipo `primary` en `page-head` de `Recipes.tsx`.
- **Aceptación**: navega a `#/recipes/new`.

## Fase 4 — Planificador semanal con "solo mis recetas"

### 4.1 Toggle y filtro por source local
- **Estado actual**: `WeeklyPlan.tsx` y `RecipePicker` no filtran por source. Generar semana usa todo el catálogo.
- **Cambio**:
  - Estado local `localOnly` en `WeeklyPlan.tsx`
  - Botón toggle `📝 Solo mis recetas` en page-head del planificador
  - Pasar `localOnly` a `RecipePicker`
  - En `RecipePicker`, filtrar `list` por `source === "local"` cuando `localOnly` es true
- **Aceptación**: activando el toggle solo se muestran recetas propias en el picker.

## Fase 5 — Asistente LLM para crear recetas (opcional, gratuito)

### 5.1 Generar receta desde descripción con LLM gratuito
- **Estado actual**: no hay integración con LLMs. El usuario llena todos los campos manualmente.
- **Cambio**:
  - **Server**: endpoint `POST /api/recipes/generate` que usa OpenRouter (`google/gemini-2.0-flash-exp:free`). Recibe `{ description }`, genera un `Recipe` completo vía LLM. API key en `process.env.OPENROUTER_API_KEY`. Sin key → `{ available: false }`.
  - **Client**: hook `useGenerateRecipe`, textarea "Describe tu receta", botón `✨ Generar con IA` en `CreateRecipe.tsx`. Rellena los campos automáticamente; el usuario revisa antes de guardar.
- **Aceptación**: con `OPENROUTER_API_KEY` configurada, describir "sancochado de pollo con verduras peruano" rellena el formulario; sin key, avisa que no está disponible.

## Fase 6 — Mejora de la vista de inicio

### 6.1 Dashboard más informativo y visual
- **Estado actual**: `Dashboard.tsx` muestra tip, 3 columnas (plan hoy, makeable, caducar) y recomendaciones. Funcional pero simple.
- **Cambio**:
  - Stats bar: recetas totales, ítems en despensa, slots del plan, próxima caducidad
  - Acceso rápido: botones "Añadir a despensa", "Planificar semana", "Buscar recetas"
  - Tip card más destacado con botón refrescar
  - Recomendaciones con mejor diseño
- **Aceptación**: el dashboard muestra resumen útil de un vistazo y accesos rápidos.
