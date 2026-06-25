# Adversarial Review Report — Stock Discovery & Conviction App

**Review Date:** 2026-06-25
**Review Method:** 8-dimension adversarial panel, 235 subagents, 3-skeptic verification gauntlet
**Artifacts Reviewed:** Product Requirements Document (PRD) + 9 BPMN 2.0 process diagrams
**Total Findings:** 78 surfaced, 72 confirmed, 1 refuted, 6 minor (unverified)

---

## Executive Verdict

This specification cannot ship in its current form. The adversarial panel returned a unanimous **major_rework** verdict from engineering and product judges, and an escalated **do_not_ship** from the safety judge. The regulatory exposure alone — operating as an unregistered investment adviser under US securities law — is an existential liability that no amount of architectural polish can fix post-launch.

Beyond the legal exposure, the BPMN artifacts are not valid. Five of the nine process diagrams contain structural violations of BPMN 2.0: duplicate sequenceFlow IDs that would cause any conformant BPMN engine to refuse to parse them, cross-pool sequenceFlows that violate the specification's fundamental isolation model, a timer event definition that is empty (and therefore can never fire), and a messageFlow pointing to an element that does not exist. These are not design opinions — they are specification errors that would surface as broken deployments on day one.

The product strategy has a structural flaw that no implementation can resolve: it attempts to serve two personas with incompatible workflow requirements on shared infrastructure with no feature differentiation. The conviction scoring model presents arbitrarily chosen weights as validated methodology, targets a performance metric (55% accuracy) that no professional operation would accept as meaningful, and lacks time-decay logic, meaning stale scores display with the same visual authority as fresh ones.

There are genuine strengths here — the modularity of the BPMN decomposition, the multi-factor scoring concept, and the AI Research Copilot interaction model are all sound foundations. The team has done meaningful design work. That makes it more important, not less, to be honest about what remains unresolved.

---

## Dimension Scorecards

| Dimension | Score /10 | Headline Issue | Critical | Major |
|---|---|---|---|---|
| BPMN 2.0 Rigour & Correctness | 2/10 | Pervasive structural violations render diagrams non-executable | 4 | 2 |
| Completeness & Coverage Gaps | 3/10 | Competitor analysis module (8 reqs) has zero process model | 4 | 3 |
| Defensive Design & Resilience | 2/10 | Hard parallel joins, infinite alert loops, no circuit breakers | 4 | 2 |
| Engineering Excellence | 3/10 | Empty timerEventDefinition, wrong gateway semantics, ID collisions | 5 | 2 |
| Factual Accuracy & Domain Correctness | 3/10 | Arbitrary weights presented as methodology, hollow performance target | 3 | 2 |
| Product Comprehensiveness & Market Fit | 3/10 | No monetisation, no competitive differentiation, no portfolio intelligence | 4 | 3 |
| Safety, Security & Regulatory Compliance | 1/10 | Unregistered investment adviser activity — federal securities law exposure | 6 | 2 |
| Architecture & Design | 6/10 | Gaps in service contracts; ASCII diagram appropriate for PRD stage | 0 | 3 |

---

## Ship-Readiness Assessment

| Judge Role | Verdict | Primary Rationale |
|---|---|---|
| Engineering / Architecture | **Major Rework** | BPMN is non-executable; resilience design is absent; timer event is broken |
| Product / Business | **Major Rework** | Dual-persona contradiction; no monetisation; hollow performance metrics |
| Safety / Resilience | **Do Not Ship** | Unregistered investment adviser exposure; no audit trail; multi-tenant isolation unspecified |

**Panel Consensus: Do Not Ship.** The safety judge's veto is not a technicality — operating this product in its described form would constitute providing personalized investment advice without registration in the US (RIA requirement), and without required disclosures in the EU (MiFID II). These are not post-launch clean-up items. They must be resolved before a single user receives a conviction score or an "Entry Condition Met" alert.

---

