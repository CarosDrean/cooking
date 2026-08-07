import type { AppState, Recipe } from "../types.js";
import { isDietCompatible, isForbidden } from "./diet.js";
import { buildQueries, deduplicateResults, pantriesBonus, scoreRecipe } from "./importScoring.js";
import {
    cocktailDbAdapter,
    generateAiRecipe,
    localCatalogAdapter,
    mealDbAdapter,
    searchSpoonacular,
} from "./importSources.js";
import type {
    ImportConfig,
    ImportDrinkCandidate,
    ImportQuery,
    ImportRecipeCandidate,
    ImportResult,
} from "./importTypes.js";
import { currentSeason } from "./location.js";

const DRINK_QUERIES: ImportQuery[] = [
    { terms: "coffee", meal: "desayuno", source: "cocktaildb", lang: "en" },
    { terms: "juice", meal: "desayuno", source: "cocktaildb", lang: "en" },
    { terms: "tea", meal: "desayuno", source: "cocktaildb", lang: "en" },
    { terms: "lemonade", meal: "almuerzo", source: "cocktaildb", lang: "en" },
    { terms: "punch", meal: "almuerzo", source: "cocktaildb", lang: "en" },
    { terms: "smoothie", meal: "desayuno", source: "cocktaildb", lang: "en" },
    { terms: "chocolate", meal: "desayuno", source: "cocktaildb", lang: "en" },
    { terms: "cocktail", meal: "cena", source: "cocktaildb", lang: "en" },
];

