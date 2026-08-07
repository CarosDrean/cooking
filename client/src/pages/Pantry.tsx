import { useMemo, useState } from "react";
import {
    useAddPantry,
    useAppState,
    useDeletePantry,
    useEquivalent,
    useIngredientCatalog,
    usePantry,
    useUpdatePantry,
} from "../api/hooks";
import PantryEditModal from "../components/PantryEditModal";
import VoiceButton from "../components/VoiceButton";
import { useConfirm } from "../lib/confirm";
import { fmtCurrency, fmtQty, toISODate } from "../lib/format";
import { parseSpokenIngredient, parseTypedIngredient } from "../lib/speech";
import { useToast } from "../lib/toast";
import type { CatalogIngredient, PantryItem } from "../types";
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

type PriceMode = "unit" | "total";

function round2(n: number): number {
    return Math.round(n * 100) / 100;
}

export default function PantryPage() {
    const pantry = usePantry();
    const addItem = useAddPantry();
    const updateItem = useUpdatePantry();
    const remove = useDeletePantry();
    const toast = useToast();
    const confirm = useConfirm();

    const catalog = useIngredientCatalog();
    const { data: state } = useAppState();

    const [name, setName] = useState("");
    const [qty, setQty] = useState("");
    const [unit, setUnit] = useState("unidades");
    const [price, setPrice] = useState("");
    const [priceMode, setPriceMode] = useState<PriceMode>("unit");
    const [expiry, setExpiry] = useState("");
    const [query, setQuery] = useState("");
    const [editItem, setEditItem] = useState<PantryItem | null>(null);
    const [hidePrices, setHidePrices] = useState(() => localStorage.getItem("pantry.hidePrices") === "1");

    const togglePrices = () => {
        setHidePrices((h) => {
            const next = !h;
            localStorage.setItem("pantry.hidePrices", next ? "1" : "0");
            return next;
        });
    };

    const matchedIngredient = useMemo<CatalogIngredient | undefined>(() => {
        const needle = normalizeText(name);
        if (!needle) return undefined;
        return catalog.data?.find((i) => normalizeText(i.name) === needle);
    }, [catalog.data, name]);

    const queryText = name.trim();
    const suggestions = useMemo(() => {
        const needle = normalizeText(queryText);
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
    }, [catalog.data, state?.pantry, state?.recipes, queryText]);

    const unitOptions = useMemo(() => {
        const base = matchedIngredient ? matchedIngredient.units : DEFAULT_UNITS;
        return base.includes(unit) ? base : [...base, unit];
    }, [matchedIngredient, unit]);

    const qtyNum = parseFloat(qty) || 1;
    const priceNum = parseFloat(price) || 0;
    const subtotal = priceMode === "total" ? priceNum : qtyNum * priceNum;
    const equivalent = useEquivalent(matchedIngredient?.name ?? name, qtyNum, unit);

    const onNameChange = (value: string) => {
        setName(value);
        const entry = catalog.data?.find((i) => normalizeText(i.name) === normalizeText(value));
        if (entry) setUnit(entry.defaultUnit);
    };

    const onVoiceResult = (text: string) => {
        const parsed = parseSpokenIngredient(text);
        if (parsed.ingredientName) setName(parsed.ingredientName);
        if (parsed.quantity != null) setQty(String(parsed.quantity));
        if (parsed.unit) {
            setUnit(parsed.unit);
        } else {
            const entry = catalog.data?.find((i) => normalizeText(i.name) === normalizeText(parsed.ingredientName));
            if (entry) setUnit(entry.defaultUnit);
        }
        if (parsed.unitPrice != null) {
            setPrice(String(parsed.unitPrice));
            setPriceMode("unit");
        }

        const pieces = [parsed.ingredientName || "?"];
        if (parsed.quantity != null) pieces.push(`${fmtQty(parsed.quantity)} ${parsed.unit ?? ""}`.trim());
        if (parsed.unitPrice != null) pieces.push(fmtCurrency(parsed.unitPrice));
        toast(`Reconocido: ${pieces.join(" · ")}`);
    };

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        const parsed = parseTypedIngredient(name);
        const submittedName = parsed ? parsed.name : name.trim();
        if (!submittedName) return;
        const submittedQty = parsed ? parsed.quantity : qtyNum;
        const submittedUnit = parsed ? parsed.unit : unit;
        const submittedUnitPrice = priceMode === "total" && submittedQty > 0 ? priceNum / submittedQty : priceNum;
        addItem.mutate(
            {
                ingredientName: submittedName,
                quantity: submittedQty,
                unit: submittedUnit,
                unitPrice: submittedUnitPrice > 0 ? round2(submittedUnitPrice) : undefined,
                expiryDate: expiry || undefined,
            },
            {
                onSuccess: (item) => {
                    toast(`Añadido: ${item.ingredientName} (${fmtQty(item.quantity)} ${item.unit})`);
                    setName("");
                    setQty("");
                    setPrice("");
                    setExpiry("");
                    setUnit("unidades");
                },
                onError: (err) => toast(`Error: ${(err as Error).message}`, "error"),
            },
        );
    };

    const saveEdit = (body: Partial<Omit<PantryItem, "unitPrice">> & { unitPrice?: number | null }) => {
        if (!editItem) return;
        updateItem.mutate(
            { id: editItem.id, body },
            {
                onSuccess: (item) => {
                    toast(`Actualizado: ${item.ingredientName} (${fmtQty(item.quantity)} ${item.unit})`);
                    setEditItem(null);
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
    const needle = normalizeText(query);
    const filtered = needle ? sorted.filter((p) => normalizeText(p.ingredientName).includes(needle)) : sorted;

    return (
        <div className="page">
            <div className="page-head">
                <div>
                    <h1>Despensa</h1>
                    <p className="muted">{items.length} ingredientes</p>
                </div>
                <div className="page-actions">
                    <button className="btn" onClick={togglePrices}>
                        {hidePrices ? "👁 Mostrar precios" : "🙈 Ocultar precios"}
                    </button>
                </div>
            </div>

            <form className="card pantry-form" onSubmit={submit}>
                <VoiceButton onResult={onVoiceResult} />
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
                <div className="price-mode">
                    <button
                        type="button"
                        className={`chip ${priceMode === "unit" ? "active" : ""}`}
                        aria-pressed={priceMode === "unit"}
                        onClick={() => setPriceMode("unit")}
                    >
                        S/ por und.
                    </button>
                    <button
                        type="button"
                        className={`chip ${priceMode === "total" ? "active" : ""}`}
                        aria-pressed={priceMode === "total"}
                        onClick={() => setPriceMode("total")}
                    >
                        S/ total
                    </button>
                </div>
                <input
                    className="input input-num input-price"
                    placeholder={priceMode === "total" ? "S/ total" : "S/ por und."}
                    type="number"
                    min="0"
                    step="any"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                />
                <input className="input" type="date" value={expiry} onChange={(e) => setExpiry(e.target.value)} />
                <button className="btn primary" type="submit">
                    Añadir
                </button>
            </form>
            <div className="pantry-hints">
                {matchedIngredient ? (
                    <p className="muted">
                        {matchedIngredient.name} ·{" "}
                        {CATEGORY_LABELS[matchedIngredient.category] ?? matchedIngredient.category} · medida sugerida:{" "}
                        {matchedIngredient.defaultUnit}
                    </p>
                ) : (
                    <p className="muted">
                        Escribe al menos 3 letras para ver sugerencias del catálogo, tu despensa y tus recetas, o usa el
                        micrófono: "compré un kilo de arroz", "1 sol de huevo".
                    </p>
                )}
                {equivalent.data?.matched ? (
                    <p className="muted pantry-eq">
                        {fmtQty(equivalent.data.quantity)} {equivalent.data.unit} de {equivalent.data.ingredientName} ≈{" "}
                        {fmtQty(equivalent.data.equivalentValue ?? 0)} g
                    </p>
                ) : null}
                {priceNum > 0 ? (
                    <p className="muted">
                        Subtotal: <strong>{fmtCurrency(subtotal)}</strong>
                        {priceMode === "total"
                            ? ` · ${fmtCurrency(priceNum)} total`
                            : ` · ${fmtCurrency(priceNum)} × ${fmtQty(qtyNum)} ${unit}`}
                    </p>
                ) : null}
            </div>

            {items.length > 0 ? (
                <div className="pantry-tools">
                    <input
                        className="input pantry-search"
                        placeholder="🔍 Buscar ingrediente…"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                    />
                </div>
            ) : null}

            <div className="pantry-grid">
                {filtered.map((p) => {
                    const d = daysLeft(p.expiryDate);
                    const urgent = d !== null && d <= 2;
                    const total = p.unitPrice != null ? p.quantity * p.unitPrice : null;
                    return (
                        <div key={p.id} className={`card pantry-item ${urgent ? "urgent" : ""}`}>
                            <div className="pantry-name">{p.ingredientName}</div>
                            <div className="pantry-qty">
                                {fmtQty(p.quantity)} {p.unit}
                                {p.grams != null && p.unit !== "g" ? (
                                    <span className="pantry-grams"> ≈ {fmtQty(p.grams)} g</span>
                                ) : null}
                            </div>
                            {!hidePrices && total != null ? (
                                <div className="pantry-price">
                                    <span>
                                        {fmtCurrency(p.unitPrice ?? 0)}/{p.unit}
                                    </span>
                                    <strong>{fmtCurrency(total)}</strong>
                                </div>
                            ) : null}
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
                                <div className="pantry-item-actions">
                                    <button className="icon-btn" title="Editar / añadir" onClick={() => setEditItem(p)}>
                                        ✏️
                                    </button>
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
                                                    onError: (err) =>
                                                        toast(`Error: ${(err as Error).message}`, "error"),
                                                });
                                            }
                                        }}
                                    >
                                        ✕
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })}
                {filtered.length === 0 ? (
                    <p className="muted">
                        {items.length === 0
                            ? "La despensa está vacía. Añade ingredientes."
                            : `Sin resultados para "${query}".`}
                    </p>
                ) : null}
            </div>

            {editItem ? (
                <PantryEditModal
                    item={editItem}
                    catalog={catalog.data}
                    onSave={saveEdit}
                    onClose={() => setEditItem(null)}
                />
            ) : null}
        </div>
    );
}
