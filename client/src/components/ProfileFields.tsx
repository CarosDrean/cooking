import { useMemo, useState } from "react";
import { useAppState, useIngredientCatalog, useUpdateProfile } from "../api/hooks";
import { parseSpokenMealHabits, suggestRecipesForUsualDishes } from "../lib/speech";
import { useToast } from "../lib/toast";
import {
    DIETS,
    type IngredientRestriction,
    MEAL_LABELS,
    MEALS,
    type MealType,
    normalizeText,
    type Profile,
} from "../types";
import RecipeCard from "./RecipeCard";
import VoiceButton from "./VoiceButton";

export interface ProfileFormState {
    name: string;
    emoji: string;
    diets: string[];
    restrictions: IngredientRestriction[];
    household: number;
    meals: MealType[];
    usualDishes: Record<MealType, string[]>;
}

export const defaultProfileForm = (): ProfileFormState => ({
    name: "",
    emoji: "🙂",
    diets: [],
    restrictions: [],
    household: 1,
    meals: ["desayuno", "almuerzo", "cena"],
    usualDishes: { desayuno: [], almuerzo: [], cena: [] },
});

export const LEVEL_LABELS: Record<IngredientRestriction["level"], string> = {
    no: "No come",
    poco: "Come poco",
    "no-principal": "No como protagonista",
};

function RestrictionsEditor({
    value,
    onChange,
}: {
    value: IngredientRestriction[];
    onChange: (next: IngredientRestriction[]) => void;
}) {
    const [name, setName] = useState("");
    const [level, setLevel] = useState<IngredientRestriction["level"]>("no");
    const catalog = useIngredientCatalog();
    const { data: app } = useAppState();

    const suggestions = useMemo(() => {
        const needle = normalizeText(name);
        if (needle.length < 2) return [];
        const seen = new Set<string>();
        const list: string[] = [];
        const push = (n: string) => {
            const key = normalizeText(n);
            if (key.includes(needle) && !seen.has(key)) {
                seen.add(key);
                list.push(n);
            }
        };
        for (const i of catalog.data ?? []) push(i.name);
        for (const p of app?.pantry ?? []) push(p.ingredientName);
        for (const r of app?.recipes ?? []) {
            for (const ing of r.ingredients) push(ing.name);
        }
        return list.slice(0, 12);
    }, [catalog.data, app?.pantry, app?.recipes, name]);

    const matchedCatalog = useMemo(() => {
        const needle = normalizeText(name);
        return catalog.data?.find((i) => normalizeText(i.name) === needle);
    }, [catalog.data, name]);

    const add = () => {
        const trimmed = name.trim().toLowerCase();
        if (!trimmed) return;
        const next = [...value.filter((r) => r.name !== trimmed), { name: trimmed, level }];
        onChange(next);
        setName("");
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
            e.preventDefault();
            add();
        }
    };

    return (
        <div className="field">
            <span>Restricciones de ingredientes</span>
            <div className="restriction-add">
                <input
                    className="input"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ej. pescado, ají, lactosa…"
                    list={suggestions.length ? "restriction-suggestions" : undefined}
                />
                {suggestions.length ? (
                    <datalist id="restriction-suggestions">
                        {suggestions.map((s) => (
                            <option key={s} value={s} />
                        ))}
                    </datalist>
                ) : null}
                <select
                    className="input"
                    value={level}
                    onChange={(e) => setLevel(e.target.value as IngredientRestriction["level"])}
                >
                    <option value="no">No come</option>
                    <option value="poco">Come poco</option>
                    <option value="no-principal">No como protagonista</option>
                </select>
                <button className="btn ghost" type="button" onClick={add}>
                    Añadir
                </button>
            </div>
            {matchedCatalog ? (
                <p className="muted small restriction-hint">
                    {matchedCatalog.name} · {matchedCatalog.category} · en catálogo
                </p>
            ) : null}
            {value.length > 0 ? (
                <ul className="restriction-list">
                    {value.map((r) => (
                        <li key={r.name}>
                            <span className="restriction-level">{LEVEL_LABELS[r.level]}</span>
                            <strong>{r.name}</strong>
                            <button
                                className="icon-btn"
                                type="button"
                                onClick={() => onChange(value.filter((x) => x.name !== r.name))}
                            >
                                ✕
                            </button>
                        </li>
                    ))}
                </ul>
            ) : (
                <p className="muted small">Sin restricciones. Todo cuenta como permitido.</p>
            )}
        </div>
    );
}

