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

export const DIETS = ["vegetariano", "vegano", "sin-gluten", "keto", "alta-proteina", "sin-lactosa"] as const;

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
    dislikedIngredients: string[];
    householdSize: number;
    mealsPerDay: MealType[];
    favoriteRecipeIds: string[];
    ratingByRecipe: Record<string, number>;
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
