import { useState } from "react";
import { useSettings, useUpdateSettings } from "../api/hooks";
import { useToast } from "../lib/toast";
import { SEASON_LABELS, type Season } from "../types";

const SEASON_HINTS: Record<Season, string> = {
    primavera: "Ideal para ensaladas frescas y platos con hierbas nuevas.",
    verano: "Frutas, choclo y platos frescos están en su mejor momento.",
    otonio: "Temporada de lúcuma, humitas y guisos con calabaza.",
    invierno: "Sopas, guisos y platos de cuchara reconfortan en el frío.",
};

export default function Settings() {
    const { data } = useSettings();
    const update = useUpdateSettings();
    const toast = useToast();

    const [country, setCountry] = useState(data?.location.country ?? "");
    const [city, setCity] = useState(data?.location.city ?? "");

    const save = () => {
        update.mutate(
            { country: country.trim(), city: city.trim() },
            {
                onSuccess: (info) => {
                    toast(`Ubicación guardada ✓ (${info.location.country}, ${info.location.city})`);
                    setCountry(info.location.country);
                    setCity(info.location.city);
                },
            },
        );
    };

    const season = data?.season;

    return (
        <div className="page">
            <div className="page-head">
                <div>
                    <h1>Ajustes</h1>
                    <p className="muted">Dónde vives, qué temporada es y cómo afecta a tus recetas.</p>
                </div>
            </div>

            <div className="grid-2">
                <section className="card">
                    <h2>Ubicación</h2>
                    <p className="muted small">
                        La app estima la temporada según el país y prioriza recetas con ingredientes fáciles de
                        conseguir en tu zona.
                    </p>
                    <div className="profile-form">
                        <label className="field">
                            <span>País</span>
                            <input
                                className="input"
                                value={country}
                                onChange={(e) => setCountry(e.target.value)}
                                placeholder="Ej. Perú"
                            />
                        </label>
                        <label className="field">
                            <span>Ciudad</span>
                            <input
                                className="input"
                                value={city}
                                onChange={(e) => setCity(e.target.value)}
                                placeholder="Ej. Ica"
                            />
                        </label>
                        <div className="page-actions">
                            <button className="btn primary" onClick={save} disabled={update.isPending}>
                                Guardar
                            </button>
                        </div>
                    </div>
                </section>

                <section className="card">
                    <h2>Temporada actual</h2>
                    {season ? (
                        <>
                            <div className={`season-banner season-${season}`}>
                                <span className="season-icon" aria-hidden>
                                    {season === "verano"
                                        ? "☀️"
                                        : season === "otonio"
                                          ? "🍂"
                                          : season === "invierno"
                                            ? "❄️"
                                            : "🌸"}
                                </span>
                                <div>
                                    <strong>{SEASON_LABELS[season]}</strong>
                                    <p className="muted">{SEASON_HINTS[season]}</p>
                                </div>
                            </div>
                            <p className="muted small" style={{ marginTop: 12 }}>
                                El plan semanal y las recomendaciones premian los ingredientes de temporada y los platos
                                típicos de {data?.location.country ?? "tu zona"}.
                            </p>
                        </>
                    ) : (
                        <p className="muted">Cargando temporada…</p>
                    )}
                </section>
            </div>
        </div>
    );
}
