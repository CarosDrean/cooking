import type { IngredientCategory, Recipe, RecipeStep } from "../types.js";

const BASE = "https://www.themealdb.com/api/json/v1/1";

interface TmbMeal {
    idMeal: string;
    strMeal: string;
    strMealThumb?: string;
    strInstructions?: string;
    strCategory?: string;
    strArea?: string;
    [key: string]: string | undefined;
}

const MEAT_WORDS = [
    "pollo",
    "chicken",
    "beef",
    "res",
    "cerdo",
    "pork",
    "cordero",
    "lamb",
    "pescado",
    "fish",
    "salmon",
    "tuna",
    "atun",
    "camaron",
    "shrimp",
    "sardine",
    "sardina",
    "bacon",
    "chorizo",
    "salchicha",
    "sausage",
    "pavo",
    "turkey",
    "ham",
    "jamon",
    "meat",
    "calamares",
    "squid",
    "mussel",
    "mejillón",
    "cod",
    "bacalao",
    "mackerel",
    "caballa",
    "anchovy",
    "anchoa",
];

const DAIRY_WORDS = [
    "queso",
    "cheese",
    "leche",
    "milk",
    "yogur",
    "yogurt",
    "mantequilla",
    "butter",
    "crema",
    "cream",
    "feta",
    "parmesano",
    "mozzarella",
    "mozarela",
];

const VEGAN_WORDS = ["honey", "miel", "gelatina", "gelatin"];

function guessDiet(ingredients: string[]): string[] {
    const joined = ingredients.join(" ").toLowerCase();
    const hasMeat = MEAT_WORDS.some((w) => joined.includes(w));
    const hasDairy = DAIRY_WORDS.some((w) => joined.includes(w));
    const hasEgg = /egg|huevo/.test(joined);
    const hasAnimal = hasMeat || hasDairy || hasEgg || VEGAN_WORDS.some((w) => joined.includes(w));

    const diets: string[] = [];
    if (!hasAnimal) diets.push("vegano", "vegetariano", "sin-lactosa");
    else if (!hasMeat) diets.push("vegetariano");
    if (!hasDairy) diets.push("sin-lactosa");
    return diets;
}

function categorize(name: string): IngredientCategory {
    const n = name.toLowerCase();
    const meatOrFish = MEAT_WORDS.some((w) => n.includes(w)) || /^chicken|pork|beef|lamb|fish/.test(n);
    if (meatOrFish || n.includes("egg") || n.includes("huevo")) return "proteinas";
    if (DAIRY_WORDS.some((w) => n.includes(w))) return "lacteos";
    if (
        /(onion|cebolla|garlic|ajo|pepper|pimiento|tomato|tomate|spinach|espinaca|broccoli|brócoli|potato|papa|carrot|zanahoria|lettuce|lechuga|avocado|aguacate)/.test(
            n,
        )
    )
        return "verduras";
    if (
        /(lemon|limón|limon|apple|manzana|banana|plátano|platano|orange|naranja|berry|fruto|mango|strawberry|fresa|fruit)/.test(
            n,
        )
    )
        return "frutas";
    if (
        /(rice|arroz|pasta|spaghetti|espaguetis|noodle|fideo|flour|harina|bread|pan|quinoa|oat|avena|bean|frijol|chickpea|garbanzo|lentil|lenteja|tortilla|maiz|maíz|corn)/.test(
            n,
        )
    )
        return "granos";
    if (
        /(salt|sal|pepper|pimienta|oregano|orégano|thyme|tomillo|rosemary|romero|curry|cumin|comino|cinnamon|canela|paprika|pimentón|vanilla|vainilla|soy|soja|vinegar|vinagre)/.test(
            n,
        )
    )
        return "condimentos";
    if (/(oil|aceite|sugar|azúcar|azucar|stock|caldo|broth|water|agua|honey|miel|butter)/.test(n)) return "despensa";
    return "otros";
}

