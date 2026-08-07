import { Router } from "express";
import { getState, saveState } from "../db.js";
import { runImport } from "../services/importPipeline.js";
import type { ImportConfig } from "../services/importTypes.js";

export const importRouter = Router();

importRouter.post("/auto-import", async (req, res) => {
    const state = getState();
    const body = (req.body ?? {}) as {
        sources?: string[];
        maxResults?: number;
        pantryBonus?: boolean;
    };

    const config: ImportConfig = {
        sources: (body.sources as ImportConfig["sources"]) ?? ["themealdb", "cocktaildb", "local"],
        maxResults: body.maxResults ?? 12,
        pantryBonus: body.pantryBonus ?? false,
    };

    try {
        const result = await runImport(state, config);
        if (result.importedRecipeCount > 0 || result.importedDrinkCount > 0) {
            saveState();
        }
        res.json({
            recipes: result.recipes.map((c) => ({
                id: c.recipe.id,
                title: c.recipe.title,
                score: c.score,
                reasons: c.reasons,
                source: c.source,
                matchedMeal: c.matchedMeal,
            })),
            drinks: result.drinks.map((c) => ({
                name: c.drink.name,
                score: c.score,
                reasons: c.reasons,
            })),
            importedRecipeCount: result.importedRecipeCount,
            importedDrinkCount: result.importedDrinkCount,
            count: result.importedRecipeCount + result.importedDrinkCount,
        });
    } catch (err) {
        console.error("Import failed:", err);
        res.status(500).json({ error: "Error durante la importación" });
    }
});
