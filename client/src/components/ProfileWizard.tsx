import { useState } from "react";
import { useCreateProfile } from "../api/hooks";
import { useToast } from "../lib/toast";
import { useModalClose } from "../lib/useModalClose";
import type { Profile } from "../types";
import { defaultProfileForm, ProfileFields, type ProfileFormState } from "./ProfileFields";

/** Wizard de 2 pasos para crear un perfil (paso 1 obligatorio, paso 2 opcional). */
export default function ProfileWizard({
    onDone,
    onClose,
}: {
    onDone?: (profile: Profile) => void;
    onClose?: () => void;
}) {
    const [step, setStep] = useState(1);
    const [form, setForm] = useState<ProfileFormState>(defaultProfileForm());
    const create = useCreateProfile();
    const toast = useToast();

    const canContinue = form.name.trim().length > 0 && form.household >= 1;

    const submit = () => {
        create.mutate(
            {
                name: form.name.trim(),
                emoji: form.emoji,
                dietPreferences: form.diets,
                restrictions: form.restrictions,
                householdSize: form.household,
                mealsPerDay: form.meals,
                usualDishes: form.usualDishes,
            },
            {
                onSuccess: (profile) => {
                    toast(`Perfil creado: ${profile.name} ✓`);
                    onDone?.(profile);
                },
                onError: () => toast("No se pudo crear el perfil.", "error"),
            },
        );
    };

    const patch = (next: Partial<ProfileFormState>) => setForm((f) => ({ ...f, ...next }));

    useModalClose(() => onClose?.());

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="modal modal-wizard" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
                <div className="modal-head">
                    <h3>Crea tu perfil</h3>
                    {onClose ? (
                        <button className="icon-btn" onClick={onClose} aria-label="Cerrar">
                            ✕
                        </button>
                    ) : null}
                </div>

                <div className="wizard-steps">
                    <span className={`wizard-step ${step >= 1 ? "active" : ""}`}>1 · Lo esencial</span>
                    <span className={`wizard-step ${step >= 2 ? "active" : ""}`}>2 · Preferencias (opcional)</span>
                </div>

                {step === 1 ? (
                    <div className="profile-form">
                        <label className="field">
                            <span>Nombre *</span>
                            <input
                                className="input"
                                value={form.name}
                                onChange={(e) => patch({ name: e.target.value })}
                                placeholder="Ej. María"
                                autoFocus
                            />
                        </label>
                        <label className="field">
                            <span>Personas en el hogar *</span>
                            <input
                                className="input input-num"
                                type="number"
                                min="1"
                                max="12"
                                value={form.household}
                                onChange={(e) => patch({ household: parseInt(e.target.value, 10) || 0 })}
                            />
                        </label>
                        <p className="muted small">
                            Las preferencias (dietas, restricciones, comidas) puedes definirlas ahora o editarlas
                            después.
                        </p>
                        <button className="btn primary" disabled={!canContinue} onClick={() => setStep(2)}>
                            Continuar →
                        </button>
                    </div>
                ) : (
                    <div className="profile-form">
                        <ProfileFields value={form} onChange={patch} showBasics={false} />
                        <div className="modal-actions">
                            <button className="btn ghost" onClick={() => setStep(1)}>
                                ← Atrás
                            </button>
                            <button className="btn primary" onClick={submit} disabled={create.isPending}>
                                {create.isPending ? "Creando…" : "Crear perfil"}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