/**
 * Campos comunes del perfil. `showBasics` controla si se muestran los
 * obligatorios (nombre, personas en el hogar, emoji); el resto siempre se ve.
 */
export function ProfileFields({
    value,
    onChange,
    showBasics = true,
    profile,
}: {
    value: ProfileFormState;
    onChange: (patch: Partial<ProfileFormState>) => void;
    showBasics?: boolean;
    profile?: Profile;
}) {
    const toast = useToast();
    const updateProfile = useUpdateProfile();
    const [hiddenSuggestionIds, setHiddenSuggestionIds] = useState<Set<string>>(new Set());

    const toggleDiet = (d: string) =>
        onChange({ diets: value.diets.includes(d) ? value.diets.filter((x) => x !== d) : [...value.diets, d] });

    const toggleMeal = (m: MealType) =>
        onChange({
            meals: value.meals.includes(m) ? value.meals.filter((x) => x !== m) : [...value.meals, m],
        });

    const addDish = (meal: MealType, dish: string) => {
        const trimmed = dish.trim().toLowerCase();
        if (!trimmed) return;
        onChange({
            usualDishes: {
                ...value.usualDishes,
                [meal]: [...new Set([...(value.usualDishes[meal] ?? []), trimmed])],
            },
        });
    };

    const removeDish = (meal: MealType, dish: string) =>
        onChange({
            usualDishes: {
                ...value.usualDishes,
                [meal]: (value.usualDishes[meal] ?? []).filter((d) => d !== dish),
            },
        });

    const { data: state } = useAppState();
    const catalog = useMemo(() => {
        if (!state) return [];
        const recipes = state.recipes ?? [];
        const restrictions = profile?.restrictions?.length ? profile.restrictions : value.restrictions;
        if (!restrictions.length) return recipes;
        return recipes;
    }, [state, value.restrictions, profile?.restrictions]);

    const effectiveFeedback = useMemo(() => {
        const base = profile?.suggestionFeedback ?? {};
        const withHidden: Record<string, { hide: boolean; weight: number }> = { ...base };
        for (const id of hiddenSuggestionIds) {
            withHidden[id] = { ...withHidden[id], hide: true };
        }
        return withHidden;
    }, [profile?.suggestionFeedback, hiddenSuggestionIds]);

    const suggestions = useMemo(() => {
        if (!catalog.length) return [];
        const hasDishes = MEALS.some((m) => (value.usualDishes[m] ?? []).length > 0);
        if (!hasDishes) return [];
        const restrictions = value.restrictions.length > 0 ? value.restrictions : (profile?.restrictions ?? []);
        return suggestRecipesForUsualDishes(catalog, value.usualDishes, restrictions, effectiveFeedback);
    }, [catalog, value.usualDishes, value.restrictions, profile?.restrictions, effectiveFeedback]);

    const suggestionsByMeal = useMemo(() => {
        const groups: Record<MealType, typeof suggestions> = {
            desayuno: [],
            almuerzo: [],
            cena: [],
        };
        for (const s of suggestions) {
            const meal = s.matchedMeals[0];
            if (meal && s.recipe.suitableFor.includes(meal)) {
                groups[meal].push(s);
            } else {
                const bestMeal = s.matchedMeals.find((m) => s.recipe.suitableFor.includes(m)) ?? s.matchedMeals[0];
                if (bestMeal) {
                    groups[bestMeal].push(s);
                }
            }
        }
        return groups;
    }, [suggestions]);

    const onHabitVoice = (text: string) => {
        const habits = parseSpokenMealHabits(text);
        if (habits.length === 0) {
            toast("No reconocí comidas o platos en lo que dijiste.", "error");
            return;
        }
        const nextDishes = { ...value.usualDishes };
        const nextMeals = new Set(value.meals);
        let addedDishes = 0;
        for (const habit of habits) {
            nextMeals.add(habit.meal);
            if (habit.dishes.length > 0) {
                nextDishes[habit.meal] = [...new Set([...(nextDishes[habit.meal] ?? []), ...habit.dishes])];
                addedDishes += habit.dishes.length;
            }
        }
        onChange({ usualDishes: nextDishes, meals: [...nextMeals] });
        toast(addedDishes > 0 ? "Guardé tus platos habituales" : "Guardé tus comidas");
    };

    const saveFeedback = (recipeId: string, patch: { hide?: boolean; weight?: number }) => {
        if (!profile?.id) return;
        const current = profile.suggestionFeedback ?? {};
        const next: Record<string, { hide: boolean; weight: number }> = {};
        for (const [key, val] of Object.entries(current)) {
            next[key] = { ...val };
        }
        next[recipeId] = {
            hide: patch.hide ?? current[recipeId]?.hide ?? false,
            weight: patch.weight ?? current[recipeId]?.weight ?? 1,
        };
        updateProfile.mutate({
            id: profile.id,
            body: { suggestionFeedback: next },
        });
    };

    const onHideSuggestion = (recipeId: string) => {
        setHiddenSuggestionIds((prev) => new Set(prev).add(recipeId));
    };

    const onDismissSuggestion = (recipeId: string) => {
        saveFeedback(recipeId, { hide: true });
        setHiddenSuggestionIds((prev) => new Set(prev).add(recipeId));
    };

    const onWeightSuggestion = (recipeId: string, weight: number) => {
        saveFeedback(recipeId, { weight });
    };

    const renderSuggestionCards = (items: typeof suggestions) => (
        <div className="suggestion-list">
            {items.map(({ recipe, matchedMeals, matchedWords, restrictedIngredients }) => (
                <RecipeCard
                    key={recipe.id}
                    recipe={recipe}
                    compact
                    restrictedIngredients={restrictedIngredients}
                    right={
                        <div className="suggestion-right">
                            <span className="muted small suggestion-tags">
                                {matchedMeals.map((m) => MEAL_LABELS[m]).join(", ")}
                                {matchedWords.length > 0 ? ` · ${matchedWords.join(", ")}` : ""}
                            </span>
                            <span className="suggestion-votes">
                                <button
                                    className="icon-btn vote-btn"
                                    type="button"
                                    title="No sugerir más"
                                    aria-label="No sugerir más"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onDismissSuggestion(recipe.id);
                                    }}
                                >
                                    🙅
                                </button>
                                <button
                                    className="icon-btn vote-btn"
                                    type="button"
                                    title="Menos similares"
                                    aria-label="Menos similares"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onWeightSuggestion(recipe.id, 0.5);
                                    }}
                                >
                                    ↓
                                </button>
                                <button
                                    className="icon-btn vote-btn"
                                    type="button"
                                    title="Más similares"
                                    aria-label="Más similares"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onWeightSuggestion(recipe.id, 2);
                                    }}
                                >
                                    ↑
                                </button>
                                <button
                                    className="icon-btn vote-btn"
                                    type="button"
                                    title="Quitar"
                                    aria-label="Quitar"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onHideSuggestion(recipe.id);
                                    }}
                                >
                                    ✕
                                </button>
                            </span>
                        </div>
                    }
                />
            ))}
        </div>
    );

    return (
        <>
            {showBasics ? (
                <>
                    <label className="field">
                        <span>Nombre</span>
                        <input
                            className="input"
                            value={value.name}
                            onChange={(e) => onChange({ name: e.target.value })}
                            placeholder="Ej. María"
                        />
                    </label>

                    <div className="edit-row">
                        <label className="field">
                            <span>Emoji (opcional)</span>
                            <input
                                className="input"
                                value={value.emoji}
                                onChange={(e) => onChange({ emoji: e.target.value })}
                                placeholder="🙂"
                            />
                        </label>
                        <label className="field">
                            <span>Personas en el hogar</span>
                            <input
                                className="input input-num"
                                type="number"
                                min="1"
                                max="12"
                                value={value.household}
                                onChange={(e) => onChange({ household: parseInt(e.target.value, 10) || 1 })}
                            />
                        </label>
                    </div>
                </>
            ) : null}

            <div className="field">
                <span>Preferencias de dieta</span>
                <div className="filter-chips">
                    {DIETS.map((d) => (
                        <button
                            key={d}
                            type="button"
                            className={`chip ${value.diets.includes(d) ? "active" : ""}`}
                            onClick={() => toggleDiet(d)}
                        >
                            {d}
                        </button>
                    ))}
                </div>
            </div>

            <RestrictionsEditor value={value.restrictions} onChange={(r) => onChange({ restrictions: r })} />

            <div className="field">
                <span>Comidas al día</span>
                <div className="filter-chips">
                    {MEALS.map((m) => (
                        <button
                            key={m}
                            type="button"
                            className={`chip ${value.meals.includes(m) ? "active" : ""}`}
                            onClick={() => toggleMeal(m)}
                        >
                            {MEAL_LABELS[m]}
                        </button>
                    ))}
                </div>
            </div>

            <div className="field">
                <span>Platos habituales</span>
                <div className="meal-voice-row">
                    <p className="muted small">
                        Dicta qué suelen comer: "desayuno jugo surtido o avena, almuerzo estofado de lentejas y cena
                        sopa de verduras". Con eso sugerimos recetas parecidas.
                    </p>
                    <VoiceButton title="Dictar comidas y platos" onResult={onHabitVoice} />
                </div>
                {MEALS.map((meal) => (
                    <div className="usual-dish-row" key={meal}>
                        <span className="usual-dish-label">{MEAL_LABELS[meal]}</span>
                        <div className="filter-chips">
                            {(value.usualDishes[meal] ?? []).map((dish) => (
                                <span className="chip" key={dish}>
                                    {dish}
                                    <button
                                        className="icon-btn chip-remove"
                                        type="button"
                                        aria-label={`Quitar ${dish}`}
                                        onClick={() => removeDish(meal, dish)}
                                    >
                                        ✕
                                    </button>
                                </span>
                            ))}
                            <DishAdder meal={meal} onAdd={(dish) => addDish(meal, dish)} />
                        </div>
                    </div>
                ))}
            </div>

            {suggestions.length > 0 ? (
                <div className="field">
                    <span>Según tus hábitos, podrías preparar:</span>
                    {MEALS.map((meal) => {
                        const items = suggestionsByMeal[meal];
                        if (!items.length) return null;
                        return (
                            <div className="suggestion-group" key={meal}>
                                <h4 className="suggestion-group-title">{MEAL_LABELS[meal]}</h4>
                                {renderSuggestionCards(items)}
                            </div>
                        );
                    })}
                </div>
            ) : null}
        </>
    );
}

function DishAdder({ meal, onAdd }: { meal: MealType; onAdd: (dish: string) => void }) {
    const [text, setText] = useState("");
    const submit = () => {
        if (!text.trim()) return;
        onAdd(text);
        setText("");
    };
    return (
        <span className="dish-adder">
            <input
                className="input input-sm"
                value={text}
                placeholder={`Añadir plato de ${MEAL_LABELS[meal]}…`}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === "Enter") {
                        e.preventDefault();
                        submit();
                    }
                }}
            />
            <button className="btn ghost" type="button" onClick={submit}>
                +
            </button>
        </span>
    );
}
