import { Router } from "express";
import { getState } from "../db.js";
import { buildSpendingReport, type SpendingPeriod } from "../services/spending.js";

export const spendingRouter = Router();

const VALID_PERIODS = new Set<SpendingPeriod>(["week", "month", "year"]);

spendingRouter.get("/", (req, res) => {
    const state = getState();
    const raw = typeof req.query.period === "string" ? req.query.period : "week";
    const period: SpendingPeriod = VALID_PERIODS.has(raw as SpendingPeriod) ? (raw as SpendingPeriod) : "week";
    res.json(buildSpendingReport(state, period));
});
