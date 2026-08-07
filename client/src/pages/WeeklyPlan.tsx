import { useState } from "react";
import {
    useActiveProfile,
    useAddHistory,
    useAppState,
    useDeleteSlot,
    useGeneratePlan,
    usePlan,
    useRegenerateSlot,
    useSavePlan,
    useUpdateSlot,
} from "../api/hooks";
import RecipePicker from "../components/RecipePicker";
import { addDays, shortDateLabel, startOfWeek } from "../lib/format";
import { navigate } from "../lib/router";
import { useToast } from "../lib/toast";
import type { Day, MealType } from "../types";
import { DAY_LABELS, DAYS, MEAL_LABELS, MEALS } from "../types";

export default function WeeklyPlan() {
    const plan = usePlan();
    const generate = useGeneratePlan();
    const regenerate = useRegenerateSlot();
    const updateSlot = useUpdateSlot();
    const deleteSlot = useDeleteSlot();
    const addHistory = useAddHistory();
    const savePlan = useSavePlan();
    const profile = useActiveProfile();
    const { data: state } = useAppState();
    const toast = useToast();

    const [picker, setPicker] = useState<{ day: Day; meal: MealType } | null>(null);

    const weekStart = plan.data?.weekStart ?? startOfWeek(new Date());
    const slots = plan.data?.plan?.slots ?? [];
    const slotByKey = new Map(slots.map((s) => [`${s.day}|${s.meal}`, s]));
    const recipeNames = new Map((state?.recipes ?? []).map((r) => [r.id, r.title]));

    const dateForDay = (day: Day) => {
        const offset = DAYS.indexOf(day);
        return addDays(weekStart, offset);
    };

    const onGenerate = () => {
        if (window.confirm("¿Generar un plan completo para esta semana?")) {
            generate.mutate(weekStart, {
                onSuccess: () => toast("Plan generado ✓"),
            });
        }
    };

    const onPickRecipe = (recipeId: string) => {
        if (!picker) return;
        const existing = slotByKey.get(`${picker.day}|${picker.meal}`);
        if (existing) {
            updateSlot.mutate({ slotId: existing.id, body: { recipeId } });
        } else {
            savePlan.mutate({
                weekStart,
                slots: [
                    ...slots,
                    { id: crypto.randomUUID(), day: picker.day, meal: picker.meal, recipeId, servings: 2 },
                ],
            });
        }
        setPicker(null);
        toast("Receta asignada ✓");
    };

    const onEaten = (day: Day, meal: MealType) => {
        const slot = slotByKey.get(`${day}|${meal}`);
        if (!slot || !profile) return;
        addHistory.mutate(
            {
                profileId: profile.id,
                recipeId: slot.recipeId,
                date: dateForDay(day),
                meal,
                servings: slot.servings,
                source: "plan",
            },
            {
                onSuccess: () => {
                    toast("Registrado en el historial ✓");
                    regenerate.mutate({ day, meal, excludeId: slot.recipeId });
                },
            },
        );
    };

    return (
        <div className="page">
            <div className="page-head">
                <div>
                    <h1>Plan semanal</h1>
                    <p className="muted">
                        Semana del {shortDateLabel(weekStart)} al {shortDateLabel(addDays(weekStart, 6))}
                    </p>
                </div>
                <div className="page-actions">
                    <button className="btn" onClick={onGenerate}>
                        🎲 Generar semana
                    </button>
                </div>
            </div>

            <div className="plan-grid">
                {DAYS.map((day) => (
                    <div key={day} className="plan-day">
                        <div className="plan-day-head">
                            <span className="plan-day-name">{DAY_LABELS[day]}</span>
                            <span className="plan-day-date">{shortDateLabel(dateForDay(day))}</span>
                        </div>
                        {MEALS.map((meal) => {
                            const slot = slotByKey.get(`${day}|${meal}`);
                            return (
                                <div key={meal} className="plan-slot">
                                    <span className="plan-meal-label">{MEAL_LABELS[meal]}</span>
                                    {slot ? (
                                        <div className="plan-slot-content">
                                            <div className="plan-recipe">
                                                <button
                                                    className="link-btn"
                                                    onClick={() => navigate(`recipes/${slot.recipeId}`)}
                                                >
                                                    {recipeNames.get(slot.recipeId) ?? "Receta"}
                                                </button>
                                                <span className="muted">×{slot.servings}</span>
                                            </div>
                                            <div className="plan-slot-actions">
                                                <button
                                                    className="icon-btn"
                                                    title="Cambiar receta"
                                                    onClick={() => setPicker({ day, meal })}
                                                >
                                                    ↻
                                                </button>
                                                <button
                                                    className="icon-btn"
                                                    title="Otra al azar"
                                                    onClick={() =>
                                                        regenerate.mutate({ day, meal, excludeId: slot.recipeId })
                                                    }
                                                >
                                                    🎲
                                                </button>
                                                <button
                                                    className="icon-btn"
                                                    title="Ya la comí"
                                                    onClick={() => onEaten(day, meal)}
                                                >
                                                    ✅
                                                </button>
                                                <button
                                                    className="icon-btn danger"
                                                    title="Quitar"
                                                    onClick={() => {
                                                        if (window.confirm("¿Quitar esta receta del plan?")) {
                                                            deleteSlot.mutate(slot.id);
                                                        }
                                                    }}
                                                >
                                                    ✕
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <button className="plan-add" onClick={() => setPicker({ day, meal })}>
                                            + Elegir
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                ))}
            </div>

            {picker ? (
                <RecipePicker
                    title={`${DAY_LABELS[picker.day]} · ${MEAL_LABELS[picker.meal]}`}
                    onPick={(r) => onPickRecipe(r.id)}
                    onClose={() => setPicker(null)}
                />
            ) : null}
        </div>
    );
}