function splitSteps(instructions: string): RecipeStep[] {
    const parts = instructions
        .split(/(?:\r?\n)+|\.\s+|\n/)
        .map((p) => p.trim())
        .filter((p) => p.length > 0);
    return parts.map((text) => ({ text }));
}

export function mapMealToRecipe(meal: TmbMeal): Recipe {
    const ingredients: Recipe["ingredients"] = [];
    for (let i = 1; i <= 20; i++) {
        const name = meal[`strIngredient${i}`]?.trim();
        const measure = meal[`strMeasure${i}`]?.trim();
        if (!name || name.length === 0) continue;
        const parsed = parseMeasure(measure ?? "");
        ingredients.push({
            name: capitalize(name),
            quantity: parsed.quantity,
            unit: parsed.unit,
            category: categorize(name),
        });
    }

    const diets = guessDiet(ingredients.map((i) => i.name));

    return {
        id: `tmdb-${meal.idMeal}`,
        title: meal.strMeal ?? "Receta sin título",
        description: `Receta de ${meal.strArea ?? "cocina internacional"} (categoría: ${meal.strCategory ?? "general"}). Importada de TheMealDB.`,
        emoji: "🍽️",
        image: meal.strMealThumb,
        source: "themealdb",
        diets,
        cuisine: (meal.strArea ?? "internacional").toLowerCase(),
        suitableFor: ["almuerzo", "cena"],
        prepMinutes: 15,
        cookMinutes: 30,
        servings: 4,
        ingredients,
        steps: meal.strInstructions ? splitSteps(meal.strInstructions) : [],
        tips: [],
        nutrition: { kcal: 0, protein: 0, carbs: 0, fat: 0 },
    };
}

function parseMeasure(measure: string): { quantity: number; unit: string } {
    const match = measure.match(/^([\d\s.,½⅓⅔¼¾/+-]+)\s*(.*)$/);
    if (!match) return { quantity: 1, unit: measure || "unidades" };
    const raw = match[1].trim();
    const unit = (match[2] || "unidades").trim();
    const qty = parseFraction(raw);
    if (Number.isFinite(qty) && qty > 0) return { quantity: qty, unit };
    return { quantity: 1, unit: measure };
}

function parseFraction(raw: string): number {
    const fractions: Record<string, number> = { "½": 0.5, "⅓": 1 / 3, "⅔": 2 / 3, "¼": 0.25, "¾": 0.75 };
    let value = 0;
    let s = raw;
    for (const [k, v] of Object.entries(fractions)) {
        if (s.includes(k)) {
            value += v;
            s = s.replace(k, " ").trim();
        }
    }
    const parts = s.split("/");
    if (parts.length === 2) {
        const a = Number.parseFloat(parts[0]);
        const b = Number.parseFloat(parts[1]);
        if (b > 0) value += a / b;
        return Math.round(value * 100) / 100;
    }
    const n = Number.parseFloat(s);
    if (Number.isFinite(n)) value += n;
    return Math.round(value * 100) / 100;
}

function capitalize(s: string): string {
    return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

async function fetchJson(path: string): Promise<TmbMeal[] | null> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    try {
        const res = await fetch(`${BASE}${path}`, { signal: controller.signal });
        if (!res.ok) return null;
        const data = (await res.json()) as { meals: TmbMeal[] | null };
        return data.meals;
    } catch {
        return null;
    } finally {
        clearTimeout(timer);
    }
}

export async function searchMealDb(query: string): Promise<Recipe[]> {
    const meals = await fetchJson(`/search.php?s=${encodeURIComponent(query)}`);
    if (!meals) return [];
    return meals.map(mapMealToRecipe);
}

export async function getMealById(id: string): Promise<Recipe | null> {
    const meals = await fetchJson(`/lookup.php?i=${encodeURIComponent(id)}`);
    if (!meals || meals.length === 0) return null;
    return mapMealToRecipe(meals[0]);
}
