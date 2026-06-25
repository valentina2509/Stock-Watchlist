// yahoo-finance2 v3 exports the class as default; instantiate once
// eslint-disable-next-line @typescript-eslint/no-require-imports
const YFClass = require("yahoo-finance2").default as new () => {
  search(query: string, opts?: Record<string, unknown>): Promise<{ quotes?: Array<{ quoteType?: string; symbol?: string; longname?: string; shortname?: string; exchDisp?: string }> }>;
  quote(ticker: string): Promise<{
    symbol: string;
    longName?: string;
    shortName?: string;
    regularMarketPrice?: number;
    regularMarketChange?: number;
    regularMarketChangePercent?: number;
    marketCap?: number;
    regularMarketVolume?: number;
    fiftyTwoWeekHigh?: number;
    fiftyTwoWeekLow?: number;
    trailingPE?: number;
    forwardPE?: number;
    epsTrailingTwelveMonths?: number;
    dividendYield?: number;
  }>;
  quoteSummary(ticker: string, opts: { modules: string[] }): Promise<{
    assetProfile?: { sector?: string; industry?: string };
  }>;
  historical(ticker: string, opts: { period1: Date; period2: Date; interval: string }): Promise<Array<{
    date: Date;
    open?: number;
    high?: number;
    low?: number;
    close: number;
    volume?: number;
    adjClose?: number;
  }>>;
};

const yf = new YFClass();

export interface StockQuote {
  ticker: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  marketCap: number | null;
  volume: number | null;
  sector: string | null;
  industry: string | null;
  fiftyTwoWeekHigh: number | null;
  fiftyTwoWeekLow: number | null;
  peRatio: number | null;
  forwardPE: number | null;
  eps: number | null;
  dividendYield: number | null;
}

export interface HistoricalBar {
  date: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  adjClose: number;
}

export async function searchTickers(query: string): Promise<{ ticker: string; name: string; exchange: string }[]> {
  const results = await yf.search(query, { newsCount: 0, quotesCount: 8 });
  return (results.quotes ?? [])
    .filter((q) => q.quoteType === "EQUITY" && q.symbol)
    .map((q) => ({
      ticker: q.symbol!,
      name: q.longname ?? q.shortname ?? q.symbol!,
      exchange: q.exchDisp ?? "",
    }));
}

export async function getQuote(ticker: string): Promise<StockQuote | null> {
  try {
    const q = await yf.quote(ticker);
    return {
      ticker: q.symbol,
      name: q.longName ?? q.shortName ?? ticker,
      price: q.regularMarketPrice ?? 0,
      change: q.regularMarketChange ?? 0,
      changePercent: q.regularMarketChangePercent ?? 0,
      marketCap: q.marketCap ?? null,
      volume: q.regularMarketVolume ?? null,
      sector: null,
      industry: null,
      fiftyTwoWeekHigh: q.fiftyTwoWeekHigh ?? null,
      fiftyTwoWeekLow: q.fiftyTwoWeekLow ?? null,
      peRatio: q.trailingPE ?? null,
      forwardPE: q.forwardPE ?? null,
      eps: q.epsTrailingTwelveMonths ?? null,
      dividendYield: q.dividendYield ?? null,
    };
  } catch {
    return null;
  }
}

export async function getQuoteWithProfile(ticker: string): Promise<StockQuote | null> {
  try {
    const [quoteResult, profileResult] = await Promise.allSettled([
      yf.quote(ticker),
      yf.quoteSummary(ticker, { modules: ["assetProfile"] }),
    ]);

    if (quoteResult.status === "rejected") return null;
    const q = quoteResult.value;
    const profile = profileResult.status === "fulfilled" ? profileResult.value.assetProfile : null;

    return {
      ticker: q.symbol,
      name: q.longName ?? q.shortName ?? ticker,
      price: q.regularMarketPrice ?? 0,
      change: q.regularMarketChange ?? 0,
      changePercent: q.regularMarketChangePercent ?? 0,
      marketCap: q.marketCap ?? null,
      volume: q.regularMarketVolume ?? null,
      sector: profile?.sector ?? null,
      industry: profile?.industry ?? null,
      fiftyTwoWeekHigh: q.fiftyTwoWeekHigh ?? null,
      fiftyTwoWeekLow: q.fiftyTwoWeekLow ?? null,
      peRatio: q.trailingPE ?? null,
      forwardPE: q.forwardPE ?? null,
      eps: q.epsTrailingTwelveMonths ?? null,
      dividendYield: q.dividendYield ?? null,
    };
  } catch {
    return null;
  }
}

export async function getHistoricalPrices(
  ticker: string,
  period: "1mo" | "3mo" | "6mo" | "1y" | "2y" = "1y"
): Promise<HistoricalBar[]> {
  const result = await yf.historical(ticker, { period1: periodToDate(period), period2: new Date(), interval: "1d" });
  return result.map((bar) => ({
    date: bar.date,
    open: bar.open ?? 0,
    high: bar.high ?? 0,
    low: bar.low ?? 0,
    close: bar.close,
    volume: bar.volume ?? 0,
    adjClose: bar.adjClose ?? bar.close,
  }));
}

function periodToDate(period: string): Date {
  const d = new Date();
  const map: Record<string, number> = { "1mo": 30, "3mo": 90, "6mo": 180, "1y": 365, "2y": 730 };
  d.setDate(d.getDate() - (map[period] ?? 365));
  return d;
}
