import type { AppState, MealLogEntry } from "@cooking/shared";

export function entriesForProfile(state: AppState, profileId: string): MealLogEntry[] {
    return state.history.filter((h) => h.profileId === profileId);
}

/** Days since the recipe was last eaten by the profile (Infinity if never). */
export function lastEatenDays(state: AppState, profileId: string, recipeId: string): number {
    const entries = entriesForProfile(state, profileId).filter((h) => h.recipeId === recipeId);
    if (entries.length === 0) return Infinity;
    const today = startOfDay(Date.now());
    let min = Infinity;
    for (const e of entries) {
        const diff = Math.floor((today - Date.parse(e.date)) / 86400000);
        if (diff < min) min = diff;
    }
    return Math.max(0, min);
}

export function timesEaten(state: AppState, profileId: string, recipeId: string): number {
    return entriesForProfile(state, profileId).filter((h) => h.recipeId === recipeId).length;
}

export function averageRating(state: AppState, profileId: string, recipeId: string): number | undefined {
    const ratings = entriesForProfile(state, profileId)
        .filter((h) => h.recipeId === recipeId && h.rating != null)
        .map((h) => h.rating as number);
    if (ratings.length === 0) return undefined;
    return ratings.reduce((a, b) => a + b, 0) / ratings.length;
}

function startOfDay(ts: number): number {
    const d = new Date(ts);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
}

export function countDaysSince(date: string): number {
    const today = startOfDay(Date.now());
    return Math.max(0, Math.floor((today - Date.parse(date)) / 86400000));
}
