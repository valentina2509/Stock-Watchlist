import { db } from "@/db";
import { whyNowScores, stocks, watchlistItems } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const YFClass = require("yahoo-finance2").default as new () => {
  quoteSummary(ticker: string, opts: { modules: string[] }): Promise<Record<string, unknown>>;
  quote(ticker: string): Promise<{
    regularMarketChangePercent?: number;
    fiftyTwoWeekHighChangePercent?: number;
    fiftyTwoWeekChangePercent?: number;
    fiftyDayAverageChangePercent?: number;
    twoHundredDayAverageChangePercent?: number;
    regularMarketPrice?: number;
    fiftyTwoWeekHigh?: number;
  }>;
  historical(ticker: string, opts: { period1: Date; period2: Date; interval: string }): Promise<Array<{
    date: Date; close: number; adjClose?: number; volume?: number;
  }>>;
  insights(ticker: string): Promise<{
    sigDevs?: Array<{ headline?: string; date?: string }>;
    companySnapshot?: { sectorInfo?: string };
  }>;
};
const yf = new YFClass();

// BPMN 03 weights
const WEIGHTS = {
  EARNINGS_CATALYST:  0.20,
  FILING:             0.15,
  ANALYST_UPGRADE:    0.15,
  TECHNICAL_BREAKOUT: 0.15,
  MACRO_TAILWIND:     0.15,
  NEWS_SENTIMENT:     0.10,
  INSIDER_BUYING:     0.10,
} as const;

export type SignalType = keyof typeof WEIGHTS;

export interface SignalResult {
  type: SignalType;
  score: number;       // 0–100
  weight: number;
  label: string;
  reasons: string[];
}

export interface WhyNowBreakdown {
  signals: SignalResult[];
  totalScore: number;
  isHotWindow: boolean;
  calculatedAt: string;
}

// ─── Sector ETF lookup ────────────────────────────────────────────────────────
const SECTOR_ETF: Record<string, string> = {
  "Technology": "XLK",
  "Financial Services": "XLF",
  "Financials": "XLF",
  "Healthcare": "XLV",
  "Consumer Cyclical": "XLY",
  "Consumer Defensive": "XLP",
  "Energy": "XLE",
  "Basic Materials": "XLB",
  "Materials": "XLB",
  "Industrials": "XLI",
  "Real Estate": "XLRE",
  "Utilities": "XLU",
  "Communication Services": "XLC",
};

// ─── Signal 1: Earnings Catalyst (20%) ───────────────────────────────────────
async function earningsCatalystSignal(ticker: string): Promise<SignalResult> {
  const reasons: string[] = [];
  let score = 30; // baseline — being in research pipeline is already a signal

  try {
    const summary = await yf.quoteSummary(ticker, {
      modules: ["calendarEvents", "earningsHistory", "earningsTrend"],
    }) as {
      calendarEvents?: { earnings?: { earningsDate?: Array<string | Date> } };
      earningsHistory?: { history?: Array<{ epsActual?: number; epsEstimate?: number; surprisePercent?: number; quarter?: Date }> };
      earningsTrend?: { trend?: Array<{ period?: string; epsTrend?: { current?: number; "30daysAgo"?: number }; revenueEstimate?: { avg?: number; growth?: number } }> };
    };

    // Upcoming earnings date
    const earningsDates = summary?.calendarEvents?.earnings?.earningsDate ?? [];
    if (earningsDates.length > 0) {
      const nextMs = new Date(earningsDates[0]).getTime();
      const daysAway = Math.ceil((nextMs - Date.now()) / 86400000);
      if (daysAway > 0 && daysAway <= 3)       { score += 55; reasons.push(`Earnings in ${daysAway} day(s) — imminent catalyst`); }
      else if (daysAway > 0 && daysAway <= 7)  { score += 45; reasons.push(`Earnings in ${daysAway} days — catalyst window open`); }
      else if (daysAway > 0 && daysAway <= 21) { score += 30; reasons.push(`Earnings in ${daysAway} days`); }
      else if (daysAway > 0 && daysAway <= 60) { score += 15; reasons.push(`Earnings in ${daysAway} days`); }
      else if (daysAway < 0)                   { reasons.push(`Last earnings ${Math.abs(daysAway)} days ago`); }
    }

    // Most recent earnings surprise
    const history = summary?.earningsHistory?.history ?? [];
    if (history.length > 0) {
      const latest = history[history.length - 1];
      const surprise = latest.surprisePercent;
      if (surprise != null) {
        if (surprise >= 10)     { score += 15; reasons.push(`Last quarter: beat by ${surprise.toFixed(1)}%`); }
        else if (surprise >= 3) { score += 8;  reasons.push(`Last quarter: beat by ${surprise.toFixed(1)}%`); }
        else if (surprise < -3) { score -= 10; reasons.push(`Last quarter: missed by ${Math.abs(surprise).toFixed(1)}%`); }
        else                    { reasons.push("Last quarter: in-line with estimates"); }
      }
    }

    // EPS estimate trend
    const trend = summary?.earningsTrend?.trend?.find(t => t.period === "0q");
    const current = trend?.epsTrend?.current;
    const month = trend?.epsTrend?.["30daysAgo"];
    if (current != null && month != null && month !== 0) {
      const revPct = (current / month - 1) * 100;
      if (revPct >= 5)       { score += 10; reasons.push(`EPS estimates revised up ${revPct.toFixed(0)}% in 30 days`); }
      else if (revPct >= 1)  { score += 5;  reasons.push(`EPS estimates nudged up in 30 days`); }
      else if (revPct <= -5) { score -= 8;  reasons.push(`EPS estimates cut ${Math.abs(revPct).toFixed(0)}% in 30 days`); }
    }
  } catch {
    reasons.push("Earnings data unavailable");
  }

  return { type: "EARNINGS_CATALYST", score: clamp(score), weight: WEIGHTS.EARNINGS_CATALYST, label: "Earnings Catalyst", reasons };
}

