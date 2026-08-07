import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { Drink, DrinkKind, IngredientCategory, MealType, Recipe } from "../types.js";
import type { DrinkImportAdapter, ImportAdapter, ImportQuery } from "./importTypes.js";
import { mapMealToRecipe } from "./themealdb.js";

/* ---------- TheMealDB adapter ---------- */

async function fetchMealDb(path: string): Promise<unknown[] | null> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    try {
        const res = await fetch(`https://www.themealdb.com/api/json/v1/1${path}`, { signal: controller.signal });
        if (!res.ok) return null;
        const data = (await res.json()) as { meals: unknown[] | null };
        return data.meals;
    } catch {
        return null;
    } finally {
        clearTimeout(timer);
    }
}

export const mealDbAdapter: ImportAdapter = {
    source: "themealdb",
    async search(query, limit) {
        const meals = await fetchMealDb(`/search.php?s=${encodeURIComponent(query.terms)}`);
        if (!meals) return [];
        const mapped = (meals as Array<Record<string, string>>).map((m) => mapMealToRecipe(m as never));
        const results: Recipe[] = [];
        for (const r of mapped) {
            r.suitableFor = inferSuitableFor(r.title, query.meal);
            results.push(r);
            if (results.length >= limit) break;
        }
        return results;
    },
};

/* ---------- TheCocktailDB adapter (drinks) ---------- */

interface CtbDrink {
    idDrink: string;
    strDrink: string;
    strCategory?: string;
    strAlcoholic?: string;
    strGlass?: string;
    strDrinkThumb?: string;
}

async function fetchCocktailDb(path: string): Promise<CtbDrink[] | null> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    try {
        const res = await fetch(`https://www.thecocktaildb.com/api/json/v1/1${path}`, { signal: controller.signal });
        if (!res.ok) return null;
        const data = (await res.json()) as { drinks: CtbDrink[] | null };
        return data.drinks;
    } catch {
        return null;
    } finally {
        clearTimeout(timer);
    }
}

const DRINK_EMOJI_MAP: Record<string, string> = {
    coffee: "☕",
    tea: "🍵",
    chocolate: "🍫",
    cocoa: "🍫",
    juice: "🧃",
    lemonade: "🍋",
    smoothie: "🥤",
    shake: "🥤",
    milk: "🥛",
    punch: "🍹",
    cocktail: "🍸",
    soda: "🥤",
    water: "💧",
};

function guessDrinkEmoji(name: string, category: string): string {
    const text = `${name} ${category}`.toLowerCase();
    for (const [key, emoji] of Object.entries(DRINK_EMOJI_MAP)) {
        if (text.includes(key)) return emoji;
    }
    return "🥤";
}

function guessDrinkKind(category: string): DrinkKind {
    const c = category.toLowerCase();
    if (c.includes("coffee") || c.includes("tea") || c.includes("cocoa")) return "bebida";
    if (c.includes("juice") || c.includes("smoothie") || c.includes("shake")) return "jugo";
    if (c.includes("punch") || c.includes("cocktail")) return "refresco";
    return "refresco";
}

function inferDrinkSuitableFor(name: string, category: string): MealType[] {
    const text = `${name} ${category}`.toLowerCase();
    const meals: MealType[] = [];
    if (/coffee|tea|cocoa|chocolate|milk|latte|capuccino|espresso|cafe/.test(text)) {
        meals.push("desayuno");
    }
    if (/juice|lemonade|smoothie|shake|batido|jugo|zumo/.test(text)) {
        meals.push("desayuno", "almuerzo", "cena");
    }
    if (/punch|soda|cola|refresco|sparkling|fizz/.test(text)) {
        meals.push("almuerzo", "cena");
    }
    if (meals.length === 0) {
        meals.push("almuerzo", "cena");
    }
    return meals;
}

