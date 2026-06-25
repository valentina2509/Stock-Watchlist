"use client";

import { useState } from "react";

type DriftStatus = "ON_TRACK" | "CONFIRMING" | "DIVERGING" | "BROKEN";

interface Thesis {
  id: number;
  version: number;
  bullCase: string | null;
  bearCase: string | null;
  keyAssumptions: string | null; // JSON string
  targetPrice: number | null;
  timeHorizon: string | null;
  driftStatus: DriftStatus;
  createdAt: string;
}

interface Props {
  watchlistItemId: number;
  initialThesis: Thesis | null;
}

const DRIFT_OPTIONS: { value: DriftStatus; label: string; color: string }[] = [
  { value: "ON_TRACK",   label: "On Track",  color: "text-zinc-600 dark:text-zinc-400" },
  { value: "CONFIRMING", label: "Confirming", color: "text-green-600 dark:text-green-400" },
  { value: "DIVERGING",  label: "Diverging",  color: "text-orange-500 dark:text-orange-400" },
  { value: "BROKEN",     label: "Broken",     color: "text-red-600 dark:text-red-400" },
];

function DriftBadge({ status }: { status: DriftStatus }) {
  const opt = DRIFT_OPTIONS.find(o => o.value === status)!;
  return (
    <span className={`text-xs font-semibold uppercase tracking-wide ${opt.color}`}>
      {opt.label}
    </span>
  );
}

function parseAssumptions(raw: string | null): string[] {
  if (!raw) return [];
  try { return JSON.parse(raw) as string[]; } catch { return []; }
}

