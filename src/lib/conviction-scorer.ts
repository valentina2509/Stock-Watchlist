import { db } from "@/db";
import { convictionScores, theses, watchlistItems } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const YFClass = require("yahoo-finance2").default as new () => {
  quoteSummary(ticker: string, opts: { modules: string[] }): Promise<Record<string, unknown>>;
  historical(ticker: string, opts: { period1: Date; period2: Date; interval: string }): Promise<Array<{
    date: Date; close: number; adjClose?: number;
  }>>;
};
const yf = new YFClass();

export interface ScoreComponent {
  score: number;  // 0–20
  reasons: string[];
}

export interface ConvictionBreakdown {
  fundamental: ScoreComponent;
  valuation: ScoreComponent;
  momentum: ScoreComponent;
  thesis: ScoreComponent;
  whyNow: ScoreComponent;
  total: number;
  band: "WATCH" | "RESEARCH" | "BUILDING" | "HIGH" | "CONVICTION";
}

function scoreBand(total: number): ConvictionBreakdown["band"] {
  if (total >= 80) return "CONVICTION";
  if (total >= 60) return "HIGH";
  if (total >= 40) return "BUILDING";
  if (total >= 20) return "RESEARCH";
  return "WATCH";
}

// ─── Component 1: Fundamental Quality (0–20) ──────────────────────────────────
async function fundamentalComponent(ticker: string): Promise<ScoreComponent> {
  const reasons: string[] = [];
  let score = 0;

  try {
    const summary = await yf.quoteSummary(ticker, {
      modules: ["financialData", "defaultKeyStatistics"],
    }) as {
      financialData?: {
        returnOnEquity?: number;
        grossMargins?: number;
        operatingMargins?: number;
        revenueGrowth?: number;
        debtToEquity?: number;
      };
      defaultKeyStatistics?: {
        returnOnAssets?: number;
        pegRatio?: number;
      };
    };

    const fd = summary?.financialData;

    // Revenue growth
    const revGrowth = fd?.revenueGrowth;
    if (revGrowth != null) {
      if (revGrowth >= 0.2)       { score += 5; reasons.push(`Strong revenue growth: ${(revGrowth * 100).toFixed(0)}%`); }
      else if (revGrowth >= 0.1)  { score += 4; reasons.push(`Solid revenue growth: ${(revGrowth * 100).toFixed(0)}%`); }
      else if (revGrowth >= 0.05) { score += 2; reasons.push(`Modest revenue growth: ${(revGrowth * 100).toFixed(0)}%`); }
      else                        { reasons.push(`Weak revenue growth: ${(revGrowth * 100).toFixed(0)}%`); }
    } else {
      reasons.push("Revenue growth data unavailable");
    }

    // Gross margin
    const grossMargin = fd?.grossMargins;
    if (grossMargin != null) {
      if (grossMargin >= 0.6)      { score += 5; reasons.push(`Excellent gross margin: ${(grossMargin * 100).toFixed(0)}%`); }
      else if (grossMargin >= 0.4) { score += 4; reasons.push(`Strong gross margin: ${(grossMargin * 100).toFixed(0)}%`); }
      else if (grossMargin >= 0.25){ score += 2; reasons.push(`Adequate gross margin: ${(grossMargin * 100).toFixed(0)}%`); }
      else                         { reasons.push(`Thin gross margin: ${(grossMargin * 100).toFixed(0)}%`); }
    } else {
      reasons.push("Gross margin data unavailable");
    }

    // Return on equity
    const roe = fd?.returnOnEquity;
    if (roe != null) {
      if (roe >= 0.25)      { score += 5; reasons.push(`Excellent ROE: ${(roe * 100).toFixed(0)}%`); }
      else if (roe >= 0.15) { score += 4; reasons.push(`Strong ROE: ${(roe * 100).toFixed(0)}%`); }
      else if (roe >= 0.08) { score += 2; reasons.push(`Adequate ROE: ${(roe * 100).toFixed(0)}%`); }
      else                  { reasons.push(`Weak ROE: ${(roe * 100).toFixed(0)}%`); }
    } else {
      reasons.push("ROE data unavailable");
    }

    // Debt/equity (Yahoo returns as a percentage e.g. 79.5 = 0.795)
    const de = fd?.debtToEquity;
    if (de != null) {
      const deRatio = de / 100;
      if (deRatio < 0.3)      { score += 5; reasons.push(`Low leverage: D/E ${deRatio.toFixed(2)}`); }
      else if (deRatio < 0.7) { score += 4; reasons.push(`Moderate leverage: D/E ${deRatio.toFixed(2)}`); }
      else if (deRatio < 1.5) { score += 2; reasons.push(`Elevated leverage: D/E ${deRatio.toFixed(2)}`); }
      else                    { reasons.push(`High leverage: D/E ${deRatio.toFixed(2)}`); }
    } else {
      reasons.push("Leverage data unavailable");
    }
  } catch {
    reasons.push("Could not fetch fundamental data");
  }

  return { score: Math.min(20, score), reasons };
}

