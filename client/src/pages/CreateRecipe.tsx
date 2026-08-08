import { useState } from "react";
import { useCreateRecipe, useGenerateRecipe } from "../api/hooks";
import { dietLabel } from "../components/DietBadge";
import { navigate } from "../lib/router";
import { useToast } from "../lib/toast";
import {
    DIETS,
    type IngredientCategory,
    MEAL_LABELS,
    MEALS,
    type MealType,
    type RecipeIngredient,
    type RecipeStep,
    SEASON_LABELS,
    SEASONS,
    type Season,
} from "../types";

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

export default function CreateRecipe() {
    const createRecipe = useCreateRecipe();
    const generateRecipe = useGenerateRecipe();
    const toast = useToast();

    const [title, setTitle] = useState("");
    const [emoji, setEmoji] = useState("🍽️");
    const [description, setDescription] = useState("");
    const [image, setImage] = useState("");
    const [servings, setServings] = useState(4);
    const [prepMinutes, setPrepMinutes] = useState(0);
    const [cookMinutes, setCookMinutes] = useState(0);
    const [diets, setDiets] = useState<string[]>([]);
    const [suitableFor, setSuitableFor] = useState<MealType[]>([]);
    const [cuisine, setCuisine] = useState("");
    const [regions, setRegions] = useState("");
    const [seasonal, setSeasonal] = useState<Season[]>([]);
    const [protagonist, setProtagonist] = useState("");
    const [ingredients, setIngredients] = useState<RecipeIngredient[]>([
        { name: "", quantity: 1, unit: "unidades", category: "otros" },
    ]);
    const [steps, setSteps] = useState<RecipeStep[]>([{ text: "" }]);
    const [tips, setTips] = useState("");
    const [kcal, setKcal] = useState(0);
    const [protein, setProtein] = useState(0);
    const [carbs, setCarbs] = useState(0);
    const [fat, setFat] = useState(0);

    const [aiDescription, setAiDescription] = useState("");

    const toggleDiet = (d: string) => setDiets((cur) => (cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d]));
    const toggleMeal = (m: MealType) =>
        setSuitableFor((cur) => (cur.includes(m) ? cur.filter((x) => x !== m) : [...cur, m]));
    const toggleSeason = (s: Season) =>
        setSeasonal((cur) => (cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]));

    const handleGenerate = () => {
        if (!aiDescription.trim()) {
            toast("Describe la receta que quieres generar", "error");
            return;
        }
        generateRecipe.mutate(aiDescription.trim(), {
            onSuccess: (data) => {
                if (data.available === false) {
                    toast("La generación con IA no está disponible. Configura OPENROUTER_API_KEY.", "error");
                    return;
                }
                if (data.recipe) {
                    const r = data.recipe;
                    setTitle(r.title || "");
                    setEmoji(r.emoji || "🍽️");
                    setDescription(r.description || "");
                    setImage("");
                    setServings(r.servings || 4);
                    setPrepMinutes(r.prepMinutes || 0);
                    setCookMinutes(r.cookMinutes || 0);
                    setDiets(r.diets || []);
                    setSuitableFor((r.suitableFor as MealType[]) || []);
                    setCuisine(r.cuisine || "");
                    setRegions((r.regions || []).join(", "));
                    setSeasonal((r.seasonal as Season[]) || []);
                    setProtagonist("");
                    setIngredients(
                        (r.ingredients || []).length > 0
                            ? r.ingredients.map((ing) => ({
                                  name: ing.name,
                                  quantity: ing.quantity,
                                  unit: ing.unit,
                                  category: ing.category as IngredientCategory,
                              }))
                            : [{ name: "", quantity: 1, unit: "unidades", category: "otros" }],
                    );
                    setSteps(
                        (r.steps || []).length > 0
                            ? r.steps.map((s) => ({ text: s.text, tip: s.tip }))
                            : [{ text: "" }],
                    );
                    setTips((r.tips || []).join("\n"));
                    setKcal(r.nutrition?.kcal || 0);
                    setProtein(r.nutrition?.protein || 0);
                    setCarbs(r.nutrition?.carbs || 0);
                    setFat(r.nutrition?.fat || 0);
                    toast("Receta generada. Revisa y ajusta los campos antes de guardar.");
                }
            },
            onError: () => toast("Error al generar la receta con IA", "error"),
        });
    };

    const updateIngredient = (i: number, patch: Partial<RecipeIngredient>) =>
        setIngredients((cur) => cur.map((ing, idx) => (idx === i ? { ...ing, ...patch } : ing)));

    const updateStep = (i: number, patch: Partial<RecipeStep>) =>
        setSteps((cur) => cur.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));

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

        createRecipe.mutate(
            {
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
                protagonist: protagonist.trim()
                    ? protagonist
                          .split(",")
                          .map((r) => r.trim())
                          .filter(Boolean)
                    : undefined,
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
            {
                onSuccess: () => {
                    toast("Receta creada");
                    navigate("recipes");
                },
                onError: () => toast("Error al crear la receta", "error"),
            },
        );
    };

    return (
        <div className="page">
            <div className="page-head">
                <div>
                    <h1>Crear receta</h1>
                    <p className="muted">Rellena los datos de tu receta</p>
                </div>
            </div>

            <div className="card">
                <div
                    style={{
                        background: "var(--accent-soft)",
                        border: "1px solid var(--accent)",
                        borderRadius: "8px",
                        padding: "16px",
                        marginBottom: "16px",
                    }}
                >
                    <p style={{ margin: "0 0 8px 0", fontWeight: 600 }}>✨ Generar receta con IA</p>
                    <textarea
                        className="input"
                        rows={3}
                        placeholder="Describe la receta que quieres generar. Ej: Una ensalada fresca con quinoa, aguacate y mango, apta para veganos."
                        value={aiDescription}
                        onChange={(e) => setAiDescription(e.target.value)}
                    />
                    <button
                        className="btn primary sm"
                        type="button"
                        style={{ marginTop: "8px" }}
                        onClick={handleGenerate}
                        disabled={generateRecipe.isPending}
                    >
                        {generateRecipe.isPending ? "Generando…" : "✨ Generar con IA"}
                    </button>
                </div>

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
                        <span>Tiempo de preparación (min)</span>
                        <input
                            className="input input-num"
                            type="number"
                            min="0"
                            value={prepMinutes}
                            onChange={(e) => setPrepMinutes(Number.parseInt(e.target.value, 10) || 0)}
                        />
                    </label>
                    <label className="field">
                        <span>Tiempo de cocción (min)</span>
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
                                {dietLabel(d)}
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

                <label className="field">
                    <span>Protagonista</span>
                    <input
                        className="input"
                        placeholder="Ej. pollo, ají amarillo"
                        value={protagonist}
                        onChange={(e) => setProtagonist(e.target.value)}
                    />
                </label>

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

                <label className="field">
                    <span>Consejos (uno por línea)</span>
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

                <div className="modal-actions">
                    <button className="btn ghost" type="button" onClick={() => navigate("recipes")}>
                        Cancelar
                    </button>
                    <button
                        className="btn primary"
                        type="button"
                        onClick={handleSubmit}
                        disabled={createRecipe.isPending}
                    >
                        {createRecipe.isPending ? "Guardando…" : "Guardar receta"}
                    </button>
                </div>
            </div>
        </div>
    );
}
