import { useCallback, useRef, useState } from "react";

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
];

function normalize(text: string): string {
    return text
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[.,;!¿?]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function tokenNumber(token: string): number | undefined {
    const numeric = token.replace(",", ".");
    if (/^\d+(\.\d+)?$/.test(numeric)) return Number.parseFloat(numeric);
    return NUMBER_WORDS[token];
}

/**
 * Convierte frases dictadas como "compré un kilo de arroz" o "1 sol de huevo"
 * en cantidad, unidad, precio e ingrediente.
 */
export function parseSpokenIngredient(raw: string): ParsedSpokenIngredient {
    let text = normalize(raw);
    let unitPrice: number | undefined;

    for (const filler of FILLERS) {
        const f = normalize(filler);
        if (text.startsWith(`${f} `)) {
            text = text.slice(f.length).trim();
            break;
        }
    }

    // Precio: "N sol(es)" en cualquier parte de la frase.
    const priceMatch = text.match(/(?:^|\s)([a-z0-9.,]+)\s+(?:sol|soles)(?=\s|$)/);
    if (priceMatch) {
        const value = tokenNumber(priceMatch[1]);
        if (value != null) unitPrice = value;
        text = text.replace(priceMatch[0], " ").replace(/\s+/g, " ").trim();
    }

    // Cantidad, unidad y fracción ("y medio") al inicio.
    const { quantity, unit, rest } = parseQuantityPrefix(text);

    // Si se dictó una cantidad sin unidad ("un pollo"), es un conteo por unidad.
    const resolvedUnit = unit ?? (quantity != null ? "unidades" : undefined);

    text = rest.replace(/^(?:de|del|un|una|unos|unas)\s+/, "").trim();

    return {
        ingredientName: text,
        quantity,
        unit: resolvedUnit,
        unitPrice,
        raw,
    };
}

export function isSpeechSupported(): boolean {
    return typeof window !== "undefined" && Boolean(window.SpeechRecognition ?? window.webkitSpeechRecognition);
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
