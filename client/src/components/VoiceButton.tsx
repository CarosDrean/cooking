import { useVoiceInput } from "../lib/speech";

interface Props {
    onResult: (text: string) => void;
}

export default function VoiceButton({ onResult }: Props) {
    const voice = useVoiceInput();

    if (!voice.supported) return null;

    return (
        <>
            <button
                type="button"
                className={`icon-btn mic-btn ${voice.listening ? "listening" : ""}`}
                title={voice.listening ? "Detener dictado" : "Dictar ingrediente por voz"}
                aria-label={voice.listening ? "Detener dictado" : "Dictar ingrediente por voz"}
                onClick={() => (voice.listening ? voice.stop() : voice.start(onResult))}
            >
                {voice.listening ? "⏹" : "🎤"}
            </button>
            {voice.error ? <span className="mic-error">{voice.error}</span> : null}
        </>
    );
}
