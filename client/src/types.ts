export type MealType = "desayuno" | "almuerzo" | "cena";

export type Day = "lunes" | "martes" | "miercoles" | "jueves" | "viernes" | "sabado" | "domingo";

export type IngredientCategory =
    | "verduras"
    | "frutas"
    | "proteinas"
    | "lacteos"
    | "granos"
    | "condimentos"
    | "despensa"
    | "otros";

export type RecipeSource = "local" | "themealdb";

export type Season = "primavera" | "verano" | "otonio" | "invierno";

export type RestrictionLevel = "no" | "poco" | "no-principal";

export interface IngredientRestriction {
    name: string;
    level: RestrictionLevel;
}

/** Grupos de ingredientes derivados (p. ej. "leche" → leche evaporada, queso, mantequilla…). */
export const DERIVED_GROUPS: Record<string, string[]> = {
    leche: [
        "leche evaporada",
        "leche condensada",
        "leche de almendras",
        "leche de coco",
        "leche de soja",
        "queso",
        "queso feta",
        "queso fresco",
        "parmesano",
        "mantequilla",
    ],
    pescado: [
        "pescado blanco",
        "filete de pescado blanco",
        "salmón",
        "atún en lata",
        "camarón",
        "calamar",
        "mariscos mixtos",
        "conchas",
    ],
    pollo: ["pechuga de pollo", "pollo entero o presas", "caldo de pollo", "carne de pollo"],
    carne: ["carne de res", "carne de cerdo", "carne molida", "lomo de res", "chicharrón de cerdo", "charqui"],
    sillao: ["salsa de soja"],
    gluten: [
        "harina de trigo",
        "harina",
        "pan",
        "pan de molde",
        "pan francés",
        "pan de hamburguesa",
        "espaguetis",
        "fideos",
        "pasta",
        "galletas de soda",
        "avena",
        "harina de maíz",
    ],
    trigo: [
        "harina de trigo",
        "pan",
        "pan de molde",
        "pan francés",
        "pan de hamburguesa",
        "espaguetis",
        "fideos",
        "pasta",
        "galletas de soda",
    ],
    aji: ["ají amarillo", "ají limo", "ají panca"],
    cerdo: ["carne de cerdo", "chicharrón de cerdo"],
    mariscos: ["camarón", "calamar", "mariscos mixtos", "conchas"],
    huevo: ["huevo", "clara de huevo", "yema de huevo"],
    lactosa: [
        "leche",
        "leche evaporada",
        "leche condensada",
        "leche de almendras",
        "leche de coco",
        "leche de soja",
        "queso",
        "queso feta",
        "queso fresco",
        "parmesano",
        "mantequilla",
        "yogurt",
        "nata",
        "crema",
    ],
};

export const DIETS = ["vegetariano", "vegano", "sin-gluten", "keto", "alta-proteina", "sin-lactosa"] as const;

export const SEASONS: Season[] = ["primavera", "verano", "otonio", "invierno"];

export const SEASON_LABELS: Record<Season, string> = {
    primavera: "Primavera",
    verano: "Verano",
    otonio: "Otoño",
    invierno: "Invierno",
};

export const DAYS: Day[] = ["lunes", "martes", "miercoles", "jueves", "viernes", "sabado", "domingo"];

export const MEALS: MealType[] = ["desayuno", "almuerzo", "cena"];

export const MEAL_LABELS: Record<MealType, string> = {
    desayuno: "Desayuno",
    almuerzo: "Almuerzo",
    cena: "Cena",
};

export const MEAL_OPTIONS: { value: MealType; label: string }[] = [
    { value: "desayuno", label: "Desayuno" },
    { value: "almuerzo", label: "Almuerzo" },
    { value: "cena", label: "Cena" },
];

export const DAY_LABELS: Record<Day, string> = {
    lunes: "Lunes",
    martes: "Martes",
    miercoles: "Miércoles",
    jueves: "Jueves",
    viernes: "Viernes",
    sabado: "Sábado",
    domingo: "Domingo",
};