function unique<T>(items: T[], keyFn: (item: T) => string): T[] {
    const seen = new Set<string>();
    return items.filter((item) => {
        const key = keyFn(item);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

function getAiConfig(): {
    provider: "openai" | "anthropic" | "gemini" | "ollama";
    apiKey?: string;
    model?: string;
    baseUrl?: string;
} | null {
    if (process.env.OPENAI_API_KEY) {
        return { provider: "openai", apiKey: process.env.OPENAI_API_KEY, model: process.env.OPENAI_MODEL };
    }
    if (process.env.ANTHROPIC_API_KEY) {
        return { provider: "anthropic", apiKey: process.env.ANTHROPIC_API_KEY, model: process.env.ANTHROPIC_MODEL };
    }
    if (process.env.GOOGLE_API_KEY) {
        return { provider: "gemini", apiKey: process.env.GOOGLE_API_KEY, model: process.env.GOOGLE_MODEL };
    }
    const ollamaHost = process.env.OLLAMA_HOST || "http://localhost:11434";
    return { provider: "ollama", baseUrl: ollamaHost, model: process.env.OLLAMA_MODEL ?? "llama3" };
}

async function tryOllama(host: string): Promise<boolean> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3000);
    try {
        const res = await fetch(`${host}/api/tags`, { signal: controller.signal });
        return res.ok;
    } catch {
        return false;
    } finally {
        clearTimeout(timer);
    }
}

function profileDescription(profile: AppState["profiles"][number], season: string): string {
    const parts: string[] = [];
    if (profile.dietPreferences.length > 0) {
        parts.push(`Dietas: ${profile.dietPreferences.join(", ")}`);
    }
    if (profile.restrictions.length > 0) {
        parts.push(`Restricciones: ${profile.restrictions.map((r) => `${r.name} (${r.level})`).join(", ")}`);
    }
    const dishes = Object.entries(profile.usualDishes)
        .filter(([, v]) => v.length > 0)
        .map(([meal, dishes]) => `${meal}: ${dishes.join(", ")}`);
    if (dishes.length > 0) parts.push(`Platos habituales: ${dishes.join("; ")}`);
    parts.push(`Temporada: ${season}`);
    parts.push(`Comidas al día: ${profile.mealsPerDay.join(", ")}`);
    return parts.join(". ");
}

export async function runImport(state: AppState, config: ImportConfig): Promise<ImportResult> {
    const profile = state.profiles.find((p) => p.id === state.activeProfileId) ?? state.profiles[0];
    if (!profile) {
        return { recipes: [], drinks: [], importedRecipeCount: 0, importedDrinkCount: 0 };
    }

    const season = currentSeason(new Date(), state.location.country);
    const queries = buildQueries(profile, season, state.location.country);

    const enabledSources = new Set(config.sources);
    const filteredQueries = queries.filter((q) => enabledSources.has(q.source));

    const adapterLimit = Math.ceil(config.maxResults * 1.5);

    const recipeCandidates: ImportRecipeCandidate[] = [];
    const seenQueries = new Set<string>();

    const adapterResults = await Promise.allSettled(
        filteredQueries.map(async (query) => {
            const qKey = `${query.source}:${query.terms}:${query.meal}`;
            if (seenQueries.has(qKey)) return [];
            seenQueries.add(qKey);

            if (query.source === "themealdb") {
                return mealDbAdapter.search(query, adapterLimit);
            }
            if (query.source === "local") {
                return localCatalogAdapter.search(query, adapterLimit);
            }
            if (query.source === "spoonacular") {
                const key = process.env.SPOONACULAR_API_KEY;
                if (!key) return [];
                return searchSpoonacular(query.terms, query.meal, key, adapterLimit);
            }
            if (query.source === "ai") {
                const aiConfig = getAiConfig();
                if (!aiConfig) return [];
                if (aiConfig.provider === "ollama") {
                    const host = aiConfig.baseUrl ?? process.env.OLLAMA_HOST ?? "http://localhost:11434";
                    const available = await tryOllama(host);
                    if (!available) return [];
                }
                const desc = profileDescription(profile, season);
                const recipe = await generateAiRecipe(query, desc, aiConfig);
                return recipe ? [recipe] : [];
            }
            return [];
        }),
    );

    for (const result of adapterResults) {
        if (result.status === "fulfilled") {
            for (const recipe of result.value) {
                const { score, reasons } = scoreRecipe(
                    recipe,
                    filteredQueries.find(
                        (q) => recipe.title.toLowerCase().includes(q.terms.toLowerCase()) || q.meal === "almuerzo",
                    ) ?? filteredQueries[0],
                    state,
                    profile,
                    season,
                );
                const matchQuery =
                    filteredQueries.find((q) => recipe.title.toLowerCase().includes(q.terms.toLowerCase())) ??
                    filteredQueries[0];
                const sourceMap: Record<string, import("./importTypes.js").ImportSource> = {
                    themealdb: "themealdb",
                    spoonacular: "spoonacular",
                    ai: "ai",
                    local: "local",
                    cocktaildb: "cocktaildb",
                };
                recipeCandidates.push({
                    recipe,
                    score,
                    reasons,
                    source: sourceMap[recipe.source] ?? "local",
                    matchedMeal: matchQuery?.meal ?? "almuerzo",
                    matchedQuery: matchQuery?.terms ?? "",
                });
            }
        }
    }

    const scored = recipeCandidates
        .filter((c) => {
            return isDietCompatible(c.recipe, profile) && !isForbidden(c.recipe, profile);
        })
        .filter((c) => c.score > -50)
        .sort((a, b) => b.score - a.score);

    const deduped = deduplicateResults(scored, state.recipes);

    const topCandidates = deduped.slice(0, config.maxResults);

    for (const c of topCandidates) {
        const pantryInfo = pantriesBonus(c.recipe, state, config.pantryBonus);
        if (pantryInfo) {
            c.score += pantryInfo.score;
            c.reasons.push(pantryInfo.reason);
        }
    }

    topCandidates.sort((a, b) => b.score - a.score);

    const importedRecipes: Recipe[] = [];
    for (const c of topCandidates) {
        if (state.recipes.some((r) => r.id === c.recipe.id)) continue;
        state.recipes.push(c.recipe);
        importedRecipes.push(c.recipe);
    }

    const drinkCandidates: ImportDrinkCandidate[] = [];
    if (enabledSources.has("cocktaildb")) {
        const drinkResults = await Promise.allSettled(
            DRINK_QUERIES.filter((q) => q.source === "cocktaildb").map(async (query) => {
                return cocktailDbAdapter.search(query, 5);
            }),
        );

        for (const result of drinkResults) {
            if (result.status === "fulfilled") {
                for (const drink of result.value) {
                    if (state.drinks.some((d) => d.id === drink.id)) continue;
                    const hasSuitable = drink.suitableFor.some((m) => profile.mealsPerDay.includes(m));
                    const score = hasSuitable ? 3 : 1;
                    drinkCandidates.push({
                        drink,
                        score,
                        reasons: hasSuitable ? ["Apta para tus comidas"] : ["Bebida importada"],
                        source: "cocktaildb",
                    });
                }
            }
        }

        const uniqueDrinks = unique(drinkCandidates, (d) => d.drink.name.toLowerCase());
        uniqueDrinks.sort((a, b) => b.score - a.score);

        const topDrinks = uniqueDrinks.slice(0, 8);
        for (const d of topDrinks) {
            if (state.drinks.some((ex) => ex.name === d.drink.name)) continue;
            state.drinks.push(d.drink);
        }
    }

    const result: ImportResult = {
        recipes: topCandidates.slice(0, config.maxResults),
        drinks: drinkCandidates,
        importedRecipeCount: importedRecipes.length,
        importedDrinkCount: drinkCandidates.filter((d) => state.drinks.some((ed) => ed.id === d.drink.id)).length,
    };

    return result;
}
