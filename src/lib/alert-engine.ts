import { db } from "@/db";
import { alerts, convictionScores, whyNowScores, watchlistItems } from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";

type AlertType = typeof alerts.$inferInsert["alertType"];

async function upsertAlert(
  watchlistItemId: number,
  alertType: AlertType,
  message: string,
  threshold?: number,
) {
  // Don't duplicate — skip if an ACTIVE alert of this type already exists
  const existing = await db.query.alerts.findFirst({
    where: and(
      eq(alerts.watchlistItemId, watchlistItemId),
      eq(alerts.alertType, alertType),
      eq(alerts.status, "ACTIVE"),
    ),
  });
  if (existing) return;

  await db.insert(alerts).values({
    watchlistItemId,
    alertType,
    status: "ACTIVE",
    threshold: threshold ?? null,
    message,
    firedAt: null,
    snoozedUntil: null,
    createdAt: new Date(),
  });
}

// Called after every conviction score calculation
export async function checkConvictionAlerts(watchlistItemId: number) {
  const scores = await db.query.convictionScores.findMany({
    where: eq(convictionScores.watchlistItemId, watchlistItemId),
    orderBy: [desc(convictionScores.calculatedAt)],
  });

  if (scores.length < 2) return;

  const [latest, previous] = scores;
  const delta = latest.totalScore - previous.totalScore;
  const bandChanged = latest.scoreBand !== previous.scoreBand;

  if (delta >= 15) {
    await upsertAlert(
      watchlistItemId,
      "CONVICTION_SURGE",
      `Conviction surged +${delta.toFixed(0)} pts to ${latest.totalScore} (${latest.scoreBand})`,
      delta,
    );
  }

  if (delta <= -15) {
    await upsertAlert(
      watchlistItemId,
      "CONVICTION_DROP",
      `Conviction dropped ${delta.toFixed(0)} pts to ${latest.totalScore} (${latest.scoreBand})`,
      Math.abs(delta),
    );
  }

  if (bandChanged && latest.scoreBand === "CONVICTION") {
    await upsertAlert(
      watchlistItemId,
      "CONVICTION_SURGE",
      `Reached CONVICTION band — score ${latest.totalScore}`,
      latest.totalScore,
    );
  }
}

// Called after every Why Now calculation
export async function checkWhyNowAlerts(watchlistItemId: number, stockId: number) {
  const latest = await db.query.whyNowScores.findFirst({
    where: eq(whyNowScores.stockId, stockId),
    orderBy: [desc(whyNowScores.calculatedAt)],
  });

  if (latest?.isHotWindow) {
    await upsertAlert(
      watchlistItemId,
      "WHY_NOW_HOT_WINDOW",
      `Hot Window detected — Why Now score ${latest.totalScore}/100`,
      latest.totalScore,
    );
  }
}

// Called when thesis drift status is updated
export async function checkThesisAlerts(watchlistItemId: number, driftStatus: string) {
  if (driftStatus === "BROKEN") {
    await upsertAlert(
      watchlistItemId,
      "THESIS_BROKEN",
      "Thesis marked as BROKEN — review your position urgently",
    );
  } else if (driftStatus === "DIVERGING") {
    await upsertAlert(
      watchlistItemId,
      "THESIS_DRIFT",
      "Key thesis assumptions diverging from reality",
    );
  }
}

// Dismiss a fired/snoozed alert
export async function fireAlert(alertId: number) {
  await db
    .update(alerts)
    .set({ status: "FIRED", firedAt: new Date() })
    .where(eq(alerts.id, alertId));
}
