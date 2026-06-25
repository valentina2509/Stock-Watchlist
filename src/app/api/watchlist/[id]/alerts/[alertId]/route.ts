import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { alerts } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

const PatchSchema = z.object({
  action: z.enum(["dismiss", "snooze", "fire"]),
  snoozeHours: z.number().int().min(1).max(168).optional(),
});

interface RouteParams { params: { id: string; alertId: string } }

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const itemId   = Number(params.id);
  const alertId  = Number(params.alertId);
  if (isNaN(itemId) || isNaN(alertId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const body = await req.json();
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

  const { action, snoozeHours } = parsed.data;
  const now = new Date();

  let update: Partial<typeof alerts.$inferInsert>;
  if (action === "dismiss") {
    update = { status: "DISMISSED" };
  } else if (action === "fire") {
    update = { status: "FIRED", firedAt: now };
  } else {
    const until = new Date(now.getTime() + (snoozeHours ?? 24) * 3600 * 1000);
    update = { status: "SNOOZED", snoozedUntil: until };
  }

  const [updated] = await db
    .update(alerts)
    .set(update)
    .where(and(eq(alerts.id, alertId), eq(alerts.watchlistItemId, itemId)))
    .returning();

  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ data: updated });
}
