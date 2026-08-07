import type { AppState, MealType, Profile, Recipe, Season } from "../types.js";
import { availability, normalizeText } from "../types.js";
import { isDietCompatible, isForbidden, restrictedCount } from "./diet.js";
import type { ImportQuery, ImportRecipeCandidate } from "./importTypes.js";

const TRANSLATIONS: Record<string, string> = {
    desayuno: "breakfast",
    almuerzo: "lunch",
    cena: "dinner",
    pollo: "chicken",
    pescado: "fish",
    carne: "meat",
    verduras: "vegetables",
    ensalada: "salad",
    sopa: "soup",
    arroz: "rice",
    pasta: "pasta",
};

const DIET_QUERY_TERMS: Record<string, string[]> = {
    "sin-gluten": ["gluten free", "gluten-free"],
    "sin-lactosa": ["vegan", "dairy free", "dairy-free"],
    vegetariano: ["vegetarian"],
    vegano: ["vegan"],
    keto: ["keto"],
    "alta-proteina": ["chicken", "high protein"],
};

function translate(term: string): string {
    return TRANSLATIONS[term.toLowerCase()] ?? term;
}

export function buildQueries(profile: Profile, _season: Season, _country: string): ImportQuery[] {
    const queries: ImportQuery[] = [];
    const meals = profile.mealsPerDay.length > 0 ? profile.mealsPerDay : (["almuerzo", "cena"] as MealType[]);

    for (const meal of meals) {
        const mealEn = translate(meal);

        queries.push({ terms: mealEn, meal, source: "themealdb", lang: "en" });
        queries.push({ terms: mealEn, meal, source: "spoonacular", lang: "en" });

        const dishes = profile.usualDishes[meal] ?? [];
        for (const dish of dishes) {
            const words = dish
                .split(/\s+/)
                .filter((w) => w.length > 2)
                .slice(0, 3);
            const term = words.join(" ").trim();
            if (!term) continue;

            queries.push({ terms: term, meal, source: "local", lang: "es" });
            queries.push({ terms: term, meal, source: "ai", lang: "es" });
        }
    }

    for (const diet of profile.dietPreferences) {
        const terms = DIET_QUERY_TERMS[diet] ?? [diet];
        for (const dietTerm of terms) {
            queries.push({ terms: dietTerm, meal: "almuerzo", source: "themealdb", lang: "en" });
            queries.push({ terms: dietTerm, meal: "almuerzo", source: "spoonacular", lang: "en" });
        }
    }

    if (queries.length === 0) {
        queries.push({ terms: "chicken", meal: "almuerzo", source: "themealdb", lang: "en" });
    }

    return queries;
}

export function scoreRecipe(
    recipe: Recipe,
    query: ImportQuery,
    state: AppState,
    profile: Profile,
    season: Season,
): { score: number; reasons: string[] } {
    let score = 0;
    const reasons: string[] = [];

    if (!isDietCompatible(recipe, profile)) {
        return { score: -100, reasons: ["No compatible con la dieta del perfil"] };
    }
    if (isForbidden(recipe, profile)) {
        return { score: -100, reasons: ["Contiene ingredientes restringidos"] };
    }

    const limited = restrictedCount(recipe, profile);
    if (limited > 0) {
        score -= limited * 3;
        reasons.push(`${limited} ingrediente(s) con restricción "poco"`);
    }

    if (recipe.suitableFor.includes(query.meal)) {
        score += 3;
        reasons.push(`Apta para ${query.meal}`);
    } else {
        score -= 2;
    }

    const avail = availability(recipe, season, state.location.country);
    score += avail.score * 2;
    if (avail.score > 1) reasons.push(avail.label);

    const feedback = profile.suggestionFeedback[recipe.id];
    if (feedback?.hide) return { score: -200, reasons: ["Ocultada por el usuario"] };
    if (feedback?.weight) {
        score *= feedback.weight;
        if (feedback.weight !== 1) reasons.push(`Peso de feedback: x${feedback.weight}`);
    }

    const queryWords = query.terms.toLowerCase().split(/\s+/).filter(Boolean);
    const recipeText =
        `${recipe.title} ${recipe.description} ${recipe.ingredients.map((i) => i.name).join(" ")}`.toLowerCase();
    let matchCount = 0;
    for (const w of queryWords) {
        if (recipeText.includes(w)) matchCount++;
    }
    score += matchCount * 1.5;
    if (matchCount >= 2) reasons.push(`Coincide con ${matchCount} términos de búsqueda`);

    if (recipe.cuisine) {
        const nc = normalizeText(state.location.country);
        const rc = normalizeText(recipe.cuisine);
        if (rc.includes(nc) || nc.includes(rc)) {
            score += 1.5;
            reasons.push(`Cocina local (${recipe.cuisine})`);
        }
    }

    const profileRating = profile.ratingByRecipe[recipe.id];
    if (profileRating) {
        score += profileRating * 0.5;
        if (profileRating >= 4) reasons.push("Bien valorada por ti");
    }

    if (profile.favoriteRecipeIds.includes(recipe.id)) {
        score += 2;
        reasons.push("En tus favoritos");
    }

    score += Math.random() * 0.4;
    return { score: Math.round(score * 100) / 100, reasons };
}

