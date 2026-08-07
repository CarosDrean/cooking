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

settingsRouter.get("/keys", (_req, res) => {
    res.json({
        openai: Boolean(process.env.OPENAI_API_KEY),
        anthropic: Boolean(process.env.ANTHROPIC_API_KEY),
        google: Boolean(process.env.GOOGLE_API_KEY),
        spoonacular: Boolean(process.env.SPOONACULAR_API_KEY),
        ollama: Boolean(process.env.OLLAMA_HOST),
    });
});

settingsRouter.put("/keys", (req, res) => {
    const body = (req.body ?? {}) as {
        openai?: string | null;
        anthropic?: string | null;
        google?: string | null;
        spoonacular?: string | null;
        ollamaHost?: string | null;
    };

    if (body.openai !== undefined) {
        if (body.openai) process.env.OPENAI_API_KEY = body.openai;
        else delete process.env.OPENAI_API_KEY;
    }
    if (body.anthropic !== undefined) {
        if (body.anthropic) process.env.ANTHROPIC_API_KEY = body.anthropic;
        else delete process.env.ANTHROPIC_API_KEY;
    }
    if (body.google !== undefined) {
        if (body.google) process.env.GOOGLE_API_KEY = body.google;
        else delete process.env.GOOGLE_API_KEY;
    }
    if (body.spoonacular !== undefined) {
        if (body.spoonacular) process.env.SPOONACULAR_API_KEY = body.spoonacular;
        else delete process.env.SPOONACULAR_API_KEY;
    }
    if (body.ollamaHost !== undefined) {
        if (body.ollamaHost) process.env.OLLAMA_HOST = body.ollamaHost;
        else delete process.env.OLLAMA_HOST;
    }

    res.json({
        openai: Boolean(process.env.OPENAI_API_KEY),
        anthropic: Boolean(process.env.ANTHROPIC_API_KEY),
        google: Boolean(process.env.GOOGLE_API_KEY),
        spoonacular: Boolean(process.env.SPOONACULAR_API_KEY),
        ollama: Boolean(process.env.OLLAMA_HOST),
    });
});
