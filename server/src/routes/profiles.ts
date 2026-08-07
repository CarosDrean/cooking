import { Router } from "express";
import { getState, saveState } from "../db.js";
import { recipeForProfile } from "../services/recipeVariants.js";
import type { IngredientRestriction, MealType, Profile, Recipe } from "../types.js";
import { isProfileComplete } from "../types.js";

export const profilesRouter = Router();

function cleanRestrictions(value: unknown): IngredientRestriction[] {
    if (!Array.isArray(value)) return [];
    const result: IngredientRestriction[] = [];
    for (const r of value) {
        if (typeof r !== "object" || r === null) continue;
        const { name, level } = r as { name?: unknown; level?: unknown };
        const trimmed = typeof name === "string" ? name.trim() : "";
        if (!trimmed) continue;
        result.push({
            name: trimmed,
            level: level === "poco" ? "poco" : level === "no-principal" ? "no-principal" : "no",
        });
    }
    return result;
}

const MEAL_KEYS: MealType[] = ["desayuno", "almuerzo", "cena"];

function cleanUsualDishes(value: unknown): Record<MealType, string[]> {
    const result: Record<MealType, string[]> = { desayuno: [], almuerzo: [], cena: [] };
    if (typeof value !== "object" || value === null) return result;
    for (const meal of MEAL_KEYS) {
        const list = (value as Record<string, unknown>)[meal];
        if (!Array.isArray(list)) continue;
        const dishes = [
            ...new Set(
                list.filter((d): d is string => typeof d === "string" && d.trim().length > 0).map((d) => d.trim()),
            ),
        ];
        result[meal] = dishes;
    }
    return result;
}

profilesRouter.get("/", (_req, res) => {
    const state = getState();
    res.json(state.profiles);
});

profilesRouter.get("/active", (_req, res) => {
    const state = getState();
    const profile = state.profiles.find((p) => p.id === state.activeProfileId) ?? state.profiles[0];
    res.json({ activeProfileId: state.activeProfileId, profile });
});

profilesRouter.post("/", (req, res) => {
    const body = req.body as Partial<Profile>;
    if (!body.name?.trim()) {
        res.status(400).json({ error: "El nombre es obligatorio" });
        return;
    }
    const state = getState();
    const householdSize = body.householdSize == null ? 0 : Math.max(1, body.householdSize);
    const profile: Profile = {
        id: crypto.randomUUID(),
        name: body.name.trim(),
        emoji: body.emoji ?? "🙂",
        dietPreferences: body.dietPreferences ?? [],
        restrictions: cleanRestrictions(body.restrictions),
        householdSize,
        mealsPerDay: body.mealsPerDay?.length ? body.mealsPerDay : ["desayuno", "almuerzo", "cena"],
        favoriteRecipeIds: [],
        ratingByRecipe: {},
        isComplete: isProfileComplete({ name: body.name.trim(), householdSize }),
        recipeOverrides: {},
        usualDishes: cleanUsualDishes(body.usualDishes),
    };
    state.profiles.push(profile);
    if (profile.isComplete) state.activeProfileId = profile.id;
    saveState();
    res.status(201).json(profile);
});

profilesRouter.put("/:id", (req, res) => {
    const state = getState();
    const index = state.profiles.findIndex((p) => p.id === req.params.id);
    if (index === -1) {
        res.status(404).json({ error: "Perfil no encontrado" });
        return;
    }
    const current = state.profiles[index];
    const body = req.body as Partial<Profile>;
    const name = body.name?.trim() || current.name;
    const householdSize = body.householdSize == null ? current.householdSize : Math.max(1, body.householdSize);
    state.profiles[index] = {
        ...current,
        name,
        emoji: body.emoji ?? current.emoji,
        dietPreferences: body.dietPreferences ?? current.dietPreferences,
        restrictions: body.restrictions !== undefined ? cleanRestrictions(body.restrictions) : current.restrictions,
        householdSize,
        mealsPerDay: body.mealsPerDay?.length ? body.mealsPerDay : current.mealsPerDay,
        isComplete: isProfileComplete({ name, householdSize }),
        usualDishes: body.usualDishes !== undefined ? cleanUsualDishes(body.usualDishes) : current.usualDishes,
    };
    saveState();
    res.json(state.profiles[index]);
});

