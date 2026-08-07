import express from "express";
import { getState } from "./db.js";
import { historyRouter } from "./routes/history.js";
import { ingredientsRouter } from "./routes/ingredients.js";
import { pantryRouter } from "./routes/pantry.js";
import { planRouter } from "./routes/plan.js";
import { profilesRouter } from "./routes/profiles.js";
import { recipesRouter } from "./routes/recipes.js";
import { recommendationsRouter } from "./routes/recommendations.js";
import { settingsRouter } from "./routes/settings.js";
import { shoppingRouter } from "./routes/shopping.js";
import { themealdbRouter } from "./routes/themealdb.js";
import { tipsRouter } from "./routes/tips.js";

const app = express();
const PORT = Number.parseInt(process.env.PORT ?? "3001", 10);

app.use(express.json({ limit: "1mb" }));

app.use((req, _res, next) => {
    console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
    next();
});

app.get("/api/health", (_req, res) => {
    res.json({ ok: true });
});

app.get("/api/state", (_req, res) => {
    res.json(getState());
});

app.use("/api/profiles", profilesRouter);
app.use("/api/recipes", recipesRouter);
app.use("/api/pantry", pantryRouter);
app.use("/api/ingredients", ingredientsRouter);
app.use("/api/plan", planRouter);
app.use("/api/history", historyRouter);
app.use("/api/shopping", shoppingRouter);
app.use("/api/recommendations", recommendationsRouter);
app.use("/api/settings", settingsRouter);
app.use("/api/tips", tipsRouter);
app.use("/api/themealdb", themealdbRouter);

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error(err);
    res.status(500).json({ error: "Error interno del servidor" });
});

app.listen(PORT, () => {
    console.log(`API escuchando en http://localhost:${PORT}`);
});
