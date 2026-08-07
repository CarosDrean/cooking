import type { Season } from "@cooking/shared";
import { availability, isLocalRecipe, normalizeText, type SeasonFit, seasonFit } from "@cooking/shared";

export type { SeasonFit };
export { availability, isLocalRecipe, seasonFit };

const SOUTHERN = [
    "peru",
    "argentina",
    "chile",
    "bolivia",
    "paraguay",
    "uruguay",
    "brasil",
    "ecuador",
    "colombia",
    "venezuela",
    "guatemala",
    "panama",
    "costa rica",
    "nicaragua",
    "honduras",
    "el salvador",
    "cuba",
    "republica dominicana",
    "mexico",
    "australia",
    "nueva zelanda",
];

export function isSouthernHemisphere(country: string): boolean {
    const c = normalizeText(country);
    return SOUTHERN.some((name) => c.includes(name));
}

/** Month-based season for a date and country (uses the southern hemisphere by default). */
export function currentSeason(date: Date, country: string): Season {
    const month = date.getMonth() + 1; // 1-12
    if (isSouthernHemisphere(country)) {
        if (month >= 12 || month <= 2) return "verano";
        if (month <= 5) return "otonio";
        if (month <= 8) return "invierno";
        return "primavera";
    }
    if (month >= 12 || month <= 2) return "invierno";
    if (month <= 5) return "primavera";
    if (month <= 8) return "verano";
    return "otonio";
}
