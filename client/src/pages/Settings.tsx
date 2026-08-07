import { useState } from "react";
import { useSettings, useUpdateSettings } from "../api/hooks";
import { COUNTRY_NAMES, getCitiesForCountry } from "../data/countries";
import { useToast } from "../lib/toast";
import { SEASON_LABELS, type Season } from "../types";

const SEASON_HINTS: Record<Season, string> = {
    primavera: "Ideal para ensaladas frescas y platos con hierbas nuevas.",
    verano: "Frutas, choclo y platos frescos están en su mejor momento.",
    otonio: "Temporada de lúcuma, humitas y guisos con calabaza.",
    invierno: "Sopas, guisos y platos de cuchara reconfortan en el frío.",
};

const COUNTRY_DATALIST_ID = "country-list";

export default function Settings() {
    const { data } = useSettings();
    const update = useUpdateSettings();
    const toast = useToast();

    const [country, setCountry] = useState(data?.location.country ?? "");
    const [city, setCity] = useState(data?.location.city ?? "");
    const [locating, setLocating] = useState(false);

    const citySuggestions = getCitiesForCountry(country);

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

    const useMyLocation = () => {
        if (!navigator.geolocation) {
            toast("Tu navegador no soporta geolocalización.");
            return;
        }
        setLocating(true);
        navigator.geolocation.getCurrentPosition(
            async (pos) => {
                try {
                    const { latitude, longitude } = pos.coords;
                    const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=es`;
                    const res = await fetch(url);
                    if (!res.ok) throw new Error("Error de red");
                    const data = await res.json();
                    const foundCountry = data.countryName;
                    const foundCity = data.locality || data.city || "";

                    if (foundCountry && COUNTRY_NAMES.includes(foundCountry)) {
                        setCountry(foundCountry);
                    } else if (foundCountry) {
                        toast(`País detectado: ${foundCountry} (no está en el catálogo; puedes escribirlo).`);
                    }
                    if (foundCity) {
                        setCity(foundCity);
                    }
                    if (foundCountry || foundCity) {
                        toast("Ubicación detectada ✓");
                    } else {
                        toast("No se pudo determinar la ubicación.");
                    }
                } catch {
                    toast("Error al consultar la ubicación. Intenta de nuevo.");
                } finally {
                    setLocating(false);
                }
            },
            () => {
                toast("No se pudo acceder a tu ubicación. Revisa los permisos.");
                setLocating(false);
            },
            { enableHighAccuracy: false, timeout: 10000 },
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
                                list={country.length >= 2 ? COUNTRY_DATALIST_ID : undefined}
                                value={country}
                                onChange={(e) => {
                                    setCountry(e.target.value);
                                    if (!getCitiesForCountry(e.target.value).includes(city)) {
                                        setCity("");
                                    }
                                }}
                                placeholder="Ej. Perú"
                            />
                            <datalist id={COUNTRY_DATALIST_ID}>
                                {COUNTRY_NAMES.map((c) => (
                                    <option key={c} value={c} />
                                ))}
                            </datalist>
                        </label>
                        <label className="field">
                            <span>Ciudad</span>
                            <input
                                className="input"
                                list={city.length >= 2 ? "city-list" : undefined}
                                value={city}
                                onChange={(e) => setCity(e.target.value)}
                                placeholder={citySuggestions.length > 0 ? "Ej. Ica" : "Escribe tu ciudad"}
                            />
                            <datalist id="city-list">
                                {citySuggestions.map((c) => (
                                    <option key={c} value={c} />
                                ))}
                            </datalist>
                        </label>
                        <div className="settings-actions">
                            <button
                                className="btn sm"
                                onClick={useMyLocation}
                                disabled={locating}
                                title="Usar mi ubicación actual"
                            >
                                {locating ? "Detectando…" : "📍 Usar mi ubicación"}
                            </button>
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
