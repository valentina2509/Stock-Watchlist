# Conviction — Stock Research Pipeline

Personal stock conviction research tool. Next.js 14 app with SQLite, Yahoo Finance data, and a 5-component conviction scoring engine. See `docs/PRD.md` for product intent and `docs/bpmn/` for the 9 BPMN 2.0 process specifications.

---

## Hard constraint: Node.js 18.19.1

This server runs Node **18.19.1** — cannot upgrade. All package choices are constrained by this:

| What | Why not newer |
|------|--------------|
| Next.js 14.2.35 (not 15+) | Next.js 15+ requires Node 20 |
| Tailwind v3 (not v4) | `@tailwindcss/oxide` native binding fails on Node 18 |
| Drizzle ORM (not Prisma) | Prisma 6 requires Node 20 |
| `next.config.mjs` (not `.ts`) | Next.js 14 doesn't support a TypeScript config file |

---

## Stack

| Layer | Package | Version |
|-------|---------|---------|
| Framework | `next` | 14.2.35 |
| UI | `react` + `react-dom` | 18.3.1 |
| ORM | `drizzle-orm` | 0.45.2 |
| Database | `better-sqlite3` | 12.11.1 |
| CSS | `tailwindcss` | 3.4.19 |
| Validation | `zod` | 4.4.3 |
| Market data | `yahoo-finance2` | 3.15.3 |
| TypeScript | `typescript` | 5.x |
| Migration CLI | `drizzle-kit` | 0.31.10 |
| Migration runner | `tsx` | 4.22.4 |

---

## Commands

```bash
npm run dev          # Start dev server (port auto-assigned; check ss -tlnp | grep 30)
npm run build        # Production build
npm run db:generate  # Diff schema → generate new migration in drizzle/
npm run db:migrate   # Apply pending migrations (runs tsx src/db/migrate.ts)
npm run db:studio    # Drizzle Studio GUI
npx tsc --noEmit     # Type-check without emitting
```

**Schema change workflow** (must follow this order every time):
1. Edit `src/db/schema.ts`
2. `npm run db:generate`
3. `npm run db:migrate`
4. **Kill and restart the dev server** — the Drizzle singleton caches the schema at startup; a stale process returns `undefined` for new tables on `db.query.*`

---

## Architecture overview

```
src/
├── app/
│   ├── api/          # 14 Next.js Route Handlers (App Router)
│   ├── stock/[id]/   # Stock detail page (server component)
│   ├── page.tsx      # Pipeline home page (client component)
│   └── layout.tsx
├── components/       # 11 React components
├── db/               # Drizzle schema, singleton, migrate script
└── lib/              # 7 domain logic modules
docs/
├── PRD.md
├── ADVERSARIAL_REVIEW.md
└── bpmn/             # 9 BPMN 2.0 diagrams (spec for all process flows)
drizzle/              # Generated migration SQL files (3 applied)
conviction.db         # SQLite database (gitignored, lives at cwd)
```

---

## The most important rule: client/server boundary

`require("yahoo-finance2")` and `better-sqlite3` are Node.js built-ins that **crash the webpack bundler** when imported in a `"use client"` component.

**Server-only** — never import into client components:
- `src/lib/market-data.ts`
- `src/lib/conviction-scorer.ts`
- `src/lib/why-now-engine.ts`
- `src/lib/valuation-engine.ts`
- `src/lib/alert-engine.ts`
- `src/lib/watchlist.ts`
- Everything in `src/db/`

**Client-safe** (no Node.js deps):
- `src/lib/valuation-calc.ts` — pure math only

Pattern: when you need logic in both a server context and a client component, extract pure math to `*-calc.ts` and keep the Yahoo Finance / DB calls in `*-engine.ts`.

---

## yahoo-finance2 v3 — critical quirks

yahoo-finance2 v3 is **ESM-only**. You cannot use `import`. Every file that uses it must do:

```typescript
// eslint-disable-next-line @typescript-eslint/no-require-imports
const YFClass = require("yahoo-finance2").default as new () => {
  quote(ticker: string): Promise<{ ... }>;
  // ... add only the methods you actually call
};
const yf = new YFClass();
```

Key field differences vs v2 and vs intuition:

| Field | Behaviour |
|-------|-----------|
| All numeric fields | Plain `number`, **not** `{ raw: number, fmt: string }` |
| `debtToEquity` | Returned as a **percentage** (e.g. `79.5` = 0.795 ratio) — divide by 100 before using as ratio |
| `historical()` | Requires **explicit** `period2: new Date()` — omitting it throws |
| `epochGradeDate` in `upgradeDowngradeHistory` | ISO date **string**, not Unix seconds — use `new Date(epochGradeDate).getTime()` |
| `secFilings[].date` | ISO date string |

---

## Database

SQLite file: `conviction.db` at `process.cwd()` (project root). Gitignored — never committed.

Three migrations applied (in `drizzle/`):
- `0000_ambiguous_starfox.sql` — initial 8 tables
- `0001_public_tony_stark.sql` — adds `why_now_scores`
- `0002_robust_black_cat.sql` — adds `valuation_scenarios`

See `src/db/CLAUDE.md` for the complete schema reference.

---

## Dev server — remote host note

The dev server binds `localhost` only. This app runs on a Hetzner server. Access in a local browser via SSH port forward:

```bash
ssh -L 3010:localhost:3010 valentina@77.42.117.110
```

Multiple `next dev` processes can accumulate on successive ports (3000, 3005, 3010, …). Check with `ss -tlnp | grep 30` and kill stale PIDs.

---

## BPMN specifications

9 diagrams in `docs/bpmn/` define the intended process flows. Sprint 7 (AI Research Copilot, `07_ai_research_copilot.bpmn`) was **intentionally skipped** — that feature is not implemented.

When implementing new features or fixing divergences, read the relevant BPMN first and document any intentional deviations.

---

## Known architectural issues

Documented in `docs/ADVERSARIAL_REVIEW.md` (78 findings, 72 confirmed real). The most important ones to know before making changes:

- **Alert fire-and-forget**: `checkConvictionAlerts()`, `checkWhyNowAlerts()`, and `checkThesisAlerts()` are called with `.catch(() => {})` — alert failures are silently swallowed
- **No IDOR protection**: The `PATCH /api/watchlist/[id]/alerts/[alertId]` and thesis endpoints don't verify that `alertId` belongs to watchlist item `id`
- **`getWatchlist()` is N+1**: it fetches all items, then loops to fetch each item's latest score and thesis separately — no pagination
- **Score history is unbounded**: `db.query.convictionScores.findMany()` on the detail page loads all history with no `.limit()`
- **Sprint 7 not implemented**: AI Research Copilot (BPMN 07) has no corresponding code

---

## Slash commands

`.claude/commands/` contains 5 project-specific slash commands:

- `/sprint <N or feature>` — plan and implement a sprint
- `/review [scope]` — adversarial multi-dimension code review
- `/debug-score <ticker or watchlist-item-id>` — debug scoring pipeline
- `/add-stock <TICKER>` — add stock and run full analysis
- `/bpmn-review [diagram|all]` — review BPMN vs implementation alignment
