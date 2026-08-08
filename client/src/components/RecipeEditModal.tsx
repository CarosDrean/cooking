import { useState } from "react";
import { useClearRecipeOverride, useSaveRecipeOverride } from "../api/hooks";
import { useToast } from "../lib/toast";
import { useModalClose } from "../lib/useModalClose";
import { DIETS, type IngredientCategory, type Recipe, type RecipeIngredient, type RecipeStep } from "../types";

const CATEGORIES: IngredientCategory[] = [
    "verduras",
    "frutas",
    "proteinas",
    "lacteos",
    "granos",
    "condimentos",
    "despensa",
    "otros",
];

/** Editor de una variante de receta para la familia (override sobre la receta base). */
export default function RecipeEditModal({
    recipe,
    profileId,
    hasOverride,
    onClose,
}: {
    recipe: Recipe;
    profileId: string;
    hasOverride: boolean;
    onClose: () => void;
}) {
    const save = useSaveRecipeOverride();
    const clear = useClearRecipeOverride();
    const toast = useToast();

    const [title, setTitle] = useState(recipe.title);
    const [emoji, setEmoji] = useState(recipe.emoji);
    const [description, setDescription] = useState(recipe.description ?? "");
    const [servings, setServings] = useState(recipe.servings);
    const [diets, setDiets] = useState<string[]>(recipe.diets ?? []);
    const [ingredients, setIngredients] = useState<RecipeIngredient[]>(recipe.ingredients ?? []);
    const [steps, setSteps] = useState<RecipeStep[]>(recipe.steps ?? []);

    const toggleDiet = (d: string) => setDiets((cur) => (cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d]));

    const updateIngredient = (i: number, patch: Partial<RecipeIngredient>) =>
        setIngredients((cur) => cur.map((ing, idx) => (idx === i ? { ...ing, ...patch } : ing)));

    const updateStep = (i: number, patch: Partial<RecipeStep>) =>
        setSteps((cur) => cur.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));

    const submit = () => {
        if (!title.trim()) return;
        save.mutate(
            {
                profileId,
                recipeId: recipe.id,
                recipe: {
                    title: title.trim(),
                    emoji: emoji || "🍲",
                    description,
                    servings,
                    diets,
                    ingredients: ingredients.filter((i) => i.name.trim().length > 0),
                    steps: steps.filter((s) => s.text.trim().length > 0),
                },
            },
            {
                onSuccess: () => {
                    toast("Receta adaptada para tu perfil ✓");
                    onClose();
                },
                onError: () => toast("No se pudo guardar la variante.", "error"),
            },
        );
    };

    const restore = () => {
        clear.mutate(
            { profileId, recipeId: recipe.id },
            {
                onSuccess: () => {
                    toast("Receta original restaurada ✓");
                    onClose();
                },
            },
        );
    };

    useModalClose(onClose);

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="modal modal-wide" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
                <div className="modal-head">
                    <h3>Adaptar receta a tu familia</h3>
                    <button className="icon-btn" onClick={onClose} aria-label="Cerrar">
                        ✕
                    </button>
                </div>
                {hasOverride ? (
                    <p className="muted small">
                        Esta receta ya está adaptada para tu perfil. Edítala de nuevo o restaura la original.
                    </p>
                ) : (
                    <p className="muted small">
                        Guarda una variante solo para tu perfil. El catálogo y el resto de familias no cambian.
                    </p>
                )}

                <label className="field">
                    <span>Título</span>
                    <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} />
                </label>

                <div className="edit-row">
                    <label className="field">
                        <span>Emoji</span>
                        <input className="input" value={emoji} onChange={(e) => setEmoji(e.target.value)} />
                    </label>
                    <label className="field">
                        <span>Raciones base</span>
                        <input
                            className="input input-num"
                            type="number"
                            min="1"
                            max="24"
                            value={servings}
                            onChange={(e) => setServings(parseInt(e.target.value, 10) || 1)}
                        />
                    </label>
                </div>

                <label className="field">
                    <span>Descripción</span>
                    <textarea
                        className="input"
                        rows={2}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                    />
                </label>

                <div className="field">
                    <span>Dietas</span>
                    <div className="filter-chips">
                        {DIETS.map((d) => (
                            <button
                                key={d}
                                type="button"
                                className={`chip ${diets.includes(d) ? "active" : ""}`}
                                onClick={() => toggleDiet(d)}
                            >
                                {d}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="field">
                    <span>Ingredientes</span>
                    {ingredients.map((ing, i) => (
                        <div key={i} className="ing-row">
                            <input
                                className="input"
                                placeholder="Nombre"
                                value={ing.name}
                                onChange={(e) => updateIngredient(i, { name: e.target.value })}
                            />
                            <input
                                className="input input-num"
                                type="number"
                                min="0"
                                step="any"
                                placeholder="Cantidad"
                                value={ing.quantity}
                                onChange={(e) =>
                                    updateIngredient(i, { quantity: Number.parseFloat(e.target.value) || 0 })
                                }
                            />
                            <input
                                className="input"
                                placeholder="Unidad"
                                value={ing.unit}
                                onChange={(e) => updateIngredient(i, { unit: e.target.value })}
                            />
                            <select
                                className="input"
                                value={ing.category}
                                onChange={(e) =>
                                    updateIngredient(i, { category: e.target.value as IngredientCategory })
                                }
                            >
                                {CATEGORIES.map((c) => (
                                    <option key={c} value={c}>
                                        {c}
                                    </option>
                                ))}
                            </select>
                            <button
                                className="icon-btn danger"
                                type="button"
                                aria-label="Quitar ingrediente"
                                onClick={() => setIngredients((cur) => cur.filter((_, idx) => idx !== i))}
                            >
                                ✕
                            </button>
                        </div>
                    ))}
                    <button
                        className="btn ghost sm"
                        type="button"
                        onClick={() =>
                            setIngredients((cur) => [
                                ...cur,
                                { name: "", quantity: 1, unit: "unidades", category: "otros" },
                            ])
                        }
                    >
                        + Añadir ingrediente
                    </button>
                </div>

                <div className="field">
                    <span>Pasos</span>
                    {steps.map((s, i) => (
                        <div key={i} className="step-row">
                            <div className="step-row-head">
                                <strong>Paso {i + 1}</strong>
                                <button
                                    className="icon-btn danger"
                                    type="button"
                                    aria-label="Quitar paso"
                                    onClick={() => setSteps((cur) => cur.filter((_, idx) => idx !== i))}
                                >
                                    ✕
                                </button>
                            </div>
                            <textarea
                                className="input"
                                rows={2}
                                value={s.text}
                                onChange={(e) => updateStep(i, { text: e.target.value })}
                            />
                            <input
                                className="input"
                                placeholder="Consejo (opcional)"
                                value={s.tip ?? ""}
                                onChange={(e) => updateStep(i, { tip: e.target.value })}
                            />
                        </div>
                    ))}
                    <button
                        className="btn ghost sm"
                        type="button"
                        onClick={() => setSteps((cur) => [...cur, { text: "" }])}
                    >
                        + Añadir paso
                    </button>
                </div>

                <div className="modal-actions">
                    {hasOverride ? (
                        <button className="btn danger-text" onClick={restore} disabled={clear.isPending}>
                            Restaurar original
                        </button>
                    ) : null}
                    <button className="btn ghost" onClick={onClose}>
                        Cancelar
                    </button>
                    <button className="btn primary" onClick={submit} disabled={save.isPending}>
                        {save.isPending ? "Guardando…" : "Guardar variante"}
                    </button>
                </div>
            </div>
        </div>
    );
}