function mapCocktailToDrink(drink: CtbDrink): Drink {
    const category = drink.strCategory ?? "";
    return {
        id: `ctdb-${drink.idDrink}`,
        name: drink.strDrink,
        emoji: guessDrinkEmoji(drink.strDrink, category),
        kind: guessDrinkKind(category),
        suitableFor: inferDrinkSuitableFor(drink.strDrink, category),
    };
}

export const cocktailDbAdapter: DrinkImportAdapter = {
    source: "cocktaildb",
    async search(query, limit) {
        const drinks = await fetchCocktailDb(`/search.php?s=${encodeURIComponent(query.terms)}`);
        if (!drinks) return [];
        const mapped = drinks.map(mapCocktailToDrink);
        return mapped.slice(0, limit);
    },
};

/* ---------- Local catalog adapter ---------- */

const recipesFile = fileURLToPath(new URL("../../data/recipes.json", import.meta.url));

let catalogCache: Recipe[] | null = null;

async function loadCatalog(): Promise<Recipe[]> {
    if (catalogCache) return catalogCache;
    try {
        const raw = readFileSync(recipesFile, "utf8");
        const recipes = JSON.parse(raw) as Array<Partial<Recipe>>;
        catalogCache = recipes.map((r, i) => ({
            ...r,
            id: r.id ?? `local-catalog-${i}`,
            source: "local" as const,
            emoji: r.emoji ?? "🍽️",
            diets: r.diets ?? [],
            suitableFor: r.suitableFor?.length ? r.suitableFor : ["almuerzo", "cena"],
            prepMinutes: r.prepMinutes ?? 15,
            cookMinutes: r.cookMinutes ?? 30,
            servings: r.servings ?? 4,
            ingredients: r.ingredients ?? [],
            steps: r.steps ?? [],
            tips: r.tips ?? [],
            nutrition: r.nutrition ?? { kcal: 0, protein: 0, carbs: 0, fat: 0 },
            description: r.description ?? "",
        })) as Recipe[];
        return catalogCache;
    } catch {
        catalogCache = [];
        return [];
    }
}

export const localCatalogAdapter: ImportAdapter = {
    source: "local",
    async search(query, limit) {
        const catalog = await loadCatalog();
        const terms = query.terms.toLowerCase().split(/\s+/).filter(Boolean);
        if (terms.length === 0) return [];
        const scored = catalog
            .filter((r) => {
                if (query.meal && !r.suitableFor.includes(query.meal)) return false;
                return true;
            })
            .map((r) => {
                let score = 0;
                const text = `${r.title} ${r.description} ${r.ingredients.map((i) => i.name).join(" ")}`.toLowerCase();
                for (const t of terms) {
                    if (text.includes(t)) score += 1;
                    if (r.title.toLowerCase().includes(t)) score += 2;
                }
                return { recipe: r, score };
            })
            .filter((s) => s.score > 0)
            .sort((a, b) => b.score - a.score)
            .slice(0, limit);
        return scored.map((s) => s.recipe);
    },
};

/* ---------- Spoonacular adapter ---------- */

interface SpoonacularRecipe {
    id: number;
    title: string;
    image?: string;
    imageType?: string;
    servings?: number;
    readyInMinutes?: number;
    cuisines?: string[];
    diets?: string[];
    dishTypes?: string[];
}

interface SpoonacularResult {
    results: SpoonacularRecipe[];
    totalResults: number;
}

function mapSpoonacularDiets(spDiets: string[]): string[] {
    const mapping: Record<string, string> = {
        "gluten free": "sin-gluten",
        "dairy free": "sin-lactosa",
        vegan: "vegano",
        vegetarian: "vegetariano",
        "lacto ovo vegetarian": "vegetariano",
        ketogenic: "keto",
    };
    return spDiets.map((d) => mapping[d.toLowerCase()] ?? d).filter(Boolean);
}

function mapSpoonacularMeal(meal: string): MealType {
    const m = meal.toLowerCase();
    if (m.includes("breakfast") || m.includes("desayuno")) return "desayuno";
    if (m.includes("dinner") || m.includes("cena") || m.includes("main course") || m.includes("plato principal"))
        return "cena";
    if (m.includes("lunch") || m.includes("almuerzo")) return "almuerzo";
    return "almuerzo";
}