// ─── Component 2: Valuation (0–20) ────────────────────────────────────────────
async function valuationComponent(ticker: string): Promise<ScoreComponent> {
  const reasons: string[] = [];
  let score = 0;

  try {
    const summary = await yf.quoteSummary(ticker, {
      modules: ["defaultKeyStatistics", "summaryDetail"],
    }) as {
      defaultKeyStatistics?: {
        pegRatio?: number;
        enterpriseToEbitda?: number;
        priceToBook?: number;
      };
      summaryDetail?: {
        forwardPE?: number;
        trailingPE?: number;
      };
    };

    const ks = summary?.defaultKeyStatistics;
    const sd = summary?.summaryDetail;

    // Forward P/E
    const fpe = sd?.forwardPE;
    if (fpe != null && fpe > 0) {
      if (fpe < 12)      { score += 6; reasons.push(`Cheap forward P/E: ${fpe.toFixed(1)}x`); }
      else if (fpe < 18) { score += 5; reasons.push(`Reasonable forward P/E: ${fpe.toFixed(1)}x`); }
      else if (fpe < 25) { score += 3; reasons.push(`Fair forward P/E: ${fpe.toFixed(1)}x`); }
      else if (fpe < 35) { score += 1; reasons.push(`Elevated forward P/E: ${fpe.toFixed(1)}x`); }
      else               { reasons.push(`Expensive forward P/E: ${fpe.toFixed(1)}x`); }
    } else {
      reasons.push("Forward P/E data unavailable");
    }

    // PEG ratio
    const peg = ks?.pegRatio;
    if (peg != null && peg > 0) {
      if (peg < 1)       { score += 6; reasons.push(`Attractive PEG: ${peg.toFixed(2)}`); }
      else if (peg < 1.5){ score += 4; reasons.push(`Acceptable PEG: ${peg.toFixed(2)}`); }
      else if (peg < 2)  { score += 2; reasons.push(`Stretched PEG: ${peg.toFixed(2)}`); }
      else               { reasons.push(`High PEG: ${peg.toFixed(2)}`); }
    } else {
      reasons.push("PEG ratio data unavailable");
    }

    // EV/EBITDA
    const evEbitda = ks?.enterpriseToEbitda;
    if (evEbitda != null && evEbitda > 0) {
      if (evEbitda < 8)       { score += 5; reasons.push(`Cheap EV/EBITDA: ${evEbitda.toFixed(1)}x`); }
      else if (evEbitda < 14) { score += 3; reasons.push(`Reasonable EV/EBITDA: ${evEbitda.toFixed(1)}x`); }
      else if (evEbitda < 20) { score += 1; reasons.push(`Rich EV/EBITDA: ${evEbitda.toFixed(1)}x`); }
      else                    { reasons.push(`Expensive EV/EBITDA: ${evEbitda.toFixed(1)}x`); }
    } else {
      reasons.push("EV/EBITDA data unavailable");
    }

    // Price/Book
    const pb = ks?.priceToBook;
    if (pb != null && pb > 0 && pb < 1.5) {
      score += 3; reasons.push(`Below-book P/B: ${pb.toFixed(2)}x`);
    }
  } catch {
    reasons.push("Could not fetch valuation data");
  }

  return { score: Math.min(20, score), reasons };
}