## Critical Findings — Must Fix Before Shipping

### BPMN-01 — Pervasive Duplicate sequenceFlow IDs Across Five Files

**Severity:** Critical — BPMN 2.0 §8.1.1 violation
**Files:** `04_conviction_scoring.bpmn`, `07_ai_research_copilot.bpmn`, `06_watchlist_states.bpmn`, `05_thesis_drift_tracking.bpmn`, `09_alerts_notifications.bpmn`

Every BPMN 2.0 element must carry a globally unique `id` attribute. This is not a best practice — it is a schema requirement. When a conformant process engine encounters duplicate IDs, the behaviour is undefined or the document is rejected outright.

Violations confirmed:
- `04_conviction_scoring.bpmn`: `sf_cvx_to_persist` × 3; `sf_cvx_review_explanation` × 4
- `07_ai_research_copilot.bpmn`: `sf_air_to_prompt` × 8; `sf_ai_review` × 2; `sf_air_router_end` × 2
- `06_watchlist_states.bpmn`: 4 cross-pool sequenceFlows with platform→user flow IDs
- `05_thesis_drift_tracking.bpmn`: `sf_thx_to_submit` × 2; `sf_thxa_respond` × 3
- `09_alerts_notifications.bpmn`: `sf_alt_view_done` × 5+

**Required Fix:** Assign a unique ID to every `sequenceFlow`. Fan-in patterns require a distinct ID per arc.

---

### BPMN-02 — messageFlow Targets Non-Existent Element

**Severity:** Critical — dangling reference breaks process definition
**File:** `08_valuation_scenarios.bpmn`, line 24

```xml
<messageFlow id="mf_val_data_req" targetRef="tsk_vald_fetch_financials" />
```

`tsk_vald_fetch_financials` does not exist in the target pool. The valuation engine starts without its required data feed.

**Required Fix:** Correct `targetRef` to `evt_vald_start` or `gw_vald_split`. Audit all messageFlow references across all nine diagrams.

---

### BPMN-03 — Five Illegal Cross-Pool sequenceFlows in Watchlist States

**Severity:** Critical — BPMN 2.0 fundamental violation
**File:** `06_watchlist_states.bpmn`, lines 251, 254–257

`sequenceFlow` elements may only connect elements within the same pool. Five flows cross from `proc_wl_platform` to `proc_wl_user`. Cross-pool communication requires `messageFlow`.

**Required Fix:** Replace all five cross-pool `sequenceFlow` elements with `messageFlow` elements. Introduce intermediate throw/catch events on each pool boundary.

---

### BPMN-04 — eventBasedGateway Outgoing Flows Target serviceTasks

**Severity:** Critical — wrong element type, broken execution semantics
**File:** `08_valuation_scenarios.bpmn`

`gw_vale_await_action` (eventBasedGateway) has outgoing flows targeting `tsk_vale_update_watchlist` and `tsk_vale_claude_critique` — both `serviceTask` elements. BPMN 2.0 §13.2.1 requires all outgoing flows from an `eventBasedGateway` to target `intermediateCatchEvent` elements.

**Required Fix:** Insert `intermediateCatchEvent` elements between the `eventBasedGateway` and each downstream serviceTask.

---

### GAP-01 — Entire Competitor Analysis Module Has No Process Model

**Severity:** Critical — COMP-01 through COMP-08 has zero BPMN coverage
**Reference:** PRD §7.7, PRD §12

Eight requirements. Zero process models. The §12 reference table claims nine diagrams cover the full system. Competitor analysis is not one of them.

**Required Fix:** Author `10_competitor_peer_analysis.bpmn` covering: peer universe definition, metric normalisation, heatmap display, and conviction score comparison.

---

### GAP-03 — Graceful Degradation Is Architecturally Absent

**Severity:** Critical — every external data dependency is a single point of failure
**Files:** `03_why_now_engine.bpmn`, `08_valuation_scenarios.bpmn`

