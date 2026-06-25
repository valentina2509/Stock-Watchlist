# src/lib — Domain Logic

Seven modules. All are server-only except `valuation-calc.ts`.

---

## Module map

| File | Server-only | Purpose |
|------|-------------|---------|
| `market-data.ts` | yes | Yahoo Finance wrapper — search, quote, historical prices |
| `watchlist.ts` | yes | Watchlist CRUD + BPMN 06 state machine |
| `conviction-scorer.ts` | yes | 5-component conviction scoring engine |
| `why-now-engine.ts` | yes | 7-signal Why Now engine |
| `alert-engine.ts` | yes | Alert auto-firing and deduplication |
| `valuation-engine.ts` | yes | Yahoo Finance prefill fetcher (re-exports calc) |
| `valuation-calc.ts` | **no** | Pure math — DCF, P/E, EV/EBITDA (safe for client import) |

---

## yahoo-finance2 v3 pattern

Used in `market-data.ts`, `conviction-scorer.ts`, `why-now-engine.ts`, and `valuation-engine.ts`. Each file instantiates its own `yf` instance:

```typescript
// eslint-disable-next-line @typescript-eslint/no-require-imports
const YFClass = require("yahoo-finance2").default as new () => {
  quoteSummary(ticker: string, opts: { modules: string[] }): Promise<Record<string, unknown>>;
  // declare only the methods this file actually calls
};
const yf = new YFClass();
```

The type declaration is local to each file and covers only the specific modules used. Do not share a global `yf` instance across files.

---

## market-data.ts

Core Yahoo Finance abstraction. Exports:

```typescript
searchTickers(query: string): Promise<{ ticker, name, exchange }[]>
getQuote(ticker: string): Promise<StockQuote | null>
getQuoteWithProfile(ticker: string): Promise<StockQuote | null>  // also fetches assetProfile
getHistoricalPrices(ticker, period): Promise<HistoricalBar[]>
```

`getQuoteWithProfile` uses `Promise.allSettled` so a failed `assetProfile` call doesn't block the quote. `getQuote` and `getQuoteWithProfile` return `null` on any error (never throw to the caller).

`getHistoricalPrices` supports periods: `"1mo" | "3mo" | "6mo" | "1y" | "2y"`. Always passes `period2: new Date()` to `yf.historical()`.

---

## watchlist.ts

Owns the BPMN 06 state machine. Exports:

```typescript
addToWatchlist(ticker: string): Promise<WatchlistItem>
transitionState(watchlistItemId: number, toState: WatchlistState): Promise<WatchlistItem>
canTransition(from: WatchlistState, to: WatchlistState): boolean
getWatchlist(): Promise<EnrichedItem[]>
getWatchlistItem(id: number): Promise<EnrichedItem | null>
removeFromWatchlist(watchlistItemId: number): Promise<void>
```

**State machine** (`STATE_TRANSITIONS` map — enforced in `transitionState`):

```
DISCOVERY         → RESEARCH
RESEARCH          → BUILDING_CONVICTION, EXITED
BUILDING_CONVICTION → HIGH_CONVICTION, RESEARCH, EXITED
HIGH_CONVICTION   → POSITION, BUILDING_CONVICTION, EXITED
POSITION          → MONITORING, EXITED
MONITORING        → EXITED
EXITED            → (none)
```

`addToWatchlist` seeds a zero-score `conviction_scores` row so the pipeline table always has something to display. If the stock already exists in `stocks`, it updates the market data. If already on the watchlist, it returns the existing item (idempotent).

`getWatchlist` has an N+1 pattern: fetches all items, then loops to get latest score and thesis per item. No pagination. Acceptable for a personal tool with a small watchlist.

---

## conviction-scorer.ts

5-component scoring engine. Entry point: `calculateAndPersistScore(watchlistItemId)`.

Each component scores 0–20. Total is 0–100. Band thresholds:

| Band | Score range |
|------|------------|
| WATCH | 0–19 |
| RESEARCH | 20–39 |
| BUILDING | 40–59 |
| HIGH | 60–79 |
| CONVICTION | 80–100 |

**Components and Yahoo Finance modules used:**

| Component | Function | YF modules |
|-----------|----------|-----------|
| Fundamental | `fundamentalComponent` | `financialData`, `defaultKeyStatistics` |
| Valuation | `valuationComponent` | `defaultKeyStatistics`, `summaryDetail` |
| Momentum | `momentumComponent` | `historical()` (210 days at 1d interval) |
| Thesis | `thesisComponent` | No YF call — reads from DB |
| Why Now | `whyNowComponent` | `earningsTrend`, `upgradeDowngradeHistory`, `calendarEvents` |

Components 1–3 and 5 run in parallel via `Promise.all`. Component 4 (thesis) is synchronous.

**Fallback scores on error**:
- `momentumComponent`: returns `{ score: 10, reasons }` when insufficient history or any error (not 0)
- `whyNowComponent`: returns `{ score: 5, reasons }` on catch (not 0)
- All others: return `{ score: 0 }` on missing data (not an error — returns points for available metrics)

**`debtToEquity` gotcha**: Yahoo returns this as a percentage (e.g. `79.5`). The scorer divides by 100 to get the ratio before scoring.

After persisting the score, fires `checkConvictionAlerts(watchlistItemId).catch(() => {})` — fire-and-forget.

---

## why-now-engine.ts

7-signal Why Now engine. Entry point: `calculateWhyNow(watchlistItemId)`. All 7 signals run in parallel via `Promise.all`.

