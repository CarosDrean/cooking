import type { Recipe, RecipeIngredient } from "@cooking/shared";

export function round(n: number): number {
    return Math.round(n * 100) / 100;
}

/** Scale a recipe's ingredients to the requested number of servings. */
export function scaleRecipe(recipe: Recipe, servings: number): RecipeIngredient[] {
    const factor = Math.max(0.5, servings) / recipe.servings;
    return recipe.ingredients.map((i) => ({
        ...i,
        quantity: round(i.quantity * factor),
    }));
}

export function scaleIngredient(i: RecipeIngredient, servings: number, baseServings: number): RecipeIngredient {
    const factor = Math.max(0.5, servings) / baseServings;
    return { ...i, quantity: round(i.quantity * factor) };
}
