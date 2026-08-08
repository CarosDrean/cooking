import { useState } from "react";
import { useOpenverseSearch, useUpdateRecipeImage } from "../api/hooks";
import { useModalClose } from "../lib/useModalClose";
import type { Recipe } from "../types";

export default function ImagePicker({ recipe, onClose }: { recipe: Recipe; onClose: () => void }) {
    const [q, setQ] = useState(recipe.title);
    const { data: images, isLoading } = useOpenverseSearch(q);
    const updateImage = useUpdateRecipeImage();

    const pick = (url: string) => {
        updateImage.mutate({ recipeId: recipe.id, image: url }, { onSuccess: () => onClose() });
    };

    useModalClose(onClose);

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="modal modal-wide" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
                <div className="modal-head">
                    <h3>Buscar imagen para "{recipe.title}"</h3>
                    <button className="icon-btn" onClick={onClose} aria-label="Cerrar">
                        ✕
                    </button>
                </div>
                <div className="image-picker-search">
                    <input
                        className="input"
                        placeholder="Buscar en Openverse…"
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") {
                                const input = e.currentTarget;
                                setQ(input.value);
                            }
                        }}
                    />
                </div>
                {isLoading ? (
                    <p className="muted">Buscando imágenes…</p>
                ) : images?.length ? (
                    <div className="image-picker-grid">
                        {images.map((img) => (
                            <button
                                key={img.id}
                                className="image-picker-item"
                                type="button"
                                onClick={() => pick(img.url)}
                                title={img.title}
                            >
                                <img
                                    src={img.thumbnail}
                                    alt={img.title}
                                    loading="lazy"
                                    onError={(e) => {
                                        e.currentTarget.style.display = "none";
                                    }}
                                />
                                <span className="image-picker-attr muted">
                                    {img.creator} · {img.license.toUpperCase()}
                                </span>
                            </button>
                        ))}
                    </div>
                ) : (
                    <p className="muted">Sin resultados. Prueba con otras palabras.</p>
                )}
                {images?.length ? (
                    <p className="image-picker-info muted">
                        Imágenes de{" "}
                        <a href="https://openverse.org" target="_blank" rel="noopener noreferrer">
                            Openverse
                        </a>
                        , con licencia libre.
                    </p>
                ) : null}
            </div>
        </div>
    );
}
