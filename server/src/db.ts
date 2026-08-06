import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { AppState } from "@cooking/shared";
import { seedState } from "./data/seed.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SERVER_ROOT = path.resolve(__dirname, "..");
const DATA_DIR = path.join(SERVER_ROOT, "data");
const DATA_FILE = path.join(DATA_DIR, "db.json");

let state: AppState | null = null;
let saveTimer: NodeJS.Timeout | null = null;

function load(): AppState {
    if (existsSync(DATA_FILE)) {
        try {
            const raw = readFileSync(DATA_FILE, "utf8");
            const parsed = JSON.parse(raw) as AppState;
            if (parsed && Array.isArray(parsed.recipes)) return parsed;
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
