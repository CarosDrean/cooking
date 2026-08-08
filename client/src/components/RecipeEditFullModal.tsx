import { useState } from "react";
import { useUpdateRecipe } from "../api/hooks";
import { useToast } from "../lib/toast";
import { useModalClose } from "../lib/useModalClose";
import type { IngredientCategory, MealType, Recipe, RecipeIngredient, RecipeStep, Season } from "../types";
import { DIETS, MEAL_LABELS, MEALS, SEASON_LABELS, SEASONS } from "../types";

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

interface Props {
    recipe: Recipe;
    onClose: () => void;
    onSaved: () => void;
}

export default function RecipeEditFullModal({ recipe, onClose, onSaved }: Props) {
    const updateRecipe = useUpdateRecipe();
    const toast = useToast();

    const [title, setTitle] = useState(recipe.title);
    const [emoji, setEmoji] = useState(recipe.emoji);
    const [description, setDescription] = useState(recipe.description ?? "");
    const [image, setImage] = useState(recipe.image ?? "");
    const [servings, setServings] = useState(recipe.servings);
    const [prepMinutes, setPrepMinutes] = useState(recipe.prepMinutes);
    const [cookMinutes, setCookMinutes] = useState(recipe.cookMinutes);
    const [diets, setDiets] = useState<string[]>(recipe.diets ?? []);
    const [suitableFor, setSuitableFor] = useState<MealType[]>(recipe.suitableFor ?? []);
    const [cuisine, setCuisine] = useState(recipe.cuisine ?? "");
    const [regions, setRegions] = useState((recipe.regions ?? []).join(", "));
    const [seasonal, setSeasonal] = useState<Season[]>(recipe.seasonal ?? []);
    const [ingredients, setIngredients] = useState<RecipeIngredient[]>(
        recipe.ingredients.length > 0
            ? recipe.ingredients
            : [{ name: "", quantity: 1, unit: "unidades", category: "otros" }],
    );
    const [steps, setSteps] = useState<RecipeStep[]>(recipe.steps.length > 0 ? recipe.steps : [{ text: "" }]);
    const [tips, setTips] = useState((recipe.tips ?? []).join("\n"));
    const [kcal, setKcal] = useState(recipe.nutrition.kcal);
    const [protein, setProtein] = useState(recipe.nutrition.protein);
    const [carbs, setCarbs] = useState(recipe.nutrition.carbs);
    const [fat, setFat] = useState(recipe.nutrition.fat);

    const toggleDiet = (d: string) => setDiets((cur) => (cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d]));
    const toggleMeal = (m: MealType) =>
        setSuitableFor((cur) => (cur.includes(m) ? cur.filter((x) => x !== m) : [...cur, m]));
    const toggleSeason = (s: Season) =>
        setSeasonal((cur) => (cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]));

    const updateIngredient = (i: number, patch: Partial<RecipeIngredient>) =>
        setIngredients((cur) => cur.map((ing, idx) => (idx === i ? { ...ing, ...patch } : ing)));

    const updateStep = (i: number, patch: Partial<RecipeStep>) =>
        setSteps((cur) => cur.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));

    useModalClose(onClose);

    const handleSubmit = () => {
        if (!title.trim()) {
            toast("El título es obligatorio", "error");
            return;
        }
        if (ingredients.length === 0 || ingredients.every((i) => !i.name.trim())) {
            toast("Añade al menos un ingrediente", "error");
            return;
        }
        if (steps.length === 0 || steps.every((s) => !s.text.trim())) {
            toast("Añade al menos un paso", "error");
            return;
        }

        updateRecipe.mutate(
            {
                id: recipe.id,
                body: {
                    title: title.trim(),
                    emoji: emoji.trim() || "🍽️",
                    description: description.trim(),
                    image: image.trim() || undefined,
                    servings,
                    prepMinutes,
                    cookMinutes,
                    diets: diets.length ? diets : undefined,
                    suitableFor: suitableFor.length ? suitableFor : undefined,
                    cuisine: cuisine.trim() || undefined,
                    regions: regions
                        .split(",")
                        .map((r) => r.trim())
                        .filter(Boolean),
                    seasonal: seasonal.length ? seasonal : undefined,
                    ingredients: ingredients.filter((i) => i.name.trim()).map((i) => ({ ...i, name: i.name.trim() })),
                    steps: steps
                        .filter((s) => s.text.trim())
                        .map((s) => ({ text: s.text.trim(), tip: s.tip?.trim() || undefined })),
                    tips: tips
                        .split("\n")
                        .map((t) => t.trim())
                        .filter(Boolean),
                    nutrition: {
                        kcal: kcal || 0,
                        protein: protein || 0,
                        carbs: carbs || 0,
                        fat: fat || 0,
                    },
                },
            },
            {
                onSuccess: () => {
                    toast("Receta actualizada ✓");
                    onSaved();
                },
                onError: () => toast("Error al actualizar la receta", "error"),
            },
        );
    };

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="modal modal-wide" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
                <div className="modal-head">
                    <h3>Editar receta</h3>
                    <button className="icon-btn" onClick={onClose} aria-label="Cerrar">
                        ✕
                    </button>
                </div>

                <div className="modal-scroll">
                    <div className="field">
                        <span>Título</span>
                        <input
                            className="input"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Ej. Lomo saltado"
                        />
                    </div>

                    <div className="edit-row">
                        <label className="field">
                            <span>Emoji</span>
                            <input className="input" value={emoji} onChange={(e) => setEmoji(e.target.value)} />
                        </label>
                        <label className="field">
                            <span>Raciones</span>
                            <input
                                className="input input-num"
                                type="number"
                                min="1"
                                max="24"
                                value={servings}
                                onChange={(e) => setServings(Number.parseInt(e.target.value, 10) || 1)}
                            />
                        </label>
                        <label className="field">
                            <span>Preparación (min)</span>
                            <input
                                className="input input-num"
                                type="number"
                                min="0"
                                value={prepMinutes}
                                onChange={(e) => setPrepMinutes(Number.parseInt(e.target.value, 10) || 0)}
                            />
                        </label>
                        <label className="field">
                            <span>Cocción (min)</span>
                            <input
                                className="input input-num"
                                type="number"
                                min="0"
                                value={cookMinutes}
                                onChange={(e) => setCookMinutes(Number.parseInt(e.target.value, 10) || 0)}
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

                    <label className="field">
                        <span>URL de imagen</span>
                        <input
                            className="input"
                            placeholder="https://..."
                            value={image}
                            onChange={(e) => setImage(e.target.value)}
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
                        <span>Comidas aptas</span>
                        <div className="filter-chips">
                            {MEALS.map((m) => (
                                <button
                                    key={m}
                                    type="button"
                                    className={`chip ${suitableFor.includes(m) ? "active" : ""}`}
                                    onClick={() => toggleMeal(m)}
                                >
                                    {MEAL_LABELS[m]}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="edit-row">
                        <label className="field">
                            <span>Cocina</span>
                            <input
                                className="input"
                                placeholder="Ej. Peruana"
                                value={cuisine}
                                onChange={(e) => setCuisine(e.target.value)}
                            />
                        </label>
                        <label className="field">
                            <span>Regiones (separadas por comas)</span>
                            <input
                                className="input"
                                placeholder="Ej. Perú, Lima"
                                value={regions}
                                onChange={(e) => setRegions(e.target.value)}
                            />
                        </label>
                    </div>

                    <div className="field">
                        <span>Temporadas</span>
                        <div className="filter-chips">
                            {SEASONS.map((s) => (
                                <button
                                    key={s}
                                    type="button"
                                    className={`chip ${seasonal.includes(s) ? "active" : ""}`}
                                    onClick={() => toggleSeason(s)}
                                >
                                    {SEASON_LABELS[s]}
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
                                    placeholder="Cant."
                                    value={ing.quantity}
                                    onChange={(e) =>
                                        updateIngredient(i, { quantity: Number.parseFloat(e.target.value) || 0 })
                                    }
                                />
                                <input
                                    className="input"
                                    placeholder="Und."
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
                                    placeholder="Tip (opcional)"
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

                    <label className="field">
                        <span>Tips (uno por línea)</span>
                        <textarea className="input" rows={3} value={tips} onChange={(e) => setTips(e.target.value)} />
                    </label>

                    <div className="field">
                        <span>Información nutricional (por ración)</span>
                        <div className="edit-row">
                            <label className="field">
                                <span>kcal</span>
                                <input
                                    className="input input-num"
                                    type="number"
                                    min="0"
                                    value={kcal}
                                    onChange={(e) => setKcal(Number.parseInt(e.target.value, 10) || 0)}
                                />
                            </label>
                            <label className="field">
                                <span>Proteína (g)</span>
                                <input
                                    className="input input-num"
                                    type="number"
                                    min="0"
                                    value={protein}
                                    onChange={(e) => setProtein(Number.parseInt(e.target.value, 10) || 0)}
                                />
                            </label>
                            <label className="field">
                                <span>Carbs (g)</span>
                                <input
                                    className="input input-num"
                                    type="number"
                                    min="0"
                                    value={carbs}
                                    onChange={(e) => setCarbs(Number.parseInt(e.target.value, 10) || 0)}
                                />
                            </label>
                            <label className="field">
                                <span>Grasa (g)</span>
                                <input
                                    className="input input-num"
                                    type="number"
                                    min="0"
                                    value={fat}
                                    onChange={(e) => setFat(Number.parseInt(e.target.value, 10) || 0)}
                                />
                            </label>
                        </div>
                    </div>
                </div>

                <div className="modal-actions">
                    <button className="btn ghost" type="button" onClick={onClose}>
                        Cancelar
                    </button>
                    <button
                        className="btn primary"
                        type="button"
                        onClick={handleSubmit}
                        disabled={updateRecipe.isPending}
                    >
                        {updateRecipe.isPending ? "Guardando…" : "Guardar cambios"}
                    </button>
                </div>
            </div>
        </div>
    );
}
