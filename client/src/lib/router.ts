import { useEffect, useState } from "react";

export interface Route {
    page: string;
    params: string[];
}

export function parseHash(): Route {
    const parts = window.location.hash.replace(/^#\/?/, "").split("/").filter(Boolean);
    return { page: parts[0] || "dashboard", params: parts.slice(1) };
}

export function useRoute(): Route {
    const [route, setRoute] = useState<Route>(() => parseHash());
    useEffect(() => {
        const onChange = () => setRoute(parseHash());
        window.addEventListener("hashchange", onChange);
        return () => window.removeEventListener("hashchange", onChange);
    }, []);
    return route;
}

export function navigate(path: string): void {
    window.location.hash = `/${path}`;
}

export function navigateToRecipe(id: string): void {
    navigate(`recipes/${id}`);
}
