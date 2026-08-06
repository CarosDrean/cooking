import type { Recipe } from "@cooking/shared";
import { totalMinutes } from "../lib/format";
import { navigate } from "../lib/router";
import { DietChips } from "./DietBadge";

export default function RecipeCard({
    recipe,
    makeable,
    right,
    onClick,
}: {
    recipe: Recipe;
    makeable?: boolean;
    right?: React.ReactNode;
    onClick?: () => void;
}) {
    const open = () => navigate(`recipes/${recipe.id}`);
    return (
        <article className={`recipe-card ${makeable ? "makeable" : ""}`} onClick={onClick ?? open}>
            <div className="recipe-card-top">
                <div className="recipe-thumb" aria-hidden>
                    {recipe.emoji ?? "🍲"}
                </div>
                <div className="recipe-card-info">
                    <h3 className="recipe-name">{recipe.title}</h3>
                    <div className="recipe-meta">
                        <span>⏱ {totalMinutes(recipe)} min</span>
                        <span>·</span>
                        <span>{recipe.servings} rac.</span>
                    </div>
                    <DietChips diets={recipe.diets} />
                </div>
                {right}
            </div>
            {makeable ? <div className="makeable-tag">✅ Se puede hacer hoy</div> : null}
        </article>
    );
}
