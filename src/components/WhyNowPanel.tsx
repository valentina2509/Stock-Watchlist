"use client";

import { useState } from "react";
import type { WhyNowBreakdown, SignalResult } from "@/lib/why-now-engine";

interface Props {
  watchlistItemId: number;
  initialBreakdown: WhyNowBreakdown | null;
}

const SIGNAL_COLORS: Record<string, { bar: string; badge: string }> = {
  EARNINGS_CATALYST:  { bar: "bg-violet-500",  badge: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300" },
  FILING:             { bar: "bg-blue-500",     badge: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300" },
  ANALYST_UPGRADE:    { bar: "bg-sky-500",      badge: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300" },
  TECHNICAL_BREAKOUT: { bar: "bg-emerald-500",  badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" },
  MACRO_TAILWIND:     { bar: "bg-teal-500",     badge: "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300" },
  NEWS_SENTIMENT:     { bar: "bg-amber-500",    badge: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300" },
  INSIDER_BUYING:     { bar: "bg-rose-500",     badge: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300" },
};

function ScoreBar({ score, type }: { score: number; type: string }) {
  const colors = SIGNAL_COLORS[type] ?? { bar: "bg-zinc-400", badge: "" };
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${colors.bar}`}
          style={{ width: `${score}%` }}
        />
      </div>
      <span className="w-8 text-right font-mono text-xs text-zinc-500">{score}</span>
    </div>
  );
}

function SignalCard({ signal }: { signal: SignalResult }) {
  const [open, setOpen] = useState(false);
  const colors = SIGNAL_COLORS[signal.type] ?? { bar: "bg-zinc-400", badge: "bg-zinc-100 text-zinc-600" };

  return (
    <div className="rounded-lg border border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
      >
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${colors.badge}`}>
          {signal.label}
        </span>
        <div className="flex-1 min-w-0">
          <ScoreBar score={signal.score} type={signal.type} />
        </div>
        <span className="text-xs text-zinc-400">
          {(signal.weight * 100).toFixed(0)}% wt
        </span>
        <svg
          className={`w-4 h-4 text-zinc-400 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && signal.reasons.length > 0 && (
        <div className="px-4 pb-3 border-t border-zinc-100 dark:border-zinc-800 pt-2 space-y-1">
          {signal.reasons.map((r, i) => (
            <p key={i} className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
              — {r}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

function HotWindowBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 ring-1 ring-amber-200 dark:ring-amber-800">
      <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
      Hot Window
    </span>
  );
}

export default function WhyNowPanel({ watchlistItemId, initialBreakdown }: Props) {
  const [breakdown, setBreakdown] = useState<WhyNowBreakdown | null>(initialBreakdown);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/watchlist/${watchlistItemId}/why-now`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed");
      setBreakdown(json.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  const weightedTotal = breakdown
    ? Math.round(breakdown.signals.reduce((sum, s) => sum + s.score * s.weight, 0))
    : null;

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Why Now Engine</h2>
          {breakdown?.isHotWindow && <HotWindowBadge />}
        </div>
        <button
          onClick={run}
          disabled={loading}
          className="text-xs font-medium rounded-lg px-3 py-1.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-60 disabled:cursor-not-allowed text-white transition-colors"
        >
          {loading ? (
            <span className="flex items-center gap-1.5">
              <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
              </svg>
              Analysing…
            </span>
          ) : breakdown ? "Re-run" : "Run Analysis"}
        </button>
      </div>

      {error && (
        <p className="text-xs text-red-500 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">{error}</p>
      )}

      {!breakdown && !loading && (
        <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/50 px-5 py-8 text-center">
          <p className="text-sm text-zinc-500">No Why Now analysis yet</p>
          <p className="text-xs text-zinc-400 mt-1">
            Checks 7 signals: earnings timing, filings, analyst activity, technicals, macro, news, and insider buying
          </p>
        </div>
      )}

      {breakdown && (
        <div className="space-y-3">
          {/* Total score ring */}
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5">
            <div className="flex items-center gap-6">
              {/* Score circle */}
              <div className="relative w-20 h-20 shrink-0">
                <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
                  <circle cx="40" cy="40" r="32" fill="none" stroke="currentColor" className="text-zinc-100 dark:text-zinc-800" strokeWidth="8" />
                  <circle
                    cx="40" cy="40" r="32" fill="none"
                    stroke={breakdown.totalScore >= 70 ? "#f59e0b" : breakdown.totalScore >= 50 ? "#10b981" : "#6366f1"}
                    strokeWidth="8"
                    strokeDasharray={`${(breakdown.totalScore / 100) * 201} 201`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-xl font-bold text-zinc-900 dark:text-zinc-50">{breakdown.totalScore}</span>
                  <span className="text-[9px] text-zinc-400 uppercase tracking-wide">/ 100</span>
                </div>
              </div>
              <div className="flex-1 min-w-0 space-y-1">
                <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">
                  {breakdown.isHotWindow
                    ? "Hot Window — multiple catalysts aligned"
                    : breakdown.totalScore >= 50
                    ? "Moderate timing signal"
                    : "Weak timing signal"}
                </p>
                <p className="text-xs text-zinc-400">
                  {new Date(breakdown.calculatedAt).toLocaleString()} · 7 signals analysed
                </p>
                {/* Weighted contribution bar */}
                <div className="flex gap-0.5 h-2 rounded-full overflow-hidden mt-2">
                  {breakdown.signals.map((s) => (
                    <div
                      key={s.type}
                      className={SIGNAL_COLORS[s.type]?.bar ?? "bg-zinc-400"}
                      style={{ width: `${(s.score * s.weight)}%` }}
                      title={`${s.label}: ${s.score} × ${(s.weight * 100).toFixed(0)}% = ${Math.round(s.score * s.weight)}`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Signal cards */}
          <div className="space-y-2">
            {breakdown.signals.map((s) => (
              <SignalCard key={s.type} signal={s} />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