// ─── Signal 2: SEC Filing Activity (15%) ─────────────────────────────────────
async function filingSignal(ticker: string): Promise<SignalResult> {
  const reasons: string[] = [];
  let score = 20;

  try {
    const summary = await yf.quoteSummary(ticker, { modules: ["secFilings"] }) as {
      secFilings?: { filings?: Array<{ date?: string; type?: string; title?: string }> };
    };

    const filings = summary?.secFilings?.filings ?? [];
    const cutoff30 = Date.now() - 30 * 86400 * 1000;
    const cutoff14 = Date.now() - 14 * 86400 * 1000;

    const recent8K = filings.filter(f => {
      const ts = f.date ? new Date(f.date).getTime() : 0;
      return ts > cutoff30 && f.type === "8-K";
    });
    const recent8K14d = recent8K.filter(f => new Date(f.date!).getTime() > cutoff14);

    if (recent8K14d.length > 0) {
      score += 60;
      reasons.push(`${recent8K14d.length} material 8-K filing(s) in last 14 days`);
      reasons.push(`"${recent8K14d[0].title?.slice(0, 60)}…"`);
    } else if (recent8K.length > 0) {
      score += 35;
      reasons.push(`${recent8K.length} material 8-K filing(s) in last 30 days`);
    } else {
      reasons.push("No recent 8-K material events");
    }

    // Check for recent 10-Q or 10-K (shows fresh disclosure)
    const recentPeriodic = filings.filter(f => {
      const ts = f.date ? new Date(f.date).getTime() : 0;
      return ts > cutoff30 && (f.type === "10-Q" || f.type === "10-K");
    });
    if (recentPeriodic.length > 0) {
      score += 15;
      reasons.push(`Fresh ${recentPeriodic[0].type} filed recently`);
    }
  } catch {
    reasons.push("SEC filing data unavailable");
  }

  return { type: "FILING", score: clamp(score), weight: WEIGHTS.FILING, label: "SEC Filing Activity", reasons };
}

