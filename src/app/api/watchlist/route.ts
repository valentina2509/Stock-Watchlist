import { NextRequest, NextResponse } from "next/server";
import { addToWatchlist, getWatchlist } from "@/lib/watchlist";
import { z } from "zod";

const AddSchema = z.object({ ticker: z.string().min(1).max(10).toUpperCase() });

export async function GET() {
  const watchlist = await getWatchlist();
  return NextResponse.json(watchlist);
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = AddSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid ticker" }, { status: 400 });
  }

  try {
    const item = await addToWatchlist(parsed.data.ticker);
    return NextResponse.json(item, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to add stock";
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
