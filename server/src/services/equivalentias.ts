import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { normalizeText } from "../types.js";

const file = fileURLToPath(new URL("../../data/equivalentias.json", import.meta.url));

interface EquivalenceEntry {
    name: string;
    conversions: Record<string, number>;
}

let cache: EquivalenceEntry[] | null = null;

function getEquivalences(): EquivalenceEntry[] {
    if (!cache) {
        cache = JSON.parse(readFileSync(file, "utf8")) as EquivalenceEntry[];
    }
    return cache;
}

/** Exact (normalized) lookup in the equivalence table. */
export function findEquivalence(name: string): EquivalenceEntry | undefined {
    const key = normalizeText(name);
    if (!key) return undefined;
    return getEquivalences().find((e) => normalizeText(e.name) === key);
}

const MASS_UNITS = new Set(["g", "kg", "gramo", "gramos", "kilo", "kilos", "kilogramo", "kilogramos"]);
const VOLUME_UNITS = new Set(["ml", "l", "litro", "litros", "mililitro", "mililitros"]);

/** Singular form so "tazas" matches the "taza" key. */
function unitKey(unit: string): string {
    return normalizeText(unit).replace(/s$/, "");
}

export interface EquivalentResult {
    ingredientName: string;
    quantity: number;
    unit: string;
    matched: boolean;
    equivalentUnit?: "g";
    equivalentValue?: number;
}

/** Converts a volumetric/ambiguous unit into grams using the pilot table. */
export function convertToGrams(name: string, quantity: number, unit: string): EquivalentResult {
    const n = normalizeText(name);
    const u = normalizeText(unit);
    const entry = n ? findEquivalence(name) : undefined;
    const key = unitKey(u);
    const gramsPerUnit = entry?.conversions[key];

    if (n && entry && !MASS_UNITS.has(u) && !VOLUME_UNITS.has(u) && gramsPerUnit && quantity > 0) {
        return {
            ingredientName: entry.name,
            quantity,
            unit,
            matched: true,
            equivalentUnit: "g",
            equivalentValue: Math.round(quantity * gramsPerUnit),
        };
    }
    return { ingredientName: name, quantity, unit, matched: false };
}
