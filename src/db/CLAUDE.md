# src/db — Database Layer

Drizzle ORM + better-sqlite3. Schema is the single source of truth; everything else derives from it.

---

## Files

| File | Purpose |
|------|---------|
| `schema.ts` | All 10 tables + all Drizzle `relations()` declarations |
| `index.ts` | Drizzle singleton with Next.js hot-reload guard |
| `migrate.ts` | Standalone migration runner (`npm run db:migrate`) |

---

## Singleton — hot-reload guard

```typescript
// index.ts
const globalForDb = global as unknown as { _db: ReturnType<typeof makeDb> };
function makeDb() {
  return drizzle(new Database(DB_PATH), { schema });
}
export const db = globalForDb._db ?? makeDb();
if (process.env.NODE_ENV !== "production") globalForDb._db = db;
```

**Why**: Next.js dev mode re-evaluates modules on every hot reload, which would open a new SQLite connection each time. The `global` cache prevents this.

**Critical**: After adding new tables to `schema.ts`, you **must restart the dev server**. The singleton is created once with the schema at startup; `db.query.*` returns `undefined` for tables the process doesn't know about.

---

## Schema — 10 tables

### `stocks`
Master list of tracked equities. Populated when a stock is added to the watchlist.

| Column | Type | Notes |
|--------|------|-------|
| `id` | integer PK | auto-increment |
| `ticker` | text | unique |
| `name` | text | |
| `sector` | text | nullable |
| `industry` | text | nullable |
| `market_cap` | real | nullable |
| `created_at` | integer | mode: "timestamp" |
| `updated_at` | integer | mode: "timestamp" |

### `watchlist_items`
One row per stock in the research pipeline. State machine drives the research lifecycle.

| Column | Type | Notes |
|--------|------|-------|
| `id` | integer PK | |
| `stock_id` | integer FK | → stocks.id (cascade delete) |
| `state` | text enum | `DISCOVERY \| RESEARCH \| BUILDING_CONVICTION \| HIGH_CONVICTION \| POSITION \| MONITORING \| EXITED` |
| `added_at` | integer | mode: "timestamp" |
| `updated_at` | integer | mode: "timestamp" |
| `notes` | text | nullable |
| `target_entry_price` | real | nullable |
| `average_cost_basis` | real | nullable |
| `position_size` | integer | nullable |
| `exit_price` | real | nullable |
| `exit_reason` | text | nullable |

### `conviction_scores`
One row per scoring run. History is preserved; query with `orderBy desc` and `findFirst` for the latest.

| Column | Type | Notes |
|--------|------|-------|
| `id` | integer PK | |
| `watchlist_item_id` | integer FK | → watchlist_items.id (cascade) |
| `fundamental_score` | real | 0–20 |
| `valuation_score` | real | 0–20 |
| `momentum_score` | real | 0–20 |
| `thesis_score` | real | 0–20 |
| `why_now_score` | real | 0–20 |
| `total_score` | real | 0–100 |
| `score_band` | text enum | `WATCH \| RESEARCH \| BUILDING \| HIGH \| CONVICTION` |
| `calculated_at` | integer | mode: "timestamp" |

Default row (all zeros, band=WATCH) is seeded by `addToWatchlist()` so the pipeline page always has a score to display.

### `theses`
Versioned investment thesis. Each save creates a new row with `version + 1`.

| Column | Type | Notes |
|--------|------|-------|
| `id` | integer PK | |
| `watchlist_item_id` | integer FK | → watchlist_items.id (cascade) |
| `version` | integer | starts at 1, incremented on save |
| `bull_case` | text | nullable |
| `bear_case` | text | nullable |
| `key_assumptions` | text | nullable — **JSON array** of strings |
| `target_price` | real | nullable |
| `time_horizon` | text | nullable |
| `drift_status` | text enum | `ON_TRACK \| CONFIRMING \| DIVERGING \| BROKEN` |
| `created_at` | integer | mode: "timestamp" |
| `updated_at` | integer | mode: "timestamp" |

`key_assumptions` is stored as a JSON array string. Always `JSON.parse()` before use; always `JSON.stringify()` before insert.

### `price_history`
Historical OHLCV bars. Fetched on demand and stored for chart rendering.

| Column | Type | Notes |
|--------|------|-------|
| `stock_id` | integer FK | → stocks.id (cascade) |
| `date` | integer | mode: "timestamp" |
| `open/high/low` | real | nullable |
| `close` | real | not null |
| `volume` | integer | nullable |
| `adj_close` | real | nullable |

### `why_now_signals`
Individual signal events (legacy table — the scoring engine now uses `why_now_scores` instead).

