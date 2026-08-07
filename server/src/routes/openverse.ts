import { Router } from "express";
import { searchWebImages } from "../services/googleImages.js";
import { searchOpenverse } from "../services/openverse.js";

export const openverseRouter = Router();

openverseRouter.get("/search", async (req, res) => {
    const q = (req.query.q as string | undefined)?.trim();
    if (!q) {
        res.status(400).json({ error: "Parámetro q es obligatorio" });
        return;
    }
    const [google, openverse] = await Promise.all([
        searchWebImages(q).catch(() => []),
        searchOpenverse(q).catch(() => []),
    ]);
    const merged = [...google, ...openverse];
    res.json(merged);
});
