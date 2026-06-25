import { NextRequest, NextResponse } from "next/server";
import { getQuote } from "@/lib/market-data";

export async function GET(_req: NextRequest, { params }: { params: { ticker: string } }) {
  const quote = await getQuote(params.ticker.toUpperCase());
  if (!quote) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(quote);
}