### `why_now_scores`
Full Why Now scoring run result. One row per run; breakdown stored as JSON.

| Column | Type | Notes |
|--------|------|-------|
| `stock_id` | integer FK | → stocks.id (cascade) |
| `total_score` | real | 0–100 |
| `is_hot_window` | integer | mode: "boolean" — true when totalScore ≥ 70 |
| `breakdown` | text | **JSON**: `{ signals: SignalResult[] }` |
| `calculated_at` | integer | mode: "timestamp" |

`breakdown` stores the full signal array. Parse with `JSON.parse(row.breakdown) as { signals: SignalResult[] }`.

### `valuation_scenarios`
One row per valuation method run. Stores assumptions as JSON alongside computed prices.

| Column | Type | Notes |
|--------|------|-------|
| `watchlist_item_id` | integer FK | → watchlist_items.id (cascade) |
| `method` | text enum | `DCF \| PE_MULTIPLE \| EV_EBITDA` |
| `bear_assumptions` | text | **JSON** — shape depends on method |
| `base_assumptions` | text | **JSON** |
| `bull_assumptions` | text | **JSON** |
| `bear_price / base_price / bull_price` | real | nullable — computed implied prices |
| `current_price` | real | nullable |
| `calculated_at` | integer | mode: "timestamp" |

### `alerts`
Auto-fired alerts from the scoring pipeline. Status lifecycle: `ACTIVE → FIRED | SNOOZED | DISMISSED`.

| Column | Type | Notes |
|--------|------|-------|
| `watchlist_item_id` | integer FK | → watchlist_items.id (cascade) |
| `alert_type` | text enum | 10 types — see below |
| `status` | text enum | `ACTIVE \| FIRED \| SNOOZED \| DISMISSED` |
| `threshold` | real | nullable — the triggering value |
| `message` | text | nullable — human-readable description |
| `fired_at` | integer | mode: "timestamp", nullable |
| `snoozed_until` | integer | mode: "timestamp", nullable |
| `created_at` | integer | mode: "timestamp" |

Alert types: `CONVICTION_SURGE`, `CONVICTION_DROP`, `WHY_NOW_HOT_WINDOW`, `THESIS_DRIFT`, `THESIS_BROKEN`, `EARNINGS_COUNTDOWN`, `CATALYST_EVENT`, `ENTRY_CONDITION_MET`, `EXIT_SIGNAL`, `PEER_DISLOCATION`.

### `research_notes`
Freeform notes with source tagging. Not yet wired to the UI.

| Column | Type | Notes |
|--------|------|-------|
| `watchlist_item_id` | integer FK | → watchlist_items.id (cascade) |
| `source` | text enum | `USER \| CLAUDE \| SYSTEM` |
| `content` | text | not null |
| `tags` | text | nullable — **JSON array** |
| `created_at` | integer | mode: "timestamp" |

---

## Relations (Drizzle relational API)

All relations are declared in `schema.ts`. The `db.query.*` API requires both:
1. `relations()` calls in schema.ts (already done for all tables)
2. The schema passed to the `drizzle()` constructor: `drizzle(sqlite, { schema })`

This is done in `index.ts`. If you use `db.query.someTable.findMany({ with: { ... } })` and the relation isn't in `schema.ts`, it silently returns nothing.

```
stocks ──< watchlistItems ──< convictionScores
                          ──< theses
                          ──< alerts
                          ──< researchNotes
                          ──< valuationScenarios
       ──< priceHistory
       ──< whyNowSignals
       ──< whyNowScores
```

---

## Timestamp storage

All timestamps use `integer("col", { mode: "timestamp" })`. Drizzle automatically converts between JS `Date` objects and SQLite integers. Always pass `new Date()` for inserts; the ORM handles the conversion.

---

## Migration workflow

```bash
# After editing schema.ts:
npm run db:generate   # Creates a new SQL file in drizzle/
npm run db:migrate    # Applies pending migrations via tsx src/db/migrate.ts
# Then restart the dev server
```

The migration runner (`migrate.ts`) opens a fresh Database connection (not the singleton) and calls Drizzle's `migrate()`. It's safe to run repeatedly — already-applied migrations are skipped.

---

## JSON columns

Several columns store JSON strings. There is no type-safe ORM layer for these — parse/stringify manually:

| Table.column | Shape |
|-------------|-------|
| `theses.key_assumptions` | `string[]` |
| `why_now_scores.breakdown` | `{ signals: SignalResult[] }` |
| `valuation_scenarios.bear/base/bull_assumptions` | `DCFAssumptions \| PEAssumptions \| EVEBITDAAssumptions` |
| `research_notes.tags` | `string[]` |
