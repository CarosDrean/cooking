import type { AppState, Recipe } from "../types.js";

/** Devuelve la variante adaptada de una receta para un perfil (o la base si no hay override). */
export function recipeForProfile(state: AppState, profileId: string, recipeId: string): Recipe | undefined {
    const base = state.recipes.find((r) => r.id === recipeId);
    if (!base) return undefined;
    const profile = state.profiles.find((p) => p.id === profileId);
    const override = profile?.recipeOverrides?.[recipeId];
    if (!override) return base;
    return { ...base, ...override, id: base.id };
}

/** Lista de recetas resueltas con los overrides del perfil indicado. */
export function recipesForProfile(state: AppState, profileId: string): Recipe[] {
    return state.recipes.map((r) => recipeForProfile(state, profileId, r.id)).filter((r): r is Recipe => Boolean(r));
}
