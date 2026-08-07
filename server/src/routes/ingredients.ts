import { Router } from "express";
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
