import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { alerts, watchlistItems } from "@/db/schema";
import { eq, desc, ne } from "drizzle-orm";

interface RouteParams { params: { id: string } }

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const itemId = Number(params.id);
  if (isNaN(itemId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const item = await db.query.watchlistItems.findFirst({ where: eq(watchlistItems.id, itemId) });
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const all = await db.query.alerts.findMany({
    where: eq(alerts.watchlistItemId, itemId),
    orderBy: [desc(alerts.createdAt)],
  });

  return NextResponse.json({ data: all });
}
