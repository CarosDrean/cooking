import { Router } from "express";
import { getState, saveState } from "../db.js";
import type { MealLogEntry, MealType } from "../types.js";

export const historyRouter = Router();

historyRouter.get("/", (req, res) => {
    const state = getState();
    const profileId = (req.query.profileId as string | undefined) ?? state.activeProfileId;
    const entries = state.history.filter((h) => h.profileId === profileId).sort((a, b) => b.date.localeCompare(a.date));
    res.json(entries);
});

historyRouter.post("/", (req, res) => {
    const state = getState();
    const body = req.body as Partial<MealLogEntry>;
    if (!body.recipeId || !state.recipes.some((r) => r.id === body.recipeId)) {
        res.status(400).json({ error: "Receta inválida" });
        return;
    }
    const entry: MealLogEntry = {
        id: crypto.randomUUID(),
        profileId: body.profileId ?? state.activeProfileId,
        recipeId: body.recipeId,
        date: body.date ?? new Date().toISOString().slice(0, 10),
        meal: (body.meal as MealType) ?? "almuerzo",
        servings: Math.max(1, body.servings ?? 1),
        rating: body.rating,
        notes: body.notes,
        source: body.source ?? "manual",
    };
    state.history.push(entry);
    saveState();
    res.status(201).json(entry);
});

historyRouter.put("/:id", (req, res) => {
    const state = getState();
    const index = state.history.findIndex((h) => h.id === req.params.id);
    if (index === -1) {
        res.status(404).json({ error: "Entrada no encontrada" });
        return;
    }
    const body = req.body as Partial<MealLogEntry>;
    const entry = state.history[index];
    entry.rating = body.rating !== undefined ? body.rating : entry.rating;
    entry.notes = body.notes !== undefined ? body.notes : entry.notes;
    entry.meal = body.meal ?? entry.meal;
    entry.servings = body.servings ?? entry.servings;
    saveState();
    res.json(entry);
});

historyRouter.delete("/:id", (req, res) => {
    const state = getState();
    const before = state.history.length;
    state.history = state.history.filter((h) => h.id !== req.params.id);
    if (state.history.length === before) {
        res.status(404).json({ error: "Entrada no encontrada" });
        return;
    }
    saveState();
    res.json({ ok: true });
});
