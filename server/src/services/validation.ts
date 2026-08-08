/**
 * Valida que un valor desconocido sea un número finito mayor o igual al mínimo.
 * Devuelve el número o null si no es válido.
 *
 * Maneja NaN, Infinity, -Infinity, strings no numéricas ("abc" → NaN → null).
 */
export function parsePositiveNumber(val: unknown, min: number): number | null {
    const n = typeof val === "number" ? val : Number(val);
    if (!Number.isFinite(n) || n < min) return null;
    return n;
}
