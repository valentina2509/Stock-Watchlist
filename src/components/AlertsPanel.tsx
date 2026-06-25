"use client";

import { useState, useEffect } from "react";

type AlertType =
  | "CONVICTION_SURGE" | "CONVICTION_DROP"
  | "WHY_NOW_HOT_WINDOW"
  | "THESIS_DRIFT" | "THESIS_BROKEN"
  | "EARNINGS_COUNTDOWN" | "CATALYST_EVENT"
  | "ENTRY_CONDITION_MET" | "EXIT_SIGNAL" | "PEER_DISLOCATION";

type AlertStatus = "ACTIVE" | "FIRED" | "SNOOZED" | "DISMISSED";

interface Alert {
  id: number;
  alertType: AlertType;
  status: AlertStatus;
  message: string | null;
  threshold: number | null;
  createdAt: string;
  firedAt: string | null;
  snoozedUntil: string | null;
}

interface Props {
  watchlistItemId: number;
}

const ALERT_META: Record<AlertType, { icon: string; color: string; label: string }> = {
  CONVICTION_SURGE:     { icon: "↑", color: "text-green-600 bg-green-50 dark:bg-green-900/20 dark:text-green-400",  label: "Conviction Surge" },
  CONVICTION_DROP:      { icon: "↓", color: "text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400",          label: "Conviction Drop" },
  WHY_NOW_HOT_WINDOW:   { icon: "🔥", color: "text-amber-600 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400", label: "Hot Window" },
  THESIS_DRIFT:         { icon: "⚠", color: "text-orange-600 bg-orange-50 dark:bg-orange-900/20 dark:text-orange-400", label: "Thesis Drift" },
  THESIS_BROKEN:        { icon: "✕", color: "text-red-700 bg-red-100 dark:bg-red-900/30 dark:text-red-300",          label: "Thesis Broken" },
  EARNINGS_COUNTDOWN:   { icon: "📅", color: "text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400",      label: "Earnings Soon" },
  CATALYST_EVENT:       { icon: "⚡", color: "text-violet-600 bg-violet-50 dark:bg-violet-900/20 dark:text-violet-400", label: "Catalyst" },
  ENTRY_CONDITION_MET:  { icon: "✓", color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 dark:text-emerald-400", label: "Entry Condition" },
  EXIT_SIGNAL:          { icon: "⇥", color: "text-zinc-600 bg-zinc-100 dark:bg-zinc-800 dark:text-zinc-300",          label: "Exit Signal" },
  PEER_DISLOCATION:     { icon: "≠", color: "text-sky-600 bg-sky-50 dark:bg-sky-900/20 dark:text-sky-400",            label: "Peer Dislocation" },
};

function timeAgo(dateStr: string): string {
  const ms = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 60)  return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)   return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function AlertsPanel({ watchlistItemId }: Props) {
  const [alerts, setAlerts]   = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState<number | null>(null); // alertId being acted on

  useEffect(() => {
    fetch(`/api/watchlist/${watchlistItemId}/alerts`)
      .then(r => r.json())
      .then(j => setAlerts(j.data ?? []))
      .finally(() => setLoading(false));
  }, [watchlistItemId]);

  async function act(alertId: number, action: "dismiss" | "snooze" | "fire", snoozeHours?: number) {
    setWorking(alertId);
    try {
      const res = await fetch(`/api/watchlist/${watchlistItemId}/alerts/${alertId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, snoozeHours }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      const updated = json.data as Alert;
      setAlerts(prev => prev.map(a => a.id === alertId ? updated : a));
    } finally {
      setWorking(null);
    }
  }

  const active    = alerts.filter(a => a.status === "ACTIVE");
  const snoozed   = alerts.filter(a => a.status === "SNOOZED");
  const dismissed = alerts.filter(a => a.status === "DISMISSED" || a.status === "FIRED");

  if (loading) return null;
  if (alerts.length === 0) return null;

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Alerts</h2>
        {active.length > 0 && (
          <span className="inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-red-500 text-[10px] font-bold text-white">
            {active.length}
          </span>
        )}
      </div>

      <div className="space-y-2">
        {/* Active */}
        {active.map(alert => {
          const meta = ALERT_META[alert.alertType];
          const busy = working === alert.id;
          return (
            <div key={alert.id} className={`rounded-xl border border-transparent px-4 py-3 flex items-start gap-3 ${meta.color}`}>
              <span className="text-base leading-none mt-0.5 shrink-0">{meta.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-semibold">{meta.label}</span>
                  <span className="text-[11px] opacity-60">{timeAgo(alert.createdAt)}</span>
                </div>
                {alert.message && (
                  <p className="text-xs mt-0.5 opacity-80 leading-relaxed">{alert.message}</p>
                )}
              </div>
              <div className="flex gap-1.5 shrink-0">
                <button
                  onClick={() => act(alert.id, "snooze", 24)}
                  disabled={busy}
                  title="Snooze 24h"
                  className="text-[11px] px-2 py-0.5 rounded bg-white/50 dark:bg-black/20 hover:bg-white/80 dark:hover:bg-black/40 disabled:opacity-50 font-medium transition-colors"
                >
                  24h
                </button>
                <button
                  onClick={() => act(alert.id, "dismiss")}
                  disabled={busy}
                  title="Dismiss"
                  className="text-[11px] px-2 py-0.5 rounded bg-white/50 dark:bg-black/20 hover:bg-white/80 dark:hover:bg-black/40 disabled:opacity-50 font-medium transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>
          );
        })}

        {/* Snoozed (collapsed summary) */}
        {snoozed.length > 0 && (
          <p className="text-xs text-zinc-400 px-1">
            {snoozed.length} snoozed alert{snoozed.length > 1 ? "s" : ""}
          </p>
        )}

        {/* Dismissed (collapsed summary) */}
        {dismissed.length > 0 && active.length === 0 && (
          <p className="text-xs text-zinc-400 px-1">
            {dismissed.length} past alert{dismissed.length > 1 ? "s" : ""} (dismissed)
          </p>
        )}
      </div>
    </section>
  );
}