// ─── Signal 3: Analyst Upgrade (15%) ─────────────────────────────────────────
async function analystSignal(ticker: string): Promise<SignalResult> {
  const reasons: string[] = [];
  let score = 30;

  try {
    const summary = await yf.quoteSummary(ticker, {
      modules: ["upgradeDowngradeHistory", "recommendationTrend"],
    }) as {
      upgradeDowngradeHistory?: { history?: Array<{ epochGradeDate?: string; toGrade?: string; fromGrade?: string; action?: string; firm?: string }> };
      recommendationTrend?: { trend?: Array<{ period?: string; strongBuy?: number; buy?: number; hold?: number; sell?: number; strongSell?: number }> };
    };

    const cutoff30 = Date.now() - 30 * 86400 * 1000;
    const cutoff7  = Date.now() - 7  * 86400 * 1000;
    const history  = summary?.upgradeDowngradeHistory?.history ?? [];

    const recent30 = history.filter(h => h.epochGradeDate && new Date(h.epochGradeDate).getTime() > cutoff30);
    const recent7  = history.filter(h => h.epochGradeDate && new Date(h.epochGradeDate).getTime() > cutoff7);

    const upgrades30 = recent30.filter(h => h.action === "up" || h.toGrade?.toLowerCase().includes("buy") || h.toGrade?.toLowerCase().includes("overweight") || h.toGrade?.toLowerCase().includes("outperform"));
    const upgrades7  = recent7.filter(h =>  h.action === "up" || h.toGrade?.toLowerCase().includes("buy") || h.toGrade?.toLowerCase().includes("overweight") || h.toGrade?.toLowerCase().includes("outperform"));
    const downgrades30 = recent30.filter(h => h.action === "down" || h.toGrade?.toLowerCase().includes("sell") || h.toGrade?.toLowerCase().includes("underperform") || h.toGrade?.toLowerCase().includes("underweight"));

    if (upgrades7.length >= 2)       { score += 55; reasons.push(`${upgrades7.length} analyst upgrades in last 7 days`); }
    else if (upgrades7.length === 1) { score += 35; reasons.push(`1 analyst upgrade in last 7 days (${upgrades7[0].firm ?? ""})`); }
    else if (upgrades30.length >= 3) { score += 30; reasons.push(`${upgrades30.length} analyst upgrades in last 30 days`); }
    else if (upgrades30.length >= 1) { score += 20; reasons.push(`${upgrades30.length} analyst upgrade(s) in last 30 days`); }
    else                             { reasons.push("No recent analyst upgrades"); }

    if (downgrades30.length > upgrades30.length) {
      score -= 20;
      reasons.push(`${downgrades30.length} downgrade(s) outweigh upgrades`);
    }

    // Recommendation distribution
    const trend = summary?.recommendationTrend?.trend?.[0]; // 0m = current month
    if (trend) {
      const totalAnalysts = (trend.strongBuy ?? 0) + (trend.buy ?? 0) + (trend.hold ?? 0) + (trend.sell ?? 0) + (trend.strongSell ?? 0);
      const bullish = (trend.strongBuy ?? 0) + (trend.buy ?? 0);
      if (totalAnalysts > 0) {
        const bullPct = (bullish / totalAnalysts) * 100;
        if (bullPct >= 75) { score += 15; reasons.push(`${bullPct.toFixed(0)}% of analysts bullish (${bullish}/${totalAnalysts})`); }
        else if (bullPct >= 50) { score += 5; reasons.push(`${bullPct.toFixed(0)}% of analysts bullish`); }
        else { reasons.push(`Only ${bullPct.toFixed(0)}% of analysts bullish`); }
      }
    }
  } catch {
    reasons.push("Analyst data unavailable");
  }

  return { type: "ANALYST_UPGRADE", score: clamp(score), weight: WEIGHTS.ANALYST_UPGRADE, label: "Analyst Activity", reasons };
}

