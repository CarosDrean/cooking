import { useCallback, useRef, useState } from "react";
import type { MealType, Recipe } from "../types";
import { MEALS } from "../types";

interface SpeechRecognitionResultLike {
    0: { transcript: string };
    isFinal: boolean;
}

interface SpeechRecognitionLike {
    lang: string;
    interimResults: boolean;
    continuous: boolean;
    start: () => void;
    stop: () => void;
    onresult: ((event: { results: SpeechRecognitionResultLike[] }) => void) | null;
    onerror: ((event: { error?: string }) => void) | null;
    onend: (() => void) | null;
}

declare global {
    interface Window {
        SpeechRecognition?: new () => SpeechRecognitionLike;
        webkitSpeechRecognition?: new () => SpeechRecognitionLike;
    }
}

export interface ParsedSpokenIngredient {
    ingredientName: string;
    quantity?: number;
    unit?: string;
    unitPrice?: number;
    raw: string;
}

const NUMBER_WORDS: Record<string, number> = {
    un: 1,
    uno: 1,
    una: 1,
    medio: 0.5,
    media: 0.5,
    dos: 2,
    tres: 3,
    cuatro: 4,
    cinco: 5,
    seis: 6,
    siete: 7,
    ocho: 8,
    nueve: 9,
    diez: 10,
    once: 11,
    doce: 12,
    trece: 13,
    catorce: 14,
    quince: 15,
    veinte: 20,
    treinta: 30,
    cuarenta: 40,
    cincuenta: 50,
    sesenta: 60,
    setenta: 70,
    ochenta: 80,
    noventa: 90,
    cien: 100,
    ciento: 100,
};

const UNITS: Record<string, string> = {
    kilo: "kg",
    kilos: "kg",
    kilogramo: "kg",
    kilogramos: "kg",
    gramo: "g",
    gramos: "g",
    litro: "l",
    litros: "l",
    mililitro: "ml",
    mililitros: "ml",
    taza: "tazas",
    tazas: "tazas",
    cucharada: "cucharadas",
    cucharadas: "cucharadas",
    cucharadita: "cucharaditas",
    cucharaditas: "cucharaditas",
    docena: "docenas",
    docenas: "docenas",
    unidad: "unidades",
    unidades: "unidades",
    puñado: "puñados",
    puñados: "puñados",
    diente: "dientes",
    dientes: "dientes",
    paquete: "paquetes",
    paquetes: "paquetes",
    lata: "latas",
    latas: "latas",
    bolsa: "bolsas",
    bolsas: "bolsas",
    caja: "cajas",
    cajas: "cajas",
    botella: "botellas",
    botellas: "botellas",
    frasco: "frascos",
    frascos: "frascos",
    atado: "atados",
    atados: "atados",
    barra: "barras",
    barras: "barras",
    cabeza: "cabezas",
    cabezas: "cabezas",
    manojo: "manojos",
    manojos: "manojos",
    rebanada: "rebanadas",
    rebanadas: "rebanadas",
    hoja: "hojas",
    hojas: "hojas",
};

/** Símbolos de unidades (teclado/escrito) que no son palabras. */
const UNIT_SYMBOLS: Record<string, string> = {
    kg: "kg",
    gr: "g",
    grs: "g",
    g: "g",
    l: "l",
    lt: "l",
    ml: "ml",
};

/** Resuelve una palabra o símbolo a la unidad canónica (undefined si no es unidad). */
function canonicalUnit(word: string): string | undefined {
    const w = normalize(word);
    return UNIT_SYMBOLS[w] ?? UNITS[w];
}

/** Fracciones habladas tras "y" dentro de una cantidad, p. ej. "un kilo y medio". */
const FRACTIONS: Record<string, number> = {
    medio: 0.5,
    media: 0.5,
    cuarto: 0.25,
    cuarta: 0.25,
    "tres cuartos": 0.75,
    "tres cuartas": 0.75,
};

