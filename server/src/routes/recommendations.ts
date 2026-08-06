import { Router } from "express";
import { getState } from "../db.js";
import { recommendRecipes } from "../services/recommender.js";
import { missingIngredients } from "../services/shoppingList.js";

export const recommendationsRouter = Router();

recommendationsRouter.get("/", (req, res) => {
    const state = getState();
    const limit = Number.parseInt(req.query.limit as string, 10) || 10;
    res.json(recommendRecipes(state, limit));
});

recommendationsRouter.get("/missing", (req, res) => {
    const state = getState();
    const recipeId = req.query.recipeId as string;
    const recipe = state.recipes.find((r) => r.id === recipeId);
    if (!recipe) {
        res.status(404).json({ error: "Receta no encontrada" });
        return;
    }
    const missing = missingIngredients(state, recipe);
    res.json({
        recipeId,
        makeable: missing.length === 0,
        missing,
    });
});
