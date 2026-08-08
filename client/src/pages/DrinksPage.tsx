import { useState } from "react";
import { useCreateDrink, useDeleteDrink, useDrinks, useUpdateDrink } from "../api/hooks";
import { useConfirm } from "../lib/confirm";
import { useToast } from "../lib/toast";
import { useModalClose } from "../lib/useModalClose";
import { type Drink, type DrinkKind, MEAL_LABELS, type MealType } from "../types";

const DRINK_KINDS: { value: DrinkKind; label: string; emoji: string }[] = [
    { value: "refresco", label: "Refresco", emoji: "🧊" },
    { value: "mate", label: "Mate / infusión", emoji: "🍵" },
    { value: "jugo", label: "Jugo", emoji: "🧃" },
    { value: "bebida", label: "Bebida caliente", emoji: "☕" },
];

const ALL_MEALS: MealType[] = ["desayuno", "almuerzo", "cena"];

const MEAL_EMOJI: Record<MealType, string> = {
    desayuno: "🌅",
    almuerzo: "☀️",
    cena: "🌙",
};

type ModalMode = "new" | "edit" | null;

export default function DrinksPage() {
    const { data: drinks, isLoading } = useDrinks();
    const createDrink = useCreateDrink();
    const updateDrink = useUpdateDrink();
    const deleteDrink = useDeleteDrink();
    const toast = useToast();
    const confirm = useConfirm();

    const [filterKind, setFilterKind] = useState<DrinkKind | "todas">("todas");
    const [filterMeal, setFilterMeal] = useState<MealType | "todas">("todas");

    const [modal, setModal] = useState<ModalMode>(null);
    const [name, setName] = useState("");
    const [emoji, setEmoji] = useState("");
    const [kind, setKind] = useState<DrinkKind>("refresco");
    const [suitableFor, setSuitableFor] = useState<MealType[]>(["almuerzo", "cena"]);
    const [editingId, setEditingId] = useState<string | null>(null);

    const filtered = (drinks ?? []).filter((d) => {
        if (filterKind !== "todas" && d.kind !== filterKind) return false;
        if (filterMeal !== "todas" && !d.suitableFor.includes(filterMeal)) return false;
        return true;
    });

    const grouped = new Map<MealType, Drink[]>();
    for (const m of ALL_MEALS) {
        const list = filtered.filter((d) => d.suitableFor.includes(m));
        if (list.length > 0) grouped.set(m, list);
    }

    const toggleMeal = (meal: MealType) => {
        if (suitableFor.includes(meal)) {
            setSuitableFor(suitableFor.filter((m) => m !== meal));
        } else {
            setSuitableFor([...suitableFor, meal]);
        }
    };

    const openNew = () => {
        setName("");
        setEmoji("");
        setKind("refresco");
        setSuitableFor(["almuerzo", "cena"]);
        setEditingId(null);
        setModal("new");
    };

    const openEdit = (d: Drink) => {
        setEditingId(d.id);
        setName(d.name);
        setEmoji(d.emoji);
        setKind(d.kind);
        setSuitableFor([...d.suitableFor]);
        setModal("edit");
    };

    const closeModal = () => setModal(null);
    useModalClose(closeModal);

    const save = () => {
        if (!name.trim() || !emoji.trim() || suitableFor.length === 0) {
            toast("Completa nombre, emoji y al menos una comida apta.");
            return;
        }
        const body = { name: name.trim(), emoji: emoji.trim(), kind, suitableFor };

        if (modal === "edit" && editingId) {
            updateDrink.mutate(
                { id: editingId, body },
                {
                    onSuccess: () => {
                        toast("Bebida actualizada ✓");
                        closeModal();
                    },
                },
            );
        } else {
            createDrink.mutate(body, {
                onSuccess: () => {
                    toast("Bebida añadida ✓");
                    closeModal();
                },
            });
        }
    };

    const removeDrink = async (id: string) => {
        if (
            await confirm({
                title: "Eliminar bebida",
                message: "¿Eliminar esta bebida del catálogo?",
                confirmLabel: "Eliminar",
                danger: true,
            })
        ) {
            deleteDrink.mutate(id, { onSuccess: () => toast("Bebida eliminada ✓") });
        }
    };

    const kindInfo = (k: DrinkKind) => DRINK_KINDS.find((x) => x.value === k) ?? DRINK_KINDS[0];
    const isSaving = modal === "edit" ? updateDrink.isPending : createDrink.isPending;
    const modalTitle = modal === "edit" ? "Editar bebida" : "Nueva bebida";
    const modalCta = modal === "edit" ? "Guardar" : "Añadir";

    return (
        <div className="page">
            <div className="page-head">
                <div>
                    <h1>Bebidas</h1>
                    <p className="muted">
                        {filtered.length} bebida{filtered.length !== 1 ? "s" : ""} en el catálogo
                    </p>
                </div>
                <div className="page-actions">
                    <button className="btn primary" onClick={openNew}>
                        + Nueva bebida
                    </button>
                </div>
            </div>

            <div className="filter-chips" style={{ marginBottom: 20 }}>
                <span className="muted small" style={{ marginRight: 4 }}>
                    Tipo:
                </span>
                {[{ value: "todas" as const, label: "Todas" }, ...DRINK_KINDS].map((k) => (
                    <button
                        key={k.value}
                        className={`chip ${filterKind === k.value ? "active" : ""}`}
                        onClick={() => setFilterKind(k.value as DrinkKind | "todas")}
                    >
                        {"emoji" in k ? `${k.emoji} ` : ""}
                        {k.label}
                    </button>
                ))}
                <span className="muted small" style={{ marginLeft: 12, marginRight: 4 }}>
                    Comida:
                </span>
                {[
                    { value: "todas" as const, label: "Todas" },
                    ...ALL_MEALS.map((m) => ({ value: m, label: MEAL_LABELS[m], emoji: MEAL_EMOJI[m] })),
                ].map((m) => (
                    <button
                        key={m.value}
                        className={`chip ${filterMeal === m.value ? "active" : ""}`}
                        onClick={() => setFilterMeal(m.value as MealType | "todas")}
                    >
                        {"emoji" in m ? `${m.emoji} ` : ""}
                        {m.label}
                    </button>
                ))}
            </div>

            {isLoading ? (
                <p className="muted">Cargando…</p>
            ) : filtered.length === 0 ? (
                <div className="empty-state">
                    <p>No hay bebidas con esos filtros.</p>
                    <button
                        className="btn"
                        onClick={() => {
                            setFilterKind("todas");
                            setFilterMeal("todas");
                        }}
                    >
                        Limpiar filtros
                    </button>
                </div>
            ) : filterMeal !== "todas" || filterKind !== "todas" ? (
                <div className="drink-grid">
                    {filtered.map((d) => (
                        <DrinkCard key={d.id} drink={d} kindInfo={kindInfo} onEdit={openEdit} onDelete={removeDrink} />
                    ))}
                </div>
            ) : (
                [...grouped.entries()].map(([meal, list]) => (
                    <section key={meal} style={{ marginBottom: 24 }}>
                        <h2
                            style={{
                                fontSize: "1rem",
                                marginBottom: 12,
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                            }}
                        >
                            {MEAL_EMOJI[meal]} {MEAL_LABELS[meal]}
                            <span className="muted small" style={{ fontWeight: 400 }}>
                                ({list.length})
                            </span>
                        </h2>
                        <div className="drink-grid">
                            {list.map((d) => (
                                <DrinkCard
                                    key={d.id}
                                    drink={d}
                                    kindInfo={kindInfo}
                                    onEdit={openEdit}
                                    onDelete={removeDrink}
                                />
                            ))}
                        </div>
                    </section>
                ))
            )}

            {modal ? (
                <div className="modal-backdrop" onClick={closeModal}>
                    <div className="modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-head">
                            <h2>{modalTitle}</h2>
                            <button className="icon-btn" onClick={closeModal}>
                                ✕
                            </button>
                        </div>
                        <div className="profile-form">
                            <div className="field">
                                <span>Nombre</span>
                                <input
                                    className="input"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Ej. Jugo de manzana"
                                    autoFocus
                                />
                            </div>
                            <div className="field-row">
                                <label className="field sm" style={{ maxWidth: 100 }}>
                                    <span>Emoji</span>
                                    <input
                                        className="input"
                                        value={emoji}
                                        onChange={(e) => setEmoji(e.target.value)}
                                        placeholder="🍎"
                                    />
                                </label>
                                <label className="field sm">
                                    <span>Tipo</span>
                                    <select
                                        className="input"
                                        value={kind}
                                        onChange={(e) => setKind(e.target.value as DrinkKind)}
                                    >
                                        {DRINK_KINDS.map((k) => (
                                            <option key={k.value} value={k.value}>
                                                {k.emoji} {k.label}
                                            </option>
                                        ))}
                                    </select>
                                </label>
                            </div>
                            <div className="field">
                                <span>Comidas aptas</span>
                                <div className="chip-row">
                                    {ALL_MEALS.map((m) => (
                                        <button
                                            key={m}
                                            className={`chip ${suitableFor.includes(m) ? "active" : ""}`}
                                            onClick={() => toggleMeal(m)}
                                            type="button"
                                        >
                                            {MEAL_EMOJI[m]} {MEAL_LABELS[m]}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="btn-row" style={{ marginTop: 16 }}>
                                <button className="btn primary" onClick={save} disabled={isSaving}>
                                    {modalCta}
                                </button>
                                <button className="btn" onClick={closeModal}>
                                    Cancelar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    );
}

function DrinkCard({
    drink,
    kindInfo,
    onEdit,
    onDelete,
}: {
    drink: Drink;
    kindInfo: (k: DrinkKind) => { emoji: string; label: string };
    onEdit: (d: Drink) => void;
    onDelete: (id: string) => void;
}) {
    const ki = kindInfo(drink.kind);

    return (
        <div className="drink-card">
            <div className="drink-card-hero">
                <span className="drink-card-emoji">{drink.emoji}</span>
            </div>
            <div className="drink-card-body">
                <strong className="drink-card-name">{drink.name}</strong>
                <span className="drink-card-kind">
                    {ki.emoji} {ki.label}
                </span>
                <div className="drink-card-meals">
                    {drink.suitableFor.map((m) => (
                        <span key={m} className="meal-chip">
                            {MEAL_EMOJI[m]} {MEAL_LABELS[m]}
                        </span>
                    ))}
                </div>
            </div>
            <div className="drink-card-actions">
                <button className="icon-btn" title="Editar" onClick={() => onEdit(drink)}>
                    ✎
                </button>
                <button className="icon-btn danger" title="Eliminar" onClick={() => onDelete(drink.id)}>
                    ✕
                </button>
            </div>
        </div>
    );
}
