import { Router } from "express";
import { getState, saveState } from "../db.js";
import { convertToGrams } from "../services/equivalentias.js";
import { findCatalogIngredient, inferCategory } from "../services/ingredients.js";
import { logMovement } from "../services/spending.js";
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
    res.json(state.pantry);
});

pantryRouter.get("/expiring", (req, res) => {
    const state = getState();
    const days = Number.parseInt(req.query.days as string, 10) || 7;
    const items = state.pantry.filter((i) => {
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
    const quantity = Math.max(0, body.quantity ?? 1);
    const unitPrice = toUnitPrice(body.unitPrice);
    const grams = convertToGrams(name, quantity, unit).equivalentValue;
    const state = getState();

    const existing = state.pantry.find((i) => sameItem(i.ingredientName, i.unit, name, unit));
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
    const index = state.pantry.findIndex((i) => i.id === req.params.id);
    if (index === -1) {
        res.status(404).json({ error: "Ítem no encontrado" });
        return;
    }
    const body = req.body as Partial<PantryItem>;
    const current = state.pantry[index];
    const name = body.ingredientName?.trim() || current.ingredientName;
    const unit = (body.unit?.trim() || current.unit).toLowerCase();
    const quantity = body.quantity != null ? Math.max(0, body.quantity) : current.quantity;
    const catalog = findCatalogIngredient(name);

    // If the edited item collides with another one (same name + unit), merge into it.
    const other = state.pantry.find((i, idx) => idx !== index && sameItem(i.ingredientName, i.unit, name, unit));
    if (other) {
        other.quantity = round(other.quantity + quantity);
        other.category = other.category ?? categoryFor(name, catalog?.category);
        state.pantry.splice(index, 1);
        saveState();
        res.json(other);
        return;
    }

    state.pantry[index] = {
        ...current,
        ingredientName: name,
        quantity,
        unit,
        expiryDate: body.expiryDate !== undefined ? body.expiryDate || undefined : current.expiryDate,
        category: body.category ?? categoryFor(name, catalog?.category) ?? current.category,
        unitPrice: body.unitPrice !== undefined ? toUnitPrice(body.unitPrice) : current.unitPrice,
        grams: convertToGrams(name, quantity, unit).equivalentValue ?? current.grams,
    };
    saveState();
    res.json(state.pantry[index]);
});

pantryRouter.delete("/:id", (req, res) => {
    const state = getState();
    const index = state.pantry.findIndex((i) => i.id === req.params.id);
    if (index === -1) {
        res.status(404).json({ error: "Ítem no encontrado" });
        return;
    }
    const removed = state.pantry[index];
    state.pantry.splice(index, 1);
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
