import { Router } from "express";
import { getState, saveState } from "../db.js";
import { currentWeekStart, generateWeekPlan, needsDrink, randomDrink, regenerateSlot } from "../services/planner.js";
import type { Day, MealSlot, MealType, WeeklyPlan } from "../types.js";
import { DAYS, MEALS } from "../types.js";

export const planRouter = Router();

planRouter.get("/", (req, res) => {
    const state = getState();
    const weekStart = (req.query.weekStart as string) || currentWeekStart();
    const plan = state.weeklyPlan && state.weeklyPlan.weekStart === weekStart ? state.weeklyPlan : null;
    res.json({ weekStart, plan });
});

planRouter.put("/", (req, res) => {
    const state = getState();
    const body = req.body as Partial<WeeklyPlan>;
    const weekStart = body.weekStart || currentWeekStart();

    const valid = (body.slots ?? []).every(
        (s) => DAYS.includes(s.day as Day) && MEALS.includes(s.meal as MealType) && typeof s.recipeId === "string",
    );
    if (!valid) {
        res.status(400).json({ error: "Slots inválidos" });
        return;
    }

    const plan: WeeklyPlan = {
        id: state.weeklyPlan?.weekStart === weekStart ? state.weeklyPlan.id : crypto.randomUUID(),
        weekStart,
        slots: (body.slots ?? []).map((s) => ({
            id: s.id || crypto.randomUUID(),
            day: s.day,
            meal: s.meal,
            recipeId: s.recipeId,
            servings: Math.max(1, s.servings ?? 2),
            drink: needsDrink(s.meal) ? s.drink?.trim() || randomDrink() : undefined,
        })),
    };
    state.weeklyPlan = plan;
    saveState();
    res.json(plan);
});

planRouter.post("/generate", (req, res) => {
    const state = getState();
    const weekStart = (req.body?.weekStart as string | undefined) || currentWeekStart();
    state.weeklyPlan = generateWeekPlan(state, weekStart);
    saveState();
    res.json(state.weeklyPlan);
});

planRouter.post("/regenerate", (req, res) => {
    const state = getState();
    const { day, meal, excludeId } = req.body as { day: Day; meal: MealType; excludeId?: string };
    if (!DAYS.includes(day) || !MEALS.includes(meal)) {
        res.status(400).json({ error: "Día o comida inválidos" });
        return;
    }
    const weekStart = state.weeklyPlan?.weekStart ?? currentWeekStart();
    const plan = regenerateSlot(state, weekStart, day, meal, excludeId);
    if (plan) state.weeklyPlan = plan;
    saveState();
    res.json(state.weeklyPlan);
});

planRouter.put("/slots/:slotId", (req, res) => {
    const state = getState();
    const slotId = req.params.slotId;
    const plan = state.weeklyPlan;
    if (!plan) {
        res.status(404).json({ error: "No hay plan" });
        return;
    }
    const index = plan.slots.findIndex((s) => s.id === slotId);
    if (index === -1) {
        res.status(404).json({ error: "Slot no encontrado" });
        return;
    }
    const body = req.body as Partial<MealSlot>;
    const meal = body.meal ?? plan.slots[index].meal;
    plan.slots[index] = {
        ...plan.slots[index],
        day: body.day ?? plan.slots[index].day,
        meal,
        recipeId: body.recipeId ?? plan.slots[index].recipeId,
        servings: body.servings != null ? Math.max(1, body.servings) : plan.slots[index].servings,
        drink:
            body.drink !== undefined
                ? body.drink.trim() || undefined
                : needsDrink(meal)
                  ? (plan.slots[index].drink ?? randomDrink())
                  : undefined,
    };
    saveState();
    res.json(plan);
});

planRouter.delete("/slots/:slotId", (req, res) => {
    const state = getState();
    const plan = state.weeklyPlan;
    if (!plan) {
        res.status(404).json({ error: "No hay plan" });
        return;
    }
    const before = plan.slots.length;
    plan.slots = plan.slots.filter((s) => s.id !== req.params.slotId);
    if (plan.slots.length === before) {
        res.status(404).json({ error: "Slot no encontrado" });
        return;
    }
    saveState();
    res.json(plan);
});
