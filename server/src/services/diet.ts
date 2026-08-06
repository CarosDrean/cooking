import type { Profile, Recipe } from "@cooking/shared";

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

export function isDisliked(recipe: Recipe, profile: Profile): boolean {
    if (profile.dislikedIngredients.length === 0) return false;
    const disliked = profile.dislikedIngredients.map((x) => normalize(x));
    return recipe.ingredients.some((i) => disliked.includes(normalize(i.name)));
}

export function normalize(value: string): string {
    return value
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim();
}
