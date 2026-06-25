import { NextRequest, NextResponse } from "next/server";
import { calculateWhyNow, getLatestWhyNow } from "@/lib/why-now-engine";
import { db } from "@/db";
import { watchlistItems, stocks } from "@/db/schema";
import { eq } from "drizzle-orm";

interface RouteParams { params: { id: string } }

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const itemId = Number(params.id);
  if (isNaN(itemId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const item = await db.query.watchlistItems.findFirst({
    where: eq(watchlistItems.id, itemId),
    with: { stock: true },
  });
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const latest = await getLatestWhyNow(item.stock.id);
  return NextResponse.json({ data: latest });
}

export async function POST(_req: NextRequest, { params }: RouteParams) {
  const itemId = Number(params.id);
  if (isNaN(itemId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  try {
    const breakdown = await calculateWhyNow(itemId);
    return NextResponse.json({ data: breakdown });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
