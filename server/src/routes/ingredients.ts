import { Router } from "express";
import { convertToGrams } from "../services/equivalentias.js";
import { getIngredientCatalog, searchCatalog } from "../services/ingredients.js";

export const ingredientsRouter = Router();

ingredientsRouter.get("/", (req, res) => {
    const q = typeof req.query.q === "string" ? req.query.q : "";
    if (q) {
        res.json(searchCatalog(q));
        return;
    }
    res.json(getIngredientCatalog());
});

ingredientsRouter.get("/equivalent", (req, res) => {
    const name = typeof req.query.ingredient === "string" ? req.query.ingredient : "";
    const unit = typeof req.query.unit === "string" ? req.query.unit : "";
    const quantity = Number.parseFloat(String(req.query.quantity ?? "1")) || 1;
    if (!name.trim() || !unit.trim()) {
        res.status(400).json({ error: "Faltan ingredient y unit" });
        return;
    }
    res.json(convertToGrams(name, quantity, unit));
});
