import type { IngredientRestriction, Profile, Recipe } from "../types.js";

const VEGAN = "vegano";
const VEGETARIANO = "vegetariano";
const SIN_GLUTEN = "sin-gluten";
const KETO = "keto";
const ALTA_PROTEINA = "alta-proteina";
const SIN_LACTOSA = "sin-lactosa";

/** Does a recipe satisfy a single diet requirement? */
export function satisfiesDiet(recipe: Recipe, diet: string): boolean {
    const d = recipe.diets;
    switch (diet) {
        case VEGAN:
            return d.includes(VEGAN);
        case VEGETARIANO:
            return d.includes(VEGETARIANO) || d.includes(VEGAN);
        case SIN_GLUTEN:
            return d.includes(SIN_GLUTEN);
        case KETO:
            return d.includes(KETO);
        case ALTA_PROTEINA:
            return d.includes(ALTA_PROTEINA);
        case SIN_LACTOSA:
            return d.includes(SIN_LACTOSA) || d.includes(VEGAN);
        default:
            return true;
    }
}

/** A recipe is compatible when it satisfies every diet the profile requires. */
export function isDietCompatible(recipe: Recipe, profile: Profile): boolean {
    return profile.dietPreferences.every((diet) => satisfiesDiet(recipe, diet));
}

function matchingRestrictions(recipe: Recipe, profile: Profile): IngredientRestriction[] {
    if (profile.restrictions.length === 0) return [];
    const normalized = profile.restrictions.map((r) => ({ ...r, name: normalize(r.name) }));
    const ingredientNames = new Set(recipe.ingredients.map((i) => normalize(i.name)));
    return normalized.filter((r) => ingredientNames.has(r.name));
}

/** A recipe is excluded when it contains an ingredient the profile cannot eat. */
export function isForbidden(recipe: Recipe, profile: Profile): boolean {
    return matchingRestrictions(recipe, profile).some((r) => r.level === "no");
}

/** Number of ingredients the profile should eat sparingly ("poco"). */
export function restrictedCount(recipe: Recipe, profile: Profile): number {
    return matchingRestrictions(recipe, profile).filter((r) => r.level === "poco").length;
}

/** Ingredients (normalized) the profile cannot eat, matching a recipe. */
export function forbiddenNames(recipe: Recipe, profile: Profile): string[] {
    return matchingRestrictions(recipe, profile)
        .filter((r) => r.level === "no")
        .map((r) => r.name);
}

export function normalize(value: string): string {
    return value
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim();
}
