---
description: Add a new stock to the watchlist and run the full analysis pipeline on it. Pass the ticker symbol.
---

You are adding a new stock to the Conviction watchlist and running the full analysis pipeline.

## Ticker

$ARGUMENTS

## Steps

1. Add the stock via `POST /api/watchlist` with `{ "ticker": "<TICKER>" }`
2. Note the returned watchlist item ID
3. Run conviction scoring: `POST /api/watchlist/<id>/score`
4. Run Why Now analysis: `POST /api/watchlist/<id>/why-now`
5. Fetch valuation prefill: `GET /api/watchlist/<id>/valuation`
6. Report a summary:
   - Stock name, sector, market cap
   - Conviction score breakdown (all 5 components, total, band)
   - Why Now score and whether it's a Hot Window
   - Key valuation metrics (current price, forward P/E, EV/EBITDA)
   - Any alerts that fired
   - Recommended next step (e.g. "write thesis to unlock thesis score", "run valuation scenarios")
