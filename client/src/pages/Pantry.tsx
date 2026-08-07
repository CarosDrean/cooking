import { useState } from "react";
import { useAddPantry, useDeletePantry, usePantry } from "../api/hooks";
import { useConfirm } from "../lib/confirm";
import { fmtQty, toISODate } from "../lib/format";
import { useToast } from "../lib/toast";

const UNITS = ["g", "kg", "ml", "l", "cucharada", "cucharadita", "puñado", "unidad", "lata", "paquete"];

export default function PantryPage() {
    const pantry = usePantry();
    const addItem = useAddPantry();
    const remove = useDeletePantry();
    const toast = useToast();
    const confirm = useConfirm();

    const [name, setName] = useState("");
    const [qty, setQty] = useState("");
    const [unit, setUnit] = useState("unidad");
    const [expiry, setExpiry] = useState("");

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
                onSuccess: () => {
                    toast(`Añadido: ${name.trim()}`);
                    setName("");
                    setQty("");
                    setExpiry("");
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
                    placeholder="Ingrediente…"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                />
                <input
                    className="input input-num"
                    placeholder="Cant."
                    type="number"
                    min="0"
                    step="any"
                    value={qty}
                    onChange={(e) => setQty(e.target.value)}
                />
                <select className="input" value={unit} onChange={(e) => setUnit(e.target.value)}>
                    {UNITS.map((u) => (
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
