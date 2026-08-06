import type { Recipe } from "@cooking/shared";
import { normalize } from "./diet.js";

interface TipRule {
    keywords: string[];
    tip: string;
}

const TIP_LIBRARY: TipRule[] = [
    {
        keywords: ["saltear", "salteado", "salte"],
        tip: "Para saltear, la sartén debe estar bien caliente y los ingredientes en una sola capa: así se doran, no se cuecen al vapor.",
    },
    {
        keywords: ["sofri", "cebolla", "ajo"],
        tip: "Sofríe la cebolla y el ajo a fuego medio-bajo; si se doran demasiado rápido, amargarán la base del plato.",
    },
    {
        keywords: ["arroz"],
        tip: "El arroz perfecto: 1 parte de arroz por 2 de agua, tapado, a fuego muy bajo durante 15 minutos sin levantar la tapa.",
    },
    {
        keywords: ["pasta", "espagueti", "fideo"],
        tip: "Cocina la pasta en agua con abundante sal ('como el mar') y reserva una taza del agua antes de escurrir: ligará la salsa.",
    },
    {
        keywords: ["huevo", "huevos", "revuelto"],
        tip: "Los huevos revueltos cremosos se logran a fuego bajo, moviendo siempre y retirando cuando aún estén ligeramente húmedos.",
    },
    {
        keywords: ["limon", "lima", "citrico"],
        tip: "El ácido de los cítricos al final del plato realza todos los sabores; exprímelos en el último minuto.",
    },
    {
        keywords: ["salmon", "pescado", "filete"],
        tip: "El pescado está listo cuando se separa fácilmente en láminas con el tenedor. No lo muevas hasta que se dore.",
    },
    {
        keywords: ["garbanzos", "lentejas", "frijol", "alubia", "legumbre"],
        tip: "Las legumbres de lata ya están cocidas: enjuágalas para quitarles el exceso de sodio y úsalas directamente.",
    },
    {
        keywords: ["aceite de oliva", "aceite"],
        tip: "El aceite de oliva extra virgen soporta fuego medio: úsalo para saltear, pero para sellar a fuego alto prefiere aceite neutro.",
    },
    {
        keywords: ["aguacate"],
        tip: "El aguacate madura a temperatura ambiente; guárdalo en la nevera solo cuando esté listo para comer.",
    },
    {
        keywords: ["tomate", "tomate triturado"],
        tip: "Cocinar el tomate al menos 10 minutos suaviza su acidez y concentra el sabor: paciencia, no le sumes azúcar.",
    },
    {
        keywords: ["quinoa"],
        tip: "Enjuaga la quinoa siempre: la saponina que la recubre tiene sabor amargo.",
    },
    {
        keywords: ["tofu"],
        tip: "Para un tofu crujiente, presiónalo 10-15 minutos, sécalo bien y rebózalo en maicena antes de dorar.",
    },
    {
        keywords: ["espinaca", "verdura de hoja", "acelga", "repollo"],
        tip: "Las verduras de hoja reducen muchísimo al cocinar: una sartén llena se convierte en un puñado. No te asustes.",
    },
    {
        keywords: ["pimenton", "curry", "comino", "especia", "cumin"],
        tip: "Tuesta las especias en el aceite durante 1 minuto antes de añadir líquidos: despierta sus aceites aromáticos.",
    },
    {
        keywords: ["horno", "asado", "hornear"],
        tip: "Deja reposar lo que horneas 5 minutos fuera del horno: los jugos se redistribuyen y queda más tierno.",
    },
    {
        keywords: ["sarten", "dorar", "sell"],
        tip: "Un ingrediente bien seco se dora, uno húmedo se cuece: seca carnes y pescados con papel de cocina antes de sellar.",
    },
    {
        keywords: ["caldo", "sopa", "cocido"],
        tip: "El caldo casero gana sabor si doras primero las verduras y usas hierbas al final, no al principio.",
    },
    {
        keywords: ["maicena", "salsa"],
        tip: "Diluye la maicena en líquido frío antes de añadirla a la salsa caliente: evitarás grumos.",
    },
    {
        keywords: ["congelad", "descongelar"],
        tip: "Descongela el marisco y el pescado en la nevera (nunca a temperatura ambiente) para conservar textura y seguridad.",
    },
];

function matchTips(text: string, limit = 4): string[] {
    const found: string[] = [];
    const normalized = normalize(text);
    for (const rule of TIP_LIBRARY) {
        if (rule.keywords.some((k) => normalized.includes(normalize(k)))) {
            found.push(rule.tip);
            if (found.length >= limit) break;
        }
    }
    return found;
}

export function tipsForRecipe(recipe: Recipe): string[] {
    const tips: string[] = [];

    for (const t of recipe.tips) {
        if (!tips.includes(t)) tips.push(t);
    }

    for (const s of recipe.steps) {
        if (s.tip && !tips.includes(s.tip)) tips.push(s.tip);
        if (tips.length >= 8) break;
    }

    const stepText = recipe.steps.map((s) => s.text).join(" ");
    const ingredientText = recipe.ingredients.map((i) => i.name).join(" ");
    const text = `${stepText} ${ingredientText}`;

    for (const t of matchTips(text)) {
        if (!tips.includes(t)) tips.push(t);
        if (tips.length >= 8) break;
    }

    return tips.slice(0, 8);
}

export function tipOfTheDay(): string {
    const dayIndex = Math.floor(Date.now() / 86400000);
    return TIP_LIBRARY[dayIndex % TIP_LIBRARY.length].tip;
}