export default function ThesisEditor({ watchlistItemId, initialThesis }: Props) {
  const [thesis, setThesis] = useState<Thesis | null>(initialThesis);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [bullCase, setBullCase]       = useState(initialThesis?.bullCase ?? "");
  const [bearCase, setBearCase]       = useState(initialThesis?.bearCase ?? "");
  const [assumptions, setAssumptions] = useState<string[]>(parseAssumptions(initialThesis?.keyAssumptions ?? null));
  const [targetPrice, setTargetPrice] = useState(initialThesis?.targetPrice?.toString() ?? "");
  const [timeHorizon, setTimeHorizon] = useState(initialThesis?.timeHorizon ?? "");
  const [driftStatus, setDriftStatus] = useState<DriftStatus>(initialThesis?.driftStatus ?? "ON_TRACK");

  function openEdit() {
    setBullCase(thesis?.bullCase ?? "");
    setBearCase(thesis?.bearCase ?? "");
    setAssumptions(parseAssumptions(thesis?.keyAssumptions ?? null));
    setTargetPrice(thesis?.targetPrice?.toString() ?? "");
    setTimeHorizon(thesis?.timeHorizon ?? "");
    setDriftStatus(thesis?.driftStatus ?? "ON_TRACK");
    setError(null);
    setEditing(true);
  }

  function addAssumption() {
    setAssumptions(a => [...a, ""]);
  }
  function updateAssumption(i: number, val: string) {
    setAssumptions(a => a.map((x, idx) => idx === i ? val : x));
  }
  function removeAssumption(i: number) {
    setAssumptions(a => a.filter((_, idx) => idx !== i));
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/watchlist/${watchlistItemId}/thesis`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bullCase:       bullCase.trim() || null,
          bearCase:       bearCase.trim() || null,
          keyAssumptions: assumptions.map(a => a.trim()).filter(Boolean),
          targetPrice:    targetPrice ? parseFloat(targetPrice) : null,
          timeHorizon:    timeHorizon.trim() || null,
          driftStatus,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(JSON.stringify(json.error));
      setThesis(json.data as Thesis);
      setEditing(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function updateDrift(newStatus: DriftStatus) {
    if (!thesis) return;
    setError(null);
    try {
      const res = await fetch(`/api/watchlist/${watchlistItemId}/thesis/${thesis.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ driftStatus: newStatus }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(JSON.stringify(json.error));
      setThesis(t => t ? { ...t, driftStatus: newStatus } : t);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed");
    }
  }

  if (editing) {
    return (
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Investment Thesis</h2>
          <span className="text-xs text-zinc-400">v{(thesis?.version ?? 0) + 1}</span>
        </div>

        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 space-y-5">
          {/* Bull case */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-green-600 dark:text-green-400">Bull Case</label>
            <textarea
              value={bullCase}
              onChange={e => setBullCase(e.target.value)}
              rows={3}
              placeholder="Why will this compound? What's the durable edge?"
              className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {/* Bear case */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-red-500 dark:text-red-400">Bear Case</label>
            <textarea
              value={bearCase}
              onChange={e => setBearCase(e.target.value)}
              rows={3}
              placeholder="What could go wrong? What would break the thesis?"
              className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {/* Key assumptions */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Key Assumptions</label>
              <button
                onClick={addAssumption}
                className="text-xs text-blue-500 hover:text-blue-600 dark:text-blue-400 font-medium"
              >
                + Add
              </button>
            </div>
            {assumptions.length === 0 && (
              <p className="text-xs text-zinc-400 italic">Add at least 2 testable assumptions</p>
            )}
            {assumptions.map((a, i) => (
              <div key={i} className="flex gap-2">
                <input
                  value={a}
                  onChange={e => updateAssumption(i, e.target.value)}
                  placeholder={`Assumption ${i + 1}`}
                  className="flex-1 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-3 py-1.5 text-sm text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={() => removeAssumption(i)}
                  className="text-zinc-400 hover:text-red-500 text-xs px-1"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          {/* Target price + horizon */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Target Price ($)</label>
              <input
                type="number"
                value={targetPrice}
                onChange={e => setTargetPrice(e.target.value)}
                placeholder="e.g. 250"
                min={0}
                step={0.01}
                className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-3 py-1.5 text-sm text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Time Horizon</label>
              <input
                value={timeHorizon}
                onChange={e => setTimeHorizon(e.target.value)}
                placeholder="e.g. 12–18 months"
                className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-3 py-1.5 text-sm text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Drift status */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Drift Status</label>
            <div className="flex gap-2">
              {DRIFT_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setDriftStatus(opt.value)}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                    driftStatus === opt.value
                      ? "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                      : "border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:border-zinc-400"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <p className="text-xs text-red-500 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">{error}</p>
          )}

          <div className="flex justify-end gap-3 pt-1">
            <button
              onClick={() => setEditing(false)}
              className="text-xs font-medium text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
            >
              Cancel
            </button>
            <button
              onClick={save}
              disabled={saving}
              className="text-xs font-medium rounded-lg px-4 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white transition-colors"
            >
              {saving ? "Saving…" : "Save Thesis"}
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Investment Thesis</h2>
        <button
          onClick={openEdit}
          className="text-xs font-medium text-blue-500 hover:text-blue-600 dark:text-blue-400"
        >
          {thesis ? "Edit / New Version" : "Write Thesis"}
        </button>
      </div>

      {error && (
        <p className="text-xs text-red-500 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">{error}</p>
      )}

      {!thesis ? (
        <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/50 px-5 py-8 text-center">
          <p className="text-sm text-zinc-500">No thesis documented yet</p>
          <p className="text-xs text-zinc-400 mt-1">A complete thesis (bull + bear + assumptions + target) adds up to 20 pts to conviction</p>
        </div>
      ) : (
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 divide-y divide-zinc-100 dark:divide-zinc-800">
          {/* Drift status bar */}
          <div className="px-5 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-400">v{thesis.version}</span>
              <span className="text-zinc-300 dark:text-zinc-700">·</span>
              <DriftBadge status={thesis.driftStatus} />
            </div>
            <div className="flex gap-1">
              {DRIFT_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => updateDrift(opt.value)}
                  title={`Mark as ${opt.label}`}
                  className={`px-2 py-0.5 rounded text-xs transition-colors ${
                    thesis.driftStatus === opt.value
                      ? "bg-zinc-100 dark:bg-zinc-800 font-semibold text-zinc-700 dark:text-zinc-200"
                      : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="px-5 py-4 space-y-4">
            {thesis.bullCase && (
              <div>
                <p className="text-xs font-medium text-green-600 dark:text-green-400 mb-1">Bull Case</p>
                <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed whitespace-pre-wrap">{thesis.bullCase}</p>
              </div>
            )}
            {thesis.bearCase && (
              <div>
                <p className="text-xs font-medium text-red-500 dark:text-red-400 mb-1">Bear Case</p>
                <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed whitespace-pre-wrap">{thesis.bearCase}</p>
              </div>
            )}
            {thesis.keyAssumptions && parseAssumptions(thesis.keyAssumptions).length > 0 && (
              <div>
                <p className="text-xs font-medium text-zinc-500 mb-2">Key Assumptions</p>
                <ul className="space-y-1">
                  {parseAssumptions(thesis.keyAssumptions).map((a, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-zinc-700 dark:text-zinc-300">
                      <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-zinc-400 dark:bg-zinc-600 shrink-0" />
                      {a}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {(thesis.targetPrice || thesis.timeHorizon) && (
              <div className="flex items-center gap-6 pt-1">
                {thesis.targetPrice && (
                  <div>
                    <p className="text-xs text-zinc-400">Target Price</p>
                    <p className="font-semibold text-zinc-800 dark:text-zinc-200">${thesis.targetPrice.toFixed(2)}</p>
                  </div>
                )}
                {thesis.timeHorizon && (
                  <div>
                    <p className="text-xs text-zinc-400">Horizon</p>
                    <p className="font-semibold text-zinc-800 dark:text-zinc-200">{thesis.timeHorizon}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