// ─── Signal 4: Technical Breakout (15%) ──────────────────────────────────────
async function technicalSignal(ticker: string): Promise<SignalResult> {
  const reasons: string[] = [];
  let score = 30;

  try {
    const [q, bars] = await Promise.all([
      yf.quote(ticker),
      yf.historical(ticker, {
        period1: (() => { const d = new Date(); d.setDate(d.getDate() - 70); return d; })(),
        period2: new Date(),
        interval: "1d",
      }),
    ]);

    const latest = q.regularMarketPrice ?? 0;
    const w52high = q.fiftyTwoWeekHigh ?? 0;
    const w52ChangePct = (q.fiftyTwoWeekChangePercent ?? 0) * 100;

    // 52-week high proximity
    if (w52high > 0) {
      const pctBelow52wHigh = ((w52high - latest) / w52high) * 100;
      if (pctBelow52wHigh <= 2)       { score += 45; reasons.push(`At 52-week high (${pctBelow52wHigh.toFixed(1)}% below)`); }
      else if (pctBelow52wHigh <= 5)  { score += 30; reasons.push(`Within 5% of 52-week high`); }
      else if (pctBelow52wHigh <= 10) { score += 15; reasons.push(`Within 10% of 52-week high`); }
      else if (pctBelow52wHigh >= 30) { score -= 10; reasons.push(`${pctBelow52wHigh.toFixed(0)}% below 52-week high`); }
      else { reasons.push(`${pctBelow52wHigh.toFixed(0)}% below 52-week high`); }
    }

    if (bars.length >= 20) {
      const closes = bars.map(b => b.adjClose ?? b.close);
      const volumes = bars.map(b => b.volume ?? 0);
      const latest_close = closes[closes.length - 1];

      // Moving average trend
      const ma20 = closes.slice(-20).reduce((a, b) => a + b, 0) / 20;
      const ma50 = closes.length >= 50 ? closes.slice(-50).reduce((a, b) => a + b, 0) / 50 : null;
      if (latest_close > ma20) { score += 10; reasons.push("Above 20-day MA"); }

      // Volume surge detection (today vs 20-day avg)
      const avgVol = volumes.slice(-20, -1).reduce((a, b) => a + b, 0) / 19;
      const todayVol = volumes[volumes.length - 1];
      if (avgVol > 0 && todayVol > avgVol * 2) { score += 15; reasons.push(`Volume surge: ${(todayVol / avgVol).toFixed(1)}x average`); }
      else if (avgVol > 0 && todayVol > avgVol * 1.5) { score += 7; reasons.push(`Above-average volume: ${(todayVol / avgVol).toFixed(1)}x`); }

      // Breakout from 30-day consolidation range
      if (closes.length >= 30) {
        const range30High = Math.max(...closes.slice(-31, -1));
        const range30Low  = Math.min(...closes.slice(-31, -1));
        if (latest_close > range30High * 0.99) { score += 20; reasons.push("Breaking out of 30-day range"); }
        else if (latest_close < range30Low * 1.01) { score -= 15; reasons.push("Breaking down from 30-day range"); }
      }

      // 1-year performance context
      if (w52ChangePct >= 30)       { score += 5; reasons.push(`+${w52ChangePct.toFixed(0)}% over 1 year`); }
      else if (w52ChangePct <= -20) { reasons.push(`${w52ChangePct.toFixed(0)}% over 1 year`); }

      void ma50; // used implicitly via context
    }
  } catch {
    reasons.push("Price data unavailable");
  }

  return { type: "TECHNICAL_BREAKOUT", score: clamp(score), weight: WEIGHTS.TECHNICAL_BREAKOUT, label: "Technical Breakout", reasons };
}

// ─── Signal 5: Macro Tailwind (15%) ──────────────────────────────────────────
async function macroSignal(ticker: string, sector: string | null): Promise<SignalResult> {
  const reasons: string[] = [];
  let score = 40; // neutral baseline

  try {
    const etfTicker = (sector && SECTOR_ETF[sector]) ? SECTOR_ETF[sector] : null;

    if (etfTicker) {
      const [etfQ, spyQ] = await Promise.all([
        yf.quote(etfTicker),
        yf.quote("SPY"),
      ]);

      const etfChange1y  = (etfQ.fiftyTwoWeekChangePercent ?? 0) * 100;
      const spyChange1y  = (spyQ.fiftyTwoWeekChangePercent ?? 0) * 100;
      const etfChangeDay = etfQ.regularMarketChangePercent ?? 0;
      const etfVs200d    = (etfQ.twoHundredDayAverageChangePercent ?? 0) * 100;

      // Sector relative performance vs SPY (1-year)
      const relativePerf = etfChange1y - spyChange1y;
      if (relativePerf >= 15)       { score += 35; reasons.push(`${sector} sector +${relativePerf.toFixed(0)}% vs S&P 500 (1yr)`); }
      else if (relativePerf >= 5)   { score += 20; reasons.push(`${sector} sector outperforming market by ${relativePerf.toFixed(0)}%`); }
      else if (relativePerf >= -5)  { score += 5;  reasons.push(`${sector} sector in line with market`); }
      else if (relativePerf >= -15) { score -= 10; reasons.push(`${sector} sector underperforming by ${Math.abs(relativePerf).toFixed(0)}%`); }
      else                          { score -= 20; reasons.push(`${sector} sector significantly lagging market`); }

      // Sector trend vs 200-day MA
      if (etfVs200d >= 5)        { score += 10; reasons.push(`${etfTicker} ${etfVs200d.toFixed(0)}% above 200d MA`); }
      else if (etfVs200d <= -5)  { score -= 10; reasons.push(`${etfTicker} below 200d MA`); }

      reasons.push(`${etfTicker} 1-year: ${etfChange1y >= 0 ? "+" : ""}${etfChange1y.toFixed(0)}%`);
    } else {
      // No sector ETF — use S&P 500 health as proxy
      const spyQ = await yf.quote("SPY");
      const spyChange1y = (spyQ.fiftyTwoWeekChangePercent ?? 0) * 100;
      if (spyChange1y >= 10) { score += 15; reasons.push(`Broad market up ${spyChange1y.toFixed(0)}% (1yr)`); }
      else if (spyChange1y <= -10) { score -= 10; reasons.push(`Broad market down ${Math.abs(spyChange1y).toFixed(0)}% (1yr)`); }
      reasons.push("Sector ETF not identified — using market proxy");
    }
  } catch {
    reasons.push("Macro data unavailable");
  }

  return { type: "MACRO_TAILWIND", score: clamp(score), weight: WEIGHTS.MACRO_TAILWIND, label: "Macro Tailwind", reasons };
}

