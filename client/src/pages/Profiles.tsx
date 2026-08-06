import { DIETS, MEAL_LABELS, MEALS, type MealType } from "@cooking/shared";
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
    const [disliked, setDisliked] = useState("");
    const [household, setHousehold] = useState(2);
    const [meals, setMeals] = useState<MealType[]>(["desayuno", "almuerzo", "cena"]);

    const [editingId, setEditingId] = useState<string | null>(null);
    const [editName, setEditName] = useState("");
    const [editDisliked, setEditDisliked] = useState("");

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
                dislikedIngredients: disliked
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean),
                householdSize: household,
                mealsPerDay: meals,
            },
            {
                onSuccess: () => {
                    toast(`Perfil creado: ${name.trim()}`);
                    setName("");
                    setDiets([]);
                    setDisliked("");
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
        setEditDisliked(p.dislikedIngredients.join(", "));
    };

    const saveEdit = () => {
        if (!editingId) return;
        update.mutate({
            id: editingId,
            body: {
                name: editName.trim(),
                dislikedIngredients: editDisliked
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean),
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

                            <label className="field">
                                <span>Ingredientes que no le gustan (separados por coma)</span>
                                <input
                                    className="input"
                                    value={disliked}
                                    onChange={(e) => setDisliked(e.target.value)}
                                    placeholder="Ej. cebolla, pescado"
                                />
                            </label>

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
                                <label className="field">
                                    <span>Disgustos</span>
                                    <input
                                        className="input"
                                        value={editDisliked}
                                        onChange={(e) => setEditDisliked(e.target.value)}
                                    />
                                </label>
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
