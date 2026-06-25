"use client";

import { useState, useEffect } from "react";

interface PeerMetrics {
  ticker: string;
  name: string;
  price: number | null;
  marketCap: number | null;
  trailingPE: number | null;
  forwardPE: number | null;
  revenueGrowth: number | null;
  grossMargin: number | null;
  operatingMargin: number | null;
  fiftyTwoWeekChangePercent: number | null;
  loading: boolean;
  error?: string;
}

interface Props {
  baseTicker: string;
}

function fmt(n: number | null | undefined, type: "price" | "pct" | "cap" | "multiple" | "margin"): string {
  if (n == null) return "—";
  if (type === "price")    return `$${n.toFixed(2)}`;
  if (type === "pct")      return `${n >= 0 ? "+" : ""}${(n * 100).toFixed(1)}%`;
  if (type === "multiple") return `${n.toFixed(1)}x`;
  if (type === "margin")   return `${(n * 100).toFixed(1)}%`;
  if (type === "cap") {
    if (n >= 1e12) return `$${(n / 1e12).toFixed(1)}T`;
    if (n >= 1e9)  return `$${(n / 1e9).toFixed(1)}B`;
    return `$${(n / 1e6).toFixed(0)}M`;
  }
  return String(n);
}

function Cell({ value, best, worst, neutral }: { value: string; best?: boolean; worst?: boolean; neutral?: boolean }) {
  return (
    <td className={`px-3 py-2.5 text-xs font-mono text-right whitespace-nowrap ${
      best    ? "text-green-600 dark:text-green-400 font-semibold" :
      worst   ? "text-red-500 dark:text-red-400" :
      neutral ? "text-zinc-500 dark:text-zinc-400" :
                "text-zinc-700 dark:text-zinc-300"
    }`}>
      {value}
    </td>
  );
}

