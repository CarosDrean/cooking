import {
    useActiveProfile,
    useAppState,
    useDailyTip,
    useExpiring,
    useMakeable,
    usePlan,
    useRecommendations,
} from "../api/hooks";
import RecipeCard from "../components/RecipeCard";
import { dayKeyOf, toISODate, weekdayOf } from "../lib/format";
import { navigate } from "../lib/router";
import { DRINKS, MEAL_LABELS } from "../types";

export default function Dashboard() {
    const profile = useActiveProfile();
    const recommendations = useRecommendations(6);
    const tip = useDailyTip();
    const makeable = useMakeable();
    const expiring = useExpiring(5);
    const plan = usePlan();
    const { data: state } = useAppState();
    const recipeNames = new Map((state?.recipes ?? []).map((r) => [r.id, r.title]));
    const today = toISODate(new Date());
    const todayKey = dayKeyOf(today);
    const todaySlots =
        plan.data?.plan?.slots.filter((s) => s.day === todayKey).sort((a, b) => a.meal.localeCompare(b.meal)) ?? [];

    const expiringSoon = (expiring.data ?? []).filter((p) => p.daysLeft >= 0);

    return (
        <div className="page">
            <div className="page-head">
                <div>
                    <h1>Buen provecho, {profile?.name.split(" ")[0]}</h1>
                    <p className="muted">
                        Hoy es {weekdayOf(today)} ·{" "}
                        {new Date(`${today}T12:00:00`).toLocaleDateString("es-ES", {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                        })}
                    </p>
                </div>
                <button className="btn primary" onClick={() => navigate("recipes")}>
                    Ver recetas
                </button>
            </div>

            {tip.data ? (
                <div className="card tip-card">
                    <span className="tip-icon">💡</span>
                    <div>
                        <strong>Consejo de hoy</strong>
                        <p>{tip.data.tip}</p>
                    </div>
                </div>
            ) : null}

            <div className="grid-3">
                <section className="card">
                    <div className="card-head">
                        <h2>Hoy en el plan</h2>
                        <button className="link-btn" onClick={() => navigate("plan")}>
                            Ver plan →
                        </button>
                    </div>
                    {todaySlots.length === 0 ? (
                        <p className="muted">No hay comidas asignadas para hoy.</p>
                    ) : (
                        <ul className="today-list">
                            {todaySlots.map((s) => (
                                <li key={s.id}>
                                    <span className="meal-chip">{MEAL_LABELS[s.meal]}</span>
                                    <button className="link-btn" onClick={() => navigate(`recipes/${s.recipeId}`)}>
                                        {recipeNames.get(s.recipeId) ?? "Receta"}
                                    </button>
                                    {s.drink ? (
                                        <span className="muted" title="Bebida">
                                            {DRINKS.find((d) => d.name === s.drink)?.emoji ?? "🍵"} {s.drink}
                                        </span>
                                    ) : null}
                                    <span className="muted">×{s.servings}</span>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>

                <section className="card">
                    <div className="card-head">
                        <h2>Se puede hacer hoy</h2>
                        <button className="link-btn" onClick={() => navigate("recipes")}>
                            Todas →
                        </button>
                    </div>
                    {(makeable.data ?? []).slice(0, 3).length === 0 ? (
                        <p className="muted">Añade ingredientes a la despensa.</p>
                    ) : (
                        <ul className="today-list">
                            {(makeable.data ?? []).slice(0, 3).map(({ recipe, missingCount }) => (
                                <li key={recipe.id}>
                                    <button className="link-btn" onClick={() => navigate(`recipes/${recipe.id}`)}>
                                        {recipe.image ? (
                                            <span className="mini-thumb">
                                                <img src={recipe.image} alt="" loading="lazy" />
                                            </span>
                                        ) : (
                                            <span className="mini-thumb emoji">{recipe.emoji ?? "🍲"}</span>
                                        )}
                                        {recipe.title}
                                    </button>
                                    <span className="muted">
                                        {missingCount === 0 ? "listo" : `faltan ${missingCount}`}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>

                <section className="card">
                    <div className="card-head">
                        <h2>Por caducar</h2>
                        <button className="link-btn" onClick={() => navigate("pantry")}>
                            Despensa →
                        </button>
                    </div>
                    {expiringSoon.length === 0 ? (
                        <p className="muted">Nada a punto de caducar. 🎉</p>
                    ) : (
                        <ul className="today-list">
                            {expiringSoon.slice(0, 4).map((p) => (
                                <li key={p.id}>
                                    <span>{p.ingredientName}</span>
                                    <span className={`exp-badge ${p.daysLeft <= 2 ? "urgent" : ""}`}>
                                        {p.daysLeft === 0 ? "hoy" : `${p.daysLeft} d`}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>
            </div>

            <section className="card">
                <div className="card-head">
                    <h2>Recomendaciones para ti</h2>
                    <span className="muted">Según tus gustos, dieta y despensa</span>
                </div>
                <div className="recipe-grid">
                    {(recommendations.data ?? []).map((rec) => (
                        <RecipeCard
                            key={rec.recipe.id}
                            recipe={rec.recipe}
                            right={
                                <div className="rec-reasons">
                                    {rec.reasons.slice(0, 3).map((r, i) => (
                                        <span key={i} className="reason-chip">
                                            {r}
                                        </span>
                                    ))}
                                </div>
                            }
                        />
                    ))}
                    {(recommendations.data ?? []).length === 0 && !recommendations.isLoading ? (
                        <p className="muted">Sin recomendaciones todavía.</p>
                    ) : null}
                </div>
            </section>
        </div>
    );
}