// ─── Signal 6: News Sentiment (10%) ──────────────────────────────────────────
async function newsSignal(ticker: string): Promise<SignalResult> {
  const reasons: string[] = [];
  let score = 35;

  try {
    const data = await yf.insights(ticker);

    const sigDevs = data.sigDevs ?? [];
    const cutoff7  = Date.now() - 7  * 86400 * 1000;
    const cutoff30 = Date.now() - 30 * 86400 * 1000;

    const recent7  = sigDevs.filter(s => s.date && new Date(s.date).getTime() > cutoff7);
    const recent30 = sigDevs.filter(s => s.date && new Date(s.date).getTime() > cutoff30);

    if (recent7.length >= 3)       { score += 45; reasons.push(`${recent7.length} significant developments in last 7 days`); }
    else if (recent7.length >= 1)  { score += 25; reasons.push(`${recent7.length} significant development(s) in last 7 days`); }
    else if (recent30.length >= 3) { score += 15; reasons.push(`${recent30.length} significant developments in last 30 days`); }
    else if (recent30.length >= 1) { score += 8;  reasons.push(`${recent30.length} development(s) in last 30 days`); }
    else                           { reasons.push("No significant news in last 30 days"); }

    if (recent7.length > 0) {
      reasons.push(`Latest: "${recent7[0].headline?.slice(0, 70)}…"`);
    }
  } catch {
    reasons.push("News data unavailable");
  }

  return { type: "NEWS_SENTIMENT", score: clamp(score), weight: WEIGHTS.NEWS_SENTIMENT, label: "News Sentiment", reasons };
}

