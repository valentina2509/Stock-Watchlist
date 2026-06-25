"use client";

import { useState, useEffect } from "react";

interface Bar { date: string; close: number }
type Period = "1mo" | "3mo" | "6mo" | "1y";

interface Props {
  ticker: string;
  currentPrice?: number;
}

const PERIODS: { value: Period; label: string }[] = [
  { value: "1mo", label: "1M" },
  { value: "3mo", label: "3M" },
  { value: "6mo", label: "6M" },
  { value: "1y",  label: "1Y" },
];

function Sparkline({ bars, positive }: { bars: Bar[]; positive: boolean }) {
  if (bars.length < 2) return null;

  const W = 600, H = 120, PAD = 4;
  const closes = bars.map(b => b.close);
  const min = Math.min(...closes);
  const max = Math.max(...closes);
  const range = max - min || 1;

  const px = (i: number) => PAD + (i / (bars.length - 1)) * (W - PAD * 2);
  const py = (v: number) => PAD + (1 - (v - min) / range) * (H - PAD * 2);

  const points = bars.map((b, i) => `${px(i)},${py(b.close)}`).join(" ");
  const area = `M${px(0)},${py(bars[0].close)} ` +
    bars.slice(1).map((b, i) => `L${px(i + 1)},${py(b.close)}`).join(" ") +
    ` L${px(bars.length - 1)},${H} L${px(0)},${H} Z`;

  const color = positive ? "#10b981" : "#ef4444";
  const fillId = `fill-${positive ? "pos" : "neg"}`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="none">
      <defs>
        <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.15" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${fillId})`} />
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

export default function PriceChart({ ticker, currentPrice }: Props) {
  const [period, setPeriod]   = useState<Period>("3mo");
  const [bars, setBars]       = useState<Bar[]>([]);
  const [loading, setLoading] = useState(true);
  const [hovered, setHovered] = useState<Bar | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/quote/${ticker}/history?period=${period}`)
      .then(r => r.json())
      .then(j => setBars(j.data ?? []))
      .finally(() => setLoading(false));
  }, [ticker, period]);

  const first = bars[0]?.close ?? 0;
  const last  = bars[bars.length - 1]?.close ?? currentPrice ?? 0;
  const change = first > 0 ? ((last - first) / first) * 100 : 0;
  const positive = change >= 0;
  const display = hovered ?? (bars.length > 0 ? bars[bars.length - 1] : null);

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Price</h2>
        <div className="flex gap-0.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 p-0.5">
          {PERIODS.map(p => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={`px-2.5 py-0.5 rounded-md text-xs font-medium transition-colors ${
                period === p.value
                  ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm"
                  : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
        {/* Price header */}
        <div className="px-5 pt-4 pb-2 flex items-end gap-3">
          <span className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            ${display ? display.close.toFixed(2) : (currentPrice?.toFixed(2) ?? "—")}
          </span>
          {!loading && bars.length > 0 && (
            <span className={`text-sm font-semibold mb-0.5 ${positive ? "text-green-600 dark:text-green-400" : "text-red-500 dark:text-red-400"}`}>
              {positive ? "+" : ""}{change.toFixed(2)}%
            </span>
          )}
          {display && (
            <span className="text-xs text-zinc-400 mb-0.5 ml-auto">{display.date}</span>
          )}
        </div>

        {/* Chart */}
        <div className="relative h-28 px-0">
          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-6 h-6 rounded-full border-2 border-zinc-200 dark:border-zinc-700 border-t-blue-500 animate-spin" />
            </div>
          ) : bars.length < 2 ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <p className="text-xs text-zinc-400">No price data</p>
            </div>
          ) : (
            <div
              className="w-full h-full"
              onMouseLeave={() => setHovered(null)}
              onMouseMove={e => {
                const rect = e.currentTarget.getBoundingClientRect();
                const x = (e.clientX - rect.left) / rect.width;
                const idx = Math.round(x * (bars.length - 1));
                setHovered(bars[Math.min(Math.max(0, idx), bars.length - 1)]);
              }}
            >
              <Sparkline bars={bars} positive={positive} />
            </div>
          )}
        </div>

        {/* Stats footer */}
        {!loading && bars.length > 0 && (
          <div className="px-5 py-3 border-t border-zinc-100 dark:border-zinc-800 flex gap-6 text-xs text-zinc-500">
            <span>Low <span className="font-medium text-zinc-700 dark:text-zinc-300">${Math.min(...bars.map(b => b.close)).toFixed(2)}</span></span>
            <span>High <span className="font-medium text-zinc-700 dark:text-zinc-300">${Math.max(...bars.map(b => b.close)).toFixed(2)}</span></span>
            <span>{bars.length} trading days</span>
          </div>
        )}
      </div>
    </section>
  );
}
