import { Router } from "express";
import { getState, saveState } from "../db.js";
import { normalize } from "../services/diet.js";
import { isMakeable, missingIngredients } from "../services/shoppingList.js";
import type { MakeableInfo, MealType, Recipe, Season } from "../types.js";
import { SEASONS } from "../types.js";

export const recipesRouter = Router();

function findRecipe(state: { recipes: Recipe[] }, id: string): Recipe | undefined {
    return state.recipes.find((r) => r.id === id);
}

recipesRouter.get("/", (req, res) => {
    const state = getState();
    const q = (req.query.q as string | undefined)?.trim().toLowerCase();
    const diet = (req.query.diet as string | undefined)?.split(",").filter(Boolean) ?? [];
    const ingredient = (req.query.ingredients as string | undefined)?.split(",").filter(Boolean) ?? [];
    const ingredientMode = (req.query.mode as string | undefined) ?? "all";
    const makeableOnly = req.query.makeable === "true";
    const meal = req.query.meal as MealType | undefined;
    const season = req.query.season as Season | undefined;

    let recipes = state.recipes;

    if (q) {
        recipes = recipes.filter((r) =>
            [r.title, r.description, ...r.ingredients.map((i) => i.name)].some((t) => t.toLowerCase().includes(q)),
        );
    }

    if (diet.length > 0) {
        const normalized = diet.map((d) => normalize(d));
        recipes = recipes.filter((r) => {
            const rDiets = r.diets.map((d) => normalize(d));
            return normalized.every((d) => rDiets.includes(d));
        });
    }

    if (ingredient.length > 0) {
        const normalized = ingredient.map((i) => normalize(i));
        recipes = recipes.filter((r) => {
            const rIngredients = r.ingredients.map((i) => normalize(i.name));
            if (ingredientMode === "any") {
                return normalized.some((i) => rIngredients.includes(i));
            }
            return normalized.every((i) => rIngredients.includes(i));
        });
    }

    if (meal) {
        recipes = recipes.filter((r) => r.suitableFor.includes(meal));
    }

    if (season && SEASONS.includes(season)) {
        recipes = recipes.filter((r) => !r.seasonal?.length || r.seasonal.includes(season));
    }

    if (makeableOnly) {
        recipes = recipes.filter((r) => isMakeable(state, r));
    }

    res.json(recipes);
});

recipesRouter.get("/makeable", (_req, res) => {
    const state = getState();
    const info: MakeableInfo[] = state.recipes.map((recipe) => {
        const missing = missingIngredients(state, recipe);
        return {
            recipe,
            missingCount: missing.length,
            makeable: missing.length === 0,
        };
    });
    info.sort((a, b) => a.missingCount - b.missingCount);
    res.json(info);
});

recipesRouter.get("/:id", (req, res) => {
    const state = getState();
    const recipe = findRecipe(state, req.params.id);
    if (!recipe) {
        res.status(404).json({ error: "Receta no encontrada" });
        return;
    }
    res.json(recipe);
});

recipesRouter.post("/", (req, res) => {
    const body = req.body as Recipe;
    if (!body.title?.trim() || !Array.isArray(body.ingredients) || !Array.isArray(body.steps)) {
        res.status(400).json({ error: "Faltan campos obligatorios (title, ingredients, steps)" });
        return;
    }
    const state = getState();
    const recipe: Recipe = {
        ...body,
        id: crypto.randomUUID(),
        title: body.title.trim(),
        source: "local",
        emoji: body.emoji || "🍽️",
        diets: body.diets ?? [],
        suitableFor: body.suitableFor?.length ? body.suitableFor : ["almuerzo", "cena"],
        servings: Math.max(1, body.servings ?? 4),
        prepMinutes: body.prepMinutes ?? 0,
        cookMinutes: body.cookMinutes ?? 0,
        nutrition: body.nutrition ?? { kcal: 0, protein: 0, carbs: 0, fat: 0 },
        tips: body.tips ?? [],
    };
    state.recipes.push(recipe);
    saveState();
    res.status(201).json(recipe);
});

recipesRouter.put("/:id", (req, res) => {
    const state = getState();
    const index = state.recipes.findIndex((r) => r.id === req.params.id);
    if (index === -1) {
        res.status(404).json({ error: "Receta no encontrada" });
        return;
    }
    const body = req.body as Partial<Recipe>;
    state.recipes[index] = {
        ...state.recipes[index],
        ...body,
        id: state.recipes[index].id,
        title: body.title?.trim() || state.recipes[index].title,
    };
    saveState();
    res.json(state.recipes[index]);
});

recipesRouter.delete("/:id", (req, res) => {
    const state = getState();
    const id = req.params.id;
    if (!findRecipe(state, id)) {
        res.status(404).json({ error: "Receta no encontrada" });
        return;
    }
    state.recipes = state.recipes.filter((r) => r.id !== id);
    if (state.weeklyPlan) {
        state.weeklyPlan.slots = state.weeklyPlan.slots.filter((s) => s.recipeId !== id);
    }
    state.history = state.history.filter((h) => h.recipeId !== id);
    for (const p of state.profiles) {
        p.favoriteRecipeIds = p.favoriteRecipeIds.filter((f) => f !== id);
    }
    saveState();
    res.json({ ok: true });
});