function mapSpoonacularToRecipe(item: SpoonacularRecipe): Recipe {
    return {
        id: `sp-${item.id}`,
        title: item.title,
        description: "",
        emoji: "🍽️",
        image: item.image,
        source: "spoonacular",
        diets: mapSpoonacularDiets(item.diets ?? []),
        cuisine: item.cuisines?.[0]?.toLowerCase() ?? "internacional",
        suitableFor: item.dishTypes?.map(mapSpoonacularMeal) ?? ["almuerzo", "cena"],
        prepMinutes: Math.ceil((item.readyInMinutes ?? 30) / 3),
        cookMinutes: Math.floor(((item.readyInMinutes ?? 30) * 2) / 3),
        servings: item.servings ?? 4,
        ingredients: [],
        steps: [],
        tips: [],
        nutrition: { kcal: 0, protein: 0, carbs: 0, fat: 0 },
    };
}

function spoonacularCategorize(name: string): IngredientCategory {
    const n = name.toLowerCase();
    if (/chicken|beef|pork|lamb|fish|salmon|shrimp|egg|huevo|meat|tofu|tempeh/.test(n)) return "proteinas";
    if (/cheese|milk|cream|butter|yogurt|leche|queso|crema|mantequilla/.test(n)) return "lacteos";
    if (/onion|garlic|tomato|pepper|broccoli|carrot|spinach|celery|lettuce|potato/.test(n)) return "verduras";
    if (/lemon|apple|banana|orange|berry|mango|strawberry|fruit/.test(n)) return "frutas";
    if (/rice|pasta|flour|bread|quinoa|oat|bean|lentil|corn|wheat/.test(n)) return "granos";
    if (/salt|pepper|oregano|thyme|rosemary|curry|cumin|cinnamon|paprika|vinegar|oil|sugar/.test(n))
        return "condimentos";
    return "otros";
}

export async function searchSpoonacular(
    terms: string,
    meal: MealType,
    apiKey: string,
    limit: number,
): Promise<Recipe[]> {
    if (!apiKey) return [];
    const mealMapping: Record<MealType, string> = {
        desayuno: "breakfast",
        almuerzo: "lunch",
        cena: "dinner",
    };
    const params = new URLSearchParams({
        query: terms,
        apiKey,
        number: String(limit),
        addRecipeInformation: "true",
        type: mealMapping[meal] ?? "lunch",
    });
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    try {
        const res = await fetch(`https://api.spoonacular.com/recipes/complexSearch?${params}`, {
            signal: controller.signal,
        });
        if (!res.ok) return [];
        const data = (await res.json()) as SpoonacularResult;
        const recipes: Recipe[] = [];
        for (const item of data.results) {
            const recipe = mapSpoonacularToRecipe(item);
            if (item.readyInMinutes) {
                recipe.prepMinutes = Math.ceil(item.readyInMinutes / 3);
                recipe.cookMinutes = Math.floor((item.readyInMinutes * 2) / 3);
            }
            recipes.push(recipe);
        }
        return recipes;
    } catch {
        return [];
    } finally {
        clearTimeout(timer);
    }
}

/* ---------- OpenAI adapter (AI generation) ---------- */

interface AIProviderConfig {
    provider: "openai" | "anthropic" | "gemini" | "ollama";
    apiKey?: string;
    model?: string;
    baseUrl?: string;
}