PRD §9 Reliability contains exactly two sentences on graceful degradation. Every parallel gateway joining external data sources is a strict AND-join with no boundary error events, no timeouts, and no partial-success handling. External financial data APIs fail daily in production.

**Required Fix:** Attach `boundaryEvent` (error and timer) to every external serviceTask. Design partial-success logic for parallel joins. Document in a Resilience Runbook.

---

### DDR-01 — Why Now Engine: Hard Parallel Join, No Partial Success Policy

**Severity:** Critical — single source failure deadlocks the calculation
**File:** `03_why_now_engine.bpmn`

`gw_why_parallel_join` has 7 incoming flows. No boundary events on any of the 7 fetch tasks. AND-join semantics require all 7 tokens. Any single external failure leaves the gateway waiting forever.

**Required Fix:** Attach timer boundary events to each fetch task. Redesign the join to allow N-of-7 quorum with degraded-mode fallback.

---

### DDR-02 — Alert Engine: Unbounded Infinite Loop, No Circuit Breaker

**Severity:** Critical — Claude API latency can stall all user alerts globally
**File:** `09_alerts_notifications.bpmn`

`sf_alte_no_triggered` loops back to `evt_alte_data_tick` with no iteration counter. `tsk_alte_claude_summary` is synchronous within this loop. One slow Claude response compounds into a global alert delivery stall for all users.

**Required Fix:** Decouple Claude summarisation from the alert detection loop via a message queue. Implement circuit breaker on the Claude call. Add iteration limits.

---

### DDR-04 — Claude API Degradation Cascades to All Three Core Engines

**Severity:** Critical — systemic single point of failure
**Files:** `04_conviction_scoring.bpmn`, `03_why_now_engine.bpmn`, `09_alerts_notifications.bpmn`

Claude narrative generation is mandatory on the critical path in conviction scoring, Why Now, and alert delivery simultaneously. Claude degrading freezes all three systems at once.

**Required Fix:** Reclassify all Claude narrative generation as asynchronous enrichment, not synchronous gate-keeping. Scores and alerts must be deliverable without Claude.

---

### ENG-004 — Thesis Monitor Timer Event Has Empty timerEventDefinition

**Severity:** Critical — thesis drift monitoring will never fire
**File:** `05_thesis_drift_tracking.bpmn`, line 173

```xml
<timerEventDefinition />
```

Completely empty. No `timeCycle`, `timeDate`, or `timeDuration`. The thesis drift monitoring process cannot execute.

**Required Fix:** `<timeCycle>R/P1W</timeCycle>` for weekly cadence. Audit all timer events across all nine diagrams.

---

### SEC-001 — Unregistered Investment Adviser Activity

**Severity:** Critical — existential regulatory and legal liability
**Reference:** PRD §7.2, §7.3, §7.6, §7.8

Claude answers "Is now a good time to enter?" (Entry Timing mode). The system auto-promotes stocks to "High Conviction" and sends "Entry Condition Met" alerts. This is personalized investment advice. In the US, this requires SEC RIA registration under the Investment Advisers Act of 1940. In the EU, MiFID II applies. No registration pathway, no exemption analysis, and no evidence of legal counsel review appears anywhere in the PRD.

**Required Fix:** Engage securities law counsel before proceeding. Outcome will determine whether the product requires registration, structural redesign as a "tools only" platform, or territorial restriction.

---

### SEC-002 — No AI-Generated Research Disclosures

**Severity:** Critical — MiFID II Article 24 and SEC Regulation Best Interest violations
**File:** `07_ai_research_copilot.bpmn`

`tsk_air_post_process` injects citations and confidence tags. It injects no regulatory disclosures. AI-generated investment research requires explicit disclosure in every major jurisdiction.

**Required Fix:** Add mandatory disclosure-injection to `tsk_air_post_process`. Implement a jurisdiction-aware disclosure template library.

---

### SEC-005 — Prompt Injection Vector in AI Research Copilot

