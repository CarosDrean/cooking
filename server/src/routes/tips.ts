import { Router } from "express";
import { getState } from "../db.js";
import { tipOfTheDay, tipsForRecipe } from "../services/tips.js";

export const tipsRouter = Router();

tipsRouter.get("/", (req, res) => {
    const state = getState();
    const recipeId = req.query.recipeId as string;
    const recipe = state.recipes.find((r) => r.id === recipeId);
    if (!recipe) {
        res.status(404).json({ error: "Receta no encontrada" });
        return;
    }
    res.json({ recipeId, tips: tipsForRecipe(recipe) });
});

tipsRouter.get("/daily", (_req, res) => {
    res.json({ tip: tipOfTheDay() });
});
