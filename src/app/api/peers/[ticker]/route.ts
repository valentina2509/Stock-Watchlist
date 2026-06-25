import { NextRequest, NextResponse } from "next/server";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const YFClass = require("yahoo-finance2").default as new () => {
  quote(ticker: string): Promise<{
    symbol: string;
    longName?: string;
    shortName?: string;
    regularMarketPrice?: number;
    marketCap?: number;
    trailingPE?: number;
    forwardPE?: number;
    fiftyTwoWeekChangePercent?: number;
  }>;
  quoteSummary(ticker: string, opts: { modules: string[] }): Promise<{
    financialData?: {
      revenueGrowth?: number;
      grossMargins?: number;
      operatingMargins?: number;
    };
  }>;
};
const yf = new YFClass();

interface RouteParams { params: { ticker: string } }

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const ticker = params.ticker.toUpperCase();

  try {
    const [q, summary] = await Promise.all([
      yf.quote(ticker),
      yf.quoteSummary(ticker, { modules: ["financialData"] }),
    ]);

    const fd = summary.financialData;

    return NextResponse.json({
      ticker,
      name:                     q.longName ?? q.shortName ?? ticker,
      price:                    q.regularMarketPrice ?? null,
      marketCap:                q.marketCap ?? null,
      trailingPE:               q.trailingPE ?? null,
      forwardPE:                q.forwardPE ?? null,
      revenueGrowth:            fd?.revenueGrowth ?? null,
      grossMargin:              fd?.grossMargins ?? null,
      operatingMargin:          fd?.operatingMargins ?? null,
      fiftyTwoWeekChangePercent: q.fiftyTwoWeekChangePercent ?? null,
    });
  } catch {
    return NextResponse.json({ error: "Ticker not found" }, { status: 404 });
  }
}
