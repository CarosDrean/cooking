import { Router } from "express";
import { getState, saveState } from "../db.js";
import type { Drink, MealType } from "../types.js";
import { DRINKS } from "../types.js";

export const drinksRouter = Router();

function allDrinks(): Drink[] {
    const state = getState();
    if (state.drinks.length === 0) {
        state.drinks = DRINKS.map((d) => ({ ...d }));
        saveState();
    }
    return state.drinks;
}

drinksRouter.get("/", (_req, res) => {
    res.json(allDrinks());
});

drinksRouter.post("/", (req, res) => {
    const state = getState();
    const { name, emoji, kind, suitableFor } = (req.body ?? {}) as {
        name?: unknown;
        emoji?: unknown;
        kind?: unknown;
        suitableFor?: unknown;
    };

    const errors: string[] = [];
    if (typeof name !== "string" || !name.trim()) errors.push("El nombre es obligatorio.");
    if (typeof emoji !== "string" || !emoji.trim()) errors.push("El emoji es obligatorio.");
    if (!["refresco", "mate", "jugo", "bebida"].includes(kind as string)) errors.push("Tipo de bebida inválido.");
    if (!Array.isArray(suitableFor) || suitableFor.some((m) => !["desayuno", "almuerzo", "cena"].includes(m))) {
        errors.push("Las comidas aptas deben ser un arreglo de 'desayuno', 'almuerzo' o 'cena'.");
    }

    if (errors.length > 0) {
        res.status(400).json({ error: errors.join(" ") });
        return;
    }

    const drink: Drink = {
        id: `d${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: (name as string).trim(),
        emoji: (emoji as string).trim(),
        kind: kind as Drink["kind"],
        suitableFor: suitableFor as MealType[],
    };

    state.drinks.push(drink);
    saveState();
    res.status(201).json(drink);
});

drinksRouter.put("/:id", (req, res) => {
    const state = getState();
    const { id } = req.params;
    const body = (req.body ?? {}) as Record<string, unknown>;

    const idx = state.drinks.findIndex((d) => d.id === id);
    if (idx === -1) {
        res.status(404).json({ error: "Bebida no encontrada." });
        return;
    }

    const existing = state.drinks[idx];
    if (typeof body.name === "string" && body.name.trim()) {
        existing.name = body.name.trim();
    }
    if (typeof body.emoji === "string" && body.emoji.trim()) {
        existing.emoji = body.emoji.trim();
    }
    if (["refresco", "mate", "jugo", "bebida"].includes(body.kind as string)) {
        existing.kind = body.kind as Drink["kind"];
    }
    if (
        Array.isArray(body.suitableFor) &&
        body.suitableFor.every((m) => ["desayuno", "almuerzo", "cena"].includes(m))
    ) {
        existing.suitableFor = body.suitableFor as MealType[];
    }

    state.drinks[idx] = existing;
    saveState();
    res.json(existing);
});

drinksRouter.delete("/:id", (req, res) => {
    const state = getState();
    const { id } = req.params;

    const idx = state.drinks.findIndex((d) => d.id === id);
    if (idx === -1) {
        res.status(404).json({ error: "Bebida no encontrada." });
        return;
    }

    state.drinks.splice(idx, 1);
    saveState();
    res.json({ ok: true });
});
