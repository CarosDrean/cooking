import { memo, useCallback, useMemo, useRef, useState } from "react";
import { useMakeable } from "../api/hooks";
import { useDebouncedValue } from "../lib/useDebouncedValue";
import { useModalClose } from "../lib/useModalClose";
import type { Recipe } from "../types";
import RecipeCard from "./RecipeCard";

const PickableCard = memo(function PickableCard({
    recipe,
    onPick,
}: {
    recipe: Recipe;
    onPick: (recipe: Recipe) => void;
}) {
    const onPickRef = useRef(onPick);
    onPickRef.current = onPick;
    const handleClick = useCallback(() => onPickRef.current(recipe), [recipe]);
    return <RecipeCard recipe={recipe} onClick={handleClick} />;
});

export default function RecipePicker({
    title,
    selectedId,
    localOnly = false,
    onPick,
    onClose,
}: {
    title: string;
    selectedId?: string;
    localOnly?: boolean;
    onPick: (recipe: Recipe) => void;
    onClose: () => void;
}) {
    const [tab, setTab] = useState<"todas" | "makeable">("todas");
    const [query, setQuery] = useState("");
    const debouncedQuery = useDebouncedValue(query, 300);
    const makeable = useMakeable();
    const allRecipes = makeable.data?.map((m) => m.recipe) ?? [];

    useModalClose(onClose);

    const baseList = useMemo(() => {
        if (tab === "makeable") {
            const makeableRecipes = (makeable.data ?? []).filter((m) => m.makeable).map((m) => m.recipe);
            return localOnly ? makeableRecipes.filter((r) => r.source === "local") : makeableRecipes;
        }
        return localOnly ? allRecipes.filter((r) => r.source === "local") : allRecipes;
    }, [allRecipes, makeable.data, localOnly, tab]);

    const list = useMemo(() => {
        if (!debouncedQuery.trim()) return baseList;
        return baseList.filter((r) => r.title.toLowerCase().includes(debouncedQuery.toLowerCase()));
    }, [baseList, debouncedQuery]);

    const totalCount = localOnly ? allRecipes.filter((r) => r.source === "local").length : allRecipes.length;

    const makeableCount = useMemo(() => {
        const makeableList = (makeable.data ?? []).filter((m) => m.makeable);
        return localOnly ? makeableList.filter((m) => m.recipe.source === "local").length : makeableList.length;
    }, [makeable.data, localOnly]);

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="modal recipe-picker" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
                <div className="modal-head">
                    <h3>{title}</h3>
                    <button className="icon-btn" onClick={onClose} aria-label="Cerrar">
                        ✕
                    </button>
                </div>
                <div className="modal-tabs">
                    <button className={`tab ${tab === "todas" ? "active" : ""}`} onClick={() => setTab("todas")}>
                        Todas ({totalCount})
                    </button>
                    <button className={`tab ${tab === "makeable" ? "active" : ""}`} onClick={() => setTab("makeable")}>
                        Hacer hoy ({makeableCount})
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
                        <p className="muted">
                            {tab === "makeable"
                                ? "Ninguna receta se puede hacer hoy con tu despensa"
                                : "Sin resultados."}
                        </p>
                    ) : (
                        list.map((r) => (
                            <div key={r.id} className={`picker-row ${r.id === selectedId ? "selected" : ""}`}>
                                <PickableCard recipe={r} onPick={onPick} />
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
