# src/app/api — Route Handlers

14 Next.js App Router Route Handlers. All live in `src/app/api/`.

---

## Route inventory

| Method | Path | Handler | Purpose |
|--------|------|---------|---------|
| GET | `/api/watchlist` | `watchlist/route.ts` | List all watchlist items (enriched with latest score + thesis) |
| POST | `/api/watchlist` | `watchlist/route.ts` | Add ticker to watchlist |
| GET | `/api/watchlist/[id]` | `watchlist/[id]/route.ts` | Get single watchlist item with score history |
| PATCH | `/api/watchlist/[id]` | `watchlist/[id]/route.ts` | Transition state (`{ state: WatchlistState }`) |
| DELETE | `/api/watchlist/[id]` | `watchlist/[id]/route.ts` | Remove from watchlist (cascade deletes all related rows) |
| POST | `/api/watchlist/[id]/score` | `watchlist/[id]/score/route.ts` | Run conviction scoring |
| GET | `/api/watchlist/[id]/why-now` | `watchlist/[id]/why-now/route.ts` | Get latest Why Now result |
| POST | `/api/watchlist/[id]/why-now` | `watchlist/[id]/why-now/route.ts` | Run Why Now engine |
| GET | `/api/watchlist/[id]/thesis` | `watchlist/[id]/thesis/route.ts` | Get all thesis versions |
| POST | `/api/watchlist/[id]/thesis` | `watchlist/[id]/thesis/route.ts` | Save new thesis version |
| PATCH | `/api/watchlist/[id]/thesis/[thesisId]` | `watchlist/[id]/thesis/[thesisId]/route.ts` | Update drift status only |
| GET | `/api/watchlist/[id]/valuation` | `watchlist/[id]/valuation/route.ts` | Get saved valuation scenarios + prefill data |
| POST | `/api/watchlist/[id]/valuation` | `watchlist/[id]/valuation/route.ts` | Save valuation scenarios |
| GET | `/api/watchlist/[id]/alerts` | `watchlist/[id]/alerts/route.ts` | List alerts for this item |
| PATCH | `/api/watchlist/[id]/alerts/[alertId]` | `watchlist/[id]/alerts/[alertId]/route.ts` | Snooze or dismiss an alert |
| GET | `/api/alerts` | `alerts/route.ts` | List all ACTIVE alerts across all items |
| GET | `/api/quote/[ticker]` | `quote/[ticker]/route.ts` | Live quote for a ticker |
| GET | `/api/quote/[ticker]/history` | `quote/[ticker]/history/route.ts` | Historical price bars |
| GET | `/api/peers/[ticker]` | `peers/[ticker]/route.ts` | Peer comparison metrics |
| GET | `/api/search` | `search/route.ts` | Ticker search (used by StockSearch component) |

---

## Conventions

### Request validation

All POST and PATCH handlers validate the request body with `zod` before touching the database. Pattern:

```typescript
import { z } from "zod";
const Schema = z.object({ ... });

const body = await request.json().catch(() => null);
const parsed = Schema.safeParse(body);
if (!parsed.success) {
  return NextResponse.json({ error: "..." }, { status: 400 });
}
```

Never pass raw `request.json()` output to a DB operation.

### Error responses

All errors return JSON: `{ error: string }` with an appropriate status code:

| Status | Meaning |
|--------|---------|
| 400 | Invalid input (zod parse failure) |
| 404 | Watchlist item / stock not found |
| 422 | Business logic error (e.g. invalid state transition, stock not found on Yahoo Finance) |
| 500 | Unexpected server error |

### Success responses

- GET endpoints return the resource directly (array or object)
- POST endpoints return the created resource at status 201
- PATCH endpoints return the updated resource at status 200
- DELETE endpoints return `{ success: true }` at status 200

---

## State transition enforcement

`PATCH /api/watchlist/[id]` enforces the BPMN 06 state machine via `canTransition()` from `src/lib/watchlist.ts`. Invalid transitions return 422:

```json
{ "error": "Cannot transition from EXITED to RESEARCH" }
```

---

## Scoring routes

`POST /api/watchlist/[id]/score` is the most expensive route — it makes 4 separate `quoteSummary` calls to Yahoo Finance plus one `historical()` call. Typical response time: 3–8 seconds depending on Yahoo Finance latency.

`POST /api/watchlist/[id]/why-now` is even heavier — 7 signals run in parallel, each making 1–3 Yahoo Finance calls (up to ~15 calls total). Typical response time: 5–12 seconds.

---

## Valuation prefill

`GET /api/watchlist/[id]/valuation` returns both the saved scenarios (from DB) and a fresh `prefill` object fetched from Yahoo Finance. The prefill is used to populate default values in the ValuationPanel UI.

---

## Alert management

`PATCH /api/watchlist/[id]/alerts/[alertId]` accepts `{ action: "snooze" | "dismiss" }`:
- `snooze`: sets `snoozedUntil` to 24 hours from now, status → `SNOOZED`
- `dismiss`: sets status → `DISMISSED`

**Known issue**: there is no ownership check — a client could PATCH an `alertId` that belongs to a different `watchlistItemId`. (Documented in `docs/ADVERSARIAL_REVIEW.md` as a known IDOR gap — acceptable for a single-user personal tool.)

---

## Peers route

`GET /api/peers/[ticker]` returns `{ ticker, price, peRatio, forwardPE, evToEbitda, priceToBook, marketCap, sector }` for the requested ticker. Used by the `PeerComparison` component to fetch base stock metrics client-side.

The peer list itself is stored in `localStorage` by the component — the API only returns metrics for a single requested ticker.
