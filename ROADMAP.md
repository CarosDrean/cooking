# Roadmap

Fases ordenadas por impacto/esfuerzo. Cada ítem incluye el estado actual, qué cambiar y criterios de aceptación. UI y tipos en español (convención del repo).

## ✅ Fase 1 — Pulido de UX (quick wins) — COMPLETADA

Completada el 2026-08-07. Todos los criterios de aceptación verificados en navegador y `pnpm check` en verde.

### ✅ 1.1 Quitar el subtítulo "Perfil activo" de la topbar
- **Estado actual**: `client/src/App.tsx` muestra "Hola, {nombre}" y debajo el subtítulo "Perfil activo: {nombre}". El saludo se mantiene; el subtítulo es redundante porque el perfil activo ya se identifica en el avatar y en su menú desplegable.
- **Cambio**: eliminar solo el `<span className="topbar-sub">Perfil activo: {nombre}</span>` de la topbar; conservar "Hola, {nombre}".
- **Aceptación**: la topbar muestra "Hola, {nombre}" sin el subtítulo "Perfil activo: …".
- **✅ Completado**: subtítulo eliminado; además se añadió un reloj en vivo (`viernes, 7 ago · 11:08`) en `App.tsx` con CSS `.topbar-date`.

### ✅ 1.2 Menú de perfil con acciones (ver perfil, ajustes, etc.)
- **Estado actual**: `client/src/components/ProfileMenu.tsx` abre un dropdown con el perfil activo, la lista de perfiles para cambiar a 1 click y el enlace "Gestionar perfiles →". No tiene opciones de navegación como "Ver mi perfil" o "Ajustes".
- **Cambio**: ampliar el dropdown con una sección de acciones: "Ver mi perfil" (→ `#/profiles`), "Ajustes" (→ `#/settings`) y mantener el cambio de perfil y "Gestionar perfiles".
- **Aceptación**: al desplegar el avatar salen opciones claras: ver perfil, cambiar de perfil, gestionar perfiles y ajustes, cada una navegando a su página.
- **✅ Completado**: acciones añadidas en `ProfileMenu.tsx` con CSS `.profile-dropdown-actions`.

### ✅ 1.3 Gastos: movimientos ordenados por más reciente
- **Estado actual**: `server/src/services/spending.ts:117` ordena `movements` solo por `date` (ISO de día) de forma descendente. Como `PurchaseLogEntry` guarda solo la fecha (`logMovement`, `spending.ts:135-141`), los movimientos del mismo día mantienen el orden de inserción: lo último ingresado queda al final, no al inicio. El usuario reportó que "sal", su último ingreso, aparece como tercero.
- **Cambio**: añadir un timestamp/orden de creación a `PurchaseLogEntry` (p. ej. `createdAt` ISO con hora, o un contador) en tipos duplicados + seed + `db.json`, y ordenar `movements` por `createdAt` descendente (con `date` como fallback). Reflejarlo también en el sort de `byIngredient`/tendencia si aplica.
- **Aceptación**: en la página Gastos, el movimiento más reciente (incluidos los del mismo día) aparece primero.
- **✅ Completado**: `createdAt` añadido a `PurchaseLogEntry` (tipos duplicados + seed + `db.json`), `logMovement` lo setea y `movements` se ordena por `createdAt` desc con fallback `date`. Además se arreglaron dos bugs derivados: editar un ítem sin precio para ponerle precio ahora registra la compra (`PUT /api/pantry/:id`), y las mutaciones de despensa invalidan la query `["spending"]` para que Gastos se actualice sin recargar.

