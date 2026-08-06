import { useClearShopping, useGenerateShopping, useShopping, useToggleShoppingItem } from "../api/hooks";
import { fmtQty } from "../lib/format";
import { useToast } from "../lib/toast";

const CATEGORY_ORDER = [
    "verduras",
    "frutas",
    "proteinas",
    "lacteos",
    "granos",
    "condimentos",
    "despensa",
    "otros",
] as const;

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

export default function ShoppingPage() {
    const shopping = useShopping();
    const generate = useGenerateShopping();
    const toggle = useToggleShoppingItem();
    const clear = useClearShopping();
    const toast = useToast();

    const list = shopping.data;
    const items = list?.items ?? [];

    const grouped = new Map<string, typeof items>([]);
    for (const item of items) {
        const cat = item.category;
        const bucket = grouped.get(cat) ?? [];
        bucket.push(item);
        grouped.set(cat, bucket);
    }
    const categories = [...grouped.entries()].sort(
        (a, b) =>
            CATEGORY_ORDER.indexOf(a[0] as (typeof CATEGORY_ORDER)[number]) -
            CATEGORY_ORDER.indexOf(b[0] as (typeof CATEGORY_ORDER)[number]),
    );

    const total = items.reduce((s, i) => s + i.toBuy, 0) ?? 0;
    const checked = items.filter((i) => i.checked).length ?? 0;

    const onGenerate = () => {
        generate.mutate(undefined, {
            onSuccess: () => toast("Lista generada a partir del plan y la despensa ✓"),
            onError: (err) => toast(`Error: ${(err as Error).message}`),
        });
    };

    if (!list || list.items.length === 0) {
        return (
            <div className="page">
                <div className="page-head">
                    <div>
                        <h1>Lista de la compra</h1>
                        <p className="muted">Se genera a partir de tu plan semanal y tu despensa.</p>
                    </div>
                </div>
                <div className="empty-state card">
                    <p>No hay lista todavía.</p>
                    <button className="btn primary" onClick={onGenerate}>
                        🛒 Generar lista
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="page">
            <div className="page-head">
                <div>
                    <h1>Lista de la compra</h1>
                    <p className="muted">
                        {checked}/{list.items.length} marcados · {fmtQty(total)} items por comprar
                    </p>
                </div>
                <div className="page-actions">
                    <button className="btn" onClick={onGenerate}>
                        🎲 Regenerar
                    </button>
                    <button
                        className="btn ghost"
                        onClick={() => {
                            if (window.confirm("¿Borrar la lista?")) {
                                clear.mutate(undefined, { onSuccess: () => toast("Lista borrada") });
                            }
                        }}
                    >
                        🗑 Vaciar
                    </button>
                </div>
            </div>

            {list.items.some((i) => i.toBuy <= 0) ? (
                <p className="muted">Los items en verde ya los tienes en la despensa.</p>
            ) : null}

            {categories.map(([cat, items]) => (
                <section key={cat} className="card">
                    <h2>{CATEGORY_LABELS[cat] ?? cat}</h2>
                    <ul className="shopping-list">
                        {items.map((item) => {
                            const already = item.inPantry >= item.needed;
                            return (
                                <li key={item.name}>
                                    <label
                                        className={`shopping-item ${item.checked ? "checked" : ""} ${already ? "have" : ""}`}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={item.checked}
                                            onChange={(e) =>
                                                toggle.mutate({ name: item.name, checked: e.target.checked })
                                            }
                                        />
                                        <span className="shopping-name">{item.name}</span>
                                        <span className="shopping-qty">
                                            {item.toBuy > 0 ? `${fmtQty(item.toBuy)} ${item.unit}` : "ya en despensa"}
                                        </span>
                                    </label>
                                </li>
                            );
                        })}
                    </ul>
                </section>
            ))}
        </div>
    );
}
