# Roadmap

Fases ordenadas por impacto/esfuerzo. Cada ítem incluye el estado actual, qué cambiar y criterios de aceptación. UI y tipos en español (convención del repo).

## Fase 1 — Pulido de UX (quick wins)

### 1.1 Contenido centrado en pantallas grandes
- **Estado actual**: `.content` en `client/src/index.css:166` tiene `max-width: 1280px` pero no `margin: 0 auto`, así que el contenido queda pegado a la izquierda en monitores anchos.
- **Cambio**: centrar el contenedor (p. ej. `margin-inline: auto`) y evaluar si el sidebar debe quedarse fijo a la izquierda.
- **Aceptación**: en pantallas >1440px el contenido queda centrado; en móvil no cambia nada.

### 1.2 Custom confirm en vez de `window.confirm`
- **Estado actual**: 6 usos de `window.confirm` nativo: `Pantry.tsx:120`, `Profiles.tsx:271`, `Shopping.tsx:95`, `History.tsx:71`, `WeeklyPlan.tsx:45` y `WeeklyPlan.tsx:158`.
- **Cambio**: crear componente `ConfirmDialog` (reutilizar estilos de `.modal` ya existentes) y un hook tipo `useConfirm()` que devuelva una promesa. Reemplazar todos los `window.confirm`.
- **Aceptación**: ninguna acción destructiva usa diálogos nativos del navegador.

### 1.3 Quitar ingrediente sin recargar
- **Estado actual**: `useDeletePantry` invalida queries (`client/src/api/hooks.ts:234`), pero el listado parece no refrescar. Verificar que `invalidateState` y `["pantry"]`/`["expiring"]` se refresquen y que no haya recarga de página.
- **Cambio**: depurar invalidación (o pasar de `useQuery` con `initialData` a cache actualizada en el `onSuccess`) para que el listado sea optimista.
- **Aceptación**: al borrar un ingrediente la tarjeta desaparece al instante sin recargar.

### 1.4 Toasts en agregar/eliminar ingredientes
- **Estado actual**: ya existe `ToastProvider`/`useToast` (`client/src/lib/toast.tsx`) y hay toasts al añadir en despensa, pero no al eliminar.
- **Cambio**: añadir toast en `onSuccess` de delete pantry (+ el resto de acciones sin feedback). Opcional: variantes (éxito/error) y animación de salida.
- **Aceptación**: agregar, eliminar y editar ingredientes siempre muestran un toast.

### 1.5 El plan no debe llenar días pasados
- **Estado actual**: `generateWeekPlan` (`server/src/services/planner.ts:96`) recorre todos los `DAYS` y `meals` sin mirar la fecha ni la hora actual; `POST /api/plan/generate` (`server/src/routes/plan.ts:53`) genera siempre la semana completa.
- **Cambio**: al generar el plan de la semana en curso, saltar los días anteriores a hoy y, para hoy, saltar las comidas cuya hora ya pasó (definir ventanas horarias como constantes: desayuno < 11h, almuerzo < 15h, cena < 21h). Si `weekStart` no es la semana actual, llenar todo.
- **Aceptación**: generar el plan un miércoles por la tarde deja lunes y martes vacíos y solo asigna desde el almuerzo/cena del miércoles en adelante.

### 1.6 Raciones iniciales = tamaño del hogar
- **Estado actual**: `RecipeDetail.tsx:35` y `CookingMode.tsx:15` inicializan `servings` en 1 aunque el perfil activo define `householdSize` (p. ej. "2 personas").
- **Cambio**: inicializar el stepper con `profile.householdSize` (fallback 1) cuando el perfil esté cargado, en detalle de receta y modo cocina, para que las cantidades escaladas ya reflejen las personas del hogar.
- **Aceptación**: al entrar a cualquier receta, el stepper y las cantidades de ingredientes parten del número de personas configurado en el perfil.

### 1.7 Todo el seed data en JSON (nada en código)
- **Estado actual**: las recetas ya viven en `server/data/recipes.json`, pero el resto del seed está hardcodeado en `seedState()` (`server/src/data/seed.ts:16-196`): perfiles, despensa (`pantry`), plan semanal, historial y ubicación (ej. el perfil "Familia Salcedo Huaroto" y sus ratings en las líneas 16-28). `db.json` (estado runtime) también está git-trackeado.
- **Cambio**: mover perfiles, despensa, plan, historial y ubicación a `server/data/seed.json` (mismo patrón que `recipes.json`), leyéndolo desde `seedState()`. En código solo quedan los cálculos dinámicos (fechas relativas: hoy, `weekStart`, `daysAgo`). Evaluar si `db.json` debe dejar de trackearse o quedar como muestra inicial.
- **Aceptación**: al inspeccionar `server/src/`, no queda ningún dato de perfiles/despensa/plan/historial hardcodeado; todo se carga de JSON.