### ✅ 1.4 Dictado de despensa: cantidad y unidad contables ("2 bolsas de sal")
- **Estado actual**: reportado por el usuario: al dictar "2 bolsas de sal" no se rellena la cantidad. El parseo vive en `client/src/lib/speech.ts` (`parseSpokenIngredient`, `parseQuantityPrefix`): el caso aislado "2 bolsas de sal" resuelve (cant. 2, "bolsas"), pero es frágil ante variantes reales del dictado (números transcritos como ordinales/"a dos", relleno al final como "por favor", unidades contables compuestas, fracciones "y media", "unidades de X").
- **Cambio**: robustecer `parseSpokenIngredient` para que cualquier patrón "cantidad + unidad contable + de + ingrediente" rellene siempre cantidad y unidad (normalizando singular/plural, símbolos y relleno en cualquier posición). Asegurar que la unidad reconocida (p. ej. "bolsas") aparezca en el select de unidades de `client/src/pages/Pantry.tsx` (hoy `DEFAULT_UNITS` no la incluye, aunque `unitOptions` la agrega al vuelo). Añadir pruebas manuales de los casos típicos.
- **Aceptación**: dictar "2 bolsas de sal", "dos bolsas de sal", "compré 2 bolsas de sal por favor" rellena cantidad=2, unidad=bolsas, nombre=sal; "2 bolsas de sal y media" rellena cantidad=2.5; el guardado suma correctamente.
- **✅ Completado**: `parseSpokenIngredient` robustecido en `speech.ts` (`stripFillerEdges`, `parseQuantityUnitAnywhere`, unidades contables nuevas, fracciones, rellenos). Extras: compra por moneda ("50 céntimos de culantro", "2 soles de canela" → precio, céntimos ÷100) y fix de unidad al dictar solo precio (ya no rellena "g" por defecto). El toast muestra la transcripción cruda para diagnóstico.

## Fase 2 — Restricciones y sugerencias de platos habituales

### 2.1 Autocompletado al escribir una restricción por ingrediente
- **Estado actual**: `RestrictionsEditor` en `client/src/components/ProfileFields.tsx:56-68` es un input de texto libre sin sugerencias; solo valida que no esté vacío. El catálogo de ingredientes ya existe (`GET /api/ingredients`, `server/data/ingredients.json`) y `Pantry.tsx:74-93` ya construye sugerencias (catálogo + despensa + recetas).
- **Cambio**: reutilizar la misma fuente de sugerencias (datalist/combobox) en el input de restricciones: catálogo + ingredientes de recetas + despensa. Al elegir/teclear un ingrediente del catálogo, mostrar su categoría.
- **Aceptación**: al escribir 2-3 letras en "Restricciones de ingredientes" aparecen sugerencias del catálogo y de las recetas, y se puede añadir con Enter o clic.

### 2.2 Restricción directa vs derivada (y matching que no falle)
- **Estado actual**: reportado por el usuario: con "leche" como restricción, se sugirió "Quinoa con leche". El matching en `server/src/services/diet.ts:36-41` (`matchingRestrictions`) compara **igualdad exacta** del nombre normalizado: "leche" no coincide con "leche evaporada", "queso", "yogurt" ni "mantequilla". Además `restrictedCount`/`isForbidden` sufren del mismo problema. No existe concepto de restricción directa vs derivada.
- **Cambio**:
  - Añadir a `IngredientRestriction` el modo de aplicación: **directa** (el ingrediente tal cual: "pescado") vs **derivada** (productos derivados: "leche" → leche evaporada, leche de coco, yogurt, queso, mantequilla, crema), con un set de derivados/alias editable o resuelto desde el catálogo (`ingredients.json`).
  - Cambiar `matchingRestrictions` a matching por subcadena/stem sobre los nombres de ingredientes + derivados, en vez de igualdad exacta (p. ej. "leche" bloquea "leche evaporada").
  - Marcar visualmente en `ProfileFields.tsx` si cada restricción es directa o derivada.
- **Aceptación**: con "leche" como restricción (derivada), "Quinoa con leche" y toda receta con leche evaporada/queso/yogurt se marca como no permitida (o "consume con moderación" según nivel); el catálogo no muestra esas recetas según el perfil.

