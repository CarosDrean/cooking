import type { Profile, Recipe } from "../types.js";
import { DERIVED_GROUPS } from "../types.js";

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

/** Nombre de cada ingrediente de la receta que coincide con una restricción. */
export function restrictedIngredientNames(recipe: Recipe, profile: Profile): string[] {
    if (profile.restrictions.length === 0) return [];
    const names = new Set<string>();

    for (const r of profile.restrictions) {
        const rName = normalize(r.name);
        const targets = new Set([rName, ...(DERIVED_GROUPS[rName] ?? []).map(normalize)]);

        for (const ingredient of recipe.ingredients) {
            const iname = normalize(ingredient.name);
            const matched = [...targets].some((t) => iname === t || iname.includes(t) || t.includes(iname));
            if (matched) names.add(ingredient.name);
        }
    }

    return [...names];
}

/** A recipe is excluded when it contains ingredients the profile cannot eat (level "no" always, "no-principal" si es protagonista). */
export function isForbidden(recipe: Recipe, profile: Profile): boolean {
    if (profile.restrictions.length === 0) return false;

    return profile.restrictions.some((r) => {
        const rName = normalize(r.name);
        const targets = [rName, ...(DERIVED_GROUPS[rName] ?? []).map(normalize)];

        const matchedIngredients = recipe.ingredients.filter((i) => {
            const iname = normalize(i.name);
            return targets.some((t) => iname === t || iname.includes(t) || t.includes(iname));
        });

        if (matchedIngredients.length === 0) return false;

        if (r.level === "no") return true;

        if (r.level === "no-principal") {
            return matchedIngredients.some((mi) => isProtagonist(recipe, mi.name));
        }

        return false;
    });
}

/** Number of ingredients the profile should eat sparingly ("poco"). */
export function restrictedCount(recipe: Recipe, profile: Profile): number {
    if (profile.restrictions.length === 0) return 0;

    return profile.restrictions.filter((r) => {
        const rName = normalize(r.name);
        const targets = [rName, ...(DERIVED_GROUPS[rName] ?? []).map(normalize)];

        const matchedIngredients = recipe.ingredients.filter((i) => {
            const iname = normalize(i.name);
            return targets.some((t) => iname === t || iname.includes(t) || t.includes(iname));
        });

        if (matchedIngredients.length === 0) return false;

        if (r.level === "poco") return true;

        if (r.level === "no-principal") {
            return matchedIngredients.every((mi) => !isProtagonist(recipe, mi.name));
        }

        return false;
    }).length;
}

/** Ingredients (normalized) the profile cannot eat, matching a recipe. */
export function forbiddenNames(recipe: Recipe, profile: Profile): string[] {
    if (profile.restrictions.length === 0) return [];

    const names = new Set<string>();

    for (const r of profile.restrictions) {
        const rName = normalize(r.name);
        const targets = [rName, ...(DERIVED_GROUPS[rName] ?? []).map(normalize)];

        const matchedIngredients = recipe.ingredients.filter((i) => {
            const iname = normalize(i.name);
            return targets.some((t) => iname === t || iname.includes(t) || t.includes(iname));
        });

        if (matchedIngredients.length === 0) continue;

        if (r.level === "no") {
            for (const mi of matchedIngredients) names.add(mi.name);
            continue;
        }

        if (r.level === "no-principal") {
            for (const mi of matchedIngredients) {
                if (isProtagonist(recipe, mi.name)) names.add(mi.name);
            }
        }
    }

    return [...names];
}

/** True when an ingredient is the protagonist of the dish, not just a background touch. */
export function isProtagonist(recipe: Recipe, name: string): boolean {
    const n = normalize(name);

    if (recipe.protagonist?.some((p) => normalize(p) === n)) return true;

    const ingredient = recipe.ingredients.find((i) => normalize(i.name) === n);
    if (ingredient?.category === "proteinas") return true;

    // En el título, solo chequear la palabra principal (1ª palabra) para evitar falsos
    // positivos con derivados compuestos: "leche de coco" no debe matchear solo "coco".
    const mainWord = n.split(/\s+/)[0];
    if (!mainWord) return false;

    const titleWords = new Set(normalize(recipe.title).split(/\s+/).map(stem).filter(Boolean));
    if (titleWords.has(stem(mainWord))) return true;

    return false;
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
