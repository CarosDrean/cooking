import { useEffect, useState } from "react";
import { useActiveProfile, useAppState } from "./api/hooks";
import ProfileMenu from "./components/ProfileMenu";
import ProfileWizard from "./components/ProfileWizard";
import { dayKeyOf, toISODate } from "./lib/format";
import { useRoute } from "./lib/router";
import CookingMode from "./pages/CookingMode";
import Dashboard from "./pages/Dashboard";
import DrinksPage from "./pages/DrinksPage";
import HistoryPage from "./pages/History";
import PantryPage from "./pages/Pantry";
import ProfilesPage from "./pages/Profiles";
import RecipeDetail from "./pages/RecipeDetail";
import Recipes from "./pages/Recipes";
import Settings from "./pages/Settings";
import ShoppingPage from "./pages/Shopping";
import SpendingPage from "./pages/Spending";
import WeeklyPlan from "./pages/WeeklyPlan";

function NavItem({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
    return (
        <button className={`nav-item ${active ? "active" : ""}`} onClick={onClick}>
            {children}
        </button>
    );
}

export default function App() {
    const route = useRoute();
    const { data: state } = useAppState();
    const activeProfile = useActiveProfile();
    const [showWizard, setShowWizard] = useState(false);
    const [now, setNow] = useState(() => new Date());

    useEffect(() => {
        const id = window.setInterval(() => setNow(new Date()), 30_000);
        return () => window.clearInterval(id);
    }, []);

    const setPage = (page: string) => {
        window.location.hash = `/${page}`;
    };

    const loading = !state;
    const error = state === undefined;
    const firstRun = !loading && !error && state.profiles.length === 0;

    let content: React.ReactNode;
    if (loading) {
        content = <div className="page-loading">Cargando…</div>;
    } else if (error) {
        content = (
            <div className="page-loading">
                <p>No se pudo conectar con el servidor.</p>
                <p className="muted">
                    ¿Está corriendo?
                    <br />
                    <code>pnpm dev</code>
                </p>
            </div>
        );
    } else {
        switch (route.page) {
            case "dashboard":
                content = <Dashboard />;
                break;
            case "recipes":
                content = route.params.length ? <RecipeDetail recipeId={route.params[0]} /> : <Recipes />;
                break;
            case "cook":
                content = <CookingMode recipeId={route.params[0]} />;
                break;
            case "plan":
                content = <WeeklyPlan />;
                break;
            case "history":
                content = <HistoryPage />;
                break;
            case "pantry":
                content = <PantryPage />;
                break;
            case "shopping":
                content = <ShoppingPage />;
                break;
            case "spending":
                content = <SpendingPage />;
                break;
            case "profiles":
                content = <ProfilesPage />;
                break;
            case "drinks":
                content = <DrinksPage />;
                break;
            case "settings":
                content = <Settings />;
                break;
            default:
                content = <Dashboard />;
        }
    }

    return (
        <div className="layout">
            <aside className="sidebar">
                <div className="brand">
                    <span className="brand-mark">🍳</span>
                    <span className="brand-name">Cocina Inteligente</span>
                </div>
                <nav className="nav">
                    <NavItem active={route.page === "dashboard"} onClick={() => setPage("dashboard")}>
                        Inicio
                    </NavItem>
                    <NavItem active={route.page === "recipes"} onClick={() => setPage("recipes")}>
                        Recetas
                    </NavItem>
                    <NavItem active={route.page === "plan"} onClick={() => setPage("plan")}>
                        Plan semanal
                    </NavItem>
                    <NavItem active={route.page === "history"} onClick={() => setPage("history")}>
                        Historial
                    </NavItem>
                    <NavItem active={route.page === "pantry"} onClick={() => setPage("pantry")}>
                        Despensa
                    </NavItem>
                    <NavItem active={route.page === "shopping"} onClick={() => setPage("shopping")}>
                        Compras
                    </NavItem>
                    <NavItem active={route.page === "spending"} onClick={() => setPage("spending")}>
                        Gastos
                    </NavItem>
                    <NavItem active={route.page === "profiles"} onClick={() => setPage("profiles")}>
                        Perfiles
                    </NavItem>
                    <NavItem active={route.page === "drinks"} onClick={() => setPage("drinks")}>
                        Bebidas
                    </NavItem>
                    <NavItem active={route.page === "settings"} onClick={() => setPage("settings")}>
                        Ajustes
                    </NavItem>
                </nav>
                <div className="sidebar-foot">
                    <div className="week-dot">Hoy · {dayKeyOf(toISODate(new Date()))}</div>
                </div>
            </aside>
            <main className="main">
                <header className="topbar">
                    <div className="topbar-title">
                        {activeProfile ? (
                            <>
                                <span className="avatar">{activeProfile.name.slice(0, 1).toUpperCase()}</span>
                                <span>Hola, {activeProfile.name.split(" ")[0]}</span>
                                <span className="topbar-date">
                                    {now.toLocaleDateString("es-ES", {
                                        weekday: "long",
                                        day: "numeric",
                                        month: "short",
                                    })}{" "}
                                    · {now.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
                                </span>
                            </>
                        ) : (
                            <span>Hola</span>
                        )}
                    </div>
                    <div className="topbar-actions">
                        <ProfileMenu />
                    </div>
                </header>
                <div className="content">{content}</div>
            </main>
            {firstRun || showWizard ? (
                <ProfileWizard
                    onDone={() => {
                        setShowWizard(false);
                        setPage("dashboard");
                    }}
                    onClose={firstRun ? undefined : () => setShowWizard(false)}
                />
            ) : null}
        </div>
    );
}