## Fase 2 — Modelo de ingredientes

### 2.1 Catálogo de ingredientes con medida por defecto
- **Estado actual**: `PantryItem` guarda `unit` como string libre (`client/src/types.ts:124`); en el form de `Pantry.tsx` se elige de un array fijo `UNITS` (línea 6).
- **Cambio**: crear un catálogo de ingredientes (`name`, `category`, `defaultUnit`) en el server y enlazarlo al agregar. El select de unidades se filtra según el ingrediente elegido.
- **Aceptación**: cada ingrediente tiene un tipo de medida sugerido por defecto y no se pueden mezclar unidades inconsistentes al sumar.

### 2.2 Merge al añadir el mismo ingrediente
- **Estado actual**: `POST /api/pantry` (`server/src/routes/pantry.ts:30`) siempre hace `push` de un ítem nuevo.
- **Cambio**: en `POST`, si ya existe un ítem con el mismo `ingredientName` + `unit`, sumar `quantity` en vez de duplicar (mismo criterio en `PUT`).
- **Aceptación**: añadir "2 huevos" cuando ya hay "3 huevos" deja un solo ítem con 5.

### 2.3 Autocompletado al tipear
- **Estado actual**: el input de ingrediente es de texto libre.
- **Cambio**: datalist/combobox con sugerencias del catálogo + los ítems ya en despensa (y preferiblemente los ingredientes de las recetas).
- **Aceptación**: al escribir 2-3 caracteres aparecen sugerencias y se rellenan nombre + medida.

## Fase 3 — Ingreso rápido de ingredientes

### 3.1 Dictado por voz
- **Estado actual**: ✅ Implementado. `client/src/lib/speech.ts` expone `parseSpokenIngredient()` (frases → cantidad, unidad, precio e ingrediente) y el hook `useVoiceInput()` sobre la Web Speech API (`webkitSpeechRecognition`) en `es-PE`. `VoiceButton.tsx` (🎤) en el form de despensa rellena los campos y muestra un toast con lo reconocido.
- **Cambio**: botón de micrófono en el form de despensa usando Web Speech API en español. El texto transcrito se parsea en `cantidad`, `unidad` e `ingrediente` y se rellena el formulario.
- **Aceptación**: ✅ "compré un kilo de arroz" rellena los campos (cant. 1, kg, arroz) y deja el ítem listo para guardar; "1 sol de huevo" además rellena el precio.

### 3.2 Precio por ingrediente
- **Estado actual**: ✅ Implementado. `PantryItem.unitPrice` (moneda local, soles) en `types.ts` (server y espejo cliente), seed y `db.json`. `POST/PUT /api/pantry` aceptan `unitPrice` y calculan `grams`; el form tiene un campo "S/ por und.", la tarjeta de despensa muestra precio unitario y subtotal, y el dictado soporta el formato "1 sol de huevo".
- **Cambio**: añadir campo `unitPrice` (moneda local, p. ej. soles) a `PantryItem` + `types.ts` duplicado + seed. Permitir el formato "1 sol de huevo" = cantidad 1, precio unitario 1. Mostrar subtotal.
- **Aceptación**: ✅ cada ítem puede tener precio opcional, se muestra en despensa y suma correctamente.

### 3.3 Historial de gastos de ingredientes (semana/mes/año)
- **Estado actual**: ✅ Implementado. Nuevo `AppState.purchaseLog` (`PurchaseLogEntry[]` con `kind: "compra" | "consumo"`) en tipos, seed y `db.json`. Se registra automáticamente al añadir ingredientes con precio (`POST /api/pantry`) y al eliminarlos (`DELETE`). Nueva página **Gastos** (`client/src/pages/Spending.tsx`, ruta `#/spending`) con `GET /api/spending?period=week|month|year`: total gastado, nº de compras, desglose por ingrediente y por categoría, tendencia y movimientos recientes.
- **Cambio**: log de compras/consumo de ingredientes (nuevo campo en `AppState` + `types.ts` duplicado + seed); registro automático; vista de reporte por período (semana, mes, año).
- **Aceptación**: ✅ desde la nueva página se puede ver cuánto se gastó en la semana y en el mes, desglosado por ingrediente.

