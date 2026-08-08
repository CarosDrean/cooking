import { useMemo, useState } from "react";
import { fmtQty } from "../lib/format";
import { useModalClose } from "../lib/useModalClose";
import type { CatalogIngredient, PantryItem } from "../types";
import { normalizeText } from "../types";

const DEFAULT_UNITS = [
    "g",
    "kg",
    "ml",
    "l",
    "cucharadas",
    "cucharaditas",
    "puñados",
    "unidades",
    "bolsas",
    "cajas",
    "botellas",
    "frascos",
    "latas",
    "paquetes",
    "docenas",
];

export default function PantryEditModal({
    item,
    catalog,
    onSave,
    onClose,
}: {
    item: PantryItem;
    catalog: CatalogIngredient[] | undefined;
    onSave: (body: Partial<Omit<PantryItem, "unitPrice">> & { unitPrice?: number | null }) => void;
    onClose: () => void;
}) {
    const [name, setName] = useState(item.ingredientName);
    const [addMore, setAddMore] = useState(true);
    const [quantity, setQuantity] = useState("");
    const [unit, setUnit] = useState(item.unit);
    const [price, setPrice] = useState(item.unitPrice != null ? String(item.unitPrice) : "");
    const [expiry, setExpiry] = useState(item.expiryDate ?? "");

    const matched = useMemo(() => catalog?.find((i) => normalizeText(i.name) === normalizeText(name)), [catalog, name]);

    const unitOptions = useMemo(() => {
        const base = matched ? matched.units : DEFAULT_UNITS;
        return base.includes(unit) ? base : [...base, unit];
    }, [matched, unit]);

    const toggleAddMore = (next: boolean) => {
        setAddMore(next);
        if (!next && !quantity.trim()) setQuantity(String(item.quantity));
    };

    const qtyToSave = addMore
        ? Math.round((item.quantity + (parseFloat(quantity) || 0)) * 1000) / 1000
        : Math.max(0, parseFloat(quantity) || 0);

    useModalClose(onClose);

    const save = () => {
        if (!name.trim()) return;
        onSave({
            ingredientName: name.trim(),
            quantity: qtyToSave,
            unit,
            unitPrice: price.trim() ? parseFloat(price) : null,
            expiryDate: expiry || undefined,
        });
    };

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
                <div className="modal-head">
                    <h3>Editar ingrediente</h3>
                    <button className="icon-btn" onClick={onClose} aria-label="Cerrar">
                        ✕
                    </button>
                </div>

                <label className="field">
                    <span>Ingrediente</span>
                    <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
                </label>

                <label className="check-label">
                    <input type="checkbox" checked={addMore} onChange={(e) => toggleAddMore(e.target.checked)} />
                    Sumar a lo que tengo ({fmtQty(item.quantity)} {item.unit})
                </label>

                <div className="edit-row">
                    <label className="field">
                        <span>{addMore ? "Añadir" : "Nueva cantidad"}</span>
                        <input
                            className="input input-num"
                            type="number"
                            min="0"
                            step="any"
                            placeholder={addMore ? `sumar a ${fmtQty(item.quantity)}` : "cantidad"}
                            value={quantity}
                            onChange={(e) => setQuantity(e.target.value)}
                            autoFocus
                        />
                    </label>
                    <label className="field">
                        <span>Medida</span>
                        <select className="input input-unit" value={unit} onChange={(e) => setUnit(e.target.value)}>
                            {unitOptions.map((u) => (
                                <option key={u} value={u}>
                                    {u}
                                </option>
                            ))}
                        </select>
                    </label>
                </div>

                <label className="field">
                    <span>S/ por und.</span>
                    <input
                        className="input input-num"
                        type="number"
                        min="0"
                        step="any"
                        placeholder="precio"
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                    />
                </label>

                <label className="field">
                    <span>Vence</span>
                    <input className="input" type="date" value={expiry} onChange={(e) => setExpiry(e.target.value)} />
                </label>

                {addMore && (parseFloat(quantity) || 0) > 0 ? (
                    <p className="muted">
                        Quedará:{" "}
                        <strong>
                            {fmtQty(qtyToSave)} {unit}
                        </strong>
                    </p>
                ) : null}

                <div className="modal-actions">
                    <button className="btn" onClick={onClose}>
                        Cancelar
                    </button>
                    <button className="btn primary" onClick={save}>
                        Guardar
                    </button>
                </div>
            </div>
        </div>
    );
}
