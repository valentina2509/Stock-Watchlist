import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { valuationScenarios, watchlistItems } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { fetchValuationPrefill, buildDefaultScenarios, calculate } from "@/lib/valuation-engine";
import type { ValuationMethod, Assumptions } from "@/lib/valuation-engine";
import { z } from "zod";

interface RouteParams { params: { id: string } }

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const itemId = Number(params.id);
  if (isNaN(itemId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const item = await db.query.watchlistItems.findFirst({
    where: eq(watchlistItems.id, itemId),
    with: { stock: true },
  });
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [saved, prefill] = await Promise.all([
    db.query.valuationScenarios.findFirst({
      where: eq(valuationScenarios.watchlistItemId, itemId),
      orderBy: [desc(valuationScenarios.calculatedAt)],
    }),
    fetchValuationPrefill(item.stock.ticker),
  ]);

  return NextResponse.json({ data: { saved: saved ?? null, prefill } });
}

const SaveSchema = z.object({
  method:           z.enum(["DCF", "PE_MULTIPLE", "EV_EBITDA"]),
  bearAssumptions:  z.record(z.string(), z.unknown()),
  baseAssumptions:  z.record(z.string(), z.unknown()),
  bullAssumptions:  z.record(z.string(), z.unknown()),
  currentPrice:     z.number(),
});

export async function POST(req: NextRequest, { params }: RouteParams) {
  const itemId = Number(params.id);
  if (isNaN(itemId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const item = await db.query.watchlistItems.findFirst({ where: eq(watchlistItems.id, itemId) });
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const parsed = SaveSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

  const { method, bearAssumptions, baseAssumptions, bullAssumptions, currentPrice } = parsed.data;

  const bearResult = calculate(method as ValuationMethod, bearAssumptions as unknown as Assumptions, currentPrice);
  const baseResult = calculate(method as ValuationMethod, baseAssumptions as unknown as Assumptions, currentPrice);
  const bullResult = calculate(method as ValuationMethod, bullAssumptions as unknown as Assumptions, currentPrice);

  const [created] = await db.insert(valuationScenarios).values({
    watchlistItemId: itemId,
    method,
    bearAssumptions: JSON.stringify(bearAssumptions),
    baseAssumptions: JSON.stringify(baseAssumptions),
    bullAssumptions: JSON.stringify(bullAssumptions),
    bearPrice:    bearResult.impliedPrice,
    basePrice:    baseResult.impliedPrice,
    bullPrice:    bullResult.impliedPrice,
    currentPrice,
    calculatedAt: new Date(),
  }).returning();

  return NextResponse.json({ data: created }, { status: 201 });
}
