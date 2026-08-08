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

    // Stats
    const totalRecetas = state?.recipes.length ?? 0;
    const itemsDespensa = state?.pantry.length ?? 0;
    const slotsPlan = plan.data?.plan?.slots.length ?? 0;
    const firstUrgent = (expiring.data ?? []).find((p) => p.daysLeft === 0 || p.daysLeft === 1);
    const proximaCaducidad = firstUrgent ? (firstUrgent.daysLeft === 0 ? "hoy" : "1 d") : "—";

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

            <div className="stats-bar">
                <div className="stat-item">
                    <span className="stat-value">{totalRecetas}</span>
                    <span className="stat-label">Recetas</span>
                </div>
                <div className="stat-item">
                    <span className="stat-value">{itemsDespensa}</span>
                    <span className="stat-label">En despensa</span>
                </div>
                <div className="stat-item">
                    <span className="stat-value">{slotsPlan}</span>
                    <span className="stat-label">Comidas planeadas</span>
                </div>
                <div className="stat-item">
                    <span className="stat-value">{proximaCaducidad}</span>
                    <span className="stat-label">Próx. caducidad</span>
                </div>
            </div>

            <div className="quick-actions">
                <button className="btn primary" onClick={() => navigate("pantry")}>
                    🧺 Añadir a despensa
                </button>
                <button className="btn" onClick={() => navigate("plan")}>
                    📅 Planificar semana
                </button>
                <button className="btn primary" onClick={() => navigate("recipes")}>
                    📖 Buscar recetas
                </button>
            </div>

            {tip.data ? (
                <div className="card tip-card">
                    <div className="tip-card-header">
                        <span className="tip-card-icon">💡</span>
                        <span className="tip-card-title">Consejo de hoy</span>
                        <button
                            className="icon-btn"
                            onClick={() => tip.refetch()}
                            title="Obtener otro consejo"
                            aria-label="Obtener otro consejo"
                            style={{ marginLeft: "auto" }}
                        >
                            🔄
                        </button>
                    </div>
                    <p>{tip.data.tip}</p>
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
                                                <img
                                                    src={recipe.image}
                                                    alt={recipe.title}
                                                    loading="lazy"
                                                    onError={(e) => {
                                                        e.currentTarget.style.display = "none";
                                                    }}
                                                />
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