**Severity:** Critical — multi-tenant data exfiltration risk
**File:** `07_ai_research_copilot.bpmn`

User-authored thesis text flows directly into Claude prompt construction via `tsk_air_load_context` with no sanitisation. An adversarial thesis document could attempt to exfiltrate other users' research.

**Required Fix:** Add sanitisation task before `tsk_air_load_context`. Isolate user-controlled content in clearly delimited untrusted sections. Implement multi-tenant context isolation at the Claude API call level.

---

## Major Findings — Fix Before V1 Launch

| ID | Title | Dimension |
|---|---|---|
| GAP-02 | No specification for position sizing despite High Conviction state referencing it | Completeness |
| GAP-04 | Claude API quota management unspecified — system burns user quota silently | Completeness |
| ENG-002 | Exclusive gateway for multi-condition threshold — wrong semantics, fires only one path | Engineering |
| DDR-03 | Valuation engine: no data snapshot — three scenarios computed on inconsistent live data | Resilience |
| FAC-01 | Conviction score weights are arbitrary — presented as fact with no calibration methodology | Accuracy |
| FAC-03 | 55% accuracy target is statistically hollow — not used by any professional investment operation | Accuracy |
| PCM-01 | No monetisation strategy, pricing model, or competitive differentiation | Product |
| PCM-02 | Conviction scores have no time-decay — stale scores display with same authority as fresh | Product |
| PCM-03 | Dual-persona strategy is a product death trap — Morgan and Alex need different products | Product |
| PCM-04 | Zero portfolio-level intelligence — all 9 modules operate in single-stock isolation | Product |
| SEC-003 | GDPR/CCPA deletion flow architecturally unsubstantiated across 5 storage systems | Security |
| SEC-004 | No immutable audit trail for AI-generated investment advice | Security |
| SEC-006 | Multi-tenant data isolation unspecified — shared PostgreSQL/Redis with 10,000+ users | Security |

---

## Minor Findings — Technical Debt / Backlog

1. **Timer cadences inconsistent** — PRD says "weekly" but some BPMN annotations suggest "daily." Align explicitly.
2. **No SLA defined for Why Now Engine latency** — With 7 parallel fetches, p99 latency unspecified.
3. **Alert deduplication logic absent** — Rapid successive threshold crossings may generate duplicate alerts.
4. **Conviction score time-series history not modelled** — Implied by PRD but not in data model or BPMN.
5. **No defined maximum watchlist size** — Unbounded watchlist is an unbounded computational load.
6. **Claude model version pinning unspecified** — Model upgrades could silently change output format and break `tsk_air_post_process` parsing.

---

## Refuted Findings

### ARCH-01 — "ASCII Architecture Diagram Is Operationally Useless" — REFUTED

**Verdict:** A PRD is not an Architecture Decision Record. A high-level component diagram is appropriate and conventional at this stage. Demanding a C4 Level 3 diagram in a PRD mistakes the document's purpose.

**Retained Partial Concern (now tracked as Major finding):** The underlying observation that service contracts, inter-service communication protocols, and deployment topology are unspecified is valid. This belongs in a subsequent Architecture Design Document.

---

## Top 10 Prioritised Recommendations

1. **Engage Securities Law Counsel Before Writing Another Line of Specification** — SEC-001 is not an engineering problem. Legal analysis determines whether the product as described can legally exist in its target markets.

2. **Fix All BPMN 2.0 Structural Violations (BPMN-01 through BPMN-04)** — Run all nine diagrams through a conformant BPMN validator. Fix all duplicate IDs, dangling references, cross-pool sequenceFlows, and eventBasedGateway violations before handing off to implementation.

3. **Fix the Empty timerEventDefinition (ENG-004)** — Five minutes of work. The thesis drift monitoring feature literally cannot run without it.

