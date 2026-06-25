"use client";

import { useState, useEffect, useCallback } from "react";
import type {
  ValuationMethod,
  DCFAssumptions,
  PEAssumptions,
  EVEBITDAAssumptions,
  ValuationPrefill,
  ScenarioSet,
} from "@/lib/valuation-calc";
import { calcDCF, calcPE, calcEVEBITDA, buildDefaultScenarios } from "@/lib/valuation-calc";

interface SavedRow {
  id: number;
  method: ValuationMethod;
  bearAssumptions: string;
  baseAssumptions: string;
  bullAssumptions: string;
  bearPrice: number | null;
  basePrice: number | null;
  bullPrice: number | null;
  currentPrice: number | null;
  calculatedAt: string;
}

interface Props {
  watchlistItemId: number;
}

type Scenario = "bear" | "base" | "bull";

const METHODS: { value: ValuationMethod; label: string; desc: string }[] = [
  { value: "DCF",        label: "DCF",        desc: "Discounted Cash Flow" },
  { value: "PE_MULTIPLE", label: "P/E",        desc: "Earnings multiple" },
  { value: "EV_EBITDA",  label: "EV/EBITDA",  desc: "Enterprise value multiple" },
];

const SCENARIO_COLORS = {
  bear: { bg: "bg-red-50 dark:bg-red-900/10",   border: "border-red-200 dark:border-red-800",   text: "text-red-600 dark:text-red-400",   label: "Bear" },
  base: { bg: "bg-zinc-50 dark:bg-zinc-900/50", border: "border-zinc-200 dark:border-zinc-700", text: "text-zinc-700 dark:text-zinc-300",  label: "Base" },
  bull: { bg: "bg-green-50 dark:bg-green-900/10", border: "border-green-200 dark:border-green-800", text: "text-green-600 dark:text-green-400", label: "Bull" },
};

