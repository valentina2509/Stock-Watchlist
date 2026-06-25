import { NextResponse } from "next/server";
import { db } from "@/db";
import { alerts, watchlistItems, stocks } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

// Returns all ACTIVE alerts across the whole watchlist, with stock info
export async function GET() {
  const active = await db
    .select({
      id:             alerts.id,
      watchlistItemId: alerts.watchlistItemId,
      alertType:      alerts.alertType,
      status:         alerts.status,
      message:        alerts.message,
      threshold:      alerts.threshold,
      createdAt:      alerts.createdAt,
      ticker:         stocks.ticker,
      stockName:      stocks.name,
    })
    .from(alerts)
    .innerJoin(watchlistItems, eq(alerts.watchlistItemId, watchlistItems.id))
    .innerJoin(stocks, eq(watchlistItems.stockId, stocks.id))
    .where(eq(alerts.status, "ACTIVE"))
    .orderBy(desc(alerts.createdAt));

  return NextResponse.json({ data: active });
}
