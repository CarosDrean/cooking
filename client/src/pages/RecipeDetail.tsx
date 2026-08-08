import { useEffect, useState } from "react";
import {
    useActiveProfile,
    useAddHistory,
    useAppState,
    useDeleteRecipe,
    useMissing,
    usePlan,
    useRecipe,
    useRecipeTips,
    useSavePlan,
    useSetFavorite,
    useSetRating,
    useSettings,
} from "../api/hooks";
import { dietLabel } from "../components/DietBadge";
import ImagePicker from "../components/ImagePicker";
import { RecipeContextBadges } from "../components/RecipeContextBadges";
import RecipeEditFullModal from "../components/RecipeEditFullModal";
import RecipeEditModal from "../components/RecipeEditModal";
import Stars from "../components/Stars";
import { useConfirm } from "../lib/confirm";
import { fmtQty, hasNutrition, startOfWeek, toISODate } from "../lib/format";
import { navigate } from "../lib/router";
import { useToast } from "../lib/toast";
import { useModalClose } from "../lib/useModalClose";
import type { Day, MealType } from "../types";

const DAY_KEYS: Day[] = ["lunes", "martes", "miercoles", "jueves", "viernes", "sabado", "domingo"];

export default function RecipeDetail({ recipeId }: { recipeId?: string }) {
    const recipe = useRecipe(recipeId);
    const tips = useRecipeTips(recipeId);
    const missing = useMissing(recipeId);
    const profile = useActiveProfile();
    const setRating = useSetRating();
    const setFavorite = useSetFavorite();
    const addHistory = useAddHistory();
    const savePlan = useSavePlan();
    const plan = usePlan();
    const toast = useToast();
    const confirm = useConfirm();
    const deleteRecipe = useDeleteRecipe();
    const { data: state } = useAppState();
    const { data: settings } = useSettings();
    const country = state?.location.country ?? "";
    const season = settings?.season;

    const [servings, setServings] = useState(1);
    const [imageError, setImageError] = useState(false);
    const [showPlanPicker, setShowPlanPicker] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showImagePicker, setShowImagePicker] = useState(false);
    const [showEditFullModal, setShowEditFullModal] = useState(false);
    const [selectedDay, setSelectedDay] = useState<Day>("lunes");
    const [selectedMeal, setSelectedMeal] = useState<MealType>("almuerzo");

    useEffect(() => {
        if (profile) setServings(profile.householdSize);
    }, [recipeId, profile?.id]);

    useModalClose(() => setShowPlanPicker(false));

    if (!recipe.data || !profile) return <div className="page">Cargando receta…</div>;

    const r = recipe.data;
    const scale = (q: number) => (q / r.servings) * servings;

    const rating = profile.ratingByRecipe[r.id] ?? null;
    const isFav = profile.favoriteRecipeIds?.includes(r.id) ?? false;
    const hasOverride = Boolean(profile.recipeOverrides?.[r.id]);

    const addToPlan = () => {
        const current = plan.data?.plan;
        const weekStart = plan.data?.weekStart ?? startOfWeek(new Date());
        const slots = [...(current?.slots ?? [])];
        const existing = slots.find((s) => s.day === selectedDay && s.meal === selectedMeal);
        if (existing) {
            existing.recipeId = r.id;
            existing.servings = servings;
        } else {
            slots.push({ id: crypto.randomUUID(), day: selectedDay, meal: selectedMeal, recipeId: r.id, servings });
        }
        savePlan.mutate(
            { weekStart, slots },
            {
                onSuccess: () => {
                    toast(`Añadido a ${selectedDay} (${selectedMeal}) ✓`);
                    setShowPlanPicker(false);
                },
            },
        );
    };

    const markEaten = () => {
        addHistory.mutate(
            {
                profileId: profile.id,
                recipeId: r.id,
                date: toISODate(new Date()),
                meal: selectedMeal,
                servings,
                source: "manual",
            },
            {
                onSuccess: () => toast("Registrado en el historial ✓"),
            },
        );
    };

    return (
        <div className="page">
            <button className="link-btn" onClick={() => navigate("recipes")}>
                ← Volver a recetas
            </button>
            <div className="detail-head">
                <div className="detail-hero">
                    {r.image && !imageError ? (
                        <>
                            <img src={r.image} alt={r.title} onError={() => setImageError(true)} />
                            <div className="detail-hero-overlay" />
                            <div className="detail-hero-content">
                                <h1>{r.title}</h1>
                                <div className="detail-meta">
                                    <span>⏱ {r.prepMinutes + r.cookMinutes} min</span>
                                    <span>·</span>
                                    <span>{r.servings} raciones</span>
                                </div>
                                <div className="diet-chips">
                                    {r.diets.map((d) => (
                                        <span key={d} className="diet-badge">
                                            {dietLabel(d)}
                                        </span>
                                    ))}
                                </div>
                                <RecipeContextBadges recipe={r} country={country} season={season} />
                            </div>
                        </>
                    ) : (
                        <span className="detail-hero-emoji">{r.emoji ?? "🍲"}</span>
                    )}
                </div>
                <div className="detail-actions-bar">
                    <Stars
                        value={rating}
                        onChange={
                            setRating.isPending
                                ? undefined
                                : (n) => setRating.mutate({ profileId: profile.id, recipeId: r.id, rating: n })
                        }
                    />
                    <button
                        className={`btn ${isFav ? "primary" : "ghost"}`}
                        disabled={setFavorite.isPending}
                        onClick={() => setFavorite.mutate({ profileId: profile.id, recipeId: r.id, favorite: !isFav })}
                    >
                        {setFavorite.isPending ? "Guardando…" : isFav ? "★ Favorita" : "☆ Guardar"}
                    </button>
                    <button className="btn primary" onClick={() => navigate(`cook/${r.id}`)}>
                        ▶ Modo cocina
                    </button>
                    {r.source === "local" ? (
                        <button className="btn ghost" onClick={() => setShowEditFullModal(true)}>
                            ✎ Editar
                        </button>
                    ) : null}
                    {r.source === "local" ? (
                        <button
                            className="btn ghost sm danger-text"
                            disabled={deleteRecipe.isPending}
                            onClick={async () => {
                                if (
                                    await confirm({
                                        title: "Eliminar receta",
                                        message:
                                            "¿Eliminar esta receta? Se quitará del catálogo, el plan semanal y el historial.",
                                        confirmLabel: "Eliminar",
                                        danger: true,
                                    })
                                ) {
                                    deleteRecipe.mutate(r.id, {
                                        onSuccess: () => {
                                            toast("Receta eliminada ✓");
                                            navigate("recipes");
                                        },
                                        onError: (err) => toast(`Error: ${(err as Error).message}`, "error"),
                                    });
                                }
                            }}
                        >
                            {deleteRecipe.isPending ? "Eliminando…" : "🗑 Eliminar"}
                        </button>
                    ) : null}
                    <button className="btn ghost" onClick={() => setShowEditModal(true)}>
                        {hasOverride ? "✎ Adaptada" : "✎ Adaptar a mi familia"}
                    </button>
                    <button className="btn ghost" onClick={() => setShowImagePicker(true)}>
                        🖼 Buscar imagen
                    </button>
                </div>
            </div>

            <div className="grid-2">
                <div>
                    <section className="card">
                        <div className="card-head">
                            <h2>Ingredientes</h2>
                            <div className="serving-stepper">
                                <button className="btn ghost sm" onClick={() => setServings((s) => Math.max(1, s - 1))}>
                                    −
                                </button>
                                <span className="serving-num">{servings}</span>
                                <button
                                    className="btn ghost sm"
                                    onClick={() => setServings((s) => Math.min(12, s + 1))}
                                >
                                    +
                                </button>
                                <span className="muted">raciones</span>
                            </div>
                        </div>
                        <ul className="ingredient-list">
                            {r.ingredients.map((ing, i) => {
                                const isMissing =
                                    !missing.data?.makeable &&
                                    (missing.data?.missing ?? []).some((m) => m.name === ing.name);
                                return (
                                    <li key={i} className={isMissing ? "missing" : ""}>
                                        <span>
                                            {fmtQty(scale(ing.quantity))} {ing.unit}
                                        </span>
                                        <span className="ing-name">{ing.name}</span>
                                        {isMissing ? <span className="muted">(sin stock)</span> : null}
                                    </li>
                                );
                            })}
                        </ul>
                    </section>

                    {missing.data && !missing.data.makeable ? (
                        <div className="card missing-card">
                            <strong>
                                Faltan {missing.data.missing.length} ingrediente
                                {missing.data.missing.length !== 1 ? "s" : ""} en la despensa
                            </strong>
                            <ul>
                                {missing.data.missing.map((m) => (
                                    <li key={m.name}>{m.name}</li>
                                ))}
                            </ul>
                        </div>
                    ) : null}
                </div>

                <div>
                    <section className="card">
                        <h2>Pasos</h2>
                        <ol className="step-list">
                            {r.steps.map((step, i) => (
                                <li key={i}>{step.text}</li>
                            ))}
                        </ol>
                    </section>

                    <section className="card">
                        <h2>Consejos para esta receta</h2>
                        <ul className="tip-list">
                            {(tips.data?.tips ?? []).map((t, i) => (
                                <li key={i}>💡 {t}</li>
                            ))}
                            {(tips.data?.tips ?? []).length === 0 ? <li className="muted">Sin consejos.</li> : null}
                        </ul>
                    </section>

                    <section className="card">
                        <h2>Nutrición</h2>
                        {hasNutrition(r.nutrition) ? (
                            <div className="nutrition-grid">
                                <div>
                                    <strong>{r.nutrition.kcal}</strong>
                                    <span>kcal</span>
                                </div>
                                <div>
                                    <strong>{r.nutrition.protein}g</strong>
                                    <span>proteína</span>
                                </div>
                                <div>
                                    <strong>{r.nutrition.carbs}g</strong>
                                    <span>carb.</span>
                                </div>
                                <div>
                                    <strong>{r.nutrition.fat}g</strong>
                                    <span>grasa</span>
                                </div>
                            </div>
                        ) : (
                            <p className="muted">Sin datos nutricionales.</p>
                        )}
                    </section>
                </div>
            </div>

            <div className="detail-actions-bottom">
                <button className="btn" onClick={markEaten} disabled={addHistory.isPending}>
                    {addHistory.isPending ? "Registrando…" : "✅ Ya lo comí (historial)"}
                </button>
                <button className="btn primary" onClick={() => setShowPlanPicker(true)} disabled={savePlan.isPending}>
                    {savePlan.isPending ? "Añadiendo…" : "📅 Añadir al plan semanal"}
                </button>
            </div>

            {showEditModal ? (
                <RecipeEditModal
                    recipe={r}
                    profileId={profile.id}
                    hasOverride={hasOverride}
                    onClose={() => setShowEditModal(false)}
                />
            ) : null}

            {showImagePicker ? <ImagePicker recipe={r} onClose={() => setShowImagePicker(false)} /> : null}

            {showEditFullModal ? (
                <RecipeEditFullModal
                    recipe={r}
                    onClose={() => setShowEditFullModal(false)}
                    onSaved={() => setShowEditFullModal(false)}
                />
            ) : null}

            {showPlanPicker ? (
                <div className="modal-backdrop" onClick={() => setShowPlanPicker(false)}>
                    <div className="modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-head">
                            <h3>Añadir a la semana</h3>
                            <button className="icon-btn" onClick={() => setShowPlanPicker(false)} aria-label="Cerrar">
                                ✕
                            </button>
                        </div>
                        <label className="field">
                            <span>Día</span>
                            <select
                                className="input"
                                value={selectedDay}
                                onChange={(e) => setSelectedDay(e.target.value as Day)}
                            >
                                {DAY_KEYS.map((d) => (
                                    <option key={d} value={d}>
                                        {d.charAt(0).toUpperCase() + d.slice(1)}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <label className="field">
                            <span>Comida</span>
                            <select
                                className="input"
                                value={selectedMeal}
                                onChange={(e) => setSelectedMeal(e.target.value as MealType)}
                            >
                                <option value="desayuno">Desayuno</option>
                                <option value="almuerzo">Almuerzo</option>
                                <option value="cena">Cena</option>
                            </select>
                        </label>
                        <button className="btn primary" onClick={addToPlan}>
                            Añadir
                        </button>
                    </div>
                </div>
            ) : null}
        </div>
    );
}
