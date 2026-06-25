---
description: Review a BPMN diagram for correctness against the implementation. Pass the BPMN filename (e.g. "03_why_now_engine") or "all" to review all 9.
---

You are reviewing BPMN diagrams for correctness against the actual implementation.

## Target

$ARGUMENTS

## BPMN files location

`docs/bpmn/` — 9 diagrams covering the full system

## Review rubric

For each diagram, check:

**Structural correctness (BPMN 2.0 spec)**
- All flows start from exactly one Start Event and end at one or more End Events
- Gateways are correctly typed: XOR (exclusive), AND (parallel), OR (inclusive)
- Every gateway branch has a condition label
- No dangling sequence flows (every flow connects two elements)
- Pools and lanes are used consistently

**Implementation alignment**
- Does the process modelled in the BPMN match what `src/lib/` actually does?
- Are the decision points (score thresholds, state transitions) the same values in BPMN and code?
- Are the state machine transitions in BPMN 06 consistent with `STATE_TRANSITIONS` in `src/lib/watchlist.ts`?
- Are the 7 Why Now signals in BPMN 03 the same signals in `src/lib/why-now-engine.ts`?
- Are the 5 conviction components in BPMN 04 the same as in `src/lib/conviction-scorer.ts`?

**Gaps or missing flows**
- Are there error paths shown in code (try/catch, null returns) that aren't modelled?
- Are there alerts or side-effects in code not reflected in the BPMN?

For each finding: state the diagram, element name or line, the issue, and the recommended fix.
