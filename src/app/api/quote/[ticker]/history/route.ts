import { NextRequest, NextResponse } from "next/server";
import { getHistoricalPrices } from "@/lib/market-data";

interface RouteParams { params: { ticker: string } }

export async function GET(req: NextRequest, { params }: RouteParams) {
  const ticker = params.ticker.toUpperCase();
  const period = (req.nextUrl.searchParams.get("period") ?? "3mo") as "1mo" | "3mo" | "6mo" | "1y";

  try {
    const bars = await getHistoricalPrices(ticker, period);
    // Return only what the chart needs
    const data = bars.map(b => ({
      date:  b.date.toISOString().slice(0, 10),
      close: b.adjClose ?? b.close,
    }));
    return NextResponse.json({ data });
  } catch {
    return NextResponse.json({ error: "Failed to fetch history" }, { status: 500 });
  }
}