async function callOpenAI(prompt: string, config: AIProviderConfig): Promise<Recipe | null> {
    const key = config.apiKey || process.env.OPENAI_API_KEY;
    if (!key) return null;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 30000);
    try {
        const res = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
            body: JSON.stringify({
                model: config.model ?? "gpt-4o-mini",
                messages: [
                    {
                        role: "system",
                        content:
                            "Eres un chef experto. Responde SOLO con JSON válido, sin markdown ni texto adicional.",
                    },
                    { role: "user", content: prompt },
                ],
                temperature: 0.8,
                max_tokens: 2048,
            }),
            signal: controller.signal,
        });
        if (!res.ok) return null;
        const data = (await res.json()) as {
            choices: Array<{ message: { content: string } }>;
        };
        const text = data.choices?.[0]?.message?.content?.trim() ?? "";
        return parseAiRecipeJson(text);
    } catch {
        return null;
    } finally {
        clearTimeout(timer);
    }
}

async function callAnthropic(prompt: string, config: AIProviderConfig): Promise<Recipe | null> {
    const key = config.apiKey || process.env.ANTHROPIC_API_KEY;
    if (!key) return null;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 30000);
    try {
        const res = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-api-key": key,
                "anthropic-version": "2023-06-01",
            },
            body: JSON.stringify({
                model: config.model ?? "claude-3-haiku-20240307",
                max_tokens: 2048,
                messages: [
                    {
                        role: "user",
                        content: `Eres un chef experto. Responde SOLO con JSON válido, sin markdown ni texto adicional.\n\n${prompt}`,
                    },
                ],
            }),
            signal: controller.signal,
        });
        if (!res.ok) return null;
        const data = (await res.json()) as {
            content: Array<{ text: string }>;
        };
        const text = data.content?.[0]?.text?.trim() ?? "";
        return parseAiRecipeJson(text);
    } catch {
        return null;
    } finally {
        clearTimeout(timer);
    }
}

async function callGemini(prompt: string, config: AIProviderConfig): Promise<Recipe | null> {
    const key = config.apiKey || process.env.GOOGLE_API_KEY;
    if (!key) return null;
    const model = config.model ?? "gemini-2.0-flash";
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 30000);
    try {
        const res = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [
                        {
                            parts: [
                                {
                                    text: "Eres un chef experto. Responde SOLO con JSON válido, sin markdown ni texto adicional.",
                                },
                                { text: prompt },
                            ],
                        },
                    ],
                    generationConfig: { temperature: 0.8, maxOutputTokens: 2048 },
                }),
                signal: controller.signal,
            },
        );
        if (!res.ok) return null;
        const data = (await res.json()) as {
            candidates: Array<{ content: { parts: Array<{ text: string }> } }>;
        };
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";
        return parseAiRecipeJson(text);
    } catch {
        return null;
    } finally {
        clearTimeout(timer);
    }
}

async function callOllama(prompt: string, config: AIProviderConfig): Promise<Recipe | null> {
    const host = config.baseUrl || process.env.OLLAMA_HOST || "http://localhost:11434";
    const model = config.model ?? "llama3";
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 60000);
    try {
        const res = await fetch(`${host}/api/chat`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                model,
                messages: [
                    {
                        role: "system",
                        content:
                            "Eres un chef experto. Responde SOLO con JSON válido, sin markdown ni texto adicional.",
                    },
                    { role: "user", content: prompt },
                ],
                stream: false,
                options: { temperature: 0.8 },
            }),
            signal: controller.signal,
        });
        if (!res.ok) return null;
        const data = (await res.json()) as { message?: { content?: string } };
        const text = data.message?.content?.trim() ?? "";
        return parseAiRecipeJson(text);
    } catch {
        return null;
    } finally {
        clearTimeout(timer);
    }
}

