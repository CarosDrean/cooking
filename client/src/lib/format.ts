export function fmtQty(n: number): string {
    if (!Number.isFinite(n)) return "0";
    const rounded = Math.round(n * 100) / 100;
    return rounded.toLocaleString("es-ES", { maximumFractionDigits: 2 });
}

export function toISODate(d: Date): string {
    return d.toISOString().slice(0, 10);
}

export function startOfWeek(d: Date): string {
    const date = new Date(d);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    date.setDate(diff);
    return toISODate(date);
}

export function addDays(iso: string, days: number): string {
    const d = new Date(iso);
    d.setDate(d.getDate() + days);
    return toISODate(d);
}

export function dateLabel(iso: string): string {
    const d = new Date(`${iso}T12:00:00`);
    return d.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" });
}

export function shortDateLabel(iso: string): string {
    const d = new Date(`${iso}T12:00:00`);
    return d.toLocaleDateString("es-ES", { day: "numeric", month: "short" });
}

export function weekdayOf(iso: string): string {
    const d = new Date(`${iso}T12:00:00`);
    return d.toLocaleDateString("es-ES", { weekday: "long" });
}

const DAY_KEYS = ["domingo", "lunes", "martes", "miercoles", "jueves", "viernes", "sabado"] as const;

export function dayKeyOf(iso: string): (typeof DAY_KEYS)[number] {
    const d = new Date(`${iso}T12:00:00`);
    return DAY_KEYS[d.getDay()];
}

export function totalMinutes(r: { prepMinutes: number; cookMinutes: number }): number {
    return r.prepMinutes + r.cookMinutes;
}