### 2.3 Las sugerencias de platos habituales respetan restricciones y comidas
- **Estado actual**: `suggestRecipesForUsualDishes` (`client/src/lib/speech.ts:409-449`) puntúa el catálogo por título/ingredientes/descripción **sin filtrar por las restricciones ni las dietas del perfil**; por eso "pan con avena" pudo sugerir "Quinoa con leche" pese a la restricción de leche. Tampoco limita por `suitableFor` más allá de un bonus de +3.
- **Cambio**: pasar las restricciones/dietas del perfil a `suggestRecipesForUsualDishes` y descartar (o penalizar fuerte) las recetas que violan restricciones de nivel "no"/"no-principal", con la misma lógica que `isForbidden`/`restrictedCount` del server (`diet.ts`). Mantener el bonus de aptitud por comida (`suitableFor`).
- **Aceptación**: si el perfil restringe leche, las sugerencias de platos habituales no incluyen ninguna receta con leche o derivados, y siguen siendo aptas para la comida correspondiente.

### 2.4 Sugerencias de platos habituales separadas por comida
- **Estado actual**: `client/src/components/ProfileFields.tsx:279-297` muestra "Según tus hábitos, podrías preparar" como una lista plana de `RecipeCard`, con las comidas como etiqueta pequeña en cada tarjeta. Cuando hay hábitos de desayuno, almuerzo y cena a la vez, todo se mezcla.
- **Cambio**: agrupar las sugerencias en secciones/columnas por comida (Desayuno / Almuerzo / Cena), mostrando en cada una las recetas cuyo `matchedMeals` incluye esa comida (o la mejor correspondencia). Si no hay sugerencias para una comida, omitir la sección.
- **Aceptación**: con hábitos de las 3 comidas, las sugerencias aparecen organizadas en 3 secciones o columnas claras, cada una con sus recetas.

### 2.5 Voto en las sugerencias (quitar, no sugerir, menos/más similares)
- **Estado actual**: `suggestRecipesForUsualDishes` devuelve un ranking estático sin memoria; el panel "Según tus hábitos, podrías preparar" no permite influir en lo que se sugiere. El usuario quiere, por ejemplo, que "pan con chicharrón" se sugiera solo en pocas ocasiones.
- **Cambio**: añadir controles por sugerencia: ✕ (quitar de la lista), "🙅 No sugerir más", "Menos similar" y "Más similares". Persistir ese feedback por perfil (nuevo campo, p. ej. `Profile.suggestionFeedback: Record<recipeId, {hide: boolean; weight: number}>` o `usualDishFeedback`) en tipos duplicados + seed + `db.json`, y aplicar pesos/ocultos en `suggestRecipesForUsualDishes` (score, orden y exclusión).
- **Aceptación**: al votar una sugerencia, se quita de inmediato; "No sugerir más" la excluye permanentemente del panel; "Menos/Más similares" baja o sube su recurrencia en futuras visitas, todo persistido por perfil.

## Fase 3 — Presentación de recetas

### 3.1 Vista de recetas: grid con fotos protagonistas (no lista)
- **Estado actual**: `client/src/pages/Recipes.tsx:134-137` pinta `RecipeCard` dentro de `.card-list` (`client/src/index.css:427`, columna vertical). `RecipeCard` (`RecipeCard.tsx`) muestra la foto en una miniatura de 64×64 (`.recipe-thumb`, `index.css:482`): la imagen queda relegada frente al texto.
- **Cambio**: rediseñar la grilla del catálogo (`.recipe-grid`, tipo `.grid-3`) con tarjetas tipo tarjeta/portada: imagen de fondo o cabecera grande (aspect ratio ~16:10), título y meta encima/abajo, emoji como fallback si no hay `image`. Mantener los filtros actuales y el toggle "Según mi perfil".
- **Aceptación**: en la vista Recetas las fotos dominan visualmente la tarjeta; sin imagen se mantiene el fallback emoji y no rompe; en móvil la grilla se apila a 1 columna.

### 3.2 Detalle de receta: foto grande con protagonismo
- **Estado actual**: `client/src/pages/RecipeDetail.tsx:98-105` muestra la foto en `.detail-photo` de 120×120 (`index.css:825`), a la izquierda del título; es una miniatura más, no la protagonista.
- **Cambio**: hacer la foto un hero del detalle: imagen grande a lo ancho del contenido (o dos tercios) arriba, con el título superpuesto o justo debajo; mantener el emoji como fallback. El modo cocina (`CookingMode.tsx:105`) puede heredar el mismo tratamiento.
- **Aceptación**: al abrir una receta, la foto del plato es el elemento central y visible de inmediato; sin imagen se mantiene el fallback emoji.