profilesRouter.delete("/:id", (req, res) => {
    const state = getState();
    const id = req.params.id;
    if (state.profiles.length <= 1) {
        res.status(400).json({ error: "No se puede eliminar el último perfil" });
        return;
    }
    state.profiles = state.profiles.filter((p) => p.id !== id);
    state.history = state.history.filter((h) => h.profileId !== id);
    if (state.activeProfileId === id) {
        state.activeProfileId = state.profiles[0].id;
    }
    saveState();
    res.json({ ok: true });
});

profilesRouter.post("/:id/activate", (req, res) => {
    const state = getState();
    const profile = state.profiles.find((p) => p.id === req.params.id);
    if (!profile) {
        res.status(404).json({ error: "Perfil no encontrado" });
        return;
    }
    state.activeProfileId = profile.id;
    saveState();
    res.json({ activeProfileId: profile.id, profile });
});

profilesRouter.post("/:id/favorite", (req, res) => {
    const state = getState();
    const profile = state.profiles.find((p) => p.id === req.params.id);
    if (!profile) {
        res.status(404).json({ error: "Perfil no encontrado" });
        return;
    }
    const { recipeId, favorite } = req.body as { recipeId: string; favorite: boolean };
    profile.favoriteRecipeIds = favorite
        ? [...new Set([...profile.favoriteRecipeIds, recipeId])]
        : profile.favoriteRecipeIds.filter((id) => id !== recipeId);
    saveState();
    res.json(profile);
});

profilesRouter.post("/:id/rating", (req, res) => {
    const state = getState();
    const profile = state.profiles.find((p) => p.id === req.params.id);
    if (!profile) {
        res.status(404).json({ error: "Perfil no encontrado" });
        return;
    }
    const { recipeId, rating } = req.body as { recipeId: string; rating: number };
    if (rating == null) {
        delete profile.ratingByRecipe[recipeId];
    } else {
        profile.ratingByRecipe[recipeId] = Math.min(5, Math.max(1, rating));
    }
    saveState();
    res.json(profile);
});

profilesRouter.put("/:id/recipe-overrides/:recipeId", (req, res) => {
    const state = getState();
    const profile = state.profiles.find((p) => p.id === req.params.id);
    if (!profile) {
        res.status(404).json({ error: "Perfil no encontrado" });
        return;
    }
    const recipeId = req.params.recipeId;
    const base = state.recipes.find((r) => r.id === recipeId);
    if (!base) {
        res.status(404).json({ error: "Receta no encontrada" });
        return;
    }
    const body = req.body as Partial<Recipe>;
    if (!body.title?.trim() || !Array.isArray(body.ingredients) || !Array.isArray(body.steps)) {
        res.status(400).json({ error: "Faltan campos obligatorios (title, ingredients, steps)" });
        return;
    }
    profile.recipeOverrides[recipeId] = {
        ...base,
        ...body,
        id: base.id,
        source: base.source,
        title: body.title.trim(),
        emoji: body.emoji || base.emoji,
        diets: body.diets ?? base.diets,
        suitableFor: body.suitableFor?.length ? body.suitableFor : base.suitableFor,
        servings: Math.max(1, body.servings ?? base.servings),
        prepMinutes: body.prepMinutes ?? base.prepMinutes,
        cookMinutes: body.cookMinutes ?? base.cookMinutes,
        nutrition: body.nutrition ?? base.nutrition,
        tips: body.tips ?? base.tips,
    };
    saveState();
    res.json(recipeForProfile(state, profile.id, recipeId));
});

profilesRouter.delete("/:id/recipe-overrides/:recipeId", (req, res) => {
    const state = getState();
    const profile = state.profiles.find((p) => p.id === req.params.id);
    if (!profile) {
        res.status(404).json({ error: "Perfil no encontrado" });
        return;
    }
    delete profile.recipeOverrides[req.params.recipeId];
    saveState();
    res.json(recipeForProfile(state, profile.id, req.params.recipeId));
});
