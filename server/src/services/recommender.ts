import type { AppState, Recommendation } from "../types.js";
import { SEASON_LABELS } from "../types.js";
import { isDietCompatible, isForbidden, isProtagonist, normalize, restrictedCount } from "./diet.js";
import { availability, currentSeason, seasonFit } from "./location.js";
import { recipesForProfile } from "./recipeVariants.js";
import { isMakeable, missingIngredients, pantryTotals } from "./shoppingList.js";

/** Deterministic hash (djb2) for stable jitter. */
export function simpleHash(str: string): number {
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) + hash + str.charCodeAt(i)) | 0;
    }
    return hash >>> 0;
}

interface HistoryStats {
    dates: number[];
    ratings: number[];
}

interface HistoryByRecipe {
    lastEatenDays: number;
    timesEaten: number;
    averageRating: number | undefined;
}

export function recommendRecipes(state: AppState, limit = 10): Recommendation[] {
    const profile = state.profiles.find((p) => p.id === state.activeProfileId) ?? state.profiles[0];
    const plannedIds = new Set(state.weeklyPlan?.slots.map((s) => s.recipeId) ?? []);
    const season = currentSeason(new Date(), state.location.country);

    // Precompute pantry totals once (avoid O(R × P) in the loop).
    const pantry = pantryTotals(state);

    // Precompute history stats per recipe once (avoid O(R × H) in the loop).
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayMs = todayStart.getTime();
    const rawHistory = new Map<string, HistoryStats>();
    for (const h of state.history) {
        if (h.profileId !== profile.id) continue;
        const stats = rawHistory.get(h.recipeId);
        if (stats) {
            stats.dates.push(Date.parse(h.date));
            if (h.rating != null) stats.ratings.push(h.rating);
        } else {
            rawHistory.set(h.recipeId, {
                dates: [Date.parse(h.date)],
                ratings: h.rating != null ? [h.rating] : [],
            });
        }
    }
    const historyByRecipe = new Map<string, HistoryByRecipe>();
    for (const [rid, stats] of rawHistory) {
        let minDays = Infinity;
        for (const d of stats.dates) {
            const diff = Math.floor((todayMs - d) / 86400000);
            if (diff < minDays) minDays = diff;
        }
        historyByRecipe.set(rid, {
            lastEatenDays: stats.dates.length === 0 ? Infinity : Math.max(0, minDays),
            timesEaten: stats.dates.length,
            averageRating:
                stats.ratings.length > 0 ? stats.ratings.reduce((a, b) => a + b, 0) / stats.ratings.length : undefined,
        });
    }

    const results: Recommendation[] = [];

    for (const recipe of recipesForProfile(state, state.activeProfileId)) {
        if (!isDietCompatible(recipe, profile)) continue;
        if (isForbidden(recipe, profile)) continue;

        let score = 0;
        const reasons: string[] = [];

        if (profile.dietPreferences.length > 0) {
            score += 1;
            reasons.push(`Encaja con ${profile.dietPreferences.join(", ")}`);
        }

        const limited = restrictedCount(recipe, profile);
        if (limited > 0) {
            score -= limited * 3;
            const ingredientNames = new Set(recipe.ingredients.map((i) => normalize(i.name)));
            const names = profile.restrictions
                .filter(
                    (r) =>
                        ingredientNames.has(r.name) &&
                        (r.level === "poco" || (r.level === "no-principal" && !isProtagonist(recipe, r.name))),
                )
                .map((r) => r.name);
            reasons.push(`Contiene ${names.join(", ")} (consume con moderación)`);
        }

        const avail = availability(recipe, season, state.location.country);
        score += avail.score;
        reasons.push(avail.label);

        const fit = seasonFit(recipe, season);
        if (fit.seasonal && fit.inSeason) {
            reasons.push(`En temporada (${SEASON_LABELS[season]})`);
        }

        if (profile.favoriteRecipeIds.includes(recipe.id)) {
            score += 3;
            reasons.push("Es una de tus favoritas");
        }

        if (isMakeable(state, recipe, pantry)) {
            score += 2;
            reasons.push("La puedes hacer con lo que tienes");
        } else {
            const missing = missingIngredients(state, recipe, pantry);
            if (missing.length <= 2) {
                score += 1;
                reasons.push(`Solo te faltan ${missing.length} ingrediente(s)`);
            } else {
                reasons.push(`Te faltan ${missing.length} ingredientes`);
            }
        }

        const h = historyByRecipe.get(recipe.id);
        const fresh = h?.lastEatenDays ?? Infinity;
        if (fresh === Infinity) {
            score += 1.5;
            reasons.push("Aún no la has probado");
        } else if (fresh >= 14) {
            score += 1;
            reasons.push(`No la comes desde hace ${fresh} días`);
        } else if (fresh <= 2) {
            score -= 3;
        }

        const eaten = h?.timesEaten ?? 0;
        if (eaten >= 3) {
            score -= 1;
            reasons.push("La has comido varias veces");
        }

        const rating = h?.averageRating ?? profile.ratingByRecipe[recipe.id];
        if (rating) {
            score += rating * 0.4;
            if (rating >= 4) reasons.push(`La puntuaste ${rating}/5`);
        }

        if (plannedIds.has(recipe.id)) {
            score -= 1;
            reasons.push("Ya está en tu plan semanal");
        }

        // Deterministic jitter based on recipe id (replaces Math.random()).
        score += (simpleHash(recipe.id) % 400) / 1000;
        results.push({ recipe, score, reasons });
    }

    results.sort((a, b) => b.score - a.score);
    return results.slice(0, limit);
}
