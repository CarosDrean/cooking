import { Router } from "express";
import { getState, saveState } from "../db.js";
import { convertToGrams } from "../services/equivalentias.js";
import { findCatalogIngredient, inferCategory } from "../services/ingredients.js";
import { logMovement } from "../services/spending.js";
import { parsePositiveNumber } from "../services/validation.js";
import type { IngredientCategory, PantryItem } from "../types.js";

export const pantryRouter = Router();

function daysUntil(expiry: string | undefined): number | null {
    if (!expiry) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return Math.round((Date.parse(expiry) - today.getTime()) / 86400000);
}

function normalize(value: string): string {
    return value
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim();
}

const UNIT_SINGULAR_ALIASES: Record<string, string> = {
    unidad: "unidades",
    gramo: "gramos",
    litro: "litros",
    mililitro: "mililitros",
    kilogramo: "kilogramos",
    cucharada: "cucharadas",
    cucharadita: "cucharaditas",
    puñado: "puñados",
    tallo: "tallos",
    hoja: "hojas",
    rebanada: "rebanadas",
    diente: "dientes",
    paquete: "paquetes",
    lata: "latas",
};

/** Canonical unit: singular forms are treated as their plural ("unidad" ≡ "unidades"). */
function normalizeUnit(unit: string): string {
    const n = normalize(unit);
    if (!n) return n;
    return UNIT_SINGULAR_ALIASES[n] ?? n;
}

function round(n: number): number {
    return Math.round(n * 1000) / 1000;
}

/** Merge key: same normalized name + same unit (inconsistent units never sum). */
/** Devuelve los ítems de la despensa que pertenecen al perfil activo. */
function mine(state: ReturnType<typeof getState>): PantryItem[] {
    return state.pantry.filter((i) => i.profileId === state.activeProfileId);
}

function sameItem(nameA: string, unitA: string, nameB: string, unitB: string): boolean {
    return normalize(nameA) === normalize(nameB) && normalizeUnit(unitA) === normalizeUnit(unitB);
}

function categoryFor(name: string, catalogCategory?: IngredientCategory): IngredientCategory | undefined {
    return catalogCategory ?? inferCategory(name);
}

function toUnitPrice(value: unknown): number | undefined {
    const n = typeof value === "number" ? value : Number.parseFloat(String(value ?? ""));
    return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : undefined;
}

pantryRouter.get("/", (_req, res) => {
    const state = getState();
    res.json(mine(state));
});

pantryRouter.get("/expiring", (req, res) => {
    const state = getState();
    const days = Number.parseInt(req.query.days as string, 10) || 7;
    const items = mine(state).filter((i) => {
        const d = daysUntil(i.expiryDate);
        return d !== null && d <= days;
    });
    items.sort((a, b) => (a.expiryDate ?? "").localeCompare(b.expiryDate ?? ""));
    res.json(items.map((i) => ({ ...i, daysLeft: daysUntil(i.expiryDate) })));
});

pantryRouter.post("/", (req, res) => {
    const body = req.body as Partial<PantryItem>;
    const name = body.ingredientName?.trim();
    if (!name) {
        res.status(400).json({ error: "El nombre del ingrediente es obligatorio" });
        return;
    }
    const catalog = findCatalogIngredient(name);
    const unit = (body.unit?.trim() || catalog?.defaultUnit || "unidades").toLowerCase();
    const quantityRaw = parsePositiveNumber(body.quantity ?? 1, 0);
    if (quantityRaw === null) {
        res.status(400).json({ error: "quantity inválido (debe ser un número finito ≥ 0)" });
        return;
    }
    const quantity = Math.max(0, quantityRaw);
    const unitPrice = toUnitPrice(body.unitPrice);
    const grams = convertToGrams(name, quantity, unit).equivalentValue;
    const state = getState();

    const existing = mine(state).find((i) => sameItem(i.ingredientName, i.unit, name, unit));
    if (existing) {
        existing.quantity = round(existing.quantity + quantity);
        existing.expiryDate = body.expiryDate || existing.expiryDate;
        existing.category = existing.category ?? categoryFor(name, catalog?.category);
        if (unitPrice != null) {
            existing.unitPrice = unitPrice;
            logMovement(state, {
                profileId: state.activeProfileId,
                ingredientName: name,
                quantity,
                unit,
                unitPrice,
                total: round(quantity * unitPrice),
                category: existing.category,
                kind: "compra",
            });
        }
        if (grams != null) existing.grams = grams;
        saveState();
        res.status(200).json(existing);
        return;
    }

    const item: PantryItem = {
        id: crypto.randomUUID(),
        ingredientName: name,
        quantity,
        unit,
        expiryDate: body.expiryDate || undefined,
        dateAdded: new Date().toISOString(),
        profileId: state.activeProfileId,
        category: categoryFor(name, catalog?.category),
        unitPrice,
        grams,
    };
    state.pantry.push(item);
    if (unitPrice != null) {
        logMovement(state, {
            profileId: state.activeProfileId,
            ingredientName: name,
            quantity,
            unit,
            unitPrice,
            total: round(quantity * unitPrice),
            category: item.category,
            kind: "compra",
        });
    }
    saveState();
    res.status(201).json(item);
});