/**
 * Extrae del inicio de un texto el prefijo cantidad+unidad (+ fracción "y medio").
 * No modifica el texto si no hay unidad reconocida.
 */
function parseQuantityPrefix(text: string): { quantity?: number; unit?: string; rest: string } {
    let t = text;
    let quantity: number | undefined;
    const leadingNum = t.match(/^\d+(?:[.,]\d+)?/);
    const leadingWord = t.match(/^[a-zñ]+/);
    const leading = leadingNum?.[0] || leadingWord?.[0] || "";
    if (leading) {
        const value = tokenNumber(leading);
        if (value != null) {
            quantity = value;
            t = t.slice(leading.length).trim();
        }
    }
    let unit: string | undefined;
    const firstWord = t.match(/^[a-zñáéíóú]+/);
    if (firstWord) {
        const canonical = canonicalUnit(firstWord[0]);
        if (canonical) {
            unit = canonical;
            t = t.slice(firstWord[0].length).trim();
        }
    }
    const fracMatch = t.match(/^y\s+(medio|media|cuarto|cuarta|tres\s+cuartos|tres\s+cuartas)(?:\s+|$)/);
    if (fracMatch) {
        const frac = FRACTIONS[fracMatch[1]];
        if (frac != null) {
            quantity = (quantity ?? 1) + frac;
            t = t.slice(fracMatch[0].length).trim();
        }
    }
    // Fracción tras un sustantivo contable sin unidad: "un pollo y medio".
    if (!unit && quantity != null) {
        const nounFrac = t.match(
            /^([a-zñ]+)\s+y\s+(medio|media|cuarto|cuarta|tres\s+cuartos|tres\s+cuartas)(?:\s+(.*))?$/,
        );
        if (nounFrac) {
            const frac = FRACTIONS[nounFrac[2]];
            if (frac != null) {
                quantity = (quantity ?? 1) + frac;
                const rest = nounFrac[3]?.trim() ?? "";
                t = rest ? `${nounFrac[1]} ${rest}` : nounFrac[1];
            }
        }
    }
    return { quantity, unit, rest: t };
}

/**
 * Parsea un nombre escrito con cantidad+unidad al inicio, p. ej.
 * "5 kg de arroz", "un kilo de arroz", "2 latas de leche", "kilo y medio de pollo".
 */
export function parseTypedIngredient(text: string): { name: string; quantity: number; unit: string } | null {
    const t = normalize(text);
    const { quantity, unit, rest } = parseQuantityPrefix(t);
    if (!unit) return null;
    const name = rest.replace(/^(?:de|del)\s+/, "").trim();
    if (!name) return null;
    return { name, quantity: quantity ?? 1, unit };
}

/** Frases iniciales típicas de dictado que se ignoran al parsear. */
const FILLERS = [
    "compre",
    "compremos",
    "compramos",
    "compra",
    "comprar",
    "compré",
    "compro",
    "comprado",
    "agrega",
    "agrego",
    "agregar",
    "añade",
    "añado",
    "añadir",
    "tengo",
    "tenemos",
    "hay",
    "necesito",
    "quiero",
    "conseguí",
    "consegui",
    "falta",
    "me falta",
    "faltan",
    "adicional",
    "por favor",
    "agregue",
    "anota",
    "he",
    "me",
    "yo",
    "a",
    "por",
    "para",
];

