import { useEffect, useRef, useState } from "react";
import { useActiveProfile, useRecipe } from "../api/hooks";
import { fmtQty } from "../lib/format";
import { navigate } from "../lib/router";

function formatTime(totalSeconds: number): string {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function CookingMode({ recipeId }: { recipeId?: string }) {
    const recipe = useRecipe(recipeId);
    const profile = useActiveProfile();
    const [activeStep, setActiveStep] = useState(0);
    const [servings, setServings] = useState(1);
    const [timerSeconds, setTimerSeconds] = useState<number | null>(null);
    const [timerRunning, setTimerRunning] = useState(false);
    const timerRef = useRef<number | null>(null);
    const [checkedSteps, setCheckedSteps] = useState<Set<number>>(new Set());
    const secondsRef = useRef<number | null>(null);

    useEffect(() => {
        secondsRef.current = timerSeconds;
    }, [timerSeconds]);

    useEffect(() => {
        if (timerRunning) {
            timerRef.current = window.setInterval(() => {
                const s = secondsRef.current;
                if (s === null) return;
                if (s <= 1) {
                    setTimerRunning(false);
                    setTimerSeconds(0);
                } else {
                    setTimerSeconds(s - 1);
                }
            }, 1000);
            return () => {
                if (timerRef.current) window.clearInterval(timerRef.current);
            };
        }
    }, [timerRunning]);

    useEffect(() => {
        setActiveStep(0);
        setCheckedSteps(new Set());
        setServings(profile?.householdSize ?? 1);
    }, [recipeId, profile?.id]);

    if (!recipe.data) {
        return (
            <div className="page">
                <button className="link-btn" onClick={() => navigate("recipes")}>
                    ← Volver
                </button>
                <p className="muted">Cargando receta…</p>
            </div>
        );
    }

    const r = recipe.data;
    const steps = r.steps.map((step) => {
        const tokens = step.text.match(/(\d+)\s*(min|segundos?|minutos?)/gi);
        return { text: step.text, time: tokens?.[0] ? parseFromToken(tokens[0]) : null };
    });
    const scale = (q: number) => (q / r.servings) * servings;

    function parseFromToken(token: string): number | null {
        const m = token.match(/(\d+)\s*(min|segundos?|minutos?)/i);
        if (!m) return null;
        const n = parseInt(m[1], 10);
        if (m[2].startsWith("m")) return n * 60;
        return n;
    }

    const startTimer = (seconds: number | null) => {
        if (seconds == null) return;
        setTimerSeconds(seconds);
        setTimerRunning(true);
    };

    const toggleStep = (i: number) => {
        setCheckedSteps((prev) => {
            const next = new Set(prev);
            if (next.has(i)) next.delete(i);
            else next.add(i);
            return next;
        });
    };

    const goToStep = (i: number) => {
        setActiveStep(i);
        setCheckedSteps((prev) => new Set(prev).add(i));
    };

    const current = steps[activeStep];

    return (
        <div className="page cooking-page">
            <div className="cooking-head">
                <button className="link-btn" onClick={() => navigate(`recipes/${r.id}`)}>
                    ← Salir del modo cocina
                </button>
                <div className="serving-stepper">
                    <button className="btn ghost sm" onClick={() => setServings((s) => Math.max(1, s - 1))}>
                        −
                    </button>
                    <span className="serving-num">{servings}</span>
                    <button className="btn ghost sm" onClick={() => setServings((s) => Math.min(12, s + 1))}>
                        +
                    </button>
                    <span className="muted">rac.</span>
                </div>
            </div>

            <div className="cooking-hero" aria-hidden>
                {r.image ? (
                    <>
                        <img src={r.image} alt="" />
                        <div className="detail-hero-overlay" />
                        <div className="detail-hero-content">
                            <h1>{r.title}</h1>
                        </div>
                    </>
                ) : (
                    <span className="detail-hero-emoji">{r.emoji ?? "🍲"}</span>
                )}
            </div>

            <div className="cooking-timer">
                <div className="timer-display">{timerSeconds === null ? "--:--" : formatTime(timerSeconds)}</div>
                <div className="timer-controls">
                    <button
                        className="btn ghost sm"
                        onClick={() => {
                            setTimerSeconds(60);
                            setTimerRunning(true);
                        }}
                    >
                        1 min
                    </button>
                    <button
                        className="btn ghost sm"
                        onClick={() => {
                            setTimerSeconds(300);
                            setTimerRunning(true);
                        }}
                    >
                        5 min
                    </button>
                    <button
                        className="btn ghost sm"
                        onClick={() => {
                            setTimerSeconds(600);
                            setTimerRunning(true);
                        }}
                    >
                        10 min
                    </button>
                    {timerSeconds !== null && timerSeconds === 0 ? (
                        <button className="btn primary sm" onClick={() => setTimerSeconds(null)}>
                            ✓ Listo
                        </button>
                    ) : timerRunning ? (
                        <button className="btn primary sm" onClick={() => setTimerRunning(false)}>
                            ⏸ Pausar
                        </button>
                    ) : timerSeconds !== null ? (
                        <button className="btn primary sm" onClick={() => setTimerRunning(true)}>
                            ▶ Reanudar
                        </button>
                    ) : null}
                    {timerSeconds !== null ? (
                        <button
                            className="btn ghost sm"
                            onClick={() => {
                                setTimerRunning(false);
                                setTimerSeconds(null);
                            }}
                        >
                            ✕
                        </button>
                    ) : null}
                </div>
            </div>

            <div className="cooking-grid">
                <div className="card ingredients-card">
                    <h2>Ingredientes</h2>
                    <ul className="ingredient-list">
                        {r.ingredients.map((ing, i) => (
                            <li key={i}>
                                <span>
                                    {fmtQty(scale(ing.quantity))} {ing.unit}
                                </span>
                                <span className="ing-name">{ing.name}</span>
                            </li>
                        ))}
                    </ul>
                </div>

                <div className="card steps-card">
                    <div className="steps-progress">
                        {steps.map((_, i) => (
                            <button
                                key={i}
                                className={`step-dot ${i === activeStep ? "active" : ""} ${checkedSteps.has(i) ? "done" : ""}`}
                                onClick={() => goToStep(i)}
                            >
                                {i + 1}
                            </button>
                        ))}
                    </div>
                    <div className="current-step">
                        <div className="step-text">{current.text}</div>
                        <div className="step-actions">
                            {current.time ? (
                                <button className="btn primary sm" onClick={() => startTimer(current.time)}>
                                    ⏱ Cronometrar {Math.round(current.time / 60)} min
                                </button>
                            ) : null}
                            <button className="btn ghost sm" onClick={() => toggleStep(activeStep)}>
                                {checkedSteps.has(activeStep) ? "✓ Hecho" : "Marcar paso"}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="cooking-nav">
                <button
                    className="btn ghost"
                    onClick={() => setActiveStep((i) => Math.max(0, i - 1))}
                    disabled={activeStep === 0}
                >
                    ← Anterior
                </button>
                <span className="muted">
                    Paso {activeStep + 1} de {steps.length}
                </span>
                {activeStep < steps.length - 1 ? (
                    <button className="btn primary" onClick={() => goToStep(activeStep + 1)}>
                        Siguiente →
                    </button>
                ) : (
                    <button className="btn primary" onClick={() => navigate(`recipes/${r.id}`)}>
                        🎉 Terminar
                    </button>
                )}
            </div>
        </div>
    );
}