// ─── Component 3: Momentum (0–20) ─────────────────────────────────────────────
async function momentumComponent(ticker: string): Promise<ScoreComponent> {
  const reasons: string[] = [];
  let score = 0;

  try {
    const start = new Date();
    start.setDate(start.getDate() - 210);

    const bars = await yf.historical(ticker, { period1: start, period2: new Date(), interval: "1d" });
    if (!bars || bars.length < 20) {
      reasons.push("Insufficient price history");
      return { score: 10, reasons };
    }

    const closes = bars.map((b) => b.adjClose ?? b.close);
    const latest = closes[closes.length - 1];

    const ma20  = closes.slice(-20).reduce((a, b) => a + b, 0) / 20;
    const ma50  = closes.length >= 50  ? closes.slice(-50).reduce((a, b) => a + b, 0) / 50   : null;
    const ma200 = closes.length >= 200 ? closes.slice(-200).reduce((a, b) => a + b, 0) / 200 : null;

    // Price vs 200-day MA
    if (ma200 != null) {
      if (latest > ma200 * 1.05)       { score += 5; reasons.push(`Price ${((latest / ma200 - 1) * 100).toFixed(0)}% above 200d MA`); }
      else if (latest > ma200)         { score += 3; reasons.push("Price above 200-day MA"); }
      else if (latest > ma200 * 0.95)  { score += 1; reasons.push("Price near 200-day MA"); }
      else                             { reasons.push(`Price ${((1 - latest / ma200) * 100).toFixed(0)}% below 200d MA`); }
    }

    // 50 vs 200 (trend structure)
    if (ma50 != null && ma200 != null) {
      if (ma50 > ma200 * 1.02) { score += 5; reasons.push("Golden cross: 50d above 200d MA"); }
      else if (ma50 > ma200)   { score += 3; reasons.push("50-day MA above 200-day MA"); }
      else                     { reasons.push("50-day MA below 200-day MA"); }
    }

    // Price vs 20-day MA
    if (latest > ma20 * 1.03)      { score += 5; reasons.push(`${((latest / ma20 - 1) * 100).toFixed(0)}% above 20d MA`); }
    else if (latest > ma20)        { score += 3; reasons.push("Price above 20-day MA"); }
    else                           { reasons.push("Price below 20-day MA"); }

    // 1-month return
    const monthAgo = closes[Math.max(0, closes.length - 22)];
    const monthReturn = (latest / monthAgo - 1) * 100;
    if (monthReturn > 10)       { score += 5; reasons.push(`Strong 1-month return: +${monthReturn.toFixed(1)}%`); }
    else if (monthReturn > 3)   { score += 3; reasons.push(`Positive 1-month return: +${monthReturn.toFixed(1)}%`); }
    else if (monthReturn > -3)  { score += 1; reasons.push(`Flat 1-month return: ${monthReturn.toFixed(1)}%`); }
    else                        { reasons.push(`Negative 1-month return: ${monthReturn.toFixed(1)}%`); }
  } catch {
    reasons.push("Could not compute momentum");
    return { score: 10, reasons };
  }

  return { score: Math.min(20, score), reasons };
}

// ─── Component 4: Thesis Quality (0–20) ───────────────────────────────────────
function thesisComponent(thesis: {
  bullCase: string | null;
  bearCase: string | null;
  keyAssumptions: string | null;
  targetPrice: number | null;
  timeHorizon: string | null;
  driftStatus: string;
} | null): ScoreComponent {
  const reasons: string[] = [];
  let score = 0;

  if (!thesis) {
    reasons.push("No thesis documented yet");
    return { score: 0, reasons };
  }

  if (thesis.bullCase && thesis.bullCase.length > 50) {
    score += 5; reasons.push("Bull case documented");
  } else {
    reasons.push("Bull case missing or too brief");
  }

  if (thesis.bearCase && thesis.bearCase.length > 50) {
    score += 5; reasons.push("Bear case documented");
  } else {
    reasons.push("Bear case missing or too brief");
  }

  try {
    const assumptions = thesis.keyAssumptions ? JSON.parse(thesis.keyAssumptions) as unknown[] : [];
    if (Array.isArray(assumptions) && assumptions.length >= 2) {
      score += 5; reasons.push(`${assumptions.length} key assumptions documented`);
    } else {
      reasons.push("Key assumptions incomplete (need ≥ 2)");
    }
  } catch {
    reasons.push("Key assumptions invalid JSON");
  }

  if (thesis.targetPrice != null && thesis.timeHorizon) {
    score += 5; reasons.push(`Price target $${thesis.targetPrice} (${thesis.timeHorizon})`);
  } else if (thesis.targetPrice != null) {
    score += 3; reasons.push(`Price target $${thesis.targetPrice} (no horizon set)`);
  } else {
    reasons.push("No price target set");
  }

  if (thesis.driftStatus === "BROKEN") {
    score = Math.max(0, score - 10);
    reasons.push("⚠ Thesis marked BROKEN — review urgently");
  } else if (thesis.driftStatus === "DIVERGING") {
    score = Math.max(0, score - 5);
    reasons.push("⚠ Key assumptions diverging from reality");
  } else if (thesis.driftStatus === "CONFIRMING") {
    score = Math.min(20, score + 2);
    reasons.push("Thesis assumptions confirming");
  }

  return { score: Math.min(20, score), reasons };
}

