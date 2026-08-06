import { Router } from "express";
import { getState, saveState } from "../db.js";
import { generateShoppingList } from "../services/shoppingList.js";

export const shoppingRouter = Router();

shoppingRouter.get("/", (_req, res) => {
    const state = getState();
    res.json(state.shoppingList);
});

shoppingRouter.post("/generate", (req, res) => {
    const state = getState();
    const weekStart = (req.body?.weekStart as string | undefined) ?? state.weeklyPlan?.weekStart ?? null;
    if (!weekStart) {
        res.status(400).json({ error: "Primero genera un plan semanal" });
        return;
    }
    state.shoppingList = generateShoppingList(state, weekStart);
    saveState();
    res.json(state.shoppingList);
});

shoppingRouter.put("/items/:name", (req, res) => {
    const state = getState();
    const list = state.shoppingList;
    if (!list) {
        res.status(404).json({ error: "No hay lista de compras" });
        return;
    }
    const index = list.items.findIndex((i) => i.name === req.params.name);
    if (index === -1) {
        res.status(404).json({ error: "Ítem no encontrado" });
        return;
    }
    const checked = req.body?.checked;
    list.items[index].checked = checked != null ? Boolean(checked) : !list.items[index].checked;
    saveState();
    res.json(list);
});

shoppingRouter.delete("/", (_req, res) => {
    const state = getState();
    state.shoppingList = null;
    saveState();
    res.json({ ok: true });
});
