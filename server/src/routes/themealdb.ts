import { Router } from "express";
import { getState, saveState } from "../db.js";
import { getMealById, searchMealDb } from "../services/themealdb.js";

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
