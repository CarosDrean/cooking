import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { seedState } from "./data/seed.js";
import { convertToGrams } from "./services/equivalentias.js";
import type { AppState } from "./types.js";
import { DRINKS, isProfileComplete } from "./types.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SERVER_ROOT = path.resolve(__dirname, "..");
const DATA_DIR = path.join(SERVER_ROOT, "data");
const DATA_FILE = path.join(DATA_DIR, "db.json");

let state: AppState | null = null;
let saveTimer: NodeJS.Timeout | null = null;

export function ensureStateDefaults(state: AppState): AppState {
    // State-level defaults
    if (!state.drinks || state.drinks.length === 0) {
        state.drinks = DRINKS.map((d) => ({ ...d }));
    }
    state.purchaseLog ??= [];

    // Per-profile defaults
    for (const p of state.profiles ?? []) {
        p.suggestionFeedback ??= {};
        p.mealsPerDay ??= ["desayuno", "almuerzo", "cena"];
        p.isComplete ??= isProfileComplete(p);
        p.recipeOverrides ??= {};
        p.usualDishes ??= { desayuno: [], almuerzo: [], cena: [] };
    }

    // Per-pantry-item: grams fallback via equivalencias + profileId backfill (despensa legacy → primer perfil)
    for (const item of state.pantry ?? []) {
        item.profileId ??= state.profiles[0]?.id ?? state.activeProfileId;
        if (item.grams === undefined) {
            try {
                const result = convertToGrams(item.ingredientName, item.quantity, item.unit);
                if (result.equivalentValue !== undefined) {
                    item.grams = result.equivalentValue;
                }
            } catch {
                // Si falla la conversión, dejamos grams sin definir
            }
        }
    }

    // Dedupe recipe diets (arregla duplicados como "sin-lactosa","sin-lactosa")
    for (const recipe of state.recipes ?? []) {
        if (recipe.diets && recipe.diets.length > 0) {
            recipe.diets = [...new Set(recipe.diets)];
        }
    }

    return state;
}

function load(): AppState {
    if (existsSync(DATA_FILE)) {
        try {
            const raw = readFileSync(DATA_FILE, "utf8");
            const parsed = JSON.parse(raw) as AppState;
            if (parsed && Array.isArray(parsed.recipes)) {
                return ensureStateDefaults(parsed);
            }
        } catch {
            // corrupted file: fall back to seed
        }
    }
    const seeded = seedState();
    persistNow(seeded);
    return seeded;
}

function persistNow(next: AppState): void {
    mkdirSync(DATA_DIR, { recursive: true });
    const tmp = `${DATA_FILE}.tmp`;
    writeFileSync(tmp, JSON.stringify(next, null, 2));
    renameSync(tmp, DATA_FILE);
}

export function getState(): AppState {
    if (!state) state = load();
    return state;
}

export function saveState(): void {
    if (saveTimer) return;
    saveTimer = setTimeout(() => {
        saveTimer = null;
        if (!state) return;
        persistNow(state);
    }, 150);
}

export function updateState(mutate: (s: AppState) => void): AppState {
    const s = getState();
    mutate(s);
    saveState();
    return s;
}