### 3.4 Búsqueda de equivalencias en internet (evaluar y expandir)
- **Estado actual**: ✅ Piloto implementado con fuente offline. En vez de una API externa, se usa una tabla estática (`server/data/equivalentias.json`, ~26 ingredientes comunes: harina, arroz, azúcar…) servida por `server/src/services/equivalentias.ts` (endpoint `GET /api/ingredients/equivalent`). Al añadir un ingrediente con medida ambigua ("2 tazas de harina"), `POST /api/pantry` guarda `PantryItem.grams` normalizado y la UI muestra "≈ 250 g" y la pista en el form. El catálogo (`ingredients.json`) ahora incluye `tazas`/`cucharadas`/`cucharaditas` en los ingredientes con equivalencia. **Pendiente de evaluar**: fuente externa (API vs scraping), caché y expansión del set.
- **Cambio**: feature experimental. Al añadir un ingrediente con medida ambigua ("1 taza", "1 cabeza"), buscar equivalencia a gramos/ml vía fuente externa y guardar un valor normalizado.
- **Aceptación (piloto)**: ✅ un set acotado de ingredientes comunes (harina, arroz, azúcar…) resuelve equivalencias "taza → g" con el dato guardado en despensa.

## Fase 4 — Perfiles

### 4.1 Menú de perfil desplegable
- **Estado actual**: ✅ Implementado. `App.tsx:135` ya no tiene el botón "Cambiar perfil" ni el `<select>`; hay un nuevo componente `ProfileMenu.tsx` en la topbar: avatar + caret que abre un dropdown con el perfil activo, cambio de perfil a 1 click y acceso a "Gestionar perfiles". Los perfiles incompletos se marcan con una badge "Incompleto".
- **Cambio**: ocultar el botón; al hacer click en el avatar/topbar se abre un menú dropdown con: perfil activo, cambiar a otro perfil, y acceso a la página de Perfiles/Ajustes.
- **Aceptación**: ✅ la topbar queda limpia y el cambio de perfil está a 1 click desde el avatar.

### 4.2 Onboarding con campos obligatorios y opcionales
- **Estado actual**: ✅ Implementado. Nuevo `ProfileWizard.tsx` (modal de 2 pasos) que se abre al primer ingreso si no hay perfiles y desde "Nuevo perfil" en Perfiles: paso 1 obligatorio (nombre, personas en el hogar), paso 2 opcional (dietas, restricciones, comidas). `ProfileFields.tsx` es el form compartido que además permite editar todos los campos en la página de Perfiles. El server calcula `isComplete` (nombre + hogar ≥ 1) en `server/src/types.ts` y solo activa un perfil nuevo cuando está completo (`profiles.ts:58`).
- **Cambio**:
  - Flujo guiado (wizard/modal) al primer ingreso y al crear un perfil: paso 1 obligatorio (nombre, personas en el hogar), paso 2 opcional (dietas, restricciones, comidas al día, unidad/preferencias).
  - Permitir editar todos estos campos en la página de Perfiles (hoy `saveEdit` solo guarda nombre + restricciones en `Profiles.tsx:146`).
  - Marcar el perfil como "incompleto" hasta llenar lo obligatorio.
- **Aceptación**: ✅ un perfil nuevo no queda activo hasta completar lo obligatorio; todo lo opcional se puede editar luego en Perfiles.

### 4.3 Catálogo de recetas según la configuración del usuario
- **Estado actual**: ✅ Implementado. `GET /api/recipes` aplica por defecto los filtros del perfil activo (dietas/restricciones) y resuelve overrides vía `recipeVariants.ts`; `?profile=all` muestra el catálogo completo y `?profile=none|<id>` permite elegir. En la página Recetas hay un toggle "👤 Según mi perfil / 👥 Todas" y el botón "⬇ Importar según mi perfil" que llama `POST /api/themealdb/auto-import` (busca por comidas y dietas del perfil, importa hasta 8 recetas compatibles). Dashboard y catálogo usan las variantes resueltas.
- **Cambio** (depende de 4.2): una vez definida la config del usuario (dietas, restricciones, comidas al día):
  - `GET /api/recipes` aplica por defecto los filtros del perfil activo (dietas/restricciones) salvo override explícito.
  - Importación automática desde TheMealDB según el perfil (por categoría/cocina/ingredientes compatibles y comidas que usa) en vez de buscar e importar a mano.
  - Dashboard y catálogo muestran solo recetas relevantes ("lo que realmente va a usar").
- **Aceptación**: ✅ al cambiar la config de un perfil, el catálogo y las importaciones se ajustan automáticamente a lo que ese usuario consume.

