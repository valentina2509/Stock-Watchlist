"use client";

import type { ConvictionBreakdown, ScoreComponent } from "@/lib/conviction-scorer";

const COMPONENT_META = [
  { key: "fundamental" as const, label: "Fundamentals",  icon: "📊", description: "Business quality, margins, returns, leverage" },
  { key: "valuation"   as const, label: "Valuation",     icon: "💰", description: "Forward P/E, PEG, EV/EBITDA, P/B" },
  { key: "momentum"    as const, label: "Momentum",      icon: "📈", description: "Price trend vs moving averages, 1-month return" },
  { key: "thesis"      as const, label: "Thesis",        icon: "📝", description: "Thesis completeness: bull/bear case, assumptions, target" },
  { key: "whyNow"      as const, label: "Why Now",       icon: "⚡", description: "Catalyst richness: earnings, upgrades, estimate revisions" },
] as const;

function ComponentBar({ component, label, icon }: { component: ScoreComponent; label: string; icon: string }) {
  const pct = (component.score / 20) * 100;
  const color =
    pct >= 75 ? "bg-green-500" :
    pct >= 50 ? "bg-yellow-500" :
    pct >= 25 ? "bg-orange-400" : "bg-red-400";

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
          <span>{icon}</span>
          {label}
        </span>
        <span className="font-mono text-sm font-semibold text-zinc-800 dark:text-zinc-200">
          {component.score}<span className="text-xs font-normal text-zinc-400">/20</span>
        </span>
      </div>
      <div className="h-2 w-full rounded-full bg-zinc-100 dark:bg-zinc-800">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <ul className="space-y-0.5">
        {component.reasons.map((r, i) => {
          const isPositive = !r.startsWith("⚠") && !r.toLowerCase().includes("unavailable") && !r.toLowerCase().includes("weak") && !r.toLowerCase().includes("thin") && !r.toLowerCase().includes("negative") && !r.toLowerCase().includes("no ") && !r.toLowerCase().includes("missing") && !r.toLowerCase().includes("expensive") && !r.toLowerCase().includes("high p");
          return (
            <li key={i} className={`flex items-start gap-1.5 text-xs ${isPositive ? "text-zinc-500" : "text-zinc-400"}`}>
              <span className="mt-0.5 shrink-0">{isPositive ? "·" : "·"}</span>
              {r}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

const BAND_STYLES = {
  WATCH:      "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
  RESEARCH:   "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  BUILDING:   "bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300",
  HIGH:       "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300",
  CONVICTION: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300",
};

const TOTAL_COLOR = (score: number) =>
  score >= 80 ? "text-green-600 dark:text-green-400" :
  score >= 60 ? "text-orange-500 dark:text-orange-400" :
  score >= 40 ? "text-yellow-600 dark:text-yellow-400" :
  score >= 20 ? "text-blue-600 dark:text-blue-400" :
  "text-zinc-500";

export default function ScoreBreakdown({ breakdown }: { breakdown: ConvictionBreakdown }) {
  const totalPct = breakdown.total;

  return (
    <div className="space-y-6">
      {/* Total score */}
      <div className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white px-5 py-4 dark:border-zinc-800 dark:bg-zinc-900">
        <div>
          <p className="text-xs text-zinc-500">Conviction Score</p>
          <p className={`text-4xl font-bold tabular-nums ${TOTAL_COLOR(breakdown.total)}`}>
            {breakdown.total}
            <span className="text-lg font-normal text-zinc-400">/100</span>
          </p>
        </div>
        <div className="text-right">
          <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${BAND_STYLES[breakdown.band]}`}>
            {breakdown.band}
          </span>
          <div className="mt-2 h-2 w-32 rounded-full bg-zinc-100 dark:bg-zinc-800">
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                breakdown.band === "CONVICTION" ? "bg-green-500" :
                breakdown.band === "HIGH" ? "bg-orange-500" :
                breakdown.band === "BUILDING" ? "bg-yellow-500" :
                breakdown.band === "RESEARCH" ? "bg-blue-500" : "bg-zinc-400"
              }`}
              style={{ width: `${totalPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Component breakdown */}
      <div className="divide-y divide-zinc-100 rounded-xl border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
        {COMPONENT_META.map((meta, idx) => (
          <div key={meta.key} className={`px-5 py-4 ${idx === 0 ? "rounded-t-xl" : ""} ${idx === COMPONENT_META.length - 1 ? "rounded-b-xl" : ""} bg-white dark:bg-zinc-900`}>
            <ComponentBar
              component={breakdown[meta.key]}
              label={meta.label}
              icon={meta.icon}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
