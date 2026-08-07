import { useState } from "react";
import { useActivateProfile, useActiveProfile, useAppState } from "../api/hooks";
import { navigate } from "../lib/router";
import { useToast } from "../lib/toast";

/** Menú desplegable de la topbar: ver perfil, ajustes, cambiar de perfil y gestionar perfiles. */
export default function ProfileMenu() {
    const { data: state } = useAppState();
    const active = useActiveProfile();
    const activate = useActivateProfile();
    const toast = useToast();
    const [open, setOpen] = useState(false);

    if (!state) return null;

    const switchTo = (id: string) => {
        activate.mutate(id, {
            onSuccess: () => toast("Perfil activado ✓"),
        });
        setOpen(false);
    };

    return (
        <div className="profile-menu">
            <button
                className="profile-menu-trigger"
                onClick={() => setOpen((o) => !o)}
                aria-label="Cambiar perfil"
                aria-expanded={open}
            >
                <span className="avatar">{active?.name.slice(0, 1).toUpperCase() ?? "?"}</span>
                <span className="profile-menu-caret" aria-hidden>
                    ▾
                </span>
            </button>

            {open ? (
                <>
                    <div className="profile-menu-backdrop" onClick={() => setOpen(false)} />
                    <div className="profile-dropdown">
                        <div className="profile-dropdown-head">
                            <strong>{active?.name ?? "Sin perfil"}</strong>
                            <span className="muted small">Perfil activo</span>
                        </div>
                        <div className="profile-dropdown-list">
                            {state.profiles.map((p) => (
                                <button
                                    key={p.id}
                                    className={`profile-menu-item ${active?.id === p.id ? "active" : ""}`}
                                    onClick={() => switchTo(p.id)}
                                >
                                    <span className="avatar sm">{p.name.slice(0, 1).toUpperCase()}</span>
                                    <span className="profile-menu-name">
                                        {p.name}
                                        {!p.isComplete ? <span className="chip warn">Incompleto</span> : null}
                                    </span>
                                    {active?.id === p.id ? <span className="profile-menu-check">✓</span> : null}
                                </button>
                            ))}
                        </div>
                        <div className="profile-dropdown-actions">
                            <button
                                className="profile-menu-item"
                                onClick={() => {
                                    setOpen(false);
                                    navigate("profiles");
                                }}
                            >
                                <span className="profile-menu-name">Ver mi perfil</span>
                            </button>
                            <button
                                className="profile-menu-item"
                                onClick={() => {
                                    setOpen(false);
                                    navigate("settings");
                                }}
                            >
                                <span className="profile-menu-name">Ajustes</span>
                            </button>
                        </div>
                        <div className="profile-dropdown-foot">
                            <button
                                className="link-btn"
                                onClick={() => {
                                    setOpen(false);
                                    navigate("profiles");
                                }}
                            >
                                Gestionar perfiles →
                            </button>
                        </div>
                    </div>
                </>
            ) : null}
        </div>
    );
}
