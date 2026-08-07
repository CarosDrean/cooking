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
- **Estado actual**: en `App.tsx:135` hay un botón "Cambiar perfil" + un `<select>` con todos los perfiles en la topbar.
- **Cambio**: ocultar el botón; al hacer click en el avatar/topbar se abre un menú dropdown con: perfil activo, cambiar a otro perfil, y acceso a la página de Perfiles/Ajustes.
- **Aceptación**: la topbar queda limpia y el cambio de perfil está a 1 click desde el avatar.

### 4.2 Onboarding con campos obligatorios y opcionales
- **Estado actual**: crear perfil pide nombre, dietas, restricciones, personas en el hogar y comidas al día (`Profiles.tsx`), pero no hay flujo de primer ingreso ni distinción obligatorio/opcional; editar solo permite nombre y restricciones.
- **Cambio**:
  - Flujo guiado (wizard/modal) al primer ingreso y al crear un perfil: paso 1 obligatorio (nombre, personas en el hogar), paso 2 opcional (dietas, restricciones, comidas al día, unidad/preferencias).
  - Permitir editar todos estos campos en la página de Perfiles (hoy `saveEdit` solo guarda nombre + restricciones en `Profiles.tsx:146`).
  - Marcar el perfil como "incompleto" hasta llenar lo obligatorio.
- **Aceptación**: un perfil nuevo no queda activo hasta completar lo obligatorio; todo lo opcional se puede editar luego en Perfiles.

### 4.3 Catálogo de recetas según la configuración del usuario
- **Estado actual**: el catálogo es fijo (`server/data/recipes.json`) y las recetas de TheMealDB se importan una por una y manualmente (`POST /api/themealdb/import`, `server/src/routes/themealdb.ts:21`). `GET /api/recipes` filtra solo con query params manuales y no aplica la config del perfil activo; el perfil solo se usa en las recomendaciones (`server/src/services/recommender.ts:16`).
- **Cambio** (depende de 4.2): una vez definida la config del usuario (dietas, restricciones, comidas al día):
  - `GET /api/recipes` aplica por defecto los filtros del perfil activo (dietas/restricciones) salvo override explícito.
  - Importación automática desde TheMealDB según el perfil (por categoría/cocina/ingredientes compatibles y comidas que usa) en vez de buscar e importar a mano.
  - Dashboard y catálogo muestran solo recetas relevantes ("lo que realmente va a usar").
- **Aceptación**: al cambiar la config de un perfil, el catálogo y las importaciones se ajustan automáticamente a lo que ese usuario consume.

### 4.4 Personalizar y editar recetas por familia
- **Estado actual**: la API ya soporta `POST`/`PUT /api/recipes` (`server/src/routes/recipes.ts:90-132`), pero no hay UI de edición: `RecipeDetail.tsx` solo permite favoritos, rating, añadir al plan y modo cocina. Las recetas de `recipes.json` son read-only y no hay adaptación por familia (la misma receta para todos los perfiles).
- **Cambio**:
  - UI de edición de receta accesible desde `RecipeDetail` (título, emoji, ingredientes y cantidades, pasos, raciones, dietas).
  - Personalización por familia/perfil: cada perfil puede tener una variante de una receta base (ajustar raciones al hogar, sustituir ingredientes prohibidos, adaptar pasos a las costumbres) guardada como override; el catálogo base queda intacto.
  - Los cambios deben propagarse a plan semanal, historial y compras (referencian por `recipeId`).
- **Aceptación**: una familia puede adaptar cualquier receta a sus costumbres sin afectar el catálogo, y esos cambios se reflejan en plan y compras.

### 4.5 Configuración de comidas por voz al crear perfil
- **Estado actual**: la creación/edición de perfil ya captura las comidas como chips (`Profiles.tsx:102`, `MealType[]` con `desayuno/almuerzo/cena`), pero solo se marca a mano. No hay forma de "decirle" las comidas que se comen habitualmente y que se usen como base de la config inicial (la config de un perfil nuevo parte de defaults hardcodeados en `Profiles.tsx:102`).
- **Cambio** (depende de 3.1): en el paso de comidas al día del flujo de perfil (nuevo y edición), añadir dictado por voz (Web Speech API en español) que transcriba frases tipo "desayuno, almuerzo y cena" o "como desayuno y cena" y las parsee a `MealType[]`, marcando los chips correspondientes. Sinónimos: "desayunar" → desayuno, "comer/almuerzo" → almuerzo, "cenar" → cena. El parseo debe ser tolerante a comas, "y", "o", artículos y pausas de dictado. Lo seleccionado queda como base persistida en el perfil (ya lo usa `planner.ts:98` para generar el plan).
- **Aceptación**: al crear un perfil, decir "desayuno, almuerzo y cena" (o "solo desayuno y cena") rellena la selección de comidas correctamente y el plan semanal de ese perfil se genera solo con esas comidas.

## Fase 5 — Presentación de recetas

### 5.1 Vista de recetas más llamativa con fotos reales
- **Estado actual**: todas las recetas se muestran solo con un emoji en un recuadro de color: `RecipeCard.tsx:22` (`.recipe-thumb`, 62px, CSS `index.css:482`), `RecipeDetail.tsx:96` (`.detail-emoji`, 52px), `CookingMode.tsx:106` y `Dashboard.tsx:99`. El campo `Recipe.image` ya existe en `types.ts:112` (server + espejo cliente), pero solo lo rellenan las importaciones de TheMealDB (`server/src/services/themealdb.ts:149`); ninguna receta local de `server/data/recipes.json` tiene `image`, así que las tarjetas nunca muestran fotos.
- **Cambio**:
  - Poblar `image` en las recetas locales con fotos reales de la comida (p. ej. URLs de fuentes con licencia libre como TheMealDB/Unsplash/Openverse añadidas a `recipes.json`, o búsqueda por título).
  - Rediseñar `RecipeCard` con foto destacada (imagen de fondo/portada con título encima o foto en la tarjeta), manteniendo el emoji como fallback si no hay imagen.
  - Mostrar la foto en el detalle (`RecipeDetail`), modo cocina y plan semanal cuando exista.
  - Decidir si las fotos se sirven proxied desde el server (evitar hotlinking/CSP) o se cargan directo desde el cliente con fallback a emoji.
- **Aceptación**: las tarjetas del catálogo muestran una foto real del plato; el detalle y el modo cocina muestran la imagen grande; sin imagen se mantiene el emoji actual y no rompe.
