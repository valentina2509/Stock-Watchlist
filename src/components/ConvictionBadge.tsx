const BAND_CONFIG = {
  WATCH:     { label: "Watch",          color: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400" },
  RESEARCH:  { label: "Research",       color: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300" },
  BUILDING:  { label: "Building",       color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300" },
  HIGH:      { label: "High",           color: "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300" },
  CONVICTION:{ label: "Conviction",     color: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300" },
} as const;

const STATE_CONFIG: Record<string, { label: string; color: string }> = {
  DISCOVERY:         { label: "Discovery",         color: "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400" },
  RESEARCH:          { label: "Research",           color: "bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-300" },
  BUILDING_CONVICTION: { label: "Building",         color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300" },
  HIGH_CONVICTION:   { label: "High Conviction",    color: "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300" },
  POSITION:          { label: "Position",           color: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300" },
  MONITORING:        { label: "Monitoring",         color: "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300" },
  EXITED:            { label: "Exited",             color: "bg-zinc-100 text-zinc-400 dark:bg-zinc-900 dark:text-zinc-600" },
};

export function ScoreBandBadge({ band }: { band: keyof typeof BAND_CONFIG }) {
  const cfg = BAND_CONFIG[band] ?? BAND_CONFIG.WATCH;
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${cfg.color}`}>
      {cfg.label}
    </span>
  );
}

export function StateBadge({ state }: { state: string }) {
  const cfg = STATE_CONFIG[state] ?? STATE_CONFIG.DISCOVERY;
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${cfg.color}`}>
      {cfg.label}
    </span>
  );
}

export function ConvictionMeter({ score }: { score: number }) {
  const pct = Math.min(100, Math.max(0, score));
  const color =
    pct >= 80 ? "bg-green-500" :
    pct >= 60 ? "bg-orange-500" :
    pct >= 40 ? "bg-yellow-500" :
    pct >= 20 ? "bg-blue-500" : "bg-zinc-300";

  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-24 rounded-full bg-zinc-100 dark:bg-zinc-800">
        <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-mono text-zinc-500">{Math.round(pct)}</span>
    </div>
  );
}
