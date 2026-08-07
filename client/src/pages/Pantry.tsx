import { useMemo, useState } from "react";
import { useAddPantry, useAppState, useDeletePantry, useIngredientCatalog, usePantry } from "../api/hooks";
import { useConfirm } from "../lib/confirm";
import { fmtQty, toISODate } from "../lib/format";
import { useToast } from "../lib/toast";
import type { CatalogIngredient } from "../types";
import { normalizeText } from "../types";

const DEFAULT_UNITS = ["g", "kg", "ml", "l", "cucharadas", "cucharaditas", "puñados", "unidades", "lata", "paquete"];

const CATEGORY_LABELS: Record<string, string> = {
    verduras: "🥬 Verduras",
    frutas: "🍎 Frutas",
    proteinas: "🍗 Proteínas",
    lacteos: "🥛 Lácteos",
    granos: "🌾 Granos y legumbres",
    condimentos: "🧂 Especias",
    despensa: "📦 Despensa",
    otros: "📦 Otros",
};

export default function PantryPage() {
    const pantry = usePantry();
    const addItem = useAddPantry();
    const remove = useDeletePantry();
    const toast = useToast();
    const confirm = useConfirm();

    const catalog = useIngredientCatalog();
    const { data: state } = useAppState();

    const [name, setName] = useState("");
    const [qty, setQty] = useState("");
    const [unit, setUnit] = useState("unidades");
    const [expiry, setExpiry] = useState("");

    const matchedIngredient = useMemo<CatalogIngredient | undefined>(() => {
        const needle = normalizeText(name);
        if (!needle) return undefined;
        return catalog.data?.find((i) => normalizeText(i.name) === needle);
    }, [catalog.data, name]);

    const query = name.trim();
    const suggestions = useMemo(() => {
        const needle = normalizeText(query);
        if (needle.length < 3) return [];
        const seen = new Set<string>();
        const list: string[] = [];
        const push = (n: string) => {
            const key = normalizeText(n);
            if (n.trim() && key.includes(needle) && !seen.has(key)) {
                seen.add(key);
                list.push(n);
            }
        };
        for (const i of catalog.data ?? []) push(i.name);
        for (const p of state?.pantry ?? []) push(p.ingredientName);
        for (const r of state?.recipes ?? []) {
            for (const ing of r.ingredients) push(ing.name);
        }
        return list;
    }, [catalog.data, state?.pantry, state?.recipes, query]);

    const unitOptions = useMemo(() => {
        const base = matchedIngredient ? matchedIngredient.units : DEFAULT_UNITS;
        return base.includes(unit) ? base : [...base, unit];
    }, [matchedIngredient, unit]);

    const onNameChange = (value: string) => {
        setName(value);
        const entry = catalog.data?.find((i) => normalizeText(i.name) === normalizeText(value));
        if (entry) setUnit(entry.defaultUnit);
    };

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;
        const quantity = parseFloat(qty) || 1;
        addItem.mutate(
            {
                ingredientName: name.trim(),
                quantity,
                unit,
                expiryDate: expiry || undefined,
            },
            {
                onSuccess: (item) => {
                    toast(`Añadido: ${item.ingredientName} (${fmtQty(item.quantity)} ${item.unit})`);
                    setName("");
                    setQty("");
                    setExpiry("");
                    setUnit("unidades");
                },
                onError: (err) => toast(`Error: ${(err as Error).message}`, "error"),
            },
        );
    };

    const items = pantry.data ?? [];
    const today = toISODate(new Date());
    const daysLeft = (expiryDate?: string) => {
        if (!expiryDate) return null;
        return Math.ceil((new Date(expiryDate).getTime() - new Date(today).getTime()) / 86_400_000);
    };
    const sorted = [...items].sort((a, b) => {
        const da = daysLeft(a.expiryDate) ?? 999;
        const db = daysLeft(b.expiryDate) ?? 999;
        return da - db;
    });

    return (
        <div className="page">
            <div className="page-head">
                <div>
                    <h1>Despensa</h1>
                    <p className="muted">{items.length} ingredientes</p>
                </div>
            </div>

            <form className="card pantry-form" onSubmit={submit}>
                <input
                    className="input"
                    list={suggestions.length ? "ingredient-suggestions" : undefined}
                    placeholder="Ingrediente…"
                    value={name}
                    onChange={(e) => onNameChange(e.target.value)}
                />
                {suggestions.length ? (
                    <datalist id="ingredient-suggestions">
                        {suggestions.map((s) => (
                            <option key={s} value={s} />
                        ))}
                    </datalist>
                ) : null}
                <input
                    className="input input-num"
                    placeholder="Cant."
                    type="number"
                    min="0"
                    step="any"
                    value={qty}
                    onChange={(e) => setQty(e.target.value)}
                />
                <select className="input input-unit" value={unit} onChange={(e) => setUnit(e.target.value)}>
                    {unitOptions.map((u) => (
                        <option key={u} value={u}>
                            {u}
                        </option>
                    ))}
                </select>
                <input className="input" type="date" value={expiry} onChange={(e) => setExpiry(e.target.value)} />
                <button className="btn primary" type="submit">
                    Añadir
                </button>
            </form>
            {matchedIngredient ? (
                <p className="muted pantry-hint">
                    {matchedIngredient.name} ·{" "}
                    {CATEGORY_LABELS[matchedIngredient.category] ?? matchedIngredient.category} · medida sugerida:{" "}
                    {matchedIngredient.defaultUnit}
                </p>
            ) : (
                <p className="muted pantry-hint">
                    Escribe al menos 3 letras para ver sugerencias del catálogo, tu despensa y tus recetas.
                </p>
            )}

            <div className="pantry-grid">
                {sorted.map((p) => {
                    const d = daysLeft(p.expiryDate);
                    const urgent = d !== null && d <= 2;
                    return (
                        <div key={p.id} className={`card pantry-item ${urgent ? "urgent" : ""}`}>
                            <div className="pantry-name">{p.ingredientName}</div>
                            <div className="pantry-qty">
                                {fmtQty(p.quantity)} {p.unit}
                            </div>
                            <div className="pantry-extra">
                                {p.expiryDate ? (
                                    <span className={urgent ? "exp-badge urgent" : "exp-badge"}>
                                        {d === null
                                            ? "—"
                                            : d < 0
                                              ? `caducó hace ${Math.abs(d)} d`
                                              : d === 0
                                                ? "caduca hoy"
                                                : `caduca en ${d} d`}
                                    </span>
                                ) : (
                                    <span className="muted">sin fecha</span>
                                )}
                                <button
                                    className="icon-btn danger"
                                    title="Eliminar"
                                    onClick={async () => {
                                        if (
                                            await confirm({
                                                title: "Quitar ingrediente",
                                                message: `¿Quitar ${p.ingredientName} de la despensa?`,
                                                confirmLabel: "Quitar",
                                                danger: true,
                                            })
                                        ) {
                                            remove.mutate(p.id, {
                                                onSuccess: () => toast(`Eliminado: ${p.ingredientName}`),
                                                onError: (err) => toast(`Error: ${(err as Error).message}`, "error"),
                                            });
                                        }
                                    }}
                                >
                                    ✕
                                </button>
                            </div>
                        </div>
                    );
                })}
                {items.length === 0 ? <p className="muted">La despensa está vacía. Añade ingredientes.</p> : null}
            </div>
        </div>
    );
}
