import type { AppState, PurchaseLogEntry } from "../types.js";
import { normalizeText } from "../types.js";

export type SpendingPeriod = "week" | "month" | "year";

export const PERIOD_LABELS: Record<SpendingPeriod, string> = {
    week: "Semana",
    month: "Mes",
    year: "Año",
};

export interface SpendingReport {
    period: SpendingPeriod;
    periodLabel: string;
    startDate: string;
    endDate: string;
    spentTotal: number;
    consumedTotal: number;
    purchaseCount: number;
    byIngredient: { name: string; total: number }[];
    byCategory: { category: string; total: number }[];
    trend: { label: string; total: number }[];
    movements: PurchaseLogEntry[];
}

function toISODate(d: Date): string {
    return d.toISOString().slice(0, 10);
}

function startOfPeriod(period: SpendingPeriod): { start: string; end: string } {
    const now = new Date();
    const end = toISODate(now);
    if (period === "week") {
        const start = new Date(now);
        start.setDate(start.getDate() - 6);
        return { start: toISODate(start), end };
    }
    if (period === "month") {
        const start = new Date(now);
        start.setDate(start.getDate() - 29);
        return { start: toISODate(start), end };
    }
    const start = new Date(now);
    start.setMonth(start.getMonth() - 11);
    start.setDate(1);
    return { start: toISODate(start), end };
}

const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

function trendBuckets(period: SpendingPeriod): { key: string; label: string }[] {
    const now = new Date();
    if (period === "year") {
        const buckets: { key: string; label: string }[] = [];
        for (let i = 11; i >= 0; i--) {
            const d = new Date(now);
            d.setMonth(d.getMonth() - i);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
            buckets.push({ key, label: MONTHS[d.getMonth()] });
        }
        return buckets;
    }
    const days = period === "week" ? 7 : 30;
    const buckets: { key: string; label: string }[] = [];
    for (let i = days - 1; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        if (period === "week") {
            buckets.push({
                key: toISODate(d),
                label: d.toLocaleDateString("es-ES", { weekday: "short" }).replace(".", ""),
            });
        } else {
            buckets.push({ key: toISODate(d), label: String(d.getDate()) });
        }
    }
    return buckets;
}

function sumBy<T>(entries: PurchaseLogEntry[], keyOf: (e: PurchaseLogEntry) => T): { key: T; total: number }[] {
    const map = new Map<string, { key: T; total: number }>();
    for (const e of entries) {
        const key = keyOf(e);
        const norm = typeof key === "string" ? normalizeText(key) : String(key);
        const bucket = map.get(norm) ?? { key, total: 0 };
        bucket.total += e.total;
        map.set(norm, bucket);
    }
    return [...map.values()].sort((a, b) => b.total - a.total);
}

export function buildSpendingReport(state: AppState, period: SpendingPeriod): SpendingReport {
    const { start, end } = startOfPeriod(period);
    const profileId = state.activeProfileId;

    const inRange = (date: string) => date >= start && date <= end;
    const mine = state.purchaseLog.filter((e) => e.profileId === profileId && inRange(e.date));
    const purchases = mine.filter((e) => e.kind === "compra");
    const consumed = mine.filter((e) => e.kind === "consumo");

    const spentTotal = Math.round(purchases.reduce((s, e) => s + e.total, 0) * 100) / 100;
    const consumedTotal = Math.round(consumed.reduce((s, e) => s + e.total, 0) * 100) / 100;

    const buckets = trendBuckets(period);
    const trend = buckets.map((b) => {
        let total = 0;
        for (const e of purchases) {
            const inBucket = period === "year" ? e.date.slice(0, 7) === b.key : e.date === b.key;
            if (inBucket) total += e.total;
        }
        return { label: b.label, total: Math.round(total * 100) / 100 };
    });

    const byIngredient = sumBy(purchases, (e) => e.ingredientName).map((b) => ({ name: b.key, total: b.total }));
    const byCategory = sumBy(purchases, (e) => e.category ?? "otros").map((b) => ({ category: b.key, total: b.total }));

    const movements = [...mine].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 40);

    return {
        period,
        periodLabel: PERIOD_LABELS[period],
        startDate: start,
        endDate: end,
        spentTotal,
        consumedTotal,
        purchaseCount: purchases.length,
        byIngredient,
        byCategory,
        trend,
        movements,
    };
}

/** Appends a purchase/consumption movement with a fresh id and today's date. */
export function logMovement(state: AppState, entry: Omit<PurchaseLogEntry, "id" | "date">): void {
    state.purchaseLog.push({
        ...entry,
        id: crypto.randomUUID(),
        date: new Date().toISOString().slice(0, 10),
    });
}
