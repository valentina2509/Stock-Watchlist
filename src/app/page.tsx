"use client";

import { useState, useEffect, useCallback } from "react";
import StockSearch from "@/components/StockSearch";
import WatchlistTable from "@/components/WatchlistTable";
import type { WatchlistState } from "@/db/schema";

interface WatchlistEntry {
  id: number;
  state: WatchlistState;
  addedAt: string;
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

export default function Home() {
  const [watchlist, setWatchlist] = useState<WatchlistEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchWatchlist = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await fetch("/api/watchlist");
      const data = await res.json();
      setWatchlist(data);
    } catch {
      setError("Failed to load watchlist");
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchWatchlist(); }, [fetchWatchlist]);

  async function handleAdd(ticker: string, _name: string) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/watchlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticker }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Failed to add stock");
        return;
      }
      await fetchWatchlist();
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  async function handleRemove(id: number) {
    await fetch(`/api/watchlist/${id}`, { method: "DELETE" });
    setWatchlist((prev) => prev.filter((item) => item.id !== id));
  }

  async function handleTransition(id: number, state: WatchlistState) {
    const res = await fetch(`/api/watchlist/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ state }),
    });
    if (res.ok) {
      await fetchWatchlist();
    } else {
      const data = await res.json();
      setError(data.error ?? "Transition failed");
    }
  }

  const byState = (state: WatchlistState) =>
    watchlist.filter((item) => item.state === state).length;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Conviction</h1>
            <p className="text-xs text-zinc-500">Stock Research Pipeline</p>
          </div>
          <div className="flex items-center gap-4 text-xs text-zinc-400">
            <span>{watchlist.length} stocks</span>
            {refreshing && <span>Refreshing…</span>}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8 space-y-8">
        {/* Pipeline summary */}
        <div className="grid grid-cols-4 gap-4 sm:grid-cols-7">
          {(["DISCOVERY", "RESEARCH", "BUILDING_CONVICTION", "HIGH_CONVICTION", "POSITION", "MONITORING", "EXITED"] as WatchlistState[]).map((state) => (
            <div key={state} className="rounded-lg border border-zinc-200 bg-white px-3 py-2 dark:border-zinc-800 dark:bg-zinc-900">
              <p className="text-xs text-zinc-400 truncate">{state.replace(/_/g, " ").toLowerCase()}</p>
              <p className="text-2xl font-semibold text-zinc-800 dark:text-zinc-100">{byState(state)}</p>
            </div>
          ))}
        </div>

        {/* Add stock */}
        <section className="space-y-3">
          <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Add to Watchlist</h2>
          <StockSearch onAdd={handleAdd} loading={loading} />
          {loading && <p className="text-xs text-zinc-400">Fetching stock data…</p>}
          {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
        </section>

        {/* Watchlist */}
        <section className="space-y-3">
          <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Research Pipeline</h2>
          <WatchlistTable
            items={watchlist}
            onRemove={handleRemove}
            onTransition={handleTransition}
          />
        </section>
      </main>
    </div>
  );
}