export interface Profile {
    id: string;
    name: string;
    emoji: string;
    dietPreferences: string[];
    restrictions: IngredientRestriction[];
    householdSize: number;
    mealsPerDay: MealType[];
    favoriteRecipeIds: string[];
    ratingByRecipe: Record<string, number>;
    /** Perfil completo = nombre y personas en el hogar definidos (onboarding). */
    isComplete: boolean;
    /** Variantes de recetas adaptadas por esta familia: recipeId → receta modificada. */
    recipeOverrides: Record<string, Recipe>;
    /** Platos habituales por comida (capturados por voz): meal → lista de platos. */
    usualDishes: Record<MealType, string[]>;
    /** Feedback del usuario sobre sugerencias: recipeId → {hide, weight}. */
    suggestionFeedback: Record<string, { hide: boolean; weight: number }>;
}

export interface Location {
    country: string;
    city: string;
}

export interface RecipeIngredient {
    name: string;
    quantity: number;
    unit: string;
    category: IngredientCategory;
}

/** Entry of the ingredient catalog: canonical name, category and allowed/default units. */
export interface CatalogIngredient {
    name: string;
    category: IngredientCategory;
    defaultUnit: string;
    units: string[];
}

export interface RecipeStep {
    text: string;
    tip?: string;
}

export interface RecipeNutrition {
    kcal: number;
    protein: number;
    carbs: number;
    fat: number;
}

export interface Recipe {
    id: string;
    title: string;
    description: string;
    emoji: string;
    image?: string;
    source: RecipeSource;
    diets: string[];
    cuisine?: string;
    /** Países/regiones donde la receta es típica o sus ingredientes son fáciles de conseguir. */
    regions?: string[];
    /** Temporadas en las que sus ingredientes frescos están en temporada (ausente = todo el año). */
    seasonal?: Season[];
    /** Ingredientes que son el protagonista del plato (anula la heurística automática). */
    protagonist?: string[];
    suitableFor: MealType[];
    prepMinutes: number;
    cookMinutes: number;
    servings: number;
    ingredients: RecipeIngredient[];
    steps: RecipeStep[];
    tips: string[];
    nutrition: RecipeNutrition;
}

export interface PantryItem {
    id: string;
    ingredientName: string;
    quantity: number;
    unit: string;
    expiryDate?: string;
    dateAdded: string;
    /** Category from the ingredient catalog (optional: legacy/custom items). */
    category?: IngredientCategory;
    /** Precio por unidad en moneda local (opcional, p. ej. soles). */
    unitPrice?: number;
    /** Gramos normalizados tras convertir unidades ambiguas ("1 taza de harina" → 125 g). */
    grams?: number;
}

export type PurchaseKind = "compra" | "consumo";

/** Registro de compra/consumo de un ingrediente, base del reporte de gastos. */
export interface PurchaseLogEntry {
    id: string;
    profileId: string;
    ingredientName: string;
    quantity: number;
    unit: string;
    unitPrice: number;
    /** Precio total = quantity * unitPrice. */
    total: number;
    category?: IngredientCategory;
    /** Fecha ISO (yyyy-mm-dd). */
    date: string;
    /** Marca de creación ISO con hora; ordena los movimientos del mismo día (más reciente primero). */
    createdAt: string;
    kind: PurchaseKind;
}

export type DrinkKind = "refresco" | "mate" | "jugo" | "bebida";

/** Bebida del catálogo que acompaña las comidas. */
export interface Drink {
    id: string;
    name: string;
    emoji: string;
    kind: DrinkKind;
    /** Comidas para las que esta bebida es apta. */
    suitableFor: MealType[];
}

export const DRINKS: Drink[] = [
    { id: "d1", name: "Chicha morada", emoji: "🍇", kind: "refresco", suitableFor: ["almuerzo", "cena"] },
    { id: "d2", name: "Limonada", emoji: "🍋", kind: "refresco", suitableFor: ["almuerzo", "cena"] },
    { id: "d3", name: "Refresco de maracuyá", emoji: "🍹", kind: "refresco", suitableFor: ["almuerzo", "cena"] },
    { id: "d4", name: "Refresco de naranja", emoji: "🍊", kind: "refresco", suitableFor: ["almuerzo", "cena"] },
    { id: "d5", name: "Mate de hierbas", emoji: "🍵", kind: "mate", suitableFor: ["almuerzo", "cena"] },
    { id: "d6", name: "Mate de anís", emoji: "🌿", kind: "mate", suitableFor: ["almuerzo", "cena"] },
    { id: "d7", name: "Agua de manzanilla", emoji: "🌼", kind: "mate", suitableFor: ["almuerzo", "cena"] },
    { id: "d8", name: "Emoliente", emoji: "🥣", kind: "mate", suitableFor: ["almuerzo", "cena"] },
    { id: "d9", name: "Café pasado", emoji: "☕", kind: "bebida", suitableFor: ["desayuno", "almuerzo"] },
    { id: "d10", name: "Café con leche", emoji: "🥛", kind: "bebida", suitableFor: ["desayuno"] },
    { id: "d11", name: "Chocolate caliente", emoji: "🍫", kind: "bebida", suitableFor: ["desayuno"] },
    { id: "d12", name: "Jugo de papaya", emoji: "🥭", kind: "jugo", suitableFor: ["desayuno", "almuerzo", "cena"] },
];

