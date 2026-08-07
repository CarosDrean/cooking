import type { AppState, IngredientCategory, Recipe, ShoppingItem, ShoppingList } from "../types.js";
import { normalize } from "./diet.js";
import { recipesForProfile } from "./recipeVariants.js";
import { round, scaleRecipe } from "./scaling.js";

interface UnitInfo {
    group: "g" | "count";
    factor: number;
}

/** Map a unit to a comparable group + conversion factor to the base unit. */
export function unitInfo(unit: string): UnitInfo {
    const u = unit.trim().toLowerCase();
    if (["kg", "kilo", "kilos"].includes(u)) return { group: "g", factor: 1000 };
    if (["g", "gr", "gramo", "gramos"].includes(u)) return { group: "g", factor: 1 };
    if (["l", "lt", "litro", "litros", "ml", "mililitro", "mililitros", "cc"].includes(u))
        return { group: "g", factor: 1 };
    if (["cucharada", "cucharadas", "cda", "cucharada sopera"].includes(u)) return { group: "g", factor: 15 };
    if (["cucharadita", "cucharaditas", "cdta", "cucharada de postre"].includes(u)) return { group: "g", factor: 5 };
    if (["puñado", "puñados", "puno", "punos", "handful", "manojo", "manojos"].includes(u))
        return { group: "g", factor: 20 };
    return { group: "count", factor: 1 };
}

function keyOf(name: string, unit: string): string {
    return `${normalize(name)}|${unitInfo(unit).group}`;
}

function toBase(quantity: number, unit: string): number {
    return quantity * unitInfo(unit).factor;
}

interface PantryTotal {
    quantity: number; // in base units
    unit: string;
}

/** Aggregate pantry quantities by normalized name + comparable unit group. */
export function pantryTotals(state: AppState): Map<string, PantryTotal> {
    const map = new Map<string, PantryTotal>();
    for (const item of state.pantry) {
        const key = keyOf(item.ingredientName, item.unit);
        const existing = map.get(key);
        if (existing) {
            existing.quantity = round(existing.quantity + toBase(item.quantity, item.unit));
        } else {
            map.set(key, { quantity: toBase(item.quantity, item.unit), unit: item.unit });
        }
    }
    return map;
}

export interface MissingIngredient {
    name: string;
    quantity: number;
    unit: string;
    category: IngredientCategory;
}

/** Which recipe ingredients are not fully covered by the pantry? */
export function missingIngredients(state: AppState, recipe: Recipe): MissingIngredient[] {
    const pantry = pantryTotals(state);
    const scaled = scaleRecipe(recipe, Math.max(recipe.servings, 1));
    const missing: MissingIngredient[] = [];
    for (const ing of scaled) {
        const have = pantry.get(keyOf(ing.name, ing.unit));
        const needBase = toBase(ing.quantity, ing.unit);
        if (!have || have.quantity < needBase) {
            const missingBase = round(needBase - (have?.quantity ?? 0));
            if (missingBase > 0) {
                // express the missing amount back in the recipe's own unit
                const quantity = round(missingBase / unitInfo(ing.unit).factor);
                missing.push({ name: ing.name, quantity, unit: ing.unit, category: ing.category });
            }
        }
    }
    return missing;
}

export function isMakeable(state: AppState, recipe: Recipe): boolean {
    return missingIngredients(state, recipe).length === 0;
}

const CATEGORY_ORDER: IngredientCategory[] = [
    "verduras",
    "frutas",
    "proteinas",
    "lacteos",
    "granos",
    "condimentos",
    "despensa",
    "otros",
];

interface Aggregated {
    name: string;
    needed: number; // in base units
    unit: string;
    category: IngredientCategory;
}

/** Aggregate every slot of a weekly plan into ingredient needs (per name+unit group). */
export function aggregatePlanNeeds(state: AppState, weekStart: string): Map<string, Aggregated> {
    const plan = state.weeklyPlan;
    const byRecipe = new Map(recipesForProfile(state, state.activeProfileId).map((r) => [r.id, r]));
    const agg = new Map<string, Aggregated>();

    if (!plan || plan.weekStart !== weekStart) return agg;

    for (const slot of plan.slots) {
        const recipe = byRecipe.get(slot.recipeId);
        if (!recipe) continue;
        const scaled = scaleRecipe(recipe, slot.servings);
        for (const ing of scaled) {
            const key = keyOf(ing.name, ing.unit);
            const existing = agg.get(key);
            if (existing) {
                existing.needed = round(existing.needed + toBase(ing.quantity, ing.unit));
            } else {
                agg.set(key, {
                    name: ing.name,
                    needed: toBase(ing.quantity, ing.unit),
                    unit: ing.unit,
                    category: ing.category,
                });
            }
        }
    }
    return agg;
}

export function generateShoppingList(state: AppState, weekStart: string): ShoppingList {
    const agg = aggregatePlanNeeds(state, weekStart);
    const pantry = pantryTotals(state);

    const items: ShoppingItem[] = [];
    for (const [, a] of agg) {
        if (a.needed <= 0) continue;
        const have = pantry.get(keyOf(a.name, a.unit))?.quantity ?? 0;
        const covered = round(Math.min(a.needed, have));
        const toBuyBase = round(a.needed - covered);
        // express in the original unit of the first ingredient seen
        const factor = unitInfo(a.unit).factor;
        const needed = round(a.needed / factor);
        const toBuy = round(toBuyBase / factor);
        const inPantry = round(covered / factor);
        items.push({
            name: a.name,
            category: a.category,
            needed,
            unit: a.unit,
            inPantry,
            toBuy,
            checked: false,
        });
    }

    items.sort(
        (a, b) =>
            CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category) || a.name.localeCompare(b.name),
    );

    return {
        id: crypto.randomUUID(),
        weekStart,
        items,
        generatedAt: new Date().toISOString(),
    };
}
