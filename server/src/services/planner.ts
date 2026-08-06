import type { AppState, Day, MealSlot, MealType, Recipe, WeeklyPlan } from "@cooking/shared";
import { DAYS, MEALS } from "@cooking/shared";
import { isDietCompatible, isDisliked } from "./diet.js";
import { averageRating, lastEatenDays } from "./history.js";
import { isMakeable, missingIngredients } from "./shoppingList.js";

export interface PickContext {
    weekStart: string;
    meal: MealType;
    usedIds: Set<string>;
    excludeId?: string;
    profileId: string;
}

function scoreRecipe(state: AppState, recipe: Recipe, ctx: PickContext): number {
    let score = 0;

    const fresh = lastEatenDays(state, ctx.profileId, recipe.id);
    if (fresh === Infinity) score += 2;
    else if (fresh < 4) score -= 10;
    else if (fresh < 7) score -= 6;
    else if (fresh < 14) score -= 3;
    else if (fresh < 30) score -= 1;
    else score += 1.5;

    if (ctx.usedIds.has(recipe.id) || recipe.id === ctx.excludeId) score -= 8;

    if (isMakeable(state, recipe)) score += 2;
    else if (missingIngredients(state, recipe).length <= 2) score += 0.6;

    const profile = state.profiles.find((p) => p.id === ctx.profileId);
    if (profile?.favoriteRecipeIds.includes(recipe.id)) score += 2.5;

    const cuisineUsed = [...ctx.usedIds]
        .map((id) => state.recipes.find((r) => r.id === id))
        .filter((r): r is Recipe => Boolean(r));
    const sameCuisine = cuisineUsed.filter((r) => r.cuisine === recipe.cuisine).length;
    score -= sameCuisine;

    const rating = profile
        ? (averageRating(state, ctx.profileId, recipe.id) ?? profile.ratingByRecipe[recipe.id] ?? 0)
        : 0;
    score += rating * 0.5;

    score += Math.random() * 0.6;
    return score;
}

function pickRecipe(state: AppState, ctx: PickContext): Recipe | null {
    const profile = state.profiles.find((p) => p.id === ctx.profileId);
    if (!profile) return null;

    const candidates = state.recipes.filter((r) => {
        if (!r.suitableFor.includes(ctx.meal)) return false;
        if (!isDietCompatible(r, profile)) return false;
        if (isDisliked(r, profile)) return false;
        return true;
    });

    if (candidates.length === 0) return null;

    let best = candidates[0];
    let bestScore = -Infinity;
    for (const candidate of candidates) {
        const s = scoreRecipe(state, candidate, ctx);
        if (s > bestScore) {
            bestScore = s;
            best = candidate;
        }
    }
    return best;
}

export function generateWeekPlan(state: AppState, weekStart: string): WeeklyPlan {
    const profile = state.profiles.find((p) => p.id === state.activeProfileId) ?? state.profiles[0];
    const meals = profile.mealsPerDay.length > 0 ? profile.mealsPerDay : [...MEALS];
    const slots: MealSlot[] = [];
    const usedIds = new Set<string>();

    for (const day of DAYS) {
        for (const meal of meals) {
            const chosen = pickRecipe(state, { weekStart, meal, usedIds, profileId: state.activeProfileId });
            if (!chosen) continue;
            usedIds.add(chosen.id);
            slots.push({
                id: crypto.randomUUID(),
                day,
                meal,
                recipeId: chosen.id,
                servings: Math.max(1, profile.householdSize),
            });
        }
    }

    return { id: crypto.randomUUID(), weekStart, slots };
}

export function regenerateSlot(
    state: AppState,
    weekStart: string,
    day: Day,
    meal: MealType,
    excludeId?: string,
): WeeklyPlan | null {
    const profile = state.profiles.find((p) => p.id === state.activeProfileId) ?? state.profiles[0];
    let plan = state.weeklyPlan;
    if (!plan || plan.weekStart !== weekStart) {
        plan = { id: crypto.randomUUID(), weekStart, slots: [] };
    }

    const usedIds = new Set(plan.slots.map((s) => s.recipeId));
    if (excludeId) usedIds.add(excludeId);

    const chosen = pickRecipe(state, { weekStart, meal, usedIds, excludeId, profileId: state.activeProfileId });
    if (!chosen) return plan;

    const existing = plan.slots.find((s) => s.day === day && s.meal === meal);
    const previousServings = existing?.servings ?? Math.max(1, profile.householdSize);

    plan.slots = [
        ...plan.slots.filter((s) => !(s.day === day && s.meal === meal)),
        { id: crypto.randomUUID(), day, meal, recipeId: chosen.id, servings: previousServings },
    ];

    return plan;
}

export function defaultMeals(profile: { mealsPerDay: MealType[] }): MealType[] {
    return profile.mealsPerDay.length > 0 ? profile.mealsPerDay : [...MEALS];
}
