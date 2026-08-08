import { useState } from "react";
import { useThemealdbImport, useThemealdbSearch } from "../api/hooks";
import { useToast } from "../lib/toast";
import { useModalClose } from "../lib/useModalClose";

export default function ThemealdbImporter({ onClose }: { onClose: () => void }) {
    const [q, setQ] = useState("");
    const enabled = q.trim().length >= 2;
    const search = useThemealdbSearch(q, enabled);
    const importRecipe = useThemealdbImport();
    const toast = useToast();

    const results = search.data ?? [];

    useModalClose(onClose);

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="modal modal-wide" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
                <div className="modal-head">
                    <h3>Importar de TheMealDB</h3>
                    <button className="icon-btn" onClick={onClose} aria-label="Cerrar">
                        ✕
                    </button>
                </div>
                <input
                    className="input"
                    placeholder="Buscar en TheMealDB…"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    autoFocus
                />
                <div className="tmdb-results">
                    {search.isLoading ? (
                        <p className="muted">Buscando…</p>
                    ) : search.isError ? (
                        <p className="muted">Sin resultados</p>
                    ) : !enabled ? (
                        <p className="muted">Escribe al menos 2 caracteres para buscar</p>
                    ) : results.length === 0 ? (
                        <p className="muted">Sin resultados</p>
                    ) : (
                        results.map((r) => (
                            <div key={r.id} className="tmdb-row">
                                <img
                                    className="tmdb-thumb"
                                    src={r.image ?? ""}
                                    alt={r.title}
                                    width={60}
                                    height={60}
                                    loading="lazy"
                                    onError={(e) => {
                                        const el = e.currentTarget;
                                        el.style.display = "none";
                                    }}
                                />
                                <div className="tmdb-info">
                                    <strong>{r.title}</strong>
                                    <span className="muted small">
                                        {[r.cuisine, ...(r.regions ?? [])].filter(Boolean).join(", ") || "—"}
                                    </span>
                                </div>
                                <button
                                    className="btn primary sm"
                                    disabled={importRecipe.isPending}
                                    onClick={() => {
                                        importRecipe.mutate(r.id, {
                                            onSuccess: (data) => {
                                                toast(
                                                    data.alreadyExists
                                                        ? "Ya está en tu catálogo"
                                                        : "Receta importada ✓",
                                                );
                                                onClose();
                                            },
                                            onError: () => {
                                                toast("Error al importar", "error");
                                            },
                                        });
                                    }}
                                >
                                    Importar
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
