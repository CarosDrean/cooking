import { useActivateProfile, useActiveProfile, useAppState } from "./api/hooks";
import { dayKeyOf, toISODate } from "./lib/format";
import { useRoute } from "./lib/router";
import CookingMode from "./pages/CookingMode";
import Dashboard from "./pages/Dashboard";
import HistoryPage from "./pages/History";
import PantryPage from "./pages/Pantry";
import ProfilesPage from "./pages/Profiles";
import RecipeDetail from "./pages/RecipeDetail";
import Recipes from "./pages/Recipes";
import ShoppingPage from "./pages/Shopping";
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
    const activate = useActivateProfile();

    const setPage = (page: string) => {
        window.location.hash = `/${page}`;
    };

    const loading = !state;
    const error = state === undefined;

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
            case "profiles":
                content = <ProfilesPage />;
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
                    <NavItem active={route.page === "profiles"} onClick={() => setPage("profiles")}>
                        Perfiles
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
                                <span className="topbar-sub">Perfil activo: {activeProfile.name}</span>
                            </>
                        ) : (
                            <span>Hola</span>
                        )}
                    </div>
                    <div className="topbar-actions">
                        <button className="btn ghost" onClick={() => setPage("profiles")}>
                            Cambiar perfil
                        </button>
                        {state?.profiles.length ? (
                            <select
                                className="profile-switch"
                                value={state.activeProfileId ?? ""}
                                onChange={(e) => activate.mutate(e.target.value)}
                            >
                                {state.profiles.map((p) => (
                                    <option key={p.id} value={p.id}>
                                        {p.name}
                                    </option>
                                ))}
                            </select>
                        ) : null}
                    </div>
                </header>
                <div className="content">{content}</div>
            </main>
        </div>
    );
}
