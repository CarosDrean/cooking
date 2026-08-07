import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { AppState, Recipe } from "../types.js";

const recipesFile = fileURLToPath(new URL("../../data/recipes.json", import.meta.url));
const seedFile = fileURLToPath(new URL("../../data/seed.json", import.meta.url));

export const seedRecipes: Recipe[] = JSON.parse(readFileSync(recipesFile, "utf8"));

interface SeedData {
    profiles: AppState["profiles"];
    activeProfileId: string;
    pantry: AppState["pantry"];
    weeklyPlan: AppState["weeklyPlan"];
    history: AppState["history"];
    shoppingList: AppState["shoppingList"];
    location: AppState["location"];
}

/** Resolves `{{token}}` placeholders for relative dates so seed.json stays static. */
function resolveDates(value: unknown, resolve: (token: string) => string): unknown {
    if (typeof value === "string") {
        const match = value.match(/^\{\{([^}]+)\}\}$/);
        return match ? resolve(match[1]) : value;
    }
    if (Array.isArray(value)) return value.map((v) => resolveDates(v, resolve));
    if (value && typeof value === "object") {
        return Object.fromEntries(
            Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, resolveDates(v, resolve)]),
        );
    }
    return value;
}

export function seedState(): AppState {
    const raw = JSON.parse(readFileSync(seedFile, "utf8")) as SeedData;
    const now = new Date();
    const today = toISODate(now);
    const weekStart = startOfWeek(now);
    const daysAgo = (n: number) => toISODate(new Date(Date.now() - n * 86400000));

    const resolve = (token: string): string => {
        if (token === "today") return today;
        if (token === "weekStart") return weekStart;
        const match = token.match(/^daysAgo\((\d+)\)$/);
        if (match) return daysAgo(Number(match[1]));
        return token;
    };

    return {
        ...(resolveDates(raw, resolve) as SeedData),
        recipes: seedRecipes,
    };
}

function toISODate(d: Date): string {
    return d.toISOString().slice(0, 10);
}

function startOfWeek(d: Date): string {
    const date = new Date(d);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    date.setDate(diff);
    return toISODate(date);
}