pantryRouter.put("/:id", (req, res) => {
    const state = getState();
    const myItems = mine(state);
    const index = myItems.findIndex((i) => i.id === req.params.id);
    if (index === -1) {
        res.status(404).json({ error: "Ítem no encontrado" });
        return;
    }
    const body = req.body as Partial<PantryItem>;
    const current = myItems[index];
    const name = body.ingredientName?.trim() || current.ingredientName;
    const unit = (body.unit?.trim() || current.unit).toLowerCase();
    let quantity: number;
    if (body.quantity != null) {
        const parsed = parsePositiveNumber(body.quantity, 0);
        if (parsed === null) {
            res.status(400).json({ error: "quantity inválido (debe ser un número finito ≥ 0)" });
            return;
        }
        quantity = Math.max(0, parsed);
    } else {
        quantity = current.quantity;
    }
    const catalog = findCatalogIngredient(name);

    // If the edited item collides with another one (same name + unit), merge into it.
    const other = myItems.find((i, idx) => idx !== index && sameItem(i.ingredientName, i.unit, name, unit));
    if (other) {
        other.quantity = round(other.quantity + quantity);
        other.category = other.category ?? categoryFor(name, catalog?.category);
        // Remove current item from state.pantry (use the original pantry array)
        const realIndex = state.pantry.findIndex((i) => i.id === current.id);
        if (realIndex !== -1) state.pantry.splice(realIndex, 1);
        saveState();
        res.json(other);
        return;
    }

    const newUnitPrice = body.unitPrice !== undefined ? toUnitPrice(body.unitPrice) : current.unitPrice;

    const realIndex = state.pantry.findIndex((i) => i.id === current.id);
    if (realIndex === -1) {
        res.status(500).json({ error: "Error interno: ítem desapareció" });
        return;
    }

    state.pantry[realIndex] = {
        ...current,
        ingredientName: name,
        quantity,
        unit,
        expiryDate: body.expiryDate !== undefined ? body.expiryDate || undefined : current.expiryDate,
        category: body.category ?? categoryFor(name, catalog?.category) ?? current.category,
        unitPrice: newUnitPrice,
        grams: convertToGrams(name, quantity, unit).equivalentValue ?? current.grams,
    };

    // Al añadir precio a un ítem que no lo tenía (p. ej. registrado sin precio),
    // se registra la compra para que aparezca en Gastos.
    if (newUnitPrice != null && current.unitPrice == null) {
        logMovement(state, {
            profileId: state.activeProfileId,
            ingredientName: name,
            quantity,
            unit,
            unitPrice: newUnitPrice,
            total: round(quantity * newUnitPrice),
            category: state.pantry[realIndex].category,
            kind: "compra",
        });
    }

    saveState();
    res.json(state.pantry[realIndex]);
});

pantryRouter.delete("/:id", (req, res) => {
    const state = getState();
    const myItems = mine(state);
    const myIndex = myItems.findIndex((i) => i.id === req.params.id);
    if (myIndex === -1) {
        res.status(404).json({ error: "Ítem no encontrado" });
        return;
    }
    const removed = myItems[myIndex];
    const realIndex = state.pantry.findIndex((i) => i.id === removed.id);
    if (realIndex === -1) {
        res.status(500).json({ error: "Error interno: ítem desapareció" });
        return;
    }
    state.pantry.splice(realIndex, 1);
    if (removed.unitPrice != null) {
        logMovement(state, {
            profileId: state.activeProfileId,
            ingredientName: removed.ingredientName,
            quantity: removed.quantity,
            unit: removed.unit,
            unitPrice: removed.unitPrice,
            total: round(removed.quantity * removed.unitPrice),
            category: removed.category,
            kind: "consumo",
        });
    }
    saveState();
    res.json({ ok: true });
});
