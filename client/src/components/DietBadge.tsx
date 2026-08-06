const LABELS: Record<string, string> = {
    vegetariano: "Vegetariano",
    vegano: "Vegano",
    "sin-gluten": "Sin gluten",
    keto: "Keto",
    "alta-proteina": "Alta proteína",
    "sin-lactosa": "Sin lactosa",
};

export function DietBadge({ diet }: { diet: string }) {
    return <span className={`diet-badge diet-${diet.replace("sin-", "n")}`}>{LABELS[diet] ?? diet}</span>;
}

export function DietChips({ diets }: { diets: string[] }) {
    if (!diets?.length) return null;
    return (
        <div className="diet-chips">
            {diets.map((d) => (
                <DietBadge key={d} diet={d} />
            ))}
        </div>
    );
}

export function dietLabel(diet: string): string {
    return LABELS[diet] ?? diet;
}
