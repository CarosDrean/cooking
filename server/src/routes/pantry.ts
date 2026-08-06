import type { PantryItem } from "@cooking/shared";
import { Router } from "express";
import { getState, saveState } from "../db.js";

export const pantryRouter = Router();

function daysUntil(expiry: string | undefined): number | null {
    if (!expiry) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return Math.round((Date.parse(expiry) - today.getTime()) / 86400000);
}

pantryRouter.get("/", (_req, res) => {
    const state = getState();
    res.json(state.pantry);
});

pantryRouter.get("/expiring", (req, res) => {
    const state = getState();
    const days = Number.parseInt(req.query.days as string, 10) || 7;
    const items = state.pantry.filter((i) => {
        const d = daysUntil(i.expiryDate);
        return d !== null && d <= days;
    });
    items.sort((a, b) => (a.expiryDate ?? "").localeCompare(b.expiryDate ?? ""));
    res.json(items.map((i) => ({ ...i, daysLeft: daysUntil(i.expiryDate) })));
});

pantryRouter.post("/", (req, res) => {
    const body = req.body as Partial<PantryItem>;
    if (!body.ingredientName?.trim()) {
        res.status(400).json({ error: "El nombre del ingrediente es obligatorio" });
        return;
    }
    const state = getState();
    const item: PantryItem = {
        id: crypto.randomUUID(),
        ingredientName: body.ingredientName.trim(),
        quantity: Math.max(0, body.quantity ?? 1),
        unit: body.unit || "unidades",
        expiryDate: body.expiryDate || undefined,
        dateAdded: new Date().toISOString(),
    };
    state.pantry.push(item);
    saveState();
    res.status(201).json(item);
});

pantryRouter.put("/:id", (req, res) => {
    const state = getState();
    const index = state.pantry.findIndex((i) => i.id === req.params.id);
    if (index === -1) {
        res.status(404).json({ error: "Ítem no encontrado" });
        return;
    }
    const body = req.body as Partial<PantryItem>;
    state.pantry[index] = {
        ...state.pantry[index],
        ingredientName: body.ingredientName?.trim() || state.pantry[index].ingredientName,
        quantity: body.quantity != null ? Math.max(0, body.quantity) : state.pantry[index].quantity,
        unit: body.unit || state.pantry[index].unit,
        expiryDate: body.expiryDate !== undefined ? body.expiryDate || undefined : state.pantry[index].expiryDate,
    };
    saveState();
    res.json(state.pantry[index]);
});

pantryRouter.delete("/:id", (req, res) => {
    const state = getState();
    const before = state.pantry.length;
    state.pantry = state.pantry.filter((i) => i.id !== req.params.id);
    if (state.pantry.length === before) {
        res.status(404).json({ error: "Ítem no encontrado" });
        return;
    }
    saveState();
    res.json({ ok: true });
});
