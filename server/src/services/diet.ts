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
    return matchingRestrictions(recipe, profile).some(
        (r) => r.level === "no" || (r.level === "no-principal" && isProtagonist(recipe, r.name)),
    );
}

/** Number of ingredients the profile should eat sparingly ("poco"). */
export function restrictedCount(recipe: Recipe, profile: Profile): number {
    return matchingRestrictions(recipe, profile).filter(
        (r) => r.level === "poco" || (r.level === "no-principal" && !isProtagonist(recipe, r.name)),
    ).length;
}

/** Ingredients (normalized) the profile cannot eat, matching a recipe. */
export function forbiddenNames(recipe: Recipe, profile: Profile): string[] {
    return matchingRestrictions(recipe, profile)
        .filter((r) => r.level === "no" || (r.level === "no-principal" && isProtagonist(recipe, r.name)))
        .map((r) => r.name);
}

/** True when an ingredient is the protagonist of the dish, not just a background touch. */
export function isProtagonist(recipe: Recipe, name: string): boolean {
    const n = normalize(name);

    if (recipe.protagonist?.some((p) => normalize(p) === n)) return true;

    const ingredient = recipe.ingredients.find((i) => normalize(i.name) === n);
    if (ingredient?.category === "proteinas") return true;

    const titleWords = new Set(normalize(recipe.title).split(/\s+/).map(stem).filter(Boolean));
    if (titleWords.has(stem(n))) return true;
    return n
        .split(/\s+/)
        .filter(Boolean)
        .some((w) => titleWords.has(stem(w)));
}

/** Lowercase, remove diacritics and trailing plural "s" so "huevos" matches "huevo". */
function stem(word: string): string {
    return normalize(word).replace(/s$/, "");
}

export function normalize(value: string): string {
    return value
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim();
}
