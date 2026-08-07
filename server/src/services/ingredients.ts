import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { CatalogIngredient, IngredientCategory } from "../types.js";

const catalogFile = fileURLToPath(new URL("../../data/ingredients.json", import.meta.url));

let cache: CatalogIngredient[] | null = null;

export function getIngredientCatalog(): CatalogIngredient[] {
    if (!cache) {
        cache = JSON.parse(readFileSync(catalogFile, "utf8")) as CatalogIngredient[];
    }
    return cache;
}

function normalize(value: string): string {
    return value
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim();
}

/** Exact (normalized) lookup in the catalog. */
export function findCatalogIngredient(name: string): CatalogIngredient | undefined {
    const key = normalize(name);
    if (!key) return undefined;
    return getIngredientCatalog().find((i) => normalize(i.name) === key);
}

/** Substring autocomplete over catalog names, ranked by prefix-first. */
export function searchCatalog(q: string, limit = 20): CatalogIngredient[] {
    const needle = normalize(q);
    if (!needle) return [];
    return getIngredientCatalog()
        .filter((i) => normalize(i.name).includes(needle))
        .sort((a, b) => {
            const an = normalize(a.name);
            const bn = normalize(b.name);
            const ap = an.startsWith(needle) ? 0 : 1;
            const bp = bn.startsWith(needle) ? 0 : 1;
            return ap - bp || an.localeCompare(bn);
        })
        .slice(0, limit);
}

/** Best category for an unknown ingredient name, matching known recipe/pantry data. */
export function inferCategory(name: string): IngredientCategory {
    const key = normalize(name);
    if (!key) return "otros";
    const known = getIngredientCatalog().find((i) => {
        const n = normalize(i.name);
        return n === key || n.includes(key) || key.includes(n);
    });
    return known?.category ?? "otros";
}
