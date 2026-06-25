import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { theses } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { checkThesisAlerts } from "@/lib/alert-engine";

const PatchSchema = z.object({
  driftStatus: z.enum(["ON_TRACK", "CONFIRMING", "DIVERGING", "BROKEN"]),
});

interface RouteParams { params: { id: string; thesisId: string } }

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const itemId    = Number(params.id);
  const thesisId  = Number(params.thesisId);
  if (isNaN(itemId) || isNaN(thesisId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const body = await req.json();
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

  const [updated] = await db
    .update(theses)
    .set({ driftStatus: parsed.data.driftStatus, updatedAt: new Date() })
    .where(and(eq(theses.id, thesisId), eq(theses.watchlistItemId, itemId)))
    .returning();

  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  checkThesisAlerts(itemId, parsed.data.driftStatus).catch(() => {});
  return NextResponse.json({ data: updated });
}
