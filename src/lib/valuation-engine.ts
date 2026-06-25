// Server-only: Yahoo Finance prefill fetcher
// Pure math lives in valuation-calc.ts (safe for client imports)

export type { ValuationMethod, Assumptions, DCFAssumptions, PEAssumptions, EVEBITDAAssumptions, ScenarioSet, ValuationResult, ValuationPrefill } from "./valuation-calc";
export { calcDCF, calcPE, calcEVEBITDA, calculate, buildDefaultScenarios } from "./valuation-calc";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const YFClass = require("yahoo-finance2").default as new () => {
  quoteSummary(ticker: string, opts: { modules: string[] }): Promise<Record<string, unknown>>;
  quote(ticker: string): Promise<{ regularMarketPrice?: number }>;
};
const yf = new YFClass();

import type { ValuationPrefill } from "./valuation-calc";

export async function fetchValuationPrefill(ticker: string): Promise<ValuationPrefill> {
  const [q, summary] = await Promise.all([
    yf.quote(ticker),
    yf.quoteSummary(ticker, {
      modules: ["financialData", "defaultKeyStatistics", "summaryDetail"],
    }),
  ]) as [
    { regularMarketPrice?: number },
    {
      financialData?: {
        freeCashflow?: number;
        revenueGrowth?: number;
        ebitda?: number;
        totalDebt?: number;
        totalCash?: number;
      };
      defaultKeyStatistics?: {
        sharesOutstanding?: number;
        enterpriseToEbitda?: number;
        trailingEps?: number;
        forwardEps?: number;
      };
      summaryDetail?: {
        forwardPE?: number;
        trailingPE?: number;
      };
    },
  ];

  const fd = summary.financialData;
  const ks = summary.defaultKeyStatistics;
  const sd = summary.summaryDetail;

  return {
    currentPrice:       q.regularMarketPrice ?? 0,
    freeCashFlow:       fd?.freeCashflow ?? null,
    sharesOutstanding:  ks?.sharesOutstanding ?? null,
    netDebt:            (fd?.totalDebt ?? 0) - (fd?.totalCash ?? 0),
    revenueGrowth:      fd?.revenueGrowth ?? null,
    forwardEPS:         ks?.forwardEps ?? null,
    trailingEPS:        ks?.trailingEps ?? null,
    forwardPE:          sd?.forwardPE ?? null,
    trailingPE:         sd?.trailingPE ?? null,
    ebitda:             fd?.ebitda ?? null,
    enterpriseToEbitda: ks?.enterpriseToEbitda ?? null,
  };
}