// ─── Component 5: Why Now (0–20) ──────────────────────────────────────────────
async function whyNowComponent(ticker: string): Promise<ScoreComponent> {
  const reasons: string[] = [];
  let score = 0;

  try {
    const summary = await yf.quoteSummary(ticker, {
      modules: ["earningsTrend", "upgradeDowngradeHistory", "calendarEvents"],
    }) as {
      earningsTrend?: {
        trend?: Array<{
          period?: string;
          epsTrend?: { current?: number; "7daysAgo"?: number };
        }>;
      };
      upgradeDowngradeHistory?: {
        history?: Array<{
          epochGradeDate?: string | Date;
          firm?: string;
          toGrade?: string;
          action?: string;
        }>;
      };
      calendarEvents?: {
        earnings?: {
          earningsDate?: Array<string | Date>;
        };
      };
    };

    // Recent analyst upgrades (last 30 days)
    const cutoff30 = Date.now() - 30 * 86400 * 1000; // ms
    const history = summary?.upgradeDowngradeHistory?.history ?? [];
    const recentHistory = history.filter((h) => {
      if (!h.epochGradeDate) return false;
      const ts = new Date(h.epochGradeDate).getTime();
      return ts > cutoff30;
    });
    const recentUpgrades = recentHistory.filter(
      (h) => h.action === "up" || (h.toGrade?.toLowerCase().includes("buy")) || (h.toGrade?.toLowerCase().includes("overweight"))
    );

    if (recentUpgrades.length > 0) {
      score += 5;
      reasons.push(`${recentUpgrades.length} analyst upgrade(s) in last 30 days`);
    } else if (recentHistory.length > 0) {
      score += 2;
      reasons.push(`${recentHistory.length} analyst action(s) in last 30 days`);
    } else {
      reasons.push("No recent analyst activity");
    }

    // Upcoming earnings
    const earningsDates = summary?.calendarEvents?.earnings?.earningsDate ?? [];
    if (earningsDates.length > 0) {
      const nextEarnings = new Date(earningsDates[0]).getTime();
      const daysToEarnings = Math.ceil((nextEarnings - Date.now()) / 86400000);
      if (daysToEarnings > 0 && daysToEarnings <= 7)  { score += 5; reasons.push(`Earnings in ${daysToEarnings} day(s) — catalyst window`); }
      else if (daysToEarnings > 0 && daysToEarnings <= 21) { score += 3; reasons.push(`Earnings in ${daysToEarnings} days`); }
      else if (daysToEarnings > 0 && daysToEarnings <= 60) { score += 1; reasons.push(`Earnings in ${daysToEarnings} days`); }
      else if (daysToEarnings < 0) { reasons.push("Recent earnings passed"); }
    }

    // EPS estimate revision trend
    const trend = summary?.earningsTrend?.trend?.find((t) => t.period === "0q");
    const current = trend?.epsTrend?.current;
    const sevenDaysAgo = trend?.epsTrend?.["7daysAgo"];
    if (current != null && sevenDaysAgo != null && sevenDaysAgo !== 0) {
      const revision = (current / sevenDaysAgo - 1) * 100;
      if (revision > 2)        { score += 5; reasons.push(`EPS estimates revised up ${revision.toFixed(1)}%`); }
      else if (revision > 0)   { score += 2; reasons.push(`EPS estimates slightly revised up`); }
      else if (revision < -2)  { reasons.push(`EPS estimates revised down ${Math.abs(revision).toFixed(1)}%`); }
      else                     { reasons.push("EPS estimates stable"); }
    }

    // Active analyst coverage baseline
    if (history.length > 0) {
      score += 3; reasons.push("Active analyst coverage");
    }
  } catch {
    reasons.push("Could not fetch catalyst data");
    return { score: 5, reasons };
  }

  return { score: Math.min(20, score), reasons };
}

// ─── Main Entry Point ──────────────────────────────────────────────────────────
export async function calculateAndPersistScore(watchlistItemId: number): Promise<ConvictionBreakdown> {
  const item = await db.query.watchlistItems.findFirst({
    where: eq(watchlistItems.id, watchlistItemId),
    with: { stock: true },
  });
  if (!item) throw new Error("Watchlist item not found");

  const ticker = item.stock.ticker;

  const thesis = await db.query.theses.findFirst({
    where: eq(theses.watchlistItemId, watchlistItemId),
    orderBy: [desc(theses.version)],
  });

  const [fundamental, valuation, momentum, whyNow] = await Promise.all([
    fundamentalComponent(ticker),
    valuationComponent(ticker),
    momentumComponent(ticker),
    whyNowComponent(ticker),
  ]);
  const thesisComp = thesisComponent(thesis ?? null);

  const total = fundamental.score + valuation.score + momentum.score + thesisComp.score + whyNow.score;
  const band = scoreBand(total);

  await db.insert(convictionScores).values({
    watchlistItemId,
    fundamentalScore: fundamental.score,
    valuationScore: valuation.score,
    momentumScore: momentum.score,
    thesisScore: thesisComp.score,
    whyNowScore: whyNow.score,
    totalScore: total,
    scoreBand: band,
    calculatedAt: new Date(),
  });

  return { fundamental, valuation, momentum, thesis: thesisComp, whyNow, total, band };
}
