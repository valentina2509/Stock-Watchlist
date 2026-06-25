---
description: Run a multi-perspective adversarial review of the codebase or a specific area. Pass a scope like "api routes", "conviction scorer", "schema" or leave blank for a full review.
---

You are running an adversarial multi-agent code review of the Conviction app.

## Scope

$ARGUMENTS

## Review dimensions

Spawn independent agents for each of the following dimensions. Each agent should be skeptical and look for real problems:

1. **Correctness** — Logic bugs, off-by-one errors, wrong formulas (especially the DCF and conviction scoring math), incorrect data transformations
2. **Security** — Injection risks, exposed secrets, unvalidated inputs reaching the DB, missing auth (this is a personal tool but still good practice)
3. **Data integrity** — Schema constraints, missing foreign key cascades, potential for orphaned rows, SQLite-specific issues
4. **Yahoo Finance reliability** — Places where API failures could corrupt data or throw unhandled, fields that might be null/undefined in edge cases, Node 18 compatibility
5. **Client/server boundary** — Any server-only code (Node.js modules) imported into client components, any `"use client"` files that do DB operations
6. **TypeScript safety** — `as any` casts that hide real type errors, missing null checks, type assertions over `unknown`
7. **UI correctness** — Loading states, error states, empty states that are missing or incorrect

## Process

For each dimension:
- Read the relevant source files
- List specific findings with file path and line number
- Rate severity: CRITICAL / HIGH / MEDIUM / LOW
- Suggest a concrete fix

After all dimensions are reviewed, produce a prioritised punch list of findings, grouped by severity.

If scope is blank, review the full `src/` directory. If scope is given, focus there but note any issues you notice in adjacent files.