export function pantriesBonus(
    recipe: Recipe,
    state: AppState,
    pantryBonus: boolean,
): { score: number; reason: string } | null {
    if (!pantryBonus) return null;
    const pantry = state.pantry;
    if (pantry.length === 0) return null;

    let matched = 0;
    for (const ing of recipe.ingredients) {
        const ni = normalizeText(ing.name);
        const found = pantry.some(
            (p) => normalizeText(p.ingredientName).includes(ni) || ni.includes(normalizeText(p.ingredientName)),
        );
        if (found) matched++;
    }

    if (matched === 0) return null;
    const ratio = matched / recipe.ingredients.length;
    const bonus = ratio >= 0.8 ? 3 : ratio >= 0.5 ? 2 : 1;
    return { score: bonus, reason: `${matched}/${recipe.ingredients.length} ingredientes en tu despensa` };
}

function titleSimilarity(a: string, b: string): number {
    const na = normalizeText(a);
    const nb = normalizeText(b);
    const wordsA = new Set(na.split(/\s+/));
    const wordsB = nb.split(/\s+/);
    let match = 0;
    for (const w of wordsB) {
        if (wordsA.has(w)) match++;
    }
    const maxLen = Math.max(wordsA.size, wordsB.length);
    if (maxLen === 0) return 0;
    return match / maxLen;
}

function ingredientOverlap(a: Recipe, b: Recipe): number {
    const namesA = new Set(a.ingredients.map((i) => normalizeText(i.name)));
    const namesB = b.ingredients.map((i) => normalizeText(i.name));
    let match = 0;
    for (const name of namesB) {
        if (namesA.has(normalizeText(name))) match++;
    }
    const maxLen = Math.max(namesA.size, namesB.length);
    if (maxLen === 0) return 0;
    return match / maxLen;
}

export function deduplicateResults(
    candidates: ImportRecipeCandidate[],
    existingRecipes: Recipe[],
): ImportRecipeCandidate[] {
    const seen = new Set<string>();
    const result: ImportRecipeCandidate[] = [];

    for (const c of candidates) {
        if (seen.has(c.recipe.id)) continue;
        const existing = existingRecipes.find((r) => r.id === c.recipe.id);
        if (existing) continue;

        let isDuplicate = false;
        for (const kept of result) {
            const tSim = titleSimilarity(c.recipe.title, kept.recipe.title);
            const iSim = ingredientOverlap(c.recipe, kept.recipe);
            if (tSim >= 0.75 || (tSim >= 0.5 && iSim >= 0.7)) {
                isDuplicate = true;
                if (c.score > kept.score) {
                    const idx = result.indexOf(kept);
                    if (idx !== -1) result[idx] = c;
                }
                break;
            }
        }
        for (const ex of existingRecipes) {
            const tSim = titleSimilarity(c.recipe.title, ex.title);
            const iSim = ingredientOverlap(c.recipe, ex);
            if (tSim >= 0.75 || (tSim >= 0.5 && iSim >= 0.7)) {
                isDuplicate = true;
                break;
            }
        }

        if (!isDuplicate) {
            seen.add(c.recipe.id);
            result.push(c);
        }
    }

    return result;
}