function normalize(text: string): string {
    return text
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[.,;!¿?()"'«»]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function tokenNumber(token: string): number | undefined {
    const numeric = token.replace(",", ".");
    if (/^\d+(\.\d+)?$/.test(numeric)) return Number.parseFloat(numeric);
    return NUMBER_WORDS[token];
}

/** Elimina rellenos ("compré", "por favor", "a", "para"…) del inicio y del final. */
function stripFillerEdges(text: string): string {
    let changed = true;
    while (changed) {
        changed = false;
        for (const filler of FILLERS) {
            const f = normalize(filler);
            if (!f) continue;
            if (text === f) {
                text = "";
                changed = true;
            } else if (text.startsWith(`${f} `)) {
                text = text.slice(f.length).trim();
                changed = true;
            } else if (text.endsWith(` ${f}`)) {
                text = text.slice(0, -(f.length + 1)).trim();
                changed = true;
            }
        }
    }
    return text;
}

/**
 * Busca el patrón "cantidad + unidad + de + ingrediente" en cualquier posición,
 * para transcripciones reales con relleno ("he comprado 2 bolsas de sal",
 * "me faltan dos bolsas de sal", "quiero 2 bolsas de sal").
 */
function parseQuantityUnitAnywhere(text: string): { quantity: number; unit: string; name: string } | null {
    const m = text.match(/(?:^|\s)([a-z0-9.,]+|[a-zñ]+)\s+([a-zñ]+)\s+(?:de|del)\s+([a-zñ][a-zñ0-9\s]*)$/);
    if (!m) return null;
    const quantity = tokenNumber(m[1]);
    const unit = canonicalUnit(m[2]);
    if (quantity == null || unit == null) return null;
    const name = m[3].trim();
    if (!name) return null;
    return { quantity, unit, name };
}

/**
 * Convierte frases dictadas como "compré un kilo de arroz" o "1 sol de huevo"
 * en cantidad, unidad, precio e ingrediente. Soporta unidades contables
 * ("2 bolsas de sal"), rellenos en cualquier posición ("compré 2 bolsas de sal
 * por favor") y fracciones al final ("2 bolsas de sal y media").
 */
export function parseSpokenIngredient(raw: string): ParsedSpokenIngredient {
    let text = stripFillerEdges(normalize(raw));
    let unitPrice: number | undefined;

    // Precio: "N sol(es)" o "N céntimo(s)/centavo(s)" en cualquier parte de la frase
    // (p. ej. "50 céntimos de culantro", "2 soles de canela").
    const priceMatch = text.match(/(?:^|\s)([a-z0-9.,]+)\s+(sol(?:es)?|centimos?|centavos?)(?=\s|$)/);
    if (priceMatch) {
        const value = tokenNumber(priceMatch[1]);
        if (value != null) {
            // "50 céntimos" = medio sol (0.50).
            unitPrice = priceMatch[2].startsWith("cen") ? Math.round((value / 100) * 100) / 100 : value;
        }
        text = text.replace(priceMatch[0], " ").replace(/\s+/g, " ").trim();
        // Relleno que pueda quedar junto al precio ("... por favor a 3 soles").
        text = stripFillerEdges(text);
        // Fracción después del precio: "2 soles y medio de canela".
        const priceFrac = text.match(/^y\s+(medio|media|cuarto|cuarta|tres\s+cuartos|tres\s+cuartas)\s+/);
        if (priceFrac && unitPrice != null) {
            unitPrice += FRACTIONS[priceFrac[1]] ?? 0;
            text = text.slice(priceFrac[0].length).trim();
        }
    }

    // Cantidad, unidad y fracción ("y medio") al inicio.
    let { quantity, unit, rest } = parseQuantityPrefix(text);

    let name: string;
    if (quantity != null && unit != null) {
        // Patrón canónico al inicio: "2 bolsas de sal".
        name = rest.replace(/^(?:de|del|un|una|unos|unas)\s+/, "").trim();
    } else if (quantity == null) {
        // Sin cantidad al inicio: buscar el patrón en cualquier posición.
        const anywhere = parseQuantityUnitAnywhere(text);
        if (anywhere) {
            quantity = anywhere.quantity;
            unit = anywhere.unit;
            name = anywhere.name;
        } else {
            name = rest.replace(/^(?:de|del|un|una|unos|unas)\s+/, "").trim();
        }
    } else {
        name = rest.replace(/^(?:de|del|un|una|unos|unas)\s+/, "").trim();
    }

    // Fracción tras el ingrediente: "2 bolsas de sal y media" → cantidad 2.5.
    const trailing = name.match(/(?:^|\s)y\s+(medio|media|cuarto|cuarta|tres\s+cuartos|tres\s+cuartas)$/);
    if (trailing && quantity != null) {
        const frac = FRACTIONS[trailing[1]];
        if (frac != null) {
            quantity = (quantity ?? 1) + frac;
            name = name.slice(0, trailing.index ?? name.length).trim();
        }
    }

    // Si se dictó una cantidad sin unidad ("un pollo"), es un conteo por unidad.
    const resolvedUnit = unit ?? (quantity != null ? "unidades" : undefined);

    return {
        ingredientName: name,
        quantity,
        unit: resolvedUnit,
        unitPrice,
        raw,
    };
}

export function isSpeechSupported(): boolean {
    return typeof window !== "undefined" && Boolean(window.SpeechRecognition ?? window.webkitSpeechRecognition);
}

export interface SpokenMealHabit {
    meal: MealType;
    dishes: string[];
}

/** Detecta la comida a la que corresponde cada palabra (ancla del dictado). */
function mealOfWord(word: string): MealType | null {
    if (word.startsWith("desayun")) return "desayuno";
    if (word.startsWith("almuerz") || word.startsWith("almorz")) return "almuerzo";
    if (["comer", "comemos", "comen", "come", "comida", "comidas", "comio", "comieron"].includes(word))
        return "almuerzo";
    if (/^cen(?:a|ar|amos|aba|e|aste|o)?$/.test(word)) return "cena";
    return null;
}

/** Palabras de relleno que se descartan al leer un plato habitual. */
const DISH_STOP_WORDS = new Set([
    "el",
    "la",
    "los",
    "las",
    "un",
    "una",
    "unos",
    "unas",
    "de",
    "del",
    "para",
    "en",
    "con",
    "al",
    "tomo",
    "toma",
    "bebo",
    "bebemos",
    "como",
    "comemos",
    "comer",
    "usualmente",
    "normalmente",
    "siempre",
    "tambien",
    "solo",
    "solamente",
    "me",
    "gusta",
    "hacer",
    "preparar",
    "tomar",
]);

function cleanDishText(words: string[]): string[] {
    const joined = words.join(" ");
    const parts = joined.split(/\s+(?:y|o)\s+/);
    const dishes: string[] = [];
    for (let part of parts) {
        part = part.trim();
        let changed = true;
        while (changed) {
            changed = false;
            for (const stop of DISH_STOP_WORDS) {
                if (part === stop) {
                    part = "";
                    changed = true;
                } else if (part.startsWith(`${stop} `)) {
                    part = part.slice(stop.length + 1).trim();
                    changed = true;
                }
            }
        }
        if (part.length >= 2) dishes.push(part);
    }
    return [...new Set(dishes)];
}

/**
 * Parsea un dictado de hábitos como "desayuno jugo surtido, o avena,
 * almuerzo estofado de lentejas" en pares comida → platos habituales.
 * Conserva también las comidas sin platos ("solo desayuno y cena").
 */
export function parseSpokenMealHabits(text: string): SpokenMealHabit[] {
    const words = normalize(text).split(/\s+/).filter(Boolean);
    const segments: Array<{ meal: MealType; words: string[] }> = [];
    let current: { meal: MealType; words: string[] } | null = null;
    for (const word of words) {
        const meal = mealOfWord(word);
        if (meal) {
            current = { meal, words: [] };
            segments.push(current);
        } else if (current) {
            current.words.push(word);
        }
    }
    const seen = new Set<MealType>();
    const habits: SpokenMealHabit[] = [];
    for (const segment of segments) {
        if (seen.has(segment.meal)) continue;
        seen.add(segment.meal);
        habits.push({ meal: segment.meal, dishes: cleanDishText(segment.words) });
    }
    return habits;
}

export interface DishMatch {
    recipe: Recipe;
    score: number;
    matchedMeals: MealType[];
    matchedWords: string[];
}

/** Palabras demasiado genéricas para buscar coincidencias en recetas. */
const DISH_SKIP_WORDS = new Set(["pollo", "carne", "pescado", "comida", "plato", "comer", "tener", "hacer"]);

/**
 * Puntúa el catálogo de recetas contra los platos habituales del perfil:
 * pesa más el título, luego los ingredientes, luego la descripción; suma
 * bonus si la receta es apta para la comida (desayuno/almuerzo/cena).
 */
export function suggestRecipesForUsualDishes(recipes: Recipe[], usualDishes: Record<MealType, string[]>): DishMatch[] {
    const byMeal: Record<MealType, string[]> = { desayuno: [], almuerzo: [], cena: [] };
    for (const meal of MEALS) {
        for (const dish of usualDishes[meal] ?? []) {
            const tokens = [
                ...new Set(
                    normalize(dish)
                        .split(/\s+/)
                        .filter((w) => w.length >= 3 && !DISH_SKIP_WORDS.has(w)),
                ),
            ];
            byMeal[meal].push(...tokens);
        }
    }
    const results: DishMatch[] = [];
    for (const recipe of recipes) {
        const title = normalize(recipe.title);
        const body = normalize([recipe.description, ...recipe.ingredients.map((i) => i.name)].join(" "));
        let score = 0;
        const matchedWords = new Set<string>();
        const matchedMeals = new Set<MealType>();
        for (const meal of MEALS) {
            for (const token of byMeal[meal]) {
                if (title.includes(token)) {
                    score += 4;
                    matchedWords.add(token);
                    matchedMeals.add(meal);
                } else if (body.includes(token)) {
                    score += 2;
                    matchedWords.add(token);
                    matchedMeals.add(meal);
                }
            }
        }
        if (score === 0) continue;
        if (recipe.suitableFor.some((m) => matchedMeals.has(m))) score += 3;
        results.push({ recipe, score, matchedMeals: [...matchedMeals], matchedWords: [...matchedWords] });
    }
    results.sort((a, b) => b.score - a.score);
    return results.slice(0, 8);
}

export function useVoiceInput() {
    const [supported] = useState(() => isSpeechSupported());
    const [listening, setListening] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const recRef = useRef<SpeechRecognitionLike | null>(null);

    const stop = useCallback(() => {
        recRef.current?.stop();
    }, []);

    const start = useCallback((onResult: (final: string) => void) => {
        setError(null);
        if (!isSpeechSupported()) {
            setError("Tu navegador no soporta dictado por voz.");
            return;
        }
        const SR = window.SpeechRecognition ?? window.webkitSpeechRecognition;
        if (!SR) return;
        const rec = new SR();
        rec.lang = "es-PE";
        rec.interimResults = false;
        rec.continuous = false;

        let finalText = "";
        rec.onresult = (event) => {
            for (const result of event.results) {
                if (result.isFinal) finalText += result[0].transcript;
            }
        };
        rec.onerror = (event) => {
            if (event.error === "not-allowed" || event.error === "service-not-allowed") {
                setError("Sin permiso para usar el micrófono.");
            } else if (event.error === "no-speech") {
                setError("No te escuché, intenta de nuevo.");
            } else if (event.error === "network") {
                setError("Error de red del reconocimiento de voz.");
            } else {
                setError(`Error de voz: ${event.error}`);
            }
        };
        rec.onend = () => {
            setListening(false);
            recRef.current = null;
            if (finalText.trim()) onResult(finalText.trim());
        };

        recRef.current = rec;
        rec.start();
        setListening(true);
    }, []);

    return { supported, listening, error, start, stop };
}
