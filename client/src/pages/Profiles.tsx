import { useState } from "react";
import { useActivateProfile, useActiveProfile, useAppState, useDeleteProfile, useUpdateProfile } from "../api/hooks";
import { defaultProfileForm, ProfileFields, type ProfileFormState } from "../components/ProfileFields";
import ProfileWizard from "../components/ProfileWizard";
import { useConfirm } from "../lib/confirm";
import { useToast } from "../lib/toast";

export default function ProfilesPage() {
    const { data: state } = useAppState();
    const active = useActiveProfile();
    const update = useUpdateProfile();
    const remove = useDeleteProfile();
    const activate = useActivateProfile();
    const toast = useToast();
    const confirm = useConfirm();

    const [showWizard, setShowWizard] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<ProfileFormState>(defaultProfileForm());

    const profiles = state?.profiles ?? [];

    const startEdit = (id: string) => {
        const p = profiles.find((x) => x.id === id);
        if (!p) return;
        setEditingId(id);
        setEditForm({
            name: p.name,
            emoji: p.emoji ?? "🙂",
            diets: p.dietPreferences ?? [],
            restrictions: p.restrictions ?? [],
            household: p.householdSize ?? 1,
            meals: p.mealsPerDay ?? ["desayuno", "almuerzo", "cena"],
            usualDishes: p.usualDishes ?? { desayuno: [], almuerzo: [], cena: [] },
        });
    };

    const saveEdit = () => {
        if (!editingId) return;
        if (!editForm.name.trim()) return;
        update.mutate(
            {
                id: editingId,
                body: {
                    name: editForm.name.trim(),
                    emoji: editForm.emoji,
                    dietPreferences: editForm.diets,
                    restrictions: editForm.restrictions,
                    householdSize: editForm.household,
                    mealsPerDay: editForm.meals,
                    usualDishes: editForm.usualDishes,
                },
            },
            {
                onSuccess: () => toast("Perfil actualizado ✓"),
                onError: () => toast("No se pudo actualizar el perfil.", "error"),
            },
        );
        setEditingId(null);
    };

    return (
        <div className="page">
            <div className="page-head">
                <div>
                    <h1>Perfiles</h1>
                    <p className="muted">Las recomendaciones se adaptan a cada persona.</p>
                </div>
                <button className="btn primary" onClick={() => setShowWizard(true)}>
                    + Nuevo perfil
                </button>
            </div>

            <section className="card">
                <h2>Perfiles existentes</h2>
                <ul className="profile-list">
                    {profiles.map((p) => (
                        <li key={p.id} className={`profile-row ${active?.id === p.id ? "active" : ""}`}>
                            <div className="avatar" style={{ background: "#e8a33d" }}>
                                {p.emoji ?? p.name.slice(0, 1).toUpperCase()}
                            </div>
                            <div className="profile-info">
                                <strong>
                                    {p.name} {!p.isComplete ? <span className="chip warn">Incompleto</span> : null}
                                </strong>
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
                                    onClick={async () => {
                                        if (
                                            await confirm({
                                                title: "Eliminar perfil",
                                                message: `¿Eliminar a ${p.name}? Se perderán sus datos.`,
                                                confirmLabel: "Eliminar",
                                                danger: true,
                                            })
                                        ) {
                                            remove.mutate(p.id);
                                        }
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
                        <ProfileFields
                            value={editForm}
                            onChange={(patch) => setEditForm((f) => ({ ...f, ...patch }))}
                            profile={profiles.find((p) => p.id === editingId)}
                        />
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

            {showWizard ? (
                <ProfileWizard onClose={() => setShowWizard(false)} onDone={() => setShowWizard(false)} />
            ) : null}
        </div>
    );
}
