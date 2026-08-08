import { useState } from "react";
import { useActiveProfile, useAppState } from "./api/hooks";
import ProfileMenu from "./components/ProfileMenu";
import ProfileWizard from "./components/ProfileWizard";
import TopBarClock from "./components/TopBarClock";
import { dayKeyOf, toISODate } from "./lib/format";
import { useRoute } from "./lib/router";
import CookingMode from "./pages/CookingMode";
import CreateRecipe from "./pages/CreateRecipe";
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
import { DAY_LABELS } from "./types";

const NAV_ICONS: Record<string, string> = {
    dashboard: "🏠",
    recipes: "📖",
    plan: "📅",
    history: "🕒",
    pantry: "🧺",
    shopping: "🛒",
    spending: "💰",
    profiles: "👥",
    drinks: "🧃",
    settings: "⚙️",
};

function NavItem({
    active,
    onClick,
    icon,
    children,
}: {
    active: boolean;
    onClick: () => void;
    icon: string;
    children: React.ReactNode;
}) {
    return (
        <button className={`nav-item ${active ? "active" : ""}`} onClick={onClick}>
            <span className="nav-icon">{icon}</span>
            <span>{children}</span>
        </button>
    );
}

export default function App() {
    const route = useRoute();
    const { data: state } = useAppState();
    const activeProfile = useActiveProfile();
    const [showWizard, setShowWizard] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);

    const setPage = (page: string) => {
        window.location.hash = `/${page}`;
        setMenuOpen(false);
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
                if (route.params[0] === "new") {
                    content = <CreateRecipe />;
                } else if (route.params.length) {
                    content = <RecipeDetail recipeId={route.params[0]} />;
                } else {
                    content = <Recipes />;
                }
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
            <button
                className="menu-toggle"
                onClick={() => setMenuOpen((v) => !v)}
                aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
            >
                <span className="menu-toggle-bar" />
                <span className="menu-toggle-bar" />
                <span className="menu-toggle-bar" />
            </button>
            {menuOpen ? <div className="menu-overlay" onClick={() => setMenuOpen(false)} /> : null}
            <aside className={`sidebar ${menuOpen ? "open" : ""}`}>
                <div className="brand">
                    <span className="brand-mark">🍳</span>
                    <span className="brand-name">Cocina Inteligente</span>
                </div>
                <nav className="nav">
                    <div className="nav-group-label">Principal</div>
                    <NavItem
                        icon={NAV_ICONS.dashboard}
                        active={route.page === "dashboard"}
                        onClick={() => setPage("dashboard")}
                    >
                        Inicio
                    </NavItem>
                    <NavItem
                        icon={NAV_ICONS.recipes}
                        active={route.page === "recipes"}
                        onClick={() => setPage("recipes")}
                    >
                        Recetas
                    </NavItem>
                    <NavItem icon={NAV_ICONS.plan} active={route.page === "plan"} onClick={() => setPage("plan")}>
                        Plan semanal
                    </NavItem>
                    <NavItem
                        icon={NAV_ICONS.history}
                        active={route.page === "history"}
                        onClick={() => setPage("history")}
                    >
                        Historial
                    </NavItem>
                    <div className="nav-group-label">Cocina</div>
                    <NavItem icon={NAV_ICONS.pantry} active={route.page === "pantry"} onClick={() => setPage("pantry")}>
                        Despensa
                    </NavItem>
                    <NavItem
                        icon={NAV_ICONS.shopping}
                        active={route.page === "shopping"}
                        onClick={() => setPage("shopping")}
                    >
                        Compras
                    </NavItem>
                    <NavItem
                        icon={NAV_ICONS.spending}
                        active={route.page === "spending"}
                        onClick={() => setPage("spending")}
                    >
                        Gastos
                    </NavItem>
                    <div className="nav-group-label">Más</div>
                    <NavItem
                        icon={NAV_ICONS.profiles}
                        active={route.page === "profiles"}
                        onClick={() => setPage("profiles")}
                    >
                        Perfiles
                    </NavItem>
                    <NavItem icon={NAV_ICONS.drinks} active={route.page === "drinks"} onClick={() => setPage("drinks")}>
                        Bebidas
                    </NavItem>
                    <NavItem
                        icon={NAV_ICONS.settings}
                        active={route.page === "settings"}
                        onClick={() => setPage("settings")}
                    >
                        Ajustes
                    </NavItem>
                </nav>
                <div className="sidebar-foot">
                    <div className="week-dot">Hoy · {DAY_LABELS[dayKeyOf(toISODate(new Date()))]}</div>
                </div>
            </aside>
            <main className="main">
                <header className="topbar">
                    <div className="topbar-title">
                        {activeProfile ? (
                            <>
                                <span className="avatar">{activeProfile.name.slice(0, 1).toUpperCase()}</span>
                                <span>Hola, {activeProfile.name.split(" ")[0]}</span>
                                <TopBarClock />
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
