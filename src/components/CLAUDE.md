# src/components — React Components

11 components. All are `"use client"` except where noted. See `src/lib/CLAUDE.md` for the client/server boundary rule — never import server-only lib files here.

---

## Component inventory

| Component | Client | Purpose |
|-----------|--------|---------|
| `StockSearch` | yes | Ticker search input, debounced, calls `/api/search` |
| `WatchlistTable` | yes | Pipeline home table with state badges, conviction meters, state transition buttons |
| `ConvictionBadge` | yes | `StateBadge` and `ConvictionMeter` — shared display primitives |
| `ScorePanel` | yes | Conviction score display + "Calculate Score" button |
| `ScoreBreakdown` | yes | Detailed component-by-component breakdown (used inside ScorePanel) |
| `WhyNowPanel` | yes | 7-signal Why Now display with score ring and Hot Window badge |
| `ThesisEditor` | yes | Bull/bear case editor, assumptions list, target price, drift status pill |
| `ValuationPanel` | yes | DCF/P/E/EV/EBITDA 3-scenario editor with live margin-of-safety bar |
| `AlertsPanel` | yes | Active alerts with Snooze/Dismiss actions; hidden when no alerts |
| `PriceChart` | yes | SVG sparkline with 1M/3M/6M/1Y period toggle and hover-to-scrub |
| `PeerComparison` | yes | Peer table with best/worst highlighting; peers stored in localStorage |

---

## ConvictionBadge

Two exports used throughout the app:

```typescript
<StateBadge state={item.state} />
// Renders a coloured pill: "Discovery" | "Research" | "Building" | "High Conviction" | "Position" | "Monitoring" | "Exited"

<ConvictionMeter score={item.convictionScore?.totalScore ?? 0} />
// Renders a thin progress bar (0–100) + numeric score. Colour:
// ≥80 → green, ≥60 → orange, ≥40 → yellow, ≥20 → blue, <20 → zinc-300
```

`StateBadge` falls back to `STATE_CONFIG.DISCOVERY` for unknown state strings.

---

## ScorePanel

Props: `{ watchlistItemId: number, initialBreakdown: ConvictionBreakdown | null }`

Fetches the latest score from `/api/watchlist/[id]/score` (GET) on mount. The "Calculate Score" button POSTs to the same endpoint. Updates local state with the returned `ConvictionBreakdown`. Renders `ScoreBreakdown` when breakdown is available.

Does not accept the latest score from the server page — `initialBreakdown` is always `null` (the page passes `null` and lets the component fetch). This is intentional to avoid prop-drilling the full breakdown shape.

---

## WhyNowPanel

Props: `{ watchlistItemId: number, initialBreakdown: WhyNowBreakdown | null }`

`initialBreakdown` is passed from the server page (pre-fetched). If null, shows an "Analyse" button that POSTs to `/api/watchlist/[id]/why-now`. The "Run Analysis" button re-runs even if a breakdown exists.

Shows:
- SVG score ring (0–100 arc)
- Amber pulsing "HOT WINDOW" badge when `isHotWindow === true`
- Collapsible signal cards (one per signal), each showing score, weight, and reason list

---

## ThesisEditor

Props: `{ watchlistItemId: number, initialThesis: ThesisData | null }`

Starts in read-only mode showing the latest thesis. "Edit / New Version" enters edit mode. On save, POSTs to `/api/watchlist/[id]/thesis` to create a new version.

Drift status can be changed in-place without creating a new thesis version — it PATCHes `/api/watchlist/[id]/thesis/[thesisId]` directly.

Key assumptions are managed as a dynamic list of text inputs, serialised to a JSON array on save.

---

## ValuationPanel

Props: `{ watchlistItemId: number }`

**Imports from `valuation-calc.ts` — NOT `valuation-engine.ts`**. This is the key rule: `valuation-engine.ts` contains `require("yahoo-finance2")` and would crash the client bundle.

On mount, GETs `/api/watchlist/[id]/valuation` for saved scenarios and Yahoo Finance prefill data. Method toggle (DCF / P/E Multiple / EV/EBITDA) rebuilds default scenarios from prefill using `buildDefaultScenarios()`.

All inputs are controlled — calculations update live on every keystroke via `calcDCF / calcPE / calcEVEBITDA`.

The margin-of-safety bar shows `base scenario MoS` — green when positive (upside), red when negative.

---

## AlertsPanel

Props: `{ watchlistItemId: number }`

GETs `/api/watchlist/[id]/alerts` on mount. Renders nothing (`return null`) when the alert list is empty. Shows colour-coded alert cards by `alertType`.

Snooze calls PATCH with `{ action: "snooze" }`. Dismiss calls PATCH with `{ action: "dismiss" }`. Both update local state optimistically.

---

## PriceChart

Props: `{ ticker: string }`

Fetches `/api/quote/[ticker]/history?period=1y` on mount and re-fetches when the period toggle changes. Renders a pure SVG path with gradient fill — no charting library.

Period toggles: `1M | 3M | 6M | 1Y`. Maps to query params `1mo | 3mo | 6mo | 1y`.

The chart line is green when the first-to-last price is positive, red when negative. Hover shows a vertical crosshair and date/price tooltip tracked via mouse move on the SVG element.

---

## PeerComparison

Props: `{ baseTicker: string }`

Peer tickers are stored in `localStorage` keyed by `peers_${baseTicker}`. The component manages a text input for adding peers and persists the list.

Fetches metrics for `baseTicker` and each peer ticker via `/api/peers/[ticker]` calls on mount and whenever the peer list changes. Base row is highlighted blue; best value per metric is green, worst is red.

**Known edge case**: if only one row (base stock, no peers), all metrics highlight as both best and worst. The current implementation does not guard against this.

---

## WatchlistTable

Props: `{ items, onRemove, onTransition }`

Shows a flat table of all watchlist items regardless of state. No filtering or grouping by state (the pipeline summary cards on the home page show counts, but the table shows everything).

`NEXT_STATES` map drives the "→ next state" advance button. Only shows the single next state (linear progression), not all valid transitions. Remove uses a two-click confirmation pattern.

---

## StockSearch

Calls `/api/search?q=<query>` with 300ms debounce. Results are Yahoo Finance EQUITY-type quotes filtered client-side. Calls `onAdd(ticker, name)` when a result is selected.
