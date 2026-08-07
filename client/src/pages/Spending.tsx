import { useState } from "react";
import { type SpendingPeriod, useSpending } from "../api/hooks";
import { fmtCurrency, fmtQty, shortDateLabel } from "../lib/format";
import type { PurchaseKind } from "../types";

const PERIODS: { value: SpendingPeriod; label: string }[] = [
    { value: "week", label: "Semana" },
    { value: "month", label: "Mes" },
    { value: "year", label: "Año" },
];

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

const KIND_LABELS: Record<PurchaseKind, string> = {
    compra: "🛒 Compra",
    consumo: "🍽 Consumo",
};

const CAT_COLORS = ["#4a7c59", "#c96f4a", "#d9a441", "#5b8db8", "#9b6bb7", "#c46a7f", "#7a9e7e", "#8a6a3f"];

export default function SpendingPage() {
    const [period, setPeriod] = useState<SpendingPeriod>("week");
    const report = useSpending(period);

    const data = report.data;
    const maxIngredient = Math.max(...(data?.byIngredient.map((b) => b.total) ?? [0]));
    const maxTrend = Math.max(...(data?.trend.map((t) => t.total) ?? [0]));
    const catTotal = (data?.byCategory ?? []).reduce((s, c) => s + c.total, 0);
    let acc = 0;
    const segments = (data?.byCategory ?? []).map((c, i) => {
        const from = (acc / (catTotal || 1)) * 360;
        acc += c.total;
        const to = (acc / (catTotal || 1)) * 360;
        return {
            ...c,
            color: CAT_COLORS[i % CAT_COLORS.length],
            from,
            to,
            pct: catTotal ? (c.total / catTotal) * 100 : 0,
        };
    });
    const conic = segments.length
        ? `conic-gradient(${segments.map((s) => `${s.color} ${s.from}deg ${s.to}deg`).join(", ")})`
        : undefined;

    return (
        <div className="page">
            <div className="page-head">
                <div>
                    <h1>Gastos</h1>
                    <p className="muted">
                        {data
                            ? `${data.periodLabel.toLowerCase()} · ${shortDateLabel(data.startDate)} – ${shortDateLabel(data.endDate)}`
                            : "Resumen de gastos de ingredientes"}
                    </p>
                </div>
                <div className="filter-chips">
                    {PERIODS.map((p) => (
                        <button
                            key={p.value}
                            className={`chip ${period === p.value ? "active" : ""}`}
                            onClick={() => setPeriod(p.value)}
                        >
                            {p.label}
                        </button>
                    ))}
                </div>
            </div>

            {!data ? (
                <p className="muted">Cargando reporte…</p>
            ) : (
                <>
                    <div className="stat-grid">
                        <div className="card stat-card">
                            <span className="stat-label">Gastado</span>
                            <strong className="stat-value">{fmtCurrency(data.spentTotal)}</strong>
                            <span className="muted">{data.purchaseCount} compras</span>
                        </div>
                        <div className="card stat-card">
                            <span className="stat-label">Consumido</span>
                            <strong className="stat-value">{fmtCurrency(data.consumedTotal)}</strong>
                            <span className="muted">ingredientes usados</span>
                        </div>
                    </div>

                    <section className="card">
                        <div className="card-head">
                            <h2>Tendencia</h2>
                            <span className="muted">{fmtCurrency(data.spentTotal)} en el período</span>
                        </div>
                        <div className="trend">
                            {data.trend.map((t) => (
                                <div key={t.label} className="trend-col" title={`${t.label}: ${fmtCurrency(t.total)}`}>
                                    <span className="trend-value">{t.total > 0 ? fmtCurrency(t.total) : ""}</span>
                                    <div className="trend-track">
                                        <div
                                            className="trend-bar"
                                            style={{
                                                height: maxTrend
                                                    ? `${Math.max(2, (t.total / maxTrend) * 100)}%`
                                                    : "2px",
                                            }}
                                        />
                                    </div>
                                    <span className="trend-label">{t.label}</span>
                                </div>
                            ))}
                        </div>
                    </section>

                    <div className="grid-2">
                        <section className="card">
                            <div className="card-head">
                                <h2>Por ingrediente</h2>
                            </div>
                            {data.byIngredient.length === 0 ? (
                                <p className="muted">Sin compras con precio en este período.</p>
                            ) : (
                                <div className="bars">
                                    {data.byIngredient.map((b) => (
                                        <div key={b.name} className="bar-row">
                                            <span className="bar-label">{b.name}</span>
                                            <div className="bar-track">
                                                <div
                                                    className="bar-fill"
                                                    style={{
                                                        width: maxIngredient
                                                            ? `${(b.total / maxIngredient) * 100}%`
                                                            : "0%",
                                                    }}
                                                />
                                            </div>
                                            <span className="bar-value">{fmtCurrency(b.total)}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </section>

                        <section className="card">
                            <div className="card-head">
                                <h2>Por categoría</h2>
                                <span className="muted">{fmtCurrency(catTotal)}</span>
                            </div>
                            {data.byCategory.length === 0 ? (
                                <p className="muted">Sin datos en este período.</p>
                            ) : (
                                <div className="donut-wrap">
                                    <div
                                        className="donut"
                                        style={{ background: conic }}
                                        role="img"
                                        aria-label="Distribución del gasto por categoría"
                                    >
                                        <div className="donut-center">
                                            <span className="donut-total">{fmtCurrency(catTotal)}</span>
                                            <span className="muted">total</span>
                                        </div>
                                    </div>
                                    <ul className="donut-legend">
                                        {segments.map((s) => (
                                            <li key={s.category}>
                                                <span className="donut-dot" style={{ background: s.color }} />
                                                <span>{CATEGORY_LABELS[s.category] ?? s.category}</span>
                                                <span className="donut-value">{s.pct.toFixed(0)}%</span>
                                                <span className="donut-amount">{fmtCurrency(s.total)}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </section>
                    </div>

                    <section className="card">
                        <div className="card-head">
                            <h2>Movimientos</h2>
                        </div>
                        {data.movements.length === 0 ? (
                            <p className="muted">
                                Aún no hay movimientos. Añade ingredientes con precio desde la Despensa.
                            </p>
                        ) : (
                            <ul className="history-list">
                                {data.movements.map((m) => (
                                    <li key={m.id} className="card history-row movement-row">
                                        <div className="history-main">
                                            <span className={`meal-chip ${m.kind === "consumo" ? "muted-chip" : ""}`}>
                                                {KIND_LABELS[m.kind]}
                                            </span>
                                            <strong>{m.ingredientName}</strong>
                                            <span className="muted">
                                                {fmtQty(m.quantity)} {m.unit}
                                                {m.unitPrice != null ? ` · ${fmtCurrency(m.unitPrice)}/${m.unit}` : ""}
                                            </span>
                                        </div>
                                        <div className="history-right">
                                            <span className="muted">{shortDateLabel(m.date)}</span>
                                            <strong>{fmtCurrency(m.total)}</strong>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </section>
                </>
            )}
        </div>
    );
}
