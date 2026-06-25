import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/db";
import { watchlistItems, stocks, convictionScores, theses, whyNowScores } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { StateBadge } from "@/components/ConvictionBadge";
import ScorePanel from "@/components/ScorePanel";
import WhyNowPanel from "@/components/WhyNowPanel";
import ThesisEditor from "@/components/ThesisEditor";
import ValuationPanel from "@/components/ValuationPanel";
import AlertsPanel from "@/components/AlertsPanel";
import type { ConvictionBreakdown } from "@/lib/conviction-scorer";
import type { WhyNowBreakdown, SignalResult } from "@/lib/why-now-engine";

interface Props {
  params: { id: string };
}

function formatMarketCap(cap: number | null): string {
  if (!cap) return "—";
  if (cap >= 1e12) return `$${(cap / 1e12).toFixed(1)}T`;
  if (cap >= 1e9) return `$${(cap / 1e9).toFixed(1)}B`;
  return `$${(cap / 1e6).toFixed(0)}M`;
}

export default async function StockDetailPage({ params }: Props) {
  const itemId = Number(params.id);
  if (isNaN(itemId)) notFound();

  const item = await db.query.watchlistItems.findFirst({
    where: eq(watchlistItems.id, itemId),
    with: { stock: true },
  });
  if (!item) notFound();

  const [latestScore, latestThesis, scoreHistory, latestWhyNowRow] = await Promise.all([
    db.query.convictionScores.findFirst({
      where: eq(convictionScores.watchlistItemId, itemId),
      orderBy: [desc(convictionScores.calculatedAt)],
    }),
    db.query.theses.findFirst({
      where: eq(theses.watchlistItemId, itemId),
      orderBy: [desc(theses.version)],
    }),
    db.query.convictionScores.findMany({
      where: eq(convictionScores.watchlistItemId, itemId),
      orderBy: [desc(convictionScores.calculatedAt)],
    }),
    db.query.whyNowScores.findFirst({
      where: eq(whyNowScores.stockId, item.stock.id),
      orderBy: [desc(whyNowScores.calculatedAt)],
    }),
  ]);

  const latestWhyNow: WhyNowBreakdown | null = latestWhyNowRow
    ? {
        signals: (JSON.parse(latestWhyNowRow.breakdown) as { signals: SignalResult[] }).signals,
        totalScore: latestWhyNowRow.totalScore,
        isHotWindow: latestWhyNowRow.isHotWindow,
        calculatedAt: new Date(latestWhyNowRow.calculatedAt).toISOString(),
      }
    : null;

  const stock = item.stock;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Header */}
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto max-w-5xl px-6 py-4">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300">
              ← Pipeline
            </Link>
            <span className="text-zinc-300 dark:text-zinc-700">/</span>
            <span className="font-mono text-sm font-semibold text-blue-600 dark:text-blue-400">{stock.ticker}</span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-8 space-y-8">
        {/* Stock header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
              {stock.name}
            </h1>
            <div className="mt-2 flex items-center gap-3 text-sm text-zinc-500">
              <span className="font-mono font-semibold text-blue-600 dark:text-blue-400">{stock.ticker}</span>
              {stock.sector && <span>{stock.sector}</span>}
              {stock.industry && <><span>·</span><span>{stock.industry}</span></>}
              <span>·</span>
              <span>{formatMarketCap(stock.marketCap)}</span>
            </div>
          </div>
          <StateBadge state={item.state} />
        </div>

        {/* Alerts */}
        <AlertsPanel watchlistItemId={itemId} />

        {/* Conviction score */}
        <ScorePanel watchlistItemId={itemId} initialBreakdown={null} />

        {/* Why Now engine */}
        <WhyNowPanel watchlistItemId={itemId} initialBreakdown={latestWhyNow} />

        {/* Score history */}
        {scoreHistory.length > 1 && (
          <section className="space-y-3">
            <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Score History</h2>
            <div className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 bg-zinc-50 text-left dark:border-zinc-800 dark:bg-zinc-900">
                    <th className="px-4 py-2.5 text-xs font-medium text-zinc-500">Date</th>
                    <th className="px-4 py-2.5 text-xs font-medium text-zinc-500">Total</th>
                    <th className="px-4 py-2.5 text-xs font-medium text-zinc-500">Band</th>
                    <th className="px-4 py-2.5 text-xs font-medium text-zinc-500">Fundamental</th>
                    <th className="px-4 py-2.5 text-xs font-medium text-zinc-500">Valuation</th>
                    <th className="px-4 py-2.5 text-xs font-medium text-zinc-500">Momentum</th>
                    <th className="px-4 py-2.5 text-xs font-medium text-zinc-500">Thesis</th>
                    <th className="px-4 py-2.5 text-xs font-medium text-zinc-500">Why Now</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {scoreHistory.map((s) => (
                    <tr key={s.id} className="bg-white dark:bg-zinc-950">
                      <td className="px-4 py-2.5 text-xs text-zinc-500">
                        {new Date(s.calculatedAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-2.5 font-mono font-semibold text-zinc-800 dark:text-zinc-200">
                        {Math.round(s.totalScore)}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="text-xs text-zinc-500">{s.scoreBand}</span>
                      </td>
                      {[s.fundamentalScore, s.valuationScore, s.momentumScore, s.thesisScore, s.whyNowScore].map((v, i) => (
                        <td key={i} className="px-4 py-2.5 font-mono text-xs text-zinc-600 dark:text-zinc-400">
                          {Math.round(v)}/20
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Valuation scenarios */}
        <ValuationPanel watchlistItemId={itemId} />

        {/* Thesis */}
        <ThesisEditor
          watchlistItemId={itemId}
          initialThesis={latestThesis ? {
            id:             latestThesis.id,
            version:        latestThesis.version,
            bullCase:       latestThesis.bullCase ?? null,
            bearCase:       latestThesis.bearCase ?? null,
            keyAssumptions: latestThesis.keyAssumptions ?? null,
            targetPrice:    latestThesis.targetPrice ?? null,
            timeHorizon:    latestThesis.timeHorizon ?? null,
            driftStatus:    latestThesis.driftStatus as "ON_TRACK" | "CONFIRMING" | "DIVERGING" | "BROKEN",
            createdAt:      new Date(latestThesis.createdAt).toISOString(),
          } : null}
        />
      </main>
    </div>
  );
}
