# src/app — Pages and Routing

Next.js 14 App Router. Two pages and one layout.

---

## Files

| File | Type | Purpose |
|------|------|---------|
| `layout.tsx` | Server component | Root layout — HTML shell, global CSS, dark mode base |
| `page.tsx` | **Client component** | Pipeline home — watchlist table, pipeline summary, add stock |
| `stock/[id]/page.tsx` | Server component | Stock detail — full research view for one watchlist item |
| `globals.css` | — | Tailwind directives + base styles |

---

## layout.tsx

Minimal. Sets `<html>` with font class variables (Geist + Geist Mono loaded via `next/font/google`), renders `{children}`. No providers or global state.

---

## page.tsx — Pipeline home

`"use client"`. Fetches all data client-side on mount.

**Data flow**:
1. `useEffect` → `fetchWatchlist()` → GET `/api/watchlist` → sets `watchlist` state
2. Separate `useEffect` → GET `/api/alerts` → sets `activeAlerts` state (for the header badge count)

**State**: `watchlist` (array), `loading` (add-stock in progress), `error` (string | null), `refreshing` (watchlist refetch), `activeAlerts` (array).

**Pipeline summary**: maps over the 7 `WatchlistState` values and calls `byState(state)` to count items per state. Renders 7 small stat cards. The counts are computed from client-side `watchlist` state — they re-render when the list refreshes.

**Add stock**: `handleAdd(ticker, name)` → POST `/api/watchlist` → calls `fetchWatchlist()` on success. On error, displays the API error message (e.g. "Could not fetch data for INVALID").

**Remove / transition**: both optimistically update local state or re-fetch after the API call succeeds.

---

## stock/[id]/page.tsx — Stock detail

**Server component** — runs on the server, has direct DB access.

**URL param**: `params.id` (string) → coerced to `Number(params.id)`. Calls `notFound()` if NaN or if the watchlist item doesn't exist.

**Data fetched server-side** (4 parallel queries via `Promise.all`):
1. Latest conviction score
2. Latest thesis
3. Full conviction score history
4. Latest Why Now row (from `whyNowScores` table)

The Why Now row is parsed and reconstructed into a `WhyNowBreakdown` before passing to `WhyNowPanel` as `initialBreakdown`.

**Section render order** (top to bottom):
1. Breadcrumb header: `← Pipeline / TICKER`
2. Stock name, ticker, sector, industry, market cap, state badge
3. `AlertsPanel` — hidden when no alerts
4. `ScorePanel` — "Calculate Score" button triggers client-side fetch
5. `WhyNowPanel` — pre-populated from server-fetched `initialBreakdown`
6. Score History table — only rendered when `scoreHistory.length > 1`
7. `PriceChart`
8. `ValuationPanel`
9. `PeerComparison`
10. `ThesisEditor`

**Score History table**: shows all historical scores in descending order (most recent first). No pagination. Columns: Date, Total, Band, and one column per component (Fundamental, Valuation, Momentum, Thesis, Why Now), each formatted as `n/20`.

**Navigation back**: breadcrumb `← Pipeline` links to `/`.

---

## Client vs server component decision

`page.tsx` (home) is a client component because it has interactive state (add/remove/transition) and the watchlist can change without a full navigation. `stock/[id]/page.tsx` is a server component because the detail view is mostly read-only on load — interactive panels (`ScorePanel`, `ValuationPanel`, etc.) handle their own client state internally.