export default function PeerComparison({ baseTicker }: Props) {
  const storageKey = `peers-${baseTicker}`;
  const [baseMetrics, setBaseMetrics] = useState<Omit<PeerMetrics, "loading"> | null>(null);

  const [peerTickers, setPeerTickers] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try { return JSON.parse(localStorage.getItem(storageKey) ?? "[]"); } catch { return []; }
  });
  const [peerData, setPeerData]   = useState<Record<string, PeerMetrics>>({});
  const [input, setInput]         = useState("");
  const [adding, setAdding]       = useState(false);
  const [addError, setAddError]   = useState<string | null>(null);

  // Persist peer list
  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(peerTickers));
  }, [peerTickers, storageKey]);

  // Load base metrics
  useEffect(() => {
    fetch(`/api/peers/${baseTicker}`)
      .then(r => r.json())
      .then(d => setBaseMetrics(d))
      .catch(() => {});
  }, [baseTicker]);

  // Load any unloaded peers
  useEffect(() => {
    peerTickers.forEach(t => {
      if (peerData[t]) return;
      setPeerData(prev => ({ ...prev, [t]: { ...prev[t], ticker: t, name: t, loading: true } as PeerMetrics }));
      fetch(`/api/peers/${t}`)
        .then(r => r.json())
        .then(d => setPeerData(prev => ({ ...prev, [t]: { ...d, loading: false } })))
        .catch(() => setPeerData(prev => ({ ...prev, [t]: { ticker: t, name: t, price: null, marketCap: null, trailingPE: null, forwardPE: null, revenueGrowth: null, grossMargin: null, operatingMargin: null, fiftyTwoWeekChangePercent: null, loading: false, error: "Failed to load" } })));
    });
  }, [peerTickers]); // eslint-disable-line react-hooks/exhaustive-deps

  async function addPeer() {
    const t = input.trim().toUpperCase();
    if (!t || peerTickers.includes(t) || t === baseTicker) return;
    setAdding(true);
    setAddError(null);
    try {
      const res = await fetch(`/api/peers/${t}`);
      if (!res.ok) throw new Error("Ticker not found");
      const data = await res.json();
      setPeerTickers(prev => [...prev, t]);
      setPeerData(prev => ({ ...prev, [t]: { ...data, loading: false } }));
      setInput("");
    } catch (e) {
      setAddError(e instanceof Error ? e.message : "Failed");
    } finally {
      setAdding(false);
    }
  }

  function removePeer(t: string) {
    setPeerTickers(prev => prev.filter(x => x !== t));
    setPeerData(prev => { const n = { ...prev }; delete n[t]; return n; });
  }

  const allRows: Array<Omit<PeerMetrics, "loading"> & { isBase?: boolean; loading?: boolean }> = [
    baseMetrics
      ? { ...baseMetrics, isBase: true }
      : { ticker: baseTicker, name: baseTicker, price: null, marketCap: null, trailingPE: null, forwardPE: null, revenueGrowth: null, grossMargin: null, operatingMargin: null, fiftyTwoWeekChangePercent: null, isBase: true, loading: true },
    ...peerTickers.map(t => ({ ...(peerData[t] ?? { ticker: t, name: t, loading: true } as PeerMetrics), isBase: false })),
  ];

  // Determine best/worst for each numeric column
  function rank(field: keyof Omit<PeerMetrics, "loading" | "ticker" | "name">, higherIsBetter: boolean) {
    const vals = allRows.map(r => (r as Record<string, unknown>)[field] as number | null).filter(v => v != null) as number[];
    if (vals.length < 2) return { best: null, worst: null };
    const best  = higherIsBetter ? Math.max(...vals) : Math.min(...vals);
    const worst = higherIsBetter ? Math.min(...vals) : Math.max(...vals);
    return { best, worst };
  }

  const ranks = {
    forwardPE:                rank("forwardPE", false),
    revenueGrowth:            rank("revenueGrowth", true),
    grossMargin:              rank("grossMargin", true),
    fiftyTwoWeekChangePercent: rank("fiftyTwoWeekChangePercent", true),
  };

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Peer Comparison</h2>
      </div>

      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900">
                <th className="px-3 py-2.5 text-left font-medium text-zinc-500 w-28">Ticker</th>
                <th className="px-3 py-2.5 text-right font-medium text-zinc-500">Price</th>
                <th className="px-3 py-2.5 text-right font-medium text-zinc-500">Mkt Cap</th>
                <th className="px-3 py-2.5 text-right font-medium text-zinc-500">Fwd P/E</th>
                <th className="px-3 py-2.5 text-right font-medium text-zinc-500">Rev Growth</th>
                <th className="px-3 py-2.5 text-right font-medium text-zinc-500">Gross Margin</th>
                <th className="px-3 py-2.5 text-right font-medium text-zinc-500">52W Chg</th>
                <th className="px-3 py-2.5 w-6" />
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50 dark:divide-zinc-800/50">
              {allRows.map(row => {
                if ((row as PeerMetrics).loading) {
                  return (
                    <tr key={row.ticker} className="animate-pulse">
                      <td className="px-3 py-2.5 font-mono font-semibold text-zinc-400">{row.ticker}</td>
                      {Array.from({ length: 6 }).map((_, i) => (
                        <td key={i} className="px-3 py-2.5"><div className="h-3 rounded bg-zinc-100 dark:bg-zinc-800 ml-auto w-12" /></td>
                      ))}
                      <td />
                    </tr>
                  );
                }

                const fpe    = (row as PeerMetrics).forwardPE;
                const revg   = (row as PeerMetrics).revenueGrowth;
                const gm     = (row as PeerMetrics).grossMargin;
                const w52    = (row as PeerMetrics).fiftyTwoWeekChangePercent;

                return (
                  <tr key={row.ticker} className={row.isBase ? "bg-blue-50/50 dark:bg-blue-900/10" : "bg-white dark:bg-zinc-950"}>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1.5">
                        <span className={`font-mono font-semibold ${row.isBase ? "text-blue-600 dark:text-blue-400" : "text-zinc-700 dark:text-zinc-300"}`}>
                          {row.ticker}
                        </span>
                        {row.isBase && <span className="text-[10px] text-blue-400">you</span>}
                      </div>
                      <div className="text-[11px] text-zinc-400 truncate max-w-[100px]">{(row as PeerMetrics).name}</div>
                    </td>
                    <Cell value={fmt((row as PeerMetrics).price, "price")} neutral />
                    <Cell value={fmt((row as PeerMetrics).marketCap, "cap")} neutral />
                    <Cell
                      value={fmt(fpe, "multiple")}
                      best={fpe != null && fpe === ranks.forwardPE.best}
                      worst={fpe != null && fpe === ranks.forwardPE.worst}
                    />
                    <Cell
                      value={fmt(revg, "pct")}
                      best={revg != null && revg === ranks.revenueGrowth.best}
                      worst={revg != null && revg === ranks.revenueGrowth.worst}
                    />
                    <Cell
                      value={fmt(gm, "margin")}
                      best={gm != null && gm === ranks.grossMargin.best}
                      worst={gm != null && gm === ranks.grossMargin.worst}
                    />
                    <Cell
                      value={fmt(w52, "pct")}
                      best={w52 != null && w52 === ranks.fiftyTwoWeekChangePercent.best}
                      worst={w52 != null && w52 === ranks.fiftyTwoWeekChangePercent.worst}
                    />
                    <td className="px-2 py-2.5 text-right">
                      {!row.isBase && (
                        <button
                          onClick={() => removePeer(row.ticker)}
                          className="text-zinc-300 dark:text-zinc-600 hover:text-red-400 dark:hover:text-red-400 text-xs"
                        >
                          ✕
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Add peer */}
        <div className="border-t border-zinc-100 dark:border-zinc-800 px-3 py-2.5 flex items-center gap-2">
          <input
            value={input}
            onChange={e => setInput(e.target.value.toUpperCase())}
            onKeyDown={e => e.key === "Enter" && addPeer()}
            placeholder="Add peer ticker…"
            maxLength={10}
            className="flex-1 bg-transparent text-xs text-zinc-700 dark:text-zinc-300 placeholder:text-zinc-400 focus:outline-none"
          />
          {addError && <span className="text-xs text-red-500">{addError}</span>}
          <button
            onClick={addPeer}
            disabled={adding || !input.trim()}
            className="text-xs font-medium text-blue-500 hover:text-blue-600 dark:text-blue-400 disabled:opacity-40"
          >
            {adding ? "…" : "+ Add"}
          </button>
        </div>
      </div>
      <p className="text-[11px] text-zinc-400 px-1">Green = best in class · Red = worst · Peers saved locally</p>
    </section>
  );
}
