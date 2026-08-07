import { useState } from "react";
import { useApiKeys, useSettings, useUpdateApiKeys, useUpdateSettings } from "../api/hooks";
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

    const { data: keys } = useApiKeys();
    const updateKeys = useUpdateApiKeys();
    const [openaiKey, setOpenaiKey] = useState("");
    const [anthropicKey, setAnthropicKey] = useState("");
    const [googleKey, setGoogleKey] = useState("");
    const [spoonacularKey, setSpoonacularKey] = useState("");
    const [ollamaHost, setOllamaHost] = useState("");

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

    const saveKeys = () => {
        updateKeys.mutate(
            {
                openai: openaiKey.trim() || null,
                anthropic: anthropicKey.trim() || null,
                google: googleKey.trim() || null,
                spoonacular: spoonacularKey.trim() || null,
                ollamaHost: ollamaHost.trim() || null,
            },
            {
                onSuccess: () => {
                    toast("Claves API guardadas ✓");
                    setOpenaiKey("");
                    setAnthropicKey("");
                    setGoogleKey("");
                    setSpoonacularKey("");
                    setOllamaHost("");
                },
                onError: () => toast("Error al guardar claves.", "error"),
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

            <section className="card" style={{ marginTop: 24 }}>
                <h2>Claves de API (opcional)</h2>
                <p className="muted small">
                    Configura claves para fuentes externas. Las claves se guardan solo en memoria del servidor y nunca
                    se persisten en la base de datos.
                </p>
                <div className="profile-form">
                    <label className="field">
                        <span>OpenAI {keys?.openai ? "✓" : ""}</span>
                        <input
                            className="input"
                            type="password"
                            value={openaiKey}
                            onChange={(e) => setOpenaiKey(e.target.value)}
                            placeholder={keys?.openai ? "clave configurada ···" : "sk-..."}
                        />
                    </label>
                    <label className="field">
                        <span>Anthropic {keys?.anthropic ? "✓" : ""}</span>
                        <input
                            className="input"
                            type="password"
                            value={anthropicKey}
                            onChange={(e) => setAnthropicKey(e.target.value)}
                            placeholder={keys?.anthropic ? "clave configurada ···" : "sk-ant-..."}
                        />
                    </label>
                    <label className="field">
                        <span>Google Gemini {keys?.google ? "✓" : ""}</span>
                        <input
                            className="input"
                            type="password"
                            value={googleKey}
                            onChange={(e) => setGoogleKey(e.target.value)}
                            placeholder={keys?.google ? "clave configurada ···" : "AIza..."}
                        />
                    </label>
                    <label className="field">
                        <span>Spoonacular {keys?.spoonacular ? "✓" : ""}</span>
                        <input
                            className="input"
                            type="password"
                            value={spoonacularKey}
                            onChange={(e) => setSpoonacularKey(e.target.value)}
                            placeholder={keys?.spoonacular ? "clave configurada ···" : "..."}
                        />
                    </label>
                    <label className="field">
                        <span>Ollama (host local) {keys?.ollama ? "✓" : ""}</span>
                        <input
                            className="input"
                            value={ollamaHost}
                            onChange={(e) => setOllamaHost(e.target.value)}
                            placeholder={keys?.ollama ? (keys.ollama ? "configurado" : "") : "http://localhost:11434"}
                        />
                    </label>
                    <div className="settings-actions">
                        <button className="btn primary" onClick={saveKeys} disabled={updateKeys.isPending}>
                            Guardar claves
                        </button>
                    </div>
                </div>
            </section>
        </div>
    );
}
