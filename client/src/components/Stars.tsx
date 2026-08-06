export default function Stars({
    value,
    onChange,
    size = "md",
}: {
    value: number | null | undefined;
    onChange?: (n: number | null) => void;
    size?: "sm" | "md";
}) {
    const interactive = Boolean(onChange);
    return (
        <span className={`stars stars-${size}`}>
            {[1, 2, 3, 4, 5].map((n) => (
                <button
                    key={n}
                    type="button"
                    disabled={!interactive}
                    className={`star ${value && n <= value ? "on" : ""}`}
                    onClick={() => onChange?.(value === n ? null : n)}
                    aria-label={`${n} estrellas`}
                >
                    ★
                </button>
            ))}
        </span>
    );
}
