import { Router } from "express";
import { getState, saveState } from "../db.js";
import { currentSeason } from "../services/location.js";

export const settingsRouter = Router();

settingsRouter.get("/", (_req, res) => {
    const state = getState();
    const season = currentSeason(new Date(), state.location.country);
    res.json({ location: state.location, season });
});

settingsRouter.put("/", (req, res) => {
    const state = getState();
    const { country, city } = (req.body ?? {}) as { country?: unknown; city?: unknown };
    state.location = {
        country: typeof country === "string" && country.trim() ? country.trim() : state.location.country,
        city: typeof city === "string" && city.trim() ? city.trim() : state.location.city,
    };
    saveState();
    res.json({ location: state.location, season: currentSeason(new Date(), state.location.country) });
});
