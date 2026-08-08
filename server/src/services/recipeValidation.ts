import type { IngredientCategory } from "../types.js";

const INGREDIENT_CATEGORIES: ReadonlySet<string> = new Set<IngredientCategory>([
    "verduras",
    "frutas",
    "proteinas",
    "lacteos",
    "granos",
    "condimentos",
    "despensa",
    "otros",
]);

/**
 * Valida un ingrediente individual. Devuelve un mensaje de error en español o null si es válido.
 */
export function validateIngredient(i: unknown, index: number): string | null {
    if (i === null || typeof i !== "object") {
        return `Ingrediente inválido en posición ${index}: no es un objeto`;
    }

    const ing = i as Record<string, unknown>;

    if (typeof ing.name !== "string" || ing.name.trim().length === 0) {
        return `Ingrediente inválido en posición ${index}: name requerido`;
    }

    if (typeof ing.quantity !== "number" || !Number.isFinite(ing.quantity) || ing.quantity < 0) {
        return `Ingrediente inválido en posición ${index}: quantity requerido`;
    }

    if (typeof ing.unit !== "string") {
        return `Ingrediente inválido en posición ${index}: unit requerido`;
    }

    if (typeof ing.category !== "string" || !INGREDIENT_CATEGORIES.has(ing.category)) {
        return `Ingrediente inválido en posición ${index}: category requerido`;
    }

    return null;
}

/**
 * Valida un paso individual. Devuelve un mensaje de error en español o null si es válido.
 */
export function validateStep(s: unknown, index: number): string | null {
    if (s === null || typeof s !== "object") {
        return `Paso inválido en posición ${index}: no es un objeto`;
    }

    const step = s as Record<string, unknown>;

    if (typeof step.text !== "string" || step.text.trim().length === 0) {
        return `Paso inválido en posición ${index}: text requerido`;
    }

    return null;
}

/**
 * Valida el cuerpo de una receta (ingredientes y pasos).
 * Devuelve un array de mensajes de error en español (vacío si todo es válido).
 */
export function validateRecipe(body: unknown): string[] {
    if (body === null || typeof body !== "object") {
        return ["El cuerpo de la receta debe ser un objeto"];
    }

    const b = body as Record<string, unknown>;
    const errors: string[] = [];

    if (!Array.isArray(b.ingredients) || b.ingredients.length === 0) {
        errors.push("Se requiere al menos un ingrediente");
    } else {
        for (let i = 0; i < b.ingredients.length; i++) {
            const err = validateIngredient(b.ingredients[i], i);
            if (err) {
                errors.push(err);
            }
        }
    }

    if (!Array.isArray(b.steps) || b.steps.length === 0) {
        errors.push("Se requiere al menos un paso");
    } else {
        for (let i = 0; i < b.steps.length; i++) {
            const err = validateStep(b.steps[i], i);
            if (err) {
                errors.push(err);
            }
        }
    }

    return errors;
}
