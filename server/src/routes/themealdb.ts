import { Router } from "express";
import { getState, saveState } from "../db.js";
import { isDietCompatible, isForbidden } from "../services/diet.js";
import { getMealById, searchMealDb } from "../services/themealdb.js";
import type { Recipe } from "../types.js";

export const themealdbRouter = Router();

themealdbRouter.get("/search", async (req, res) => {
    const query = (req.query.q as string | undefined)?.trim();
    if (!query) {
        res.status(400).json({ error: "Parámetro q es obligatorio" });
        return;
    }
    const results = await searchMealDb(query);
    if (results.length === 0) {
        res.status(404).json({ error: "Sin resultados (o servicio no disponible)" });
        return;
    }
    res.json(results);
});

themealdbRouter.post("/import", async (req, res) => {
    const state = getState();
    const { mealId } = req.body as { mealId?: string };
    if (!mealId) {
        res.status(400).json({ error: "mealId es obligatorio" });
        return;
    }
    const recipe = await getMealById(mealId);
    if (!recipe) {
        res.status(404).json({ error: "Receta no encontrada en TheMealDB" });
        return;
    }
    const existing = state.recipes.find((r) => r.id === recipe.id);
    if (existing) {
        res.json({ recipe: existing, alreadyExists: true });
        return;
    }
    state.recipes.push(recipe);
    saveState();
    res.status(201).json({ recipe, alreadyExists: false });
});

/** Importa recetas de TheMealDB automáticamente según la config del perfil activo. */
themealdbRouter.post("/auto-import", async (_req, res) => {
    const state = getState();
    const profile = state.profiles.find((p) => p.id === state.activeProfileId) ?? state.profiles[0];

    const queries = new Set<string>();
    for (const meal of profile.mealsPerDay) {
        if (meal === "desayuno") queries.add("breakfast");
        else if (meal === "almuerzo") queries.add("dinner");
        else if (meal === "cena") queries.add("dinner");
    }
    for (const diet of profile.dietPreferences) {
        if (diet === "sin-gluten") queries.add("gluten");
        else if (diet === "sin-lactosa") queries.add("dairy");
        else if (diet === "alta-proteina") queries.add("chicken");
        else queries.add(diet);
    }
    if (queries.size === 0) queries.add("chicken");

    const MAX_IMPORT = 8;
    const seen = new Set<string>();
    const imported: Recipe[] = [];

    for (const query of queries) {
        if (imported.length >= MAX_IMPORT) break;
        const results = await searchMealDb(query);
        for (const recipe of results) {
            if (imported.length >= MAX_IMPORT) break;
            if (seen.has(recipe.id) || state.recipes.some((r) => r.id === recipe.id)) continue;
            if (!isDietCompatible(recipe, profile) || isForbidden(recipe, profile)) continue;
            seen.add(recipe.id);
            state.recipes.push(recipe);
            imported.push(recipe);
        }
    }

    if (imported.length > 0) saveState();
    res.json({ imported, count: imported.length });
});
