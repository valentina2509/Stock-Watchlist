---
description: Debug the conviction score or Why Now score for a stock. Pass a ticker like "AAPL" or a watchlist item ID.
---

You are debugging the scoring pipeline for the Conviction app.

## Target

$ARGUMENTS

## Steps

1. Find the watchlist item: query `SELECT * FROM watchlist_items JOIN stocks ON stocks.id = watchlist_items.stock_id WHERE stocks.ticker = '<ticker>'`
2. Pull the latest conviction score from `conviction_scores` — check each component score (fundamental, valuation, momentum, thesis, whyNow) and their reasons
3. Pull the latest Why Now score from `why_now_scores` — check each signal score and the breakdown JSON
4. If a component looks wrong:
   - Read `src/lib/conviction-scorer.ts` for the relevant component function
   - Call `yf.quoteSummary` manually to see what Yahoo Finance is actually returning
   - Check for null/undefined fields that might be scoring as 0
5. Common issues to look for:
   - `revenueGrowth` returning null → scores 0 on fundamental
   - `debtToEquity` is a percentage (79.5 = 0.795 ratio) — the scorer divides by 100
   - `epochGradeDate` in upgradeDowngradeHistory is an ISO string, not Unix seconds
   - `historical()` needs `period2: new Date()` or it throws
   - yahoo-finance2 v3 returns plain numbers, not `{ raw: number }` objects
6. Report: what the current scores are, which component is underperforming and why, what the fix should be
