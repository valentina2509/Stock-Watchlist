import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { theses, watchlistItems } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";

const ThesisSchema = z.object({
  bullCase:       z.string().optional().nullable(),
  bearCase:       z.string().optional().nullable(),
  keyAssumptions: z.array(z.string()).optional().nullable(),
  targetPrice:    z.number().positive().optional().nullable(),
  timeHorizon:    z.string().optional().nullable(),
  driftStatus:    z.enum(["ON_TRACK", "CONFIRMING", "DIVERGING", "BROKEN"]).optional(),
});

interface RouteParams { params: { id: string } }

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const itemId = Number(params.id);
  if (isNaN(itemId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const item = await db.query.watchlistItems.findFirst({ where: eq(watchlistItems.id, itemId) });
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const all = await db.query.theses.findMany({
    where: eq(theses.watchlistItemId, itemId),
    orderBy: [desc(theses.version)],
  });

  return NextResponse.json({ data: all });
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  const itemId = Number(params.id);
  if (isNaN(itemId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const item = await db.query.watchlistItems.findFirst({ where: eq(watchlistItems.id, itemId) });
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const parsed = ThesisSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

  const { bullCase, bearCase, keyAssumptions, targetPrice, timeHorizon, driftStatus } = parsed.data;

  // Get current version number
  const latest = await db.query.theses.findFirst({
    where: eq(theses.watchlistItemId, itemId),
    orderBy: [desc(theses.version)],
  });
  const nextVersion = (latest?.version ?? 0) + 1;

  const now = new Date();
  const [created] = await db.insert(theses).values({
    watchlistItemId: itemId,
    version: nextVersion,
    bullCase:       bullCase ?? null,
    bearCase:       bearCase ?? null,
    keyAssumptions: keyAssumptions ? JSON.stringify(keyAssumptions) : null,
    targetPrice:    targetPrice ?? null,
    timeHorizon:    timeHorizon ?? null,
    driftStatus:    driftStatus ?? "ON_TRACK",
    createdAt: now,
    updatedAt: now,
  }).returning();

  return NextResponse.json({ data: created }, { status: 201 });
}
