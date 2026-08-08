import type {
    IngredientCategory,
    MealType,
    Recipe,
    RecipeIngredient,
    RecipeNutrition,
    RecipeStep,
    Season,
} from "../types.js";
import { DIETS, SEASONS } from "../types.js";

const VALID_MEALS: ReadonlySet<string> = new Set(["desayuno", "almuerzo", "cena"]);

const VALID_CATEGORIES: ReadonlySet<string> = new Set([
    "verduras",
    "frutas",
    "proteinas",
    "lacteos",
    "granos",
    "condimentos",
    "despensa",
    "otros",
]);

function sanitizeCategory(raw: unknown): IngredientCategory {
    if (typeof raw === "string" && VALID_CATEGORIES.has(raw)) {
        return raw as IngredientCategory;
    }
    return "otros";
}

/**
 * Sanitiza el borrador de una receta (típicamente la respuesta JSON del LLM).
 * Normaliza campos, filtra dietas y meals contra los valores válidos,
 * fuerza categories de ingredientes a valores válidos (fallback "otros"),
 * y rellena defaults.
 *
 * Devuelve un objeto Recipe completo (id vacío, source "ai") o null si
 * la receta no es recuperable (falta title o no quedan ingredientes/pasos válidos).
 */
export function sanitizeRecipe(draft: unknown): Recipe | null {
    if (draft === null || typeof draft !== "object") {
        return null;
    }

    const d = draft as Record<string, unknown>;

    // -- title (crítico) ---------------------------------------------------
    if (typeof d.title !== "string" || d.title.trim().length === 0) {
        return null;
    }

    // -- ingredients (crítico: debe haber al menos uno válido) -------------
    if (!Array.isArray(d.ingredients) || d.ingredients.length === 0) {
        return null;
    }

    const ingredients: RecipeIngredient[] = [];
    for (const raw of d.ingredients) {
        if (raw === null || typeof raw !== "object") {
            continue;
        }
        const i = raw as Record<string, unknown>;
        if (typeof i.name !== "string" || i.name.trim().length === 0) {
            continue;
        }

        ingredients.push({
            name: i.name.trim(),
            quantity: typeof i.quantity === "number" && Number.isFinite(i.quantity) && i.quantity >= 0 ? i.quantity : 1,
            unit: typeof i.unit === "string" && i.unit.trim().length > 0 ? i.unit.trim() : "unidades",
            category: sanitizeCategory(i.category),
        });
    }

    if (ingredients.length === 0) {
        return null;
    }

    // -- steps (crítico: debe haber al menos uno válido) -------------------
    const steps: RecipeStep[] = [];
    if (Array.isArray(d.steps)) {
        for (const raw of d.steps) {
            if (raw === null || typeof raw !== "object") {
                continue;
            }
            const s = raw as Record<string, unknown>;
            if (typeof s.text !== "string" || s.text.trim().length === 0) {
                continue;
            }
            steps.push({
                text: s.text.trim(),
                tip: typeof s.tip === "string" && s.tip.trim().length > 0 ? s.tip.trim() : undefined,
            });
        }
    }

    if (steps.length === 0) {
        return null;
    }

    // -- diets: filtrar contra DIETS ---------------------------------------
    const validDiets: readonly string[] = DIETS;
    const diets: string[] = Array.isArray(d.diets)
        ? (d.diets as string[]).filter((diet): diet is string => typeof diet === "string" && validDiets.includes(diet))
        : [];

    // -- suitableFor: filtrar contra meals válidos --------------------------
    const suitableFor: MealType[] = Array.isArray(d.suitableFor)
        ? (d.suitableFor as string[]).filter((s): s is MealType => VALID_MEALS.has(s))
        : [];

    if (suitableFor.length === 0) {
        suitableFor.push("almuerzo", "cena");
    }

    // -- nutrition ---------------------------------------------------------
    const rawNutrition = d.nutrition as Record<string, unknown> | undefined;
    const nutrition: RecipeNutrition = {
        kcal: typeof rawNutrition?.kcal === "number" && Number.isFinite(rawNutrition.kcal) ? rawNutrition.kcal : 0,
        protein:
            typeof rawNutrition?.protein === "number" && Number.isFinite(rawNutrition.protein)
                ? rawNutrition.protein
                : 0,
        carbs: typeof rawNutrition?.carbs === "number" && Number.isFinite(rawNutrition.carbs) ? rawNutrition.carbs : 0,
        fat: typeof rawNutrition?.fat === "number" && Number.isFinite(rawNutrition.fat) ? rawNutrition.fat : 0,
    };

    // -- seasonal ----------------------------------------------------------
    const validSeasons: readonly string[] = SEASONS;
    const seasonal: Season[] | undefined = Array.isArray(d.seasonal)
        ? (d.seasonal as string[]).filter((s): s is Season => typeof s === "string" && validSeasons.includes(s))
        : undefined;

    // -- regions -----------------------------------------------------------
    const regions: string[] | undefined = Array.isArray(d.regions)
        ? (d.regions as string[]).filter((r): r is string => typeof r === "string")
        : undefined;

    // -- numeric fields ----------------------------------------------------
    const prepMinutes =
        typeof d.prepMinutes === "number" && Number.isFinite(d.prepMinutes) ? Math.max(0, d.prepMinutes) : 15;
    const cookMinutes =
        typeof d.cookMinutes === "number" && Number.isFinite(d.cookMinutes) ? Math.max(0, d.cookMinutes) : 30;
    const servings = typeof d.servings === "number" && Number.isFinite(d.servings) ? Math.max(1, d.servings) : 4;

    // -- tips --------------------------------------------------------------
    const tips: string[] = Array.isArray(d.tips)
        ? (d.tips as string[]).filter((t): t is string => typeof t === "string")
        : [];

    return {
        id: "",
        title: d.title.trim(),
        description: typeof d.description === "string" ? d.description.trim() : "",
        emoji: typeof d.emoji === "string" && d.emoji.trim().length > 0 ? d.emoji.trim() : "🍽️",
        source: "ai",
        diets,
        cuisine: typeof d.cuisine === "string" ? d.cuisine.trim() : undefined,
        regions: regions?.length ? regions : undefined,
        seasonal: seasonal?.length ? seasonal : undefined,
        suitableFor,
        prepMinutes,
        cookMinutes,
        servings,
        ingredients,
        steps,
        tips,
        nutrition,
    };
}