// ─── Signal 7: Insider Buying (10%) ──────────────────────────────────────────
async function insiderSignal(ticker: string): Promise<SignalResult> {
  const reasons: string[] = [];
  let score = 30;

  try {
    const summary = await yf.quoteSummary(ticker, {
      modules: ["insiderTransactions", "netSharePurchaseActivity"],
    }) as {
      insiderTransactions?: {
        transactions?: Array<{
          startDate?: string | Date;
          shares?: number;
          value?: number;
          transactionText?: string;
          filerName?: string;
          filerRelation?: string;
          ownership?: string;
        }>;
      };
      netSharePurchaseActivity?: {
        period?: string;
        buyInfoCount?: number;
        buyInfoShares?: number;
        sellInfoCount?: number;
        sellInfoShares?: number;
        netInfoCount?: number;
        netPercentInsiderShares?: number;
      };
    };

    const cutoff30 = Date.now() - 30 * 86400 * 1000;
    const cutoff90 = Date.now() - 90 * 86400 * 1000;
    const txns = summary?.insiderTransactions?.transactions ?? [];

    // Filter direct buys (ownership D = direct)
    const recentBuys30 = txns.filter(t => {
      const ts = t.startDate ? new Date(t.startDate).getTime() : 0;
      const isBuy = t.transactionText?.toLowerCase().includes("purchase") || (t.shares ?? 0) > 0 && !t.transactionText?.toLowerCase().includes("sale");
      return ts > cutoff30 && isBuy && t.ownership === "D";
    });
    const recentBuys90 = txns.filter(t => {
      const ts = t.startDate ? new Date(t.startDate).getTime() : 0;
      const isBuy = t.transactionText?.toLowerCase().includes("purchase");
      return ts > cutoff90 && isBuy && t.ownership === "D";
    });

    if (recentBuys30.length >= 3)      { score += 60; reasons.push(`${recentBuys30.length} insider purchases in last 30 days`); }
    else if (recentBuys30.length >= 1) { score += 35; reasons.push(`${recentBuys30.length} insider purchase(s) in last 30 days (${recentBuys30[0].filerName ?? ""})`); }
    else if (recentBuys90.length >= 2) { score += 15; reasons.push(`${recentBuys90.length} insider purchases in last 90 days`); }
    else                               { reasons.push("No recent insider purchases"); }

    // Net share purchase activity
    const net = summary?.netSharePurchaseActivity;
    if (net) {
      const buys   = net.buyInfoCount  ?? 0;
      const sells  = net.sellInfoCount ?? 0;
      if (buys > 0 && buys >= sells)   { score += 10; reasons.push(`Net insider buying: ${buys} buy transactions vs ${sells} sells`); }
      else if (sells > buys * 2)       { score -= 15; reasons.push(`Net insider selling: ${sells} sell transactions vs ${buys} buys`); }
    }

    // Check for significant sell activity in last 30 days
    const recentSells30 = txns.filter(t => {
      const ts = t.startDate ? new Date(t.startDate).getTime() : 0;
      return ts > cutoff30 && t.transactionText?.toLowerCase().includes("sale") && t.ownership === "D" && (t.value ?? 0) > 1_000_000;
    });
    if (recentSells30.length >= 3) {
      score -= 20;
      reasons.push(`${recentSells30.length} large insider sales in last 30 days`);
    }
  } catch {
    reasons.push("Insider data unavailable");
  }

  return { type: "INSIDER_BUYING", score: clamp(score), weight: WEIGHTS.INSIDER_BUYING, label: "Insider Activity", reasons };
}

// ─── Main Entry Point ─────────────────────────────────────────────────────────
export async function calculateWhyNow(watchlistItemId: number): Promise<WhyNowBreakdown> {
  const item = await db.query.watchlistItems.findFirst({
    where: eq(watchlistItems.id, watchlistItemId),
    with: { stock: true },
  });
  if (!item) throw new Error("Watchlist item not found");

  const { ticker, id: stockId, sector } = item.stock;

  // Run all 7 signals in parallel
  const [earnings, filing, analyst, technical, macro, news, insider] = await Promise.all([
    earningsCatalystSignal(ticker),
    filingSignal(ticker),
    analystSignal(ticker),
    technicalSignal(ticker),
    macroSignal(ticker, sector),
    newsSignal(ticker),
    insiderSignal(ticker),
  ]);

  const signals = [earnings, filing, analyst, technical, macro, news, insider];
  const totalScore = Math.round(
    signals.reduce((sum, s) => sum + s.score * s.weight, 0)
  );
  const isHotWindow = totalScore >= 70;
  const now = new Date();

  await db.insert(whyNowScores).values({
    stockId,
    totalScore,
    isHotWindow,
    breakdown: JSON.stringify({ signals }),
    calculatedAt: now,
  });

  return { signals, totalScore, isHotWindow, calculatedAt: now.toISOString() };
}

export async function getLatestWhyNow(stockId: number): Promise<WhyNowBreakdown | null> {
  const row = await db.query.whyNowScores.findFirst({
    where: eq(whyNowScores.stockId, stockId),
    orderBy: [desc(whyNowScores.calculatedAt)],
  });
  if (!row) return null;

  const breakdown = JSON.parse(row.breakdown) as { signals: SignalResult[] };
  return {
    signals: breakdown.signals,
    totalScore: row.totalScore,
    isHotWindow: row.isHotWindow,
    calculatedAt: new Date(row.calculatedAt).toISOString(),
  };
}

function clamp(n: number): number {
  return Math.min(100, Math.max(0, Math.round(n)));
}