## Fase 4 — Ajustes y localización

### 4.1 País y ciudad seleccionables o con autorelleno
- **Estado actual**: `client/src/pages/Settings.tsx:53-70` usa dos inputs de texto libre (País, Ciudad). No hay lista de países ni ciudades, ni geolocalización.
- **Cambio**: convertir País en un select/datalist de países y Ciudad en un combobox con autorelleno (datalist de ciudades, priorizando las del país elegido); opcional: botón "Usar mi ubicación" con la API de geolocalización para precargar país/ciudad. El valor guardado sigue yendo a `PUT /api/settings`.
- **Aceptación**: el usuario puede elegir país/ciudad sin teclear a ciegas, con sugerencias según lo que escribe; seleccionar país filtra las ciudades sugeridas.

## Fase 5 — Bebidas

### 5.1 Bebidas editables y aptas por comida
- **Estado actual**: `DRINKS` es un arreglo estático hardcodeado y duplicado en `server/src/types.ts:185-198` y `client/src/types.ts`. No es editable (ni agregar/eliminar/renombrar), y no tiene información de para qué comidas es apta: `MealSlot.drink` es un string libre (`WeeklyPlan.tsx:86-93` cicla entre todas las bebidas), `needsDrink` solo exige bebida para almuerzo y cena (`planner.ts:36-41`) y `randomDrink` elige entre todas. Hay bebidas de desayuno (café, chocolate caliente) que hoy se ofrecen para almuerzo/cena y viceversa.
- **Cambio**:
  - Mover las bebidas a estado: `AppState.drinks: Drink[]` (tipos duplicados + seed + `db.json`), con `suitableFor: MealType[]` en cada `Drink` (p. ej. café: desayuno; chicha morada: almuerzo y cena; jugo: todas).
  - Endpoints CRUD de bebidas (`GET/POST/PUT/DELETE /api/drinks`) y backfill de `DRINKS` actuales con `suitableFor` razonable.
  - UI para editar/agregar/eliminar bebidas (desde Ajustes o Plan semanal), con selección de las comidas para las que es apta.
  - `planner.ts` y `WeeklyPlan.tsx` filtran por `suitableFor` de la comida al elegir/randomizar bebida.
- **Aceptación**: el usuario puede crear, editar y borrar bebidas desde la UI; al asignar/randomizar la bebida de un slot solo se ofrecen las aptas para esa comida; las bebidas existentes se migran sin perder datos.

## Fase 6 — Importación de recetas según el perfil

### 6.1 Motor de importación multi-fuente (no solo TheMealDB)
- **Estado actual**: la única fuente externa es TheMealDB. `POST /api/themealdb/auto-import` (`server/src/routes/themealdb.ts:46-83`) y el servicio `server/src/services/themealdb.ts` mapean `strMeal`→`Recipe` (solo platos, en inglés, con `suitableFor: ["almuerzo","cena"]` en `themealdb.ts:153`). No hay adaptadores por fuente ni una ruta única de importación.
- **Cambio**:
  - Crear un pipeline de importación con adaptadores por fuente que normalicen cada resultado a un `Recipe`/`Drink` común:
    - **TheMealDB** (sin clave): platos.
    - **TheCocktailDB** (sin clave, hermano de TheMealDB): bebidas → alimenta la Fase 5 (`AppState.drinks`), con `suitableFor` inferido (café/chocolate → desayuno; refrescos → almuerzo/cena; jugos → todas).
    - **Catálogo local**: `server/data/recipes.json` + un seed de recetas ampliado (cocina peruana/latinoamericana de calidad curada, con imágenes de Openverse) como fuente offline de respaldo.
    - **Openverse**: imágenes con licencia libre para recetas importadas sin foto.
    - **Opcional con API key** (detrás de un flag en Ajustes, deshabilitado por defecto): Edamam o Spoonacular para ampliar el catálogo.
  - Consolidar todo bajo un único `POST /api/import/auto-import` (dejando `themealdb/*` como compat) que recorra las fuentes según prioridad y disponibilidad.
