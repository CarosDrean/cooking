import { totalMinutes } from "../lib/format";
import { navigate } from "../lib/router";
import { findReplacements } from "../lib/speech";
import type { Recipe } from "../types";
import { DietChips } from "./DietBadge";
import { RecipeContextBadges } from "./RecipeContextBadges";

export default function RecipeCard({
    recipe,
    makeable,
    right,
    onClick,
    restrictedIngredients,
    rating,
    onRate,
}: {
    recipe: Recipe;
    makeable?: boolean;
    right?: React.ReactNode;
    onClick?: () => void;
    restrictedIngredients?: string[];
    rating?: number;
    onRate?: (rating: number) => void;
}) {
    const open = () => navigate(`recipes/${recipe.id}`);
    return (
        <article className={`recipe-card ${makeable ? "makeable" : ""}`} onClick={onClick ?? open}>
            <div className="recipe-card-top">
                <div className="recipe-thumb" aria-hidden>
                    {recipe.image ? <img src={recipe.image} alt="" loading="lazy" /> : (recipe.emoji ?? "🍲")}
                </div>
                <div className="recipe-card-info">
                    <h3 className="recipe-name">{recipe.title}</h3>
                    <div className="recipe-meta">
                        <span>⏱ {totalMinutes(recipe)} min</span>
                        <span>·</span>
                        <span>{recipe.servings} rac.</span>
                        {onRate ? (
                            <span
                                className="recipe-stars"
                                onClick={(e) => e.stopPropagation()}
                                onKeyDown={(e) => e.stopPropagation()}
                            >
                                <span className="recipe-stars-sep">·</span>
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <button
                                        key={star}
                                        type="button"
                                        className={`star-btn ${rating && rating >= star ? "filled" : ""}`}
                                        aria-label={`${star} estrella${star > 1 ? "s" : ""}`}
                                        title={`${star} estrella${star > 1 ? "s" : ""}`}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onRate(star);
                                        }}
                                    >
                                        {rating && rating >= star ? "★" : "☆"}
                                    </button>
                                ))}
                            </span>
                        ) : null}
                    </div>
                    <DietChips diets={recipe.diets} />
                    <RecipeContextBadges recipe={recipe} />
                    {restrictedIngredients?.length ? (
                        <div className="restricted-ingredient-warn">
                            {restrictedIngredients.map((ing) => {
                                const replacements = findReplacements(ing);
                                return (
                                    <span
                                        key={ing}
                                        className="restricted-ing-tag"
                                        title={
                                            replacements.length
                                                ? `Reemplazar con: ${replacements.join(", ")}`
                                                : "Ingrediente restringido"
                                        }
                                    >
                                        ⚠ {ing}
                                        {replacements.length ? (
                                            <span className="replacement-hint">
                                                → {replacements.slice(0, 2).join(", ")}
                                            </span>
                                        ) : null}
                                    </span>
                                );
                            })}
                        </div>
                    ) : null}
                </div>
                {right}
            </div>
            {makeable ? <div className="makeable-tag">✅ Se puede hacer hoy</div> : null}
        </article>
    );
}
