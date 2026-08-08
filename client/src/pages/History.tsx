import {
    useActiveProfile,
    useAppState,
    useDeleteHistoryEntry,
    useHistory,
    useSetRating,
    useUpdateHistoryEntry,
} from "../api/hooks";
import Stars from "../components/Stars";
import { useConfirm } from "../lib/confirm";
import { dateLabel } from "../lib/format";
import { navigate } from "../lib/router";
import { MEAL_LABELS } from "../types";

export default function HistoryPage() {
    const profile = useActiveProfile();
    const history = useHistory(profile?.id);
    const remove = useDeleteHistoryEntry();
    const confirm = useConfirm();
    const setRating = useSetRating();
    const updateEntry = useUpdateHistoryEntry();
    const { data: state } = useAppState();
    const names = new Map((state?.recipes ?? []).map((r) => [r.id, r.title]));

    const sorted = [...(history.data ?? [])].sort((a, b) => b.date.localeCompare(a.date));

    const avgRating = (() => {
        const rated = sorted.filter((e) => e.rating != null);
        if (!rated.length) return null;
        return (rated.reduce((sum, e) => sum + (e.rating ?? 0), 0) / rated.length).toFixed(1);
    })();

    const favorites = (() => {
        const counts = new Map<string, number>();
        sorted.forEach((e) => {
            counts.set(e.recipeId, (counts.get(e.recipeId) ?? 0) + 1);
        });
        return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
    })();

    return (
        <div className="page">
            <div className="page-head">
                <div>
                    <h1>Historial de comidas</h1>
                    <p className="muted">
                        {sorted.length} registros{avgRating ? ` · media ⭐ ${avgRating}` : ""}
                    </p>
                </div>
            </div>

            {favorites.length > 0 ? (
                <section className="card">
                    <h2>Las que más repites</h2>
                    <div className="diet-chips">
                        {favorites.map(([id, n]) => (
                            <button key={id} className="chip active" onClick={() => navigate(`recipes/${id}`)}>
                                {names.get(id) ?? "Receta"} · {n}×
                            </button>
                        ))}
                    </div>
                </section>
            ) : null}

            <div className="history-list">
                {sorted.map((e) => (
                    <div key={e.id} className="card history-row">
                        <div className="history-main">
                            <span className="meal-chip">{MEAL_LABELS[e.meal]}</span>
                            <button className="link-btn" onClick={() => navigate(`recipes/${e.recipeId}`)}>
                                {names.get(e.recipeId) ?? "Receta"}
                            </button>
                            <span className="muted">×{e.servings}</span>
                        </div>
                        <div className="history-right">
                            <span className="muted">{dateLabel(e.date)}</span>
                            <Stars
                                size="sm"
                                value={e.rating}
                                onChange={
                                    setRating.isPending
                                        ? undefined
                                        : (rating) => {
                                              if (!profile) return;
                                              setRating.mutate({ profileId: profile.id, recipeId: e.recipeId, rating });
                                              updateEntry.mutate({ id: e.id, body: { rating: rating ?? undefined } });
                                          }
                                }
                            />
                            <button
                                className="icon-btn danger"
                                title="Eliminar"
                                onClick={async () => {
                                    if (
                                        await confirm({
                                            title: "Eliminar registro",
                                            message: "¿Eliminar este registro del historial?",
                                            confirmLabel: "Eliminar",
                                            danger: true,
                                        })
                                    ) {
                                        remove.mutate(e.id);
                                    }
                                }}
                            >
                                ✕
                            </button>
                        </div>
                    </div>
                ))}
                {history.isLoading ? (
                    <p className="muted">Cargando…</p>
                ) : sorted.length === 0 ? (
                    <p className="muted">Aún no has registrado comidas. Usa "Ya lo comí" desde el plan.</p>
                ) : null}
            </div>
        </div>
    );
}