### 4.4 Personalizar y editar recetas por familia
- **Estado actual**: ✅ Implementado. `RecipeDetail` tiene el botón "✎ Adaptar a mi familia" que abre `RecipeEditModal.tsx` (título, emoji, raciones, descripción, dietas, ingredientes y cantidades, pasos). Cada perfil puede guardar una variante (`profile.recipeOverrides` en `server/src/routes/profiles.ts`, endpoints `PUT/DELETE /:id/recipe-overrides/:recipeId`) resuelta por `recipeVariants.ts`; el catálogo base queda intacto. Plan semanal, historial, compras y recomendaciones consumen las variantes resueltas.
- **Cambio**:
  - UI de edición de receta accesible desde `RecipeDetail` (título, emoji, ingredientes y cantidades, pasos, raciones, dietas).
  - Personalización por familia/perfil: cada perfil puede tener una variante de una receta base (ajustar raciones al hogar, sustituir ingredientes prohibidos, adaptar pasos a las costumbres) guardada como override; el catálogo base queda intacto.
  - Los cambios deben propagarse a plan semanal, historial y compras (referencian por `recipeId`).
- **Aceptación**: ✅ una familia puede adaptar cualquier receta a sus costumbres sin afectar el catálogo, y esos cambios se reflejan en plan y compras.

### 4.5 Configuración de comidas y platos habituales por voz
- **Estado actual**: ✅ Implementado. El dictado captura pares "comida + plato habitual" (p. ej. "desayuno jugo surtido o avena, almuerzo estofado de lentejas") y se persisten como `usualDishes: Record<MealType, string[]>` en el perfil (server `types.ts`, ruta `profiles.ts`, backfill en `db.ts`). `client/src/lib/speech.ts` expone `parseSpokenMealHabits()` (detecta las comidas con "desayuno/desayunar", "almuerzo/almorzar/comer", "cena/cenar", separa los platos por "y"/"o") y `suggestRecipesForUsualDishes()`, que puntúa el catálogo (título > ingredientes > descripción, con bonus si la receta es apta para esa comida). En `ProfileFields.tsx` la sección "Platos habituales" tiene el botón 🎤, chips editables por comida y el panel "Según tus hábitos, podrías preparar". Los chips de comidas al día se seleccionan solo con clics.
- **Cambio** (depende de 3.1): en el flujo de perfil (nuevo y edición), dictado por voz (Web Speech API en español) que transcriba frases tipo "desayuno jugo surtido o avena, almuerzo estofado de lentejas" → pares `MealType → string[]` de platos habituales. Con esos platos se sugiere recetas parecidas del catálogo (match por título/ingredientes y aptitud para la comida). Seleccionar desayuno/almuerzo/cena se hace con clics; el dictado no reemplaza los chips.
- **Aceptación**: ✅ al dictar "desayuno jugo surtido o avena, almuerzo estofado de lentejas", el perfil guarda esos platos por comida, las sugerencias muestran recetas de lentejas/avena, y los chips de comidas al día se marcan solo con clic.

## Fase 5 — Presentación de recetas

### 5.1 Vista de recetas más llamativa con fotos reales
- **Estado actual**: todas las recetas se muestran solo con un emoji en un recuadro de color: `RecipeCard.tsx:22` (`.recipe-thumb`, 62px, CSS `index.css:482`), `RecipeDetail.tsx:96` (`.detail-emoji`, 52px), `CookingMode.tsx:106` y `Dashboard.tsx:99`. El campo `Recipe.image` ya existe en `types.ts:112` (server + espejo cliente), pero solo lo rellenan las importaciones de TheMealDB (`server/src/services/themealdb.ts:149`); ninguna receta local de `server/data/recipes.json` tiene `image`, así que las tarjetas nunca muestran fotos.
- **Cambio**:
  - Poblar `image` en las recetas locales con fotos reales de la comida (p. ej. URLs de fuentes con licencia libre como TheMealDB/Unsplash/Openverse añadidas a `recipes.json`, o búsqueda por título).
  - Rediseñar `RecipeCard` con foto destacada (imagen de fondo/portada con título encima o foto en la tarjeta), manteniendo el emoji como fallback si no hay imagen.
  - Mostrar la foto en el detalle (`RecipeDetail`), modo cocina y plan semanal cuando exista.
  - Decidir si las fotos se sirven proxied desde el server (evitar hotlinking/CSP) o se cargan directo desde el cliente con fallback a emoji.
- **Aceptación**: las tarjetas del catálogo muestran una foto real del plato; el detalle y el modo cocina muestran la imagen grande; sin imagen se mantiene el emoji actual y no rompe.