function fmt(n: number | null | undefined, prefix = "$"): string {
  if (n == null) return "—";
  if (Math.abs(n) >= 1e12) return `${prefix}${(n / 1e12).toFixed(1)}T`;
  if (Math.abs(n) >= 1e9)  return `${prefix}${(n / 1e9).toFixed(1)}B`;
  if (Math.abs(n) >= 1e6)  return `${prefix}${(n / 1e6).toFixed(1)}M`;
  return `${prefix}${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

function NumInput({ label, value, onChange, suffix, step, min, max, note }: {
  label: string; value: number | string; onChange: (v: number) => void;
  suffix?: string; step?: number; min?: number; max?: number; note?: string;
}) {
  return (
    <div className="space-y-1">
      <label className="block text-[11px] text-zinc-500 dark:text-zinc-400">
        {label}{note && <span className="ml-1 text-zinc-400">({note})</span>}
      </label>
      <div className="flex items-center rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 overflow-hidden">
        <input
          type="number"
          value={value}
          onChange={e => onChange(parseFloat(e.target.value) || 0)}
          step={step ?? 0.01}
          min={min}
          max={max}
          className="flex-1 min-w-0 px-2 py-1.5 text-sm bg-transparent text-zinc-800 dark:text-zinc-200 focus:outline-none"
        />
        {suffix && <span className="px-2 text-xs text-zinc-400 border-l border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900">{suffix}</span>}
      </div>
    </div>
  );
}

function MoSBar({ mos }: { mos: number }) {
  const capped = Math.min(100, Math.max(-100, mos));
  const isPositive = mos >= 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center text-[11px]">
        <span className="text-zinc-400">Margin of Safety</span>
        <span className={`font-semibold ${isPositive ? "text-green-600 dark:text-green-400" : "text-red-500 dark:text-red-400"}`}>
          {isPositive ? "+" : ""}{mos.toFixed(1)}%
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
        <div
          className={`h-full rounded-full ${isPositive ? "bg-green-500" : "bg-red-500"} transition-all duration-300`}
          style={{ width: `${Math.abs(capped)}%`, marginLeft: isPositive ? "50%" : `${50 + capped}%` }}
        />
      </div>
      <div className="flex justify-between text-[10px] text-zinc-300 dark:text-zinc-600">
        <span>-100%</span><span>0</span><span>+100%</span>
      </div>
    </div>
  );
}

export default function ValuationPanel({ watchlistItemId }: Props) {
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [method, setMethod]       = useState<ValuationMethod>("DCF");
  const [prefill, setPrefill]     = useState<ValuationPrefill | null>(null);
  const [saved, setSaved]         = useState<SavedRow | null>(null);
  const [scenarios, setScenarios] = useState<ScenarioSet | null>(null);

  // Load prefill + saved on mount
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/watchlist/${watchlistItemId}/valuation`);
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Failed to load");
        const { prefill: pf, saved: sv } = json.data as { prefill: ValuationPrefill; saved: SavedRow | null };
        setPrefill(pf);
        if (sv) {
          setSaved(sv);
          setMethod(sv.method);
          setScenarios({
            bear: JSON.parse(sv.bearAssumptions),
            base: JSON.parse(sv.baseAssumptions),
            bull: JSON.parse(sv.bullAssumptions),
          });
        } else {
          setScenarios(buildDefaultScenarios("DCF", pf));
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Load error");
      } finally {
        setLoading(false);
      }
    })();
  }, [watchlistItemId]);

  const switchMethod = useCallback((m: ValuationMethod) => {
    setMethod(m);
    if (prefill) setScenarios(buildDefaultScenarios(m, prefill));
  }, [prefill]);

  function updateScenario(scenario: Scenario, field: string, value: number) {
    setScenarios(prev => {
      if (!prev) return prev;
      return { ...prev, [scenario]: { ...prev[scenario], [field]: value } };
    });
  }

  function calcResult(scenario: Scenario) {
    if (!scenarios || !prefill) return null;
    const a = scenarios[scenario];
    const price = saved?.currentPrice ?? prefill.currentPrice;
    if (method === "DCF")         return calcDCF(a as DCFAssumptions, price);
    if (method === "PE_MULTIPLE") return calcPE(a as PEAssumptions, price);
    return calcEVEBITDA(a as EVEBITDAAssumptions, price);
  }

  async function saveScenarios() {
    if (!scenarios || !prefill) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/watchlist/${watchlistItemId}/valuation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          method,
          bearAssumptions: scenarios.bear,
          baseAssumptions: scenarios.base,
          bullAssumptions: scenarios.bull,
          currentPrice: prefill.currentPrice,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(JSON.stringify(json.error));
      setSaved(json.data as SavedRow);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <section className="space-y-3">
        <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Valuation Scenarios</h2>
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-5 py-8 text-center">
          <p className="text-sm text-zinc-400">Loading financial data…</p>
        </div>
      </section>
    );
  }

  if (!prefill || !scenarios) {
    return (
      <section className="space-y-3">
        <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Valuation Scenarios</h2>
        <p className="text-xs text-red-500">{error ?? "Could not load valuation data"}</p>
      </section>
    );
  }

  const results = { bear: calcResult("bear"), base: calcResult("base"), bull: calcResult("bull") };
  const currentPrice = prefill.currentPrice;

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Valuation Scenarios</h2>
        <div className="flex items-center gap-3">
          {saved && (
            <span className="text-[11px] text-zinc-400">
              Saved {new Date(saved.calculatedAt).toLocaleDateString()}
            </span>
          )}
          <button
            onClick={saveScenarios}
            disabled={saving}
            className="text-xs font-medium rounded-lg px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white transition-colors"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>

      {error && <p className="text-xs text-red-500 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">{error}</p>}

      {/* Current price + method selector */}
      <div className="flex items-center justify-between rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-5 py-3">
        <div>
          <p className="text-[11px] text-zinc-400">Current Price</p>
          <p className="text-lg font-bold text-zinc-900 dark:text-zinc-50">${currentPrice.toFixed(2)}</p>
        </div>
        <div className="flex gap-1 p-1 rounded-lg bg-zinc-100 dark:bg-zinc-800">
          {METHODS.map(m => (
            <button
              key={m.value}
              onClick={() => switchMethod(m.value)}
              title={m.desc}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                method === m.value
                  ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm"
                  : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Three scenario columns */}
      <div className="grid grid-cols-3 gap-3">
        {(["bear", "base", "bull"] as Scenario[]).map(s => {
          const colors = SCENARIO_COLORS[s];
          const result = results[s];
          const a = scenarios[s];

          return (
            <div key={s} className={`rounded-xl border ${colors.border} ${colors.bg} p-4 space-y-3`}>
              {/* Header */}
              <div className="flex items-center justify-between">
                <span className={`text-xs font-bold uppercase tracking-wider ${colors.text}`}>{colors.label}</span>
                {result && (
                  <span className="text-sm font-bold text-zinc-800 dark:text-zinc-100">
                    ${result.impliedPrice.toFixed(2)}
                  </span>
                )}
              </div>

              {/* Margin of safety */}
              {result && <MoSBar mos={result.marginOfSafety} />}

              {/* Inputs */}
              <div className="space-y-2 pt-1">
                {method === "DCF" && (() => {
                  const d = a as DCFAssumptions;
                  return <>
                    <NumInput label="FCF" value={d.baseFCF} onChange={v => updateScenario(s, "baseFCF", v)} suffix="$" step={1e8} note="trailing" />
                    <NumInput label="Growth Rate" value={+(d.revenueGrowthRate * 100).toFixed(1)} onChange={v => updateScenario(s, "revenueGrowthRate", v / 100)} suffix="%" step={0.5} min={-50} max={100} />
                    <NumInput label="Discount Rate" value={+(d.discountRate * 100).toFixed(1)} onChange={v => updateScenario(s, "discountRate", v / 100)} suffix="%" step={0.5} min={1} max={30} />
                    <NumInput label="Terminal Growth" value={+(d.terminalGrowthRate * 100).toFixed(1)} onChange={v => updateScenario(s, "terminalGrowthRate", v / 100)} suffix="%" step={0.5} min={0} max={5} />
                    <NumInput label="Years" value={d.projectionYears} onChange={v => updateScenario(s, "projectionYears", Math.round(v))} step={1} min={3} max={15} />
                  </>;
                })()}
                {method === "PE_MULTIPLE" && (() => {
                  const d = a as PEAssumptions;
                  return <>
                    <NumInput label="Forward EPS" value={d.forwardEPS} onChange={v => updateScenario(s, "forwardEPS", v)} suffix="$" step={0.1} />
                    <NumInput label="Target P/E" value={d.targetPE} onChange={v => updateScenario(s, "targetPE", v)} suffix="x" step={0.5} min={1} />
                  </>;
                })()}
                {method === "EV_EBITDA" && (() => {
                  const d = a as EVEBITDAAssumptions;
                  return <>
                    <NumInput label="EBITDA" value={d.ebitda} onChange={v => updateScenario(s, "ebitda", v)} suffix="$" step={1e8} />
                    <NumInput label="Target EV/EBITDA" value={d.targetMultiple} onChange={v => updateScenario(s, "targetMultiple", v)} suffix="x" step={0.5} min={1} />
                    <NumInput label="Net Debt" value={d.netDebt} onChange={v => updateScenario(s, "netDebt", v)} suffix="$" step={1e8} note="debt−cash" />
                  </>;
                })()}
              </div>
            </div>
          );
        })}
      </div>

      {/* Prefill summary */}
      <div className="rounded-xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 px-4 py-3">
        <p className="text-[11px] font-medium text-zinc-400 uppercase tracking-wide mb-2">Live data from Yahoo Finance</p>
        <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-zinc-500 dark:text-zinc-400">
          {prefill.freeCashFlow != null && <span>FCF: {fmt(prefill.freeCashFlow)}</span>}
          {prefill.ebitda != null && <span>EBITDA: {fmt(prefill.ebitda)}</span>}
          {prefill.forwardEPS != null && <span>Fwd EPS: ${prefill.forwardEPS.toFixed(2)}</span>}
          {prefill.forwardPE != null && <span>Fwd P/E: {prefill.forwardPE.toFixed(1)}x</span>}
          {prefill.enterpriseToEbitda != null && <span>EV/EBITDA: {prefill.enterpriseToEbitda.toFixed(1)}x</span>}
          {prefill.sharesOutstanding != null && <span>Shares: {fmt(prefill.sharesOutstanding, "")}</span>}
          {prefill.netDebt != null && <span>Net Debt: {fmt(prefill.netDebt)}</span>}
        </div>
      </div>
    </section>
  );
}
