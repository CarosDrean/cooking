import { Router } from "express";
import { getState, saveState } from "../db.js";
import type { IngredientRestriction, Profile } from "../types.js";

export const profilesRouter = Router();

function cleanRestrictions(value: unknown): IngredientRestriction[] {
    if (!Array.isArray(value)) return [];
    const result: IngredientRestriction[] = [];
    for (const r of value) {
        if (typeof r !== "object" || r === null) continue;
        const { name, level } = r as { name?: unknown; level?: unknown };
        const trimmed = typeof name === "string" ? name.trim() : "";
        if (!trimmed) continue;
        result.push({ name: trimmed, level: level === "poco" ? "poco" : "no" });
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
    const profile: Profile = {
        id: crypto.randomUUID(),
        name: body.name.trim(),
        emoji: body.emoji ?? "🙂",
        dietPreferences: body.dietPreferences ?? [],
        restrictions: cleanRestrictions(body.restrictions),
        householdSize: Math.max(1, body.householdSize ?? 2),
        mealsPerDay: body.mealsPerDay?.length ? body.mealsPerDay : ["desayuno", "almuerzo", "cena"],
        favoriteRecipeIds: [],
        ratingByRecipe: {},
    };
    state.profiles.push(profile);
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
    state.profiles[index] = {
        ...current,
        name: body.name?.trim() || current.name,
        emoji: body.emoji ?? current.emoji,
        dietPreferences: body.dietPreferences ?? current.dietPreferences,
        restrictions: body.restrictions !== undefined ? cleanRestrictions(body.restrictions) : current.restrictions,
        householdSize: Math.max(1, body.householdSize ?? current.householdSize),
        mealsPerDay: body.mealsPerDay?.length ? body.mealsPerDay : current.mealsPerDay,
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