function parseAiRecipeJson(text: string): Recipe | null {
    let cleaned = text;
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) cleaned = jsonMatch[0];
    try {
        const parsed = JSON.parse(cleaned) as {
            title?: string;
            description?: string;
            emoji?: string;
            cuisine?: string;
            suitableFor?: string[];
            prepMinutes?: number;
            cookMinutes?: number;
            servings?: number;
            ingredients?: Array<{ name: string; quantity: number; unit: string }>;
            steps?: Array<{ text: string; tip?: string }>;
            tips?: string[];
            diets?: string[];
        };

        if (!parsed.title || !Array.isArray(parsed.ingredients) || parsed.ingredients.length === 0) {
            return null;
        }

        const recipe: Recipe = {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
            title: parsed.title,
            description: parsed.description ?? "",
            emoji: parsed.emoji ?? "🍽️",
            source: "ai",
            diets: parsed.diets ?? [],
            cuisine: parsed.cuisine,
            suitableFor: (parsed.suitableFor?.filter((s) => ["desayuno", "almuerzo", "cena"].includes(s)) ?? [
                "almuerzo",
                "cena",
            ]) as MealType[],
            prepMinutes: Math.max(0, parsed.prepMinutes ?? 15),
            cookMinutes: Math.max(0, parsed.cookMinutes ?? 30),
            servings: Math.max(1, parsed.servings ?? 4),
            ingredients: parsed.ingredients.map((i) => ({
                name: i.name,
                quantity: i.quantity ?? 1,
                unit: i.unit ?? "unidades",
                category: spoonacularCategorize(i.name),
            })),
            steps: (parsed.steps ?? []).map((s) => ({
                text: s.text,
                tip: s.tip,
            })),
            tips: parsed.tips ?? [],
            nutrition: { kcal: 0, protein: 0, carbs: 0, fat: 0 },
        };

        return recipe;
    } catch {
        return null;
    }
}

export async function generateAiRecipe(
    query: ImportQuery,
    profileDescription: string,
    config: AIProviderConfig,
): Promise<Recipe | null> {
    const dietInfo = profileDescription ? `Perfil del usuario: ${profileDescription}\n` : "";
    const prompt = `${dietInfo}Crea una receta de ${query.meal === "desayuno" ? "desayuno" : query.meal === "almuerzo" ? "almuerzo" : "cena"} usando: ${query.terms}. El JSON debe tener este formato exacto:
{
  "title": "Nombre del plato",
  "description": "Breve descripción (1-2 frases)",
  "emoji": "🍲",
  "cuisine": "peruana",
  "suitableFor": ["almuerzo"],
  "prepMinutes": 10,
  "cookMinutes": 20,
  "servings": 4,
  "diets": ["sin-gluten"],
  "ingredients": [{"name": "papa", "quantity": 3, "unit": "unidades"}, {"name": "aceite", "quantity": 2, "unit": "cucharadas"}],
  "steps": [{"text": "Pelar y cortar las papas"}],
  "tips": ["Usar papas amarillas para mejor textura"]
}
Coloca los valores correctos según la receta. Incluye de 3-8 ingredientes y 3-6 pasos. Responde SOLO con el JSON.`;

    switch (config.provider) {
        case "openai":
            return callOpenAI(prompt, config);
        case "anthropic":
            return callAnthropic(prompt, config);
        case "gemini":
            return callGemini(prompt, config);
        case "ollama":
            return callOllama(prompt, config);
        default:
            return null;
    }
}

/* ---------- Helpers ---------- */

function inferSuitableFor(title: string, meal: MealType): MealType[] {
    const t = title.toLowerCase();
    const breakfastWords = [
        "breakfast",
        "desayuno",
        "pancake",
        "omelette",
        "toast",
        "cereal",
        "oatmeal",
        "avena",
        "huevo",
        "eggs",
        "pan",
        "tostada",
        "coffee",
        "cafe",
        "café",
        "muffin",
        "batido",
        "smoothie",
    ];
    const dinnerWords = ["soup", "sopa", "cazuela", "sancocho", "guiso", "stew", "estofado", "casserole"];

    const meals = new Set<MealType>();
    meals.add(meal);

    if (breakfastWords.some((w) => t.includes(w))) meals.add("desayuno");
    if (dinnerWords.some((w) => t.includes(w))) meals.add("cena");

    const result = [...meals];
    if (result.length === 1) {
        if (result[0] === "almuerzo") result.push("cena");
        if (result[0] === "cena") result.push("almuerzo");
    }
    return result;
}
