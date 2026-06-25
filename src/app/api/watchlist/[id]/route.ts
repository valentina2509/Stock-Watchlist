import { NextRequest, NextResponse } from "next/server";
import { getWatchlistItem, removeFromWatchlist, transitionState } from "@/lib/watchlist";
import type { WatchlistState } from "@/db/schema";
import { z } from "zod";

const TransitionSchema = z.object({
  state: z.enum([
    "DISCOVERY",
    "RESEARCH",
    "BUILDING_CONVICTION",
    "HIGH_CONVICTION",
    "POSITION",
    "MONITORING",
    "EXITED",
  ]),
});

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const item = await getWatchlistItem(Number(params.id));
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(item);
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const body = await request.json().catch(() => null);
  const parsed = TransitionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid state" }, { status: 400 });
  }

  try {
    const updated = await transitionState(Number(params.id), parsed.data.state as WatchlistState);
    return NextResponse.json(updated);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Transition failed";
    return NextResponse.json({ error: message }, { status: 422 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  await removeFromWatchlist(Number(params.id));
  return new NextResponse(null, { status: 204 });
}
