import { memo } from "react";
import { isLocalRecipe, type Recipe, SEASON_LABELS, type Season, seasonFit } from "../types";

export const RecipeContextBadges = memo(function RecipeContextBadges({
    recipe,
    country,
    season,
}: {
    recipe: Recipe;
    country: string;
    season?: Season;
}) {
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
});
