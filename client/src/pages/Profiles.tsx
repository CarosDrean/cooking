import { useState } from "react";
import {
    useActivateProfile,
    useActiveProfile,
    useAppState,
    useCreateProfile,
    useDeleteProfile,
    useUpdateProfile,
} from "../api/hooks";
import { useToast } from "../lib/toast";
import { DIETS, type IngredientRestriction, MEAL_LABELS, MEALS, type MealType } from "../types";

const LEVEL_LABELS: Record<IngredientRestriction["level"], string> = {
    no: "No come",
    poco: "Come poco",
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

    const add = () => {
        const trimmed = name.trim().toLowerCase();
        if (!trimmed) return;
        const next = [...value.filter((r) => r.name !== trimmed), { name: trimmed, level }];
        onChange(next);
        setName("");
    };

    return (
        <div className="field">
            <span>Restricciones de ingredientes</span>
            <div className="restriction-add">
                <input
                    className="input"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter") {
                            e.preventDefault();
                            add();
                        }
                    }}
                    placeholder="Ej. pescado, ají, lactosa…"
                />
                <select
                    className="input"
                    value={level}
                    onChange={(e) => setLevel(e.target.value as IngredientRestriction["level"])}
                >
                    <option value="no">No come</option>
                    <option value="poco">Come poco</option>
                </select>
                <button className="btn ghost" type="button" onClick={add}>
                    Añadir
                </button>
            </div>
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

export default function ProfilesPage() {
    const { data: state } = useAppState();
    const active = useActiveProfile();
    const create = useCreateProfile();
    const update = useUpdateProfile();
    const remove = useDeleteProfile();
    const activate = useActivateProfile();
    const toast = useToast();

    const [name, setName] = useState("");
    const [diets, setDiets] = useState<string[]>([]);
    const [restrictions, setRestrictions] = useState<IngredientRestriction[]>([]);
    const [household, setHousehold] = useState(2);
    const [meals, setMeals] = useState<MealType[]>(["desayuno", "almuerzo", "cena"]);

    const [editingId, setEditingId] = useState<string | null>(null);
    const [editName, setEditName] = useState("");
    const [editRestrictions, setEditRestrictions] = useState<IngredientRestriction[]>([]);

    const profiles = state?.profiles ?? [];

    const toggleDiet = (d: string) => setDiets((cur) => (cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d]));

    const toggleMeal = (m: MealType) => setMeals((cur) => (cur.includes(m) ? cur.filter((x) => x !== m) : [...cur, m]));

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;
        create.mutate(
            {
                name: name.trim(),
                dietPreferences: diets,
                restrictions,
                householdSize: household,
                mealsPerDay: meals,
            },
            {
                onSuccess: () => {
                    toast(`Perfil creado: ${name.trim()}`);
                    setName("");
                    setDiets([]);
                    setRestrictions([]);
                    setHousehold(2);
                    setMeals(["desayuno", "almuerzo", "cena"]);
                },
            },
        );
    };

    const startEdit = (id: string) => {
        const p = profiles.find((x) => x.id === id);
        if (!p) return;
        setEditingId(id);
        setEditName(p.name);
        setEditRestrictions(p.restrictions ?? []);
    };

    const saveEdit = () => {
        if (!editingId) return;
        update.mutate({
            id: editingId,
            body: {
                name: editName.trim(),
                restrictions: editRestrictions,
            },
        });
        setEditingId(null);
        toast("Perfil actualizado ✓");
    };

    return (
        <div className="page">
            <div className="page-head">
                <div>
                    <h1>Perfiles</h1>
                    <p className="muted">Las recomendaciones se adaptan a cada persona.</p>
                </div>
            </div>

            <div className="grid-2">
                <div>
                    <section className="card">
                        <h2>Nuevo perfil</h2>
                        <form className="profile-form" onSubmit={submit}>
                            <label className="field">
                                <span>Nombre</span>
                                <input
                                    className="input"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Ej. María"
                                />
                            </label>

                            <div className="field">
                                <span>Preferencias de dieta</span>
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

                            <RestrictionsEditor value={restrictions} onChange={setRestrictions} />

                            <label className="field">
                                <span>Personas en el hogar</span>
                                <input
                                    className="input input-num"
                                    type="number"
                                    min="1"
                                    max="12"
                                    value={household}
                                    onChange={(e) => setHousehold(parseInt(e.target.value, 10) || 1)}
                                />
                            </label>

                            <div className="field">
                                <span>Comidas al día</span>
                                <div className="filter-chips">
                                    {MEALS.map((m) => (
                                        <button
                                            key={m}
                                            type="button"
                                            className={`chip ${meals.includes(m) ? "active" : ""}`}
                                            onClick={() => toggleMeal(m)}
                                        >
                                            {MEAL_LABELS[m]}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <button className="btn primary" type="submit">
                                Crear perfil
                            </button>
                        </form>
                    </section>
                </div>

                <div>
                    <section className="card">
                        <h2>Perfiles existentes</h2>
                        <ul className="profile-list">
                            {profiles.map((p) => (
                                <li key={p.id} className={`profile-row ${active?.id === p.id ? "active" : ""}`}>
                                    <div className="avatar" style={{ background: "#e8a33d" }}>
                                        {p.name.slice(0, 1).toUpperCase()}
                                    </div>
                                    <div className="profile-info">
                                        <strong>{p.name}</strong>
                                        <span className="muted">
                                            {p.householdSize} pers. ·{" "}
                                            {p.dietPreferences.length ? p.dietPreferences.join(", ") : "sin dieta"} ·{" "}
                                            {p.mealsPerDay.length} comidas/día
                                            {p.restrictions?.length
                                                ? ` · ${p.restrictions.length} ${p.restrictions.length === 1 ? "restricción" : "restricciones"}`
                                                : ""}
                                        </span>
                                    </div>
                                    <div className="profile-actions">
                                        {active?.id === p.id ? (
                                            <span className="chip active">Activo</span>
                                        ) : (
                                            <button className="btn ghost sm" onClick={() => activate.mutate(p.id)}>
                                                Activar
                                            </button>
                                        )}
                                        <button className="btn ghost sm" onClick={() => startEdit(p.id)}>
                                            Editar
                                        </button>
                                        <button
                                            className="btn ghost sm danger-text"
                                            disabled={profiles.length <= 1}
                                            onClick={() => {
                                                if (window.confirm(`¿Eliminar a ${p.name}?`)) remove.mutate(p.id);
                                            }}
                                        >
                                            ✕
                                        </button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </section>

                    {editingId ? (
                        <section className="card">
                            <h2>Editar perfil</h2>
                            <div className="profile-form">
                                <label className="field">
                                    <span>Nombre</span>
                                    <input
                                        className="input"
                                        value={editName}
                                        onChange={(e) => setEditName(e.target.value)}
                                    />
                                </label>
                                <RestrictionsEditor value={editRestrictions} onChange={setEditRestrictions} />
                                <div className="page-actions">
                                    <button className="btn primary" onClick={saveEdit}>
                                        Guardar
                                    </button>
                                    <button className="btn ghost" onClick={() => setEditingId(null)}>
                                        Cancelar
                                    </button>
                                </div>
                            </div>
                        </section>
                    ) : null}
                </div>
            </div>
        </div>
    );
}