- **Aceptación**: "⬇ Importar según mi perfil" consulta varias fuentes (no solo TheMealDB); las bebidas de TheCocktailDB entran a `AppState.drinks`; el catálogo local curado complementa lo importado; si una fuente falla o no hay clave, el resto sigue funcionando.

### 6.2 Puntuación y selección según el perfil (inteligente)
- **Estado actual**: `auto-import` usa queries fijas en inglés ("breakfast", "dinner", "chicken", "gluten"…) a partir de `mealsPerDay` y `dietPreferences`, importa hasta 8 y solo filtra por `isDietCompatible`/`isForbidden`. No usa `usualDishes`, no puntúa por temporada/ubicación y no prioriza desayunos reales.
- **Cambio**: sobre los resultados normalizados de 6.1:
  - Construir queries desde `usualDishes` (platos → términos traducidos), restricciones, temporada/país y dieta; para desayuno buscar términos de desayuno y marcar `suitableFor` según la comida detectada.
  - Puntuar cada resultado (disponibilidad local, afinidad con platos habituales, aptitud por comida, preferencias del usuario) e importar solo los de mejor puntaje, respetando restricciones.
  - **La despensa NO es un limitador por defecto**: solo se usa como bonus pequeño (p. ej. +2 si se puede hacer ya) o como filtro estricto si el usuario activa "Con mi despensa" (mismo toggle que el catálogo en `Recipes.tsx`). Importar recetas que no se pueden hacer hoy es válido.
  - Deduplicar por similitud semántica de título/ingredientes entre fuentes y contra el catálogo existente; si hay muy pocos resultados, ampliar queries en varios idiomas/categorías.
- **Aceptación**: tras "⬇ Importar según mi perfil" se importan recetas alineadas con el perfil (desayunos para el desayuno, sin ingredientes restringidos, con ingredientes de temporada) en cantidad suficiente, sin duplicados entre fuentes, y sin que la despensa limite el resultado salvo que el usuario lo pida explícitamente.

### 6.3 Fuente de IA generativa (opcional, con clave)
- **Estado actual**: ninguna fuente usa IA; todo es estático o APIs públicas sin clave. Las recetas importadas de TheMealDB llegan en inglés, sin foto ni `suitableFor` correcto, y no se generan platos nuevos.
- **Cambio**:
  - Adapter de IA generativa que, a partir del perfil (despensa, `usualDishes`, restricciones, dietas, comidas, temporada/país), genera recetas completas y coherentes: título, emoji, descripción, ingredientes con cantidades/unidades normalizadas (vía catálogo/equivalencias), pasos, dietas, `suitableFor`, `protagonist`, temporada y nutrición estimada. También puede generar bebidas (alimenta Fase 5).
  - Proveedores configurables: OpenAI, Anthropic, Google Gemini y/o local vía **Ollama** (sin clave, offline — encaja con el ethos actual sin API key). La clave se configura en Ajustes o como variable de entorno del server; **nunca** se persiste en `db.json`/seed ni se envía al cliente.
  - El resultado pasa por el mismo filtro de 6.2 (restricciones, dieta, puntuación por temporada/ubicación; la despensa solo como bonus o si se activa "Con mi despensa") y un mapeo/validación al esquema `Recipe` antes de importar; uso secundario: normalizar/traducir ingredientes y detectar `suitableFor` de recetas importadas de otras fuentes.
  - Timeouts, rate-limit y concurrencia acotada; si no hay clave o el servicio falla, se cae al resto de fuentes sin romper.
- **Aceptación**: con una clave configurada, "⬇ Importar según mi perfil" puede crear recetas nuevas acordes a la despensa y restricciones del perfil; sin clave, las demás fuentes siguen funcionando; ninguna clave queda en el estado, seed ni repositorio.
