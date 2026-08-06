import type { AppState, Recommendation } from "@cooking/shared";
import { isDietCompatible, isDisliked } from "./diet.js";
import { averageRating, lastEatenDays, timesEaten } from "./history.js";
import { isMakeable, missingIngredients } from "./shoppingList.js";

export function recommendRecipes(state: AppState, limit = 10): Recommendation[] {
    const profile = state.profiles.find((p) => p.id === state.activeProfileId) ?? state.profiles[0];
    const plannedIds = new Set(state.weeklyPlan?.slots.map((s) => s.recipeId) ?? []);

    const results: Recommendation[] = [];

    for (const recipe of state.recipes) {
        if (!isDietCompatible(recipe, profile)) continue;
        if (isDisliked(recipe, profile)) continue;

        let score = 0;
        const reasons: string[] = [];

        if (profile.dietPreferences.length > 0) {
            score += 1;
            reasons.push(`Encaja con ${profile.dietPreferences.join(", ")}`);
        }

        if (profile.favoriteRecipeIds.includes(recipe.id)) {
            score += 3;
            reasons.push("Es una de tus favoritas");
        }

        if (isMakeable(state, recipe)) {
            score += 2;
            reasons.push("La puedes hacer con lo que tienes");
        } else {
            const missing = missingIngredients(state, recipe);
            if (missing.length <= 2) {
                score += 1;
                reasons.push(`Solo te faltan ${missing.length} ingrediente(s)`);
            } else {
                reasons.push(`Te faltan ${missing.length} ingredientes`);
            }
        }

        const fresh = lastEatenDays(state, state.activeProfileId, recipe.id);
        if (fresh === Infinity) {
            score += 1.5;
            reasons.push("Aún no la has probado");
        } else if (fresh >= 14) {
            score += 1;
            reasons.push(`No la comes desde hace ${fresh} días`);
        } else if (fresh <= 2) {
            score -= 3;
        }

        const eaten = timesEaten(state, state.activeProfileId, recipe.id);
        if (eaten >= 3) {
            score -= 1;
            reasons.push("La has comido varias veces");
        }

        const rating = averageRating(state, state.activeProfileId, recipe.id) ?? profile.ratingByRecipe[recipe.id];
        if (rating) {
            score += rating * 0.4;
            if (rating >= 4) reasons.push(`La puntuaste ${rating}/5`);
        }

        if (plannedIds.has(recipe.id)) {
            score -= 1;
            reasons.push("Ya está en tu plan semanal");
        }

        score += Math.random() * 0.4;
        results.push({ recipe, score, reasons });
    }

    results.sort((a, b) => b.score - a.score);
    return results.slice(0, limit);
}
