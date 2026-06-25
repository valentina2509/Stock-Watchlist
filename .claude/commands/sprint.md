---
description: Plan and implement a new sprint for the Conviction app. Pass the sprint number or feature name as the argument.
---

You are implementing a new sprint for the Conviction stock research app.

## Context

Stack: Next.js 14, React 18, Drizzle ORM + better-sqlite3 (SQLite), Tailwind CSS v3, TypeScript 5, zod, yahoo-finance2 v3.

Node.js constraint: 18.19.1. Do NOT use packages that require Node 20+.

yahoo-finance2 v3 quirks:
- ESM-only, must use `require("yahoo-finance2").default as new () => {...}`
- Returns plain numbers (not `{ raw: number }`)
- `historical()` requires explicit `period2: new Date()`

Drizzle quirks:
- `db.query.*` requires relations declared in schema AND schema passed to `drizzle(sqlite, { schema })`
- After adding new tables to schema, the dev server singleton must be restarted to pick up the new schema

Client vs server imports:
- Files with `require("yahoo-finance2")` or other Node.js built-ins are SERVER ONLY
- Never import server-only files into client components (`"use client"`)
- Extract pure logic (math, types) into separate `*-calc.ts` files safe for client import

## Sprint request

$ARGUMENTS

## Steps

1. Read the relevant BPMN diagram in `docs/bpmn/` for this sprint
2. Check the existing schema in `src/db/schema.ts` to understand what tables exist
3. Plan what new tables, API routes, and components are needed
4. If schema changes are needed:
   - Update `src/db/schema.ts`
   - Run `npx drizzle-kit generate` then `npx drizzle-kit migrate`
   - Restart the dev server after migration
5. Write the implementation files
6. Run `npx tsc --noEmit` — fix all errors before proceeding
7. Test key API endpoints with curl
8. Commit with a descriptive message following the pattern in git log
