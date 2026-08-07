import type { Drink, MealType, Recipe } from "../types.js";

export type ImportSource = "themealdb" | "cocktaildb" | "local" | "spoonacular" | "ai";

export interface ImportQuery {
    terms: string;
    meal: MealType;
    source: ImportSource;
    lang: string;
}

export interface ImportRecipeCandidate {
    recipe: Recipe;
    score: number;
    reasons: string[];
    source: ImportSource;
    matchedMeal: MealType;
    matchedQuery: string;
}

export interface ImportDrinkCandidate {
    drink: Drink;
    score: number;
    reasons: string[];
    source: ImportSource;
}

export interface ImportResult {
    recipes: ImportRecipeCandidate[];
    drinks: ImportDrinkCandidate[];
    importedRecipeCount: number;
    importedDrinkCount: number;
}

export interface ImportAdapter {
    source: ImportSource;
    search(query: ImportQuery, limit: number): Promise<Recipe[]>;
}

export interface DrinkImportAdapter {
    source: ImportSource;
    search(query: ImportQuery, limit: number): Promise<Drink[]>;
}

export interface ImportConfig {
    sources: ImportSource[];
    maxResults: number;
    pantryBonus: boolean;
}
