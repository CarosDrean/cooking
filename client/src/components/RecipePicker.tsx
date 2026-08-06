import type { Recipe } from "@cooking/shared";
import { useState } from "react";
import { useMakeable } from "../api/hooks";
import RecipeCard from "./RecipeCard";

export default function RecipePicker({
    title,
    selectedId,
    onPick,
    onClose,
}: {
    title: string;
    selectedId?: string;
    onPick: (recipe: Recipe) => void;
    onClose: () => void;
}) {
    const [tab, setTab] = useState<"todas" | "makeable">("todas");
    const [query, setQuery] = useState("");
    const makeable = useMakeable();
    const allRecipes = makeable.data?.map((m) => m.recipe) ?? [];

    const list = (() => {
        let base = tab === "makeable" ? allRecipes : allRecipes;
        if (query.trim()) {
            base = base.filter((r) => r.title.toLowerCase().includes(query.toLowerCase()));
        }
        return base;
    })();

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="modal recipe-picker" onClick={(e) => e.stopPropagation()}>
                <div className="modal-head">
                    <h3>{title}</h3>
                    <button className="icon-btn" onClick={onClose} aria-label="Cerrar">
                        ✕
                    </button>
                </div>
                <div className="modal-tabs">
                    <button className={`tab ${tab === "todas" ? "active" : ""}`} onClick={() => setTab("todas")}>
                        Todas ({allRecipes.length})
                    </button>
                    <button className={`tab ${tab === "makeable" ? "active" : ""}`} onClick={() => setTab("makeable")}>
                        Hacer hoy
                    </button>
                </div>
                <input
                    className="input"
                    placeholder="Buscar receta…"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    autoFocus
                />
                <div className="recipe-picker-list">
                    {list.length === 0 ? (
                        <p className="muted">Sin resultados.</p>
                    ) : (
                        list.map((r) => (
                            <div key={r.id} className={`picker-row ${r.id === selectedId ? "selected" : ""}`}>
                                <RecipeCard recipe={r} onClick={() => onPick(r)} />
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
