import { useEffect, useState } from "react";

export default function TopBarClock() {
    const [now, setNow] = useState(() => new Date());

    useEffect(() => {
        const id = window.setInterval(() => setNow(new Date()), 30_000);
        return () => window.clearInterval(id);
    }, []);

    return (
        <span className="topbar-date">
            {now.toLocaleDateString("es-ES", {
                weekday: "long",
                day: "numeric",
                month: "short",
            })}{" "}
            · {now.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
        </span>
    );
}
