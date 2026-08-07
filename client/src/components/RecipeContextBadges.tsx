import { isLocalRecipe, type Recipe, SEASON_LABELS, seasonFit } from "@cooking/shared";
import { useAppState, useSettings } from "../api/hooks";

export function RecipeContextBadges({ recipe }: { recipe: Recipe }) {
    const { data: state } = useAppState();
    const { data: settings } = useSettings();

    const country = state?.location.country ?? "";
    const season = settings?.season;

    if (!country && !season) return null;

    const local = country ? isLocalRecipe(recipe, country) : false;
    const fit = season ? seasonFit(recipe, season) : null;

    const badges: { label: string; tone: "ok" | "warn" | "neutral" }[] = [];

    if (local) {
        badges.push({ label: "Típica de tu zona", tone: "ok" });
    } else if (recipe.regions?.length) {
        badges.push({ label: `🌍 ${recipe.regions.join(", ")}`, tone: "neutral" });
    }

    if (fit?.seasonal && season) {
        if (fit.inSeason) {
            badges.push({ label: `🌞 En temporada (${SEASON_LABELS[season]})`, tone: "ok" });
        } else {
            badges.push({ label: "Fuera de temporada", tone: "warn" });
        }
    }

    if (badges.length === 0) return null;

    return (
        <div className="context-badges">
            {badges.map((b) => (
                <span key={b.label} className={`context-badge ${b.tone}`}>
                    {b.label}
                </span>
            ))}
        </div>
    );
}