4. **Redesign Resilience Model for All External Dependency Paths (DDR-01, GAP-03)** — Attach error and timer boundary events to all external serviceTasks. Replace hard AND-joins with quorum-tolerant inclusive gateways. Write a Resilience Runbook.

5. **Decouple Claude API Calls From Synchronous Critical Paths (DDR-02, DDR-04)** — All Claude enrichment moves to async queues. Scores, Why Now, and alerts must be deliverable without Claude. Claude output enriches after delivery.

6. **Resolve the Dual-Persona Strategy Contradiction (PCM-03)** — Commission a persona prioritisation exercise. Produce an explicit feature differentiation matrix before any UI or data model work proceeds.

7. **Author the Missing Competitor Analysis BPMN (GAP-01)** — `10_competitor_peer_analysis.bpmn` is required. It covers a first-class user-facing module with eight specified requirements.

8. **Implement Prompt Injection Defences and Input Sanitisation (SEC-005)** — Add sanitisation to BPMN 07 before user content enters Claude prompts. Adopt structured prompt templates with clearly delimited untrusted sections.

9. **Replace Hollow Performance Metric and Document Weight Methodology (FAC-01, FAC-03)** — Label conviction weights as configurable defaults with documented assumptions. Replace 55% accuracy with Information Coefficient, Sharpe ratio, or risk-adjusted benchmark-relative metrics.

10. **Define and Model Data Deletion Flows (SEC-003)** — GDPR/CCPA compliance requires a demonstrable, tested deletion flow across all five storage systems including Claude conversation history. Author a DSAR BPMN before launch in any regulated jurisdiction.

---

## What the Spec Gets Right

**Modular BPMN Decomposition**
Decomposing the system into discrete process models — one per major feature area — is sound architectural practice for a domain of this complexity. It creates clear implementation boundaries and enables parallel development streams. The naming conventions are consistent.

**Multi-Factor Conviction Scoring Concept**
The intellectual premise — decomposing investment conviction into constituent factors and making the weighting transparent — is a genuinely useful framework. The problem is implementation detail, not concept. Worth building correctly.

**AI Research Copilot Interaction Model**
Intent classification routing, citation injection, confidence tagging, and the structured post-processing step in BPMN 07 show thoughtful consideration of how AI should augment research workflows. The mode-routing architecture is well-conceived and, once regulatory disclosures and prompt injection defences are added, is the most implementation-ready part of the specification.

**Thesis Drift Tracking as a First-Class Feature**
Elevating thesis drift to a monitored first-class process is a genuine product insight. Most investment platforms treat portfolio monitoring as an afterthought. The concept is sound even though the current implementation is broken.

**Explicit Non-Functional Requirements**
The presence of specific latency targets, concurrency targets, and uptime requirements in PRD §9 is significantly better than most PRDs at this stage. The discipline of stating them before implementation begins is correct practice, even where the targets need refinement.

---

## Conclusion

This specification represents a team that has thought seriously about a genuinely interesting product problem. The multi-factor conviction framework, the AI research copilot architecture, and the thesis monitoring concept are all ideas worth building.

None of that diminishes what the review found.

The BPMN diagrams, as delivered, are not executable specifications. They contain structural violations that would surface as implementation failures on day one. The resilience model is absent where it matters most. The regulatory exposure is not a compliance checkbox — it is a product viability question that must be resolved before implementation begins.

The path forward requires four parallel tracks:
1. **Legal analysis** — before implementation, not alongside it
2. **BPMN remediation** — conformance validation pass with all structural violations corrected
3. **Resilience design** — a Resilience Runbook covering every external dependency
4. **Persona resolution** — a clear decision about which customer the product primarily serves

The team has done enough work to know what they want to build. This report defines what they need to do before they can build it safely, legally, and correctly.

---

*Report generated by adversarial multi-agent review panel. 235 subagents ran across 8 review dimensions. 72 of 78 findings confirmed by 3-skeptic adversarial verification. 1 finding refuted. 6 minor findings carried forward unverified.*
