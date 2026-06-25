"use client";

import { useState } from "react";
import Link from "next/link";
import { StateBadge, ConvictionMeter } from "./ConvictionBadge";
import type { WatchlistState } from "@/db/schema";

interface WatchlistEntry {
  id: number;
  state: WatchlistState;
  addedAt: Date | string;
  notes: string | null;
  stock: {
    ticker: string;
    name: string;
    sector: string | null;
    marketCap: number | null;
  };
  convictionScore: {
    totalScore: number;
    scoreBand: string;
  } | null;
}

interface Props {
  items: WatchlistEntry[];
  onRemove: (id: number) => void;
  onTransition: (id: number, state: WatchlistState) => void;
}

const NEXT_STATES: Record<WatchlistState, WatchlistState | null> = {
  DISCOVERY: "RESEARCH",
  RESEARCH: "BUILDING_CONVICTION",
  BUILDING_CONVICTION: "HIGH_CONVICTION",
  HIGH_CONVICTION: "POSITION",
  POSITION: "MONITORING",
  MONITORING: "EXITED",
  EXITED: null,
};

function formatMarketCap(cap: number | null): string {
  if (!cap) return "—";
  if (cap >= 1e12) return `$${(cap / 1e12).toFixed(1)}T`;
  if (cap >= 1e9) return `$${(cap / 1e9).toFixed(1)}B`;
  if (cap >= 1e6) return `$${(cap / 1e6).toFixed(0)}M`;
  return `$${cap.toLocaleString()}`;
}

export default function WatchlistTable({ items, onRemove, onTransition }: Props) {
  const [confirming, setConfirming] = useState<number | null>(null);

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50 py-16 text-center dark:border-zinc-800 dark:bg-zinc-900">
        <p className="text-sm text-zinc-500">No stocks in your watchlist yet.</p>
        <p className="mt-1 text-xs text-zinc-400">Search above to add your first stock.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-200 bg-zinc-50 text-left dark:border-zinc-800 dark:bg-zinc-900">
            <th className="px-4 py-3 font-medium text-zinc-500">Ticker</th>
            <th className="px-4 py-3 font-medium text-zinc-500">Name</th>
            <th className="px-4 py-3 font-medium text-zinc-500">Sector</th>
            <th className="px-4 py-3 font-medium text-zinc-500">Market Cap</th>
            <th className="px-4 py-3 font-medium text-zinc-500">State</th>
            <th className="px-4 py-3 font-medium text-zinc-500">Conviction</th>
            <th className="px-4 py-3 font-medium text-zinc-500">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {items.map((item) => {
            const nextState = NEXT_STATES[item.state];
            return (
              <tr key={item.id} className="bg-white hover:bg-zinc-50/50 dark:bg-zinc-950 dark:hover:bg-zinc-900/50">
                <td className="px-4 py-3">
                  <Link
                    href={`/stock/${item.id}`}
                    className="font-mono font-semibold text-blue-600 hover:underline dark:text-blue-400"
                  >
                    {item.stock.ticker}
                  </Link>
                </td>
                <td className="px-4 py-3 max-w-[200px] truncate text-zinc-700 dark:text-zinc-300">
                  {item.stock.name}
                </td>
                <td className="px-4 py-3 text-zinc-500">{item.stock.sector ?? "—"}</td>
                <td className="px-4 py-3 text-zinc-500 font-mono text-xs">
                  {formatMarketCap(item.stock.marketCap)}
                </td>
                <td className="px-4 py-3">
                  <StateBadge state={item.state} />
                </td>
                <td className="px-4 py-3">
                  <ConvictionMeter score={item.convictionScore?.totalScore ?? 0} />
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {nextState && (
                      <button
                        onClick={() => onTransition(item.id, nextState)}
                        className="rounded-md bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-600 hover:bg-blue-100 dark:bg-blue-950 dark:text-blue-300 dark:hover:bg-blue-900"
                      >
                        → {nextState.replace("_", " ").toLowerCase()}
                      </button>
                    )}
                    {confirming === item.id ? (
                      <>
                        <button
                          onClick={() => { onRemove(item.id); setConfirming(null); }}
                          className="rounded-md bg-red-50 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-100 dark:bg-red-950 dark:text-red-400"
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() => setConfirming(null)}
                          className="text-xs text-zinc-400 hover:text-zinc-600"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => setConfirming(item.id)}
                        className="text-xs text-zinc-400 hover:text-red-500"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
