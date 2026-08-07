import { useState } from "react";
import { useMakeable, useRecipes, useThemealdbAutoImport } from "../api/hooks";
import RecipeCard from "../components/RecipeCard";
import { useToast } from "../lib/toast";
import { DIETS, MEAL_OPTIONS, type MealType, SEASON_LABELS, SEASONS, type Season } from "../types";

export default function Recipes() {
    const [q, setQ] = useState("");
    const [diets, setDiets] = useState<string[]>([]);
    const [makeableOnly, setMakeableOnly] = useState(false);
    const [meal, setMeal] = useState("");
    const [season, setSeason] = useState("");
    const [allRecipes, setAllRecipes] = useState(false);
    const autoImport = useThemealdbAutoImport();
    const toast = useToast();

    const toggleDiet = (d: string) => setDiets((cur) => (cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d]));

    const recipes = useRecipes({
        q: q || undefined,
        diets,
        makeable: makeableOnly || undefined,
        meal: meal ? (meal as MealType) : undefined,
        season: season ? (season as Season) : undefined,
        profile: allRecipes ? "all" : undefined,
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
                    <select className="input" value={season} onChange={(e) => setSeason(e.target.value)}>
                        <option value="">Cualquier temporada</option>
                        {SEASONS.map((s) => (
                            <option key={s} value={s}>
                                {SEASON_LABELS[s]}
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
                    <button
                        className={`btn ${allRecipes ? "ghost" : "primary"}`}
                        onClick={() => setAllRecipes((v) => !v)}
                        title="Ver todas o solo las compatibles con tu perfil"
                    >
                        {allRecipes ? "👥 Todas" : "👤 Según mi perfil"}
                    </button>
                    <button
                        className="btn ghost"
                        onClick={() =>
                            autoImport.mutate(undefined, {
                                onSuccess: (res) =>
                                    toast(
                                        res.count > 0
                                            ? `Se importaron ${res.count} recetas según tu perfil ✓`
                                            : "No se encontraron recetas nuevas compatibles con tu perfil.",
                                    ),
                                onError: () => toast("No se pudo importar del catálogo.", "error"),
                            })
                        }
                        disabled={autoImport.isPending}
                        title="Importar recetas compatibles con tu perfil desde TheMealDB"
                    >
                        {autoImport.isPending ? "Importando…" : "⬇ Importar según mi perfil"}
                    </button>
                </div>
            </div>

            <div className="filter-chips">
                <span className="muted small">
                    {allRecipes
                        ? "Mostrando el catálogo completo (sin filtro de perfil)."
                        : "Catálogo filtrado por tu perfil: dieta, restricciones y comidas."}
                </span>
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
                                setSeason("");
                                setAllRecipes(false);
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
