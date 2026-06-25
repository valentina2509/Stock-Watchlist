import { db } from "@/db";
import { stocks, watchlistItems, convictionScores, theses } from "@/db/schema";
import type { WatchlistState } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { getQuoteWithProfile } from "./market-data";

// Valid state transitions (BPMN 06 state machine)
const STATE_TRANSITIONS: Record<WatchlistState, WatchlistState[]> = {
  DISCOVERY: ["RESEARCH"],
  RESEARCH: ["BUILDING_CONVICTION", "EXITED"],
  BUILDING_CONVICTION: ["HIGH_CONVICTION", "RESEARCH", "EXITED"],
  HIGH_CONVICTION: ["POSITION", "BUILDING_CONVICTION", "EXITED"],
  POSITION: ["MONITORING", "EXITED"],
  MONITORING: ["EXITED"],
  EXITED: [],
};

export function canTransition(from: WatchlistState, to: WatchlistState): boolean {
  return STATE_TRANSITIONS[from].includes(to);
}

export async function addToWatchlist(ticker: string) {
  const now = new Date();

  // Fetch stock data
  const quote = await getQuoteWithProfile(ticker.toUpperCase());
  if (!quote) throw new Error(`Could not fetch data for ${ticker}`);

  // Upsert stock
  const existing = await db.query.stocks.findFirst({
    where: eq(stocks.ticker, quote.ticker),
  });

  let stockId: number;
  if (existing) {
    await db
      .update(stocks)
      .set({ name: quote.name, sector: quote.sector, industry: quote.industry, marketCap: quote.marketCap, updatedAt: now })
      .where(eq(stocks.id, existing.id));
    stockId = existing.id;
  } else {
    const [inserted] = await db
      .insert(stocks)
      .values({ ticker: quote.ticker, name: quote.name, sector: quote.sector, industry: quote.industry, marketCap: quote.marketCap, createdAt: now, updatedAt: now })
      .returning({ id: stocks.id });
    stockId = inserted.id;
  }

  // Check if already on watchlist
  const alreadyAdded = await db.query.watchlistItems.findFirst({
    where: eq(watchlistItems.stockId, stockId),
  });
  if (alreadyAdded) return alreadyAdded;

  const [item] = await db
    .insert(watchlistItems)
    .values({ stockId, state: "DISCOVERY", addedAt: now, updatedAt: now })
    .returning();

  // Seed initial conviction score
  await db.insert(convictionScores).values({
    watchlistItemId: item.id,
    fundamentalScore: 0,
    valuationScore: 0,
    momentumScore: 0,
    thesisScore: 0,
    whyNowScore: 0,
    totalScore: 0,
    scoreBand: "WATCH",
    calculatedAt: now,
  });

  return item;
}

export async function transitionState(watchlistItemId: number, toState: WatchlistState) {
  const item = await db.query.watchlistItems.findFirst({
    where: eq(watchlistItems.id, watchlistItemId),
  });
  if (!item) throw new Error("Watchlist item not found");
  if (!canTransition(item.state, toState)) {
    throw new Error(`Cannot transition from ${item.state} to ${toState}`);
  }

  const [updated] = await db
    .update(watchlistItems)
    .set({ state: toState, updatedAt: new Date() })
    .where(eq(watchlistItems.id, watchlistItemId))
    .returning();

  return updated;
}

export async function getWatchlist() {
  const items = await db.query.watchlistItems.findMany({
    with: {
      stock: true,
    },
    orderBy: [desc(watchlistItems.updatedAt)],
  });

  // Attach latest conviction score
  const enriched = await Promise.all(
    items.map(async (item) => {
      const latestScore = await db.query.convictionScores.findFirst({
        where: eq(convictionScores.watchlistItemId, item.id),
        orderBy: [desc(convictionScores.calculatedAt)],
      });
      const latestThesis = await db.query.theses.findFirst({
        where: eq(theses.watchlistItemId, item.id),
        orderBy: [desc(theses.version)],
      });
      return { ...item, convictionScore: latestScore ?? null, thesis: latestThesis ?? null };
    })
  );

  return enriched;
}

export async function getWatchlistItem(id: number) {
  const item = await db.query.watchlistItems.findFirst({
    where: eq(watchlistItems.id, id),
    with: { stock: true },
  });
  if (!item) return null;

  const scores = await db.query.convictionScores.findMany({
    where: eq(convictionScores.watchlistItemId, id),
    orderBy: [desc(convictionScores.calculatedAt)],
  });
  const latestThesis = await db.query.theses.findFirst({
    where: eq(theses.watchlistItemId, id),
    orderBy: [desc(theses.version)],
  });

  return { ...item, scores, latestThesis: latestThesis ?? null };
}

export async function removeFromWatchlist(watchlistItemId: number) {
  await db.delete(watchlistItems).where(eq(watchlistItems.id, watchlistItemId));
}