export interface MealSlot {
    id: string;
    day: Day;
    meal: MealType;
    recipeId: string;
    servings: number;
    /** Bebida que acompaña la comida (obligatoria para almuerzo y cena). */
    drink?: string;
}

export interface WeeklyPlan {
    id: string;
    weekStart: string;
    slots: MealSlot[];
}

export interface MealLogEntry {
    id: string;
    profileId: string;
    recipeId: string;
    date: string;
    meal: MealType;
    servings: number;
    rating?: number;
    notes?: string;
    source: "plan" | "manual" | "import";
}

export interface ShoppingItem {
    name: string;
    category: IngredientCategory;
    needed: number;
    unit: string;
    inPantry: number;
    toBuy: number;
    checked: boolean;
}

export interface ShoppingList {
    id: string;
    weekStart: string;
    items: ShoppingItem[];
    generatedAt: string;
}

export interface AppState {
    profiles: Profile[];
    activeProfileId: string;
    recipes: Recipe[];
    pantry: PantryItem[];
    weeklyPlan: WeeklyPlan | null;
    history: MealLogEntry[];
    purchaseLog: PurchaseLogEntry[];
    shoppingList: ShoppingList | null;
    location: Location;
    drinks: Drink[];
}

export interface SeasonFit {
    inSeason: boolean;
    /** True when the recipe has a seasonal tag at all (false = todo el año). */
    seasonal: boolean;
    seasons: Season[];
}

export function seasonFit(recipe: Recipe, season: Season): SeasonFit {
    const seasonal = Boolean(recipe.seasonal?.length);
    return {
        inSeason: !seasonal || (recipe.seasonal ?? []).includes(season),
        seasonal,
        seasons: recipe.seasonal ?? [],
    };
}

/** Lowercase + remove diacritics, so "Perú" matches "peru". */
export function normalizeText(value: string): string {
    return value
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
}

export function isLocalRecipe(recipe: Recipe, country: string): boolean {
    if (!recipe.regions?.length) return false;
    const c = normalizeText(country);
    return recipe.regions.some((r) => {
        const region = normalizeText(r);
        return c.includes(region) || region.includes(c);
    });
}

/** Ease of finding ingredients: 0-2 (local/bonus), 1 (neutral), <1 (non-local). */
export function availability(recipe: Recipe, season: Season, country: string): { score: number; label: string } {
    const fit = seasonFit(recipe, season);
    const local = isLocalRecipe(recipe, country);
    let score = 1;
    const parts: string[] = [];

    if (fit.seasonal) {
        if (fit.inSeason) {
            score += 0.4;
            parts.push("ingredientes en temporada ahora");
        } else {
            score -= 0.6;
            parts.push("algunos ingredientes no son de temporada");
        }
    }

    if (local) {
        score += 0.4;
        parts.push("receta típica de la zona");
    } else if (recipe.regions?.length) {
        score -= 0.3;
        parts.push("menos común en tu zona");
    }

    const label =
        parts.length === 0
            ? "Ingredientes fáciles de conseguir"
            : parts.map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(", ");

    return { score, label };
}

export interface Recommendation {
    recipe: Recipe;
    score: number;
    reasons: string[];
}

export interface MakeableInfo {
    recipe: Recipe;
    missingCount: number;
    makeable: boolean;
}

export interface DailyTip {
    tip: string;
}

export interface OpenverseImage {
    id: string;
    title: string;
    url: string;
    thumbnail: string;
    creator: string;
    license: string;
    width: number;
    height: number;
    foreign_landing_url: string;
}