**Signal weights** (must sum to 1.0):

| Signal | Type key | Weight | YF data source |
|--------|----------|--------|---------------|
| Earnings Catalyst | `EARNINGS_CATALYST` | 0.20 | `calendarEvents`, `earningsHistory`, `earningsTrend` |
| SEC Filing Activity | `FILING` | 0.15 | `secFilings` |
| Analyst Activity | `ANALYST_UPGRADE` | 0.15 | `upgradeDowngradeHistory`, `recommendationTrend` |
| Technical Breakout | `TECHNICAL_BREAKOUT` | 0.15 | `quote()`, `historical()` (70 days) |
| Macro Tailwind | `MACRO_TAILWIND` | 0.15 | `quote()` on sector ETF + `SPY` |
| News Sentiment | `NEWS_SENTIMENT` | 0.10 | `insights()` |
| Insider Activity | `INSIDER_BUYING` | 0.10 | `insiderTransactions`, `netSharePurchaseActivity` |

**Weighted sum formula**: `totalScore = round(signals.reduce((sum, s) => sum + s.score * s.weight, 0))`

Each signal scores 0–100 (clamped via `clamp()` helper). Total score is also 0–100.

**Hot Window**: `isHotWindow = totalScore >= 70`

**Macro signal**: resolves the stock's sector to a sector ETF ticker via `SECTOR_ETF` map (12 sectors covered). If the sector isn't in the map, falls back to SPY as proxy.

**Baseline scores** (signals don't start at 0 — already being in the pipeline is signal):
- Earnings Catalyst: starts at 30
- Filing: starts at 20
- Analyst: starts at 30
- Technical: starts at 30
- Macro: starts at 40 (neutral)
- News: starts at 35
- Insider: starts at 30

After persisting to `why_now_scores`, fires `checkWhyNowAlerts(watchlistItemId, stockId).catch(() => {})`.

`getLatestWhyNow(stockId)` returns the most recent `why_now_scores` row, parsing `breakdown` JSON.

---

## alert-engine.ts

Three exported trigger functions, one internal deduplicator.

```typescript
checkConvictionAlerts(watchlistItemId: number): Promise<void>
checkWhyNowAlerts(watchlistItemId: number, stockId: number): Promise<void>
checkThesisAlerts(watchlistItemId: number, driftStatus: string): Promise<void>
```

**Deduplication** (`upsertAlert`): before inserting, checks for an existing `ACTIVE` alert of the same type for the same watchlist item. If one exists, skips. This prevents duplicate alerts when the same condition is triggered on successive score runs.

**Conviction alert thresholds**:
- `CONVICTION_SURGE`: delta ≥ +15 points between consecutive scores
- `CONVICTION_DROP`: delta ≤ -15 points
- Additional `CONVICTION_SURGE` fires when band changes to `CONVICTION`

**Why Now threshold**: fires `WHY_NOW_HOT_WINDOW` when `isHotWindow === true`.

**Thesis thresholds**: fires `THESIS_BROKEN` on `driftStatus === "BROKEN"`, `THESIS_DRIFT` on `driftStatus === "DIVERGING"`.

All three trigger functions are called with `.catch(() => {})` in their callers — alert failures are silently swallowed and never block the scoring response.

`fireAlert(alertId)` updates status to `FIRED` (used by the PATCH endpoint for dismiss/snooze actions).

---

## valuation-calc.ts — client-safe pure math

No imports other than TypeScript types. Safe to import in `"use client"` components.

**Exported functions:**

```typescript
calcDCF(assumptions: DCFAssumptions, currentPrice: number): ValuationResult
calcPE(assumptions: PEAssumptions, currentPrice: number): ValuationResult
calcEVEBITDA(assumptions: EVEBITDAAssumptions, currentPrice: number): ValuationResult
calculate(method, assumptions, currentPrice): ValuationResult
buildDefaultScenarios(method, prefill): ScenarioSet  // prefill from Yahoo Finance
```

**DCF formula**:
- Projects FCF for `projectionYears` (default 10), growing at `revenueGrowthRate` each year
- Discounts each year's FCF at `discountRate`
- Terminal value = `fcf_year10 × (1 + terminalGrowthRate) / (discountRate - terminalGrowthRate)`
- Equity value = PV of FCFs + PV of terminal value − netDebt
- Guard: returns `{ impliedPrice: 0, marginOfSafety: -100 }` if `sharesOutstanding ≤ 0` or `discountRate ≤ terminalGrowthRate`

**Margin of safety**: `((impliedPrice - currentPrice) / currentPrice) * 100` — positive means stock is undervalued vs the model.

`buildDefaultScenarios` creates bear/base/bull sets from Yahoo Finance prefill data:
- Bear: growth −10%, discount rate +2%
- Bull: growth +10%, discount rate −1%
- For P/E: bear = EPS ×0.85 × multiple ×0.75; bull = EPS ×1.15 × multiple ×1.25

---

## valuation-engine.ts — server-only prefill fetcher

Re-exports everything from `valuation-calc.ts` plus:

```typescript
fetchValuationPrefill(ticker: string): Promise<ValuationPrefill>
```

Calls `yf.quote()` and `yf.quoteSummary(ticker, { modules: ["financialData", "defaultKeyStatistics", "summaryDetail"] })` in parallel. Maps the response to a `ValuationPrefill` object.

**Net debt formula**: `(totalDebt ?? 0) - (totalCash ?? 0)` — can be negative (net cash position).
