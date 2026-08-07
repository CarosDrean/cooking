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

export type RestrictionLevel = "no" | "poco";

export interface IngredientRestriction {
    name: string;
    level: RestrictionLevel;
}

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
}

export interface MealSlot {
    id: string;
    day: Day;
    meal: MealType;
    recipeId: string;
    servings: number;
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
    shoppingList: ShoppingList | null;
    location: Location;
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
