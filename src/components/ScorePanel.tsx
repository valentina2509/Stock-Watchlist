"use client";

import { useState } from "react";
import ScoreBreakdown from "./ScoreBreakdown";
import type { ConvictionBreakdown } from "@/lib/conviction-scorer";

interface Props {
  watchlistItemId: number;
  initialBreakdown?: ConvictionBreakdown | null;
}

export default function ScorePanel({ watchlistItemId, initialBreakdown }: Props) {
  const [breakdown, setBreakdown] = useState<ConvictionBreakdown | null>(initialBreakdown ?? null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastCalculated, setLastCalculated] = useState<Date | null>(null);

  async function handleRecalculate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/watchlist/${watchlistItemId}/score`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Calculation failed");
        return;
      }
      const data = await res.json() as ConvictionBreakdown;
      setBreakdown(data);
      setLastCalculated(new Date());
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Conviction Score</h2>
        <div className="flex items-center gap-3">
          {lastCalculated && (
            <span className="text-xs text-zinc-400">
              Updated {lastCalculated.toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={handleRecalculate}
            disabled={loading}
            className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Calculating…" : breakdown ? "Recalculate" : "Calculate Score"}
          </button>
        </div>
      </div>

      {error && (
        <p className="text-xs text-red-500 dark:text-red-400">{error}</p>
      )}

      {loading && (
        <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 px-5 py-8 text-center">
          <p className="text-sm text-zinc-400">Fetching data across 5 dimensions…</p>
          <p className="mt-1 text-xs text-zinc-300">This takes 5–10 seconds</p>
        </div>
      )}

      {!loading && breakdown && <ScoreBreakdown breakdown={breakdown} />}

      {!loading && !breakdown && (
        <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/50 px-5 py-10 text-center">
          <p className="text-sm text-zinc-500">No score calculated yet</p>
          <p className="mt-1 text-xs text-zinc-400">Click "Calculate Score" to run the 5-component analysis</p>
        </div>
      )}
    </div>
  );
}
