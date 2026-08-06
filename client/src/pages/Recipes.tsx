import { DIETS, MEAL_OPTIONS, type MealType } from "@cooking/shared";
import { useState } from "react";
import { useMakeable, useRecipes } from "../api/hooks";
import RecipeCard from "../components/RecipeCard";

export default function Recipes() {
    const [q, setQ] = useState("");
    const [diets, setDiets] = useState<string[]>([]);
    const [makeableOnly, setMakeableOnly] = useState(false);
    const [meal, setMeal] = useState("");

    const toggleDiet = (d: string) => setDiets((cur) => (cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d]));

    const recipes = useRecipes({
        q: q || undefined,
        diets,
        makeable: makeableOnly || undefined,
        meal: meal ? (meal as MealType) : undefined,
    });
    const makeable = useMakeable();
    const makeableIds = new Set((makeable.data ?? []).map((m) => m.recipe.id));

    const shown = (() => {
        let list = recipes.data ?? [];
        if (makeableOnly && !recipes.isFetching) {
            list = list.filter((r) => makeableIds.has(r.id));
        }
        return list;
    })();

    return (
        <div className="page">
            <div className="page-head">
                <div>
                    <h1>Recetas</h1>
                    <p className="muted">{shown.length} recetas</p>
                </div>
                <div className="filters">
                    <input
                        className="input"
                        placeholder="Buscar por nombre o ingrediente…"
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                    />
                    <select className="input" value={meal} onChange={(e) => setMeal(e.target.value)}>
                        <option value="">Cualquier comida</option>
                        {MEAL_OPTIONS.map((m) => (
                            <option key={m.value} value={m.value}>
                                {m.label}
                            </option>
                        ))}
                    </select>
                    <button
                        className={`btn ${makeableOnly ? "primary" : "ghost"}`}
                        onClick={() => setMakeableOnly((v) => !v)}
                        title="Solo las que puedes cocinar con tu despensa"
                    >
                        ✅ Con mi despensa
                    </button>
                </div>
            </div>

            <div className="filter-chips">
                {DIETS.map((d) => (
                    <button
                        key={d}
                        className={`chip ${diets.includes(d) ? "active" : ""}`}
                        onClick={() => toggleDiet(d)}
                    >
                        {d === "vegetariano"
                            ? "🌱"
                            : d === "vegano"
                              ? "🌿"
                              : d === "sin-gluten"
                                ? "🌾"
                                : d === "keto"
                                  ? "🥑"
                                  : d === "alta-proteina"
                                    ? "💪"
                                    : "🥛"}{" "}
                        {d}
                    </button>
                ))}
            </div>

            <div className="card-list">
                {shown.map((r) => (
                    <RecipeCard key={r.id} recipe={r} />
                ))}
                {recipes.isLoading ? <p className="muted">Cargando recetas…</p> : null}
                {!recipes.isLoading && shown.length === 0 ? (
                    <div className="empty-state">
                        <p>No se encontraron recetas con esos filtros.</p>
                        <button
                            className="link-btn"
                            onClick={() => {
                                setQ("");
                                setDiets([]);
                                setMakeableOnly(false);
                                setMeal("");
                            }}
                        >
                            Limpiar filtros
                        </button>
                    </div>
                ) : null}
            </div>
        </div>
    );
}
