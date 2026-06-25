# Product Requirements Document
## Intelligent Stock Discovery & Conviction Platform

**Version:** 1.0  
**Date:** 2026-06-25  
**Status:** Draft — For Review  

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Problem Statement](#2-problem-statement)
3. [Product Vision & Principles](#3-product-vision--principles)
4. [Target Users & Personas](#4-target-users--personas)
5. [Goals & Success Metrics](#5-goals--success-metrics)
6. [User Journey](#6-user-journey)
7. [Core Modules & Feature Requirements](#7-core-modules--feature-requirements)
   - 7.1 Stock Discovery & Screening
   - 7.2 Why Now Engine
   - 7.3 Conviction Score System
   - 7.4 Watchlist State Machine
   - 7.5 Thesis Management & Drift Tracking
   - 7.6 Valuation & Scenario Analysis
   - 7.7 Competitor & Peer Analysis
   - 7.8 AI Research Copilot (Claude)
   - 7.9 Alerts & Notification System
8. [User Stories](#8-user-stories)
9. [Non-Functional Requirements](#9-non-functional-requirements)
10. [Technical Architecture](#10-technical-architecture)
11. [Data Sources & Integrations](#11-data-sources--integrations)
12. [BPMN Process Reference](#12-bpmn-process-reference)
13. [Glossary](#13-glossary)

---

## 1. Executive Summary

The Intelligent Stock Discovery & Conviction Platform is a living equity research system designed to help investors systematically move a stock from initial discovery to confident, well-timed investment decisions. It combines automated screening, a contextual "Why Now" engine, a transparent conviction scoring system, watchlist state tracking, thesis drift monitoring, valuation modeling, competitive analysis, and an AI research copilot powered by Claude.

Unlike static screeners or passive dashboards, this platform acts as an embedded equity research partner — organizing evidence, tracking how theses evolve, surfacing the right signal at the right time, and giving the investor a structured, auditable path from curiosity to conviction.

---

## 2. Problem Statement

Individual and semi-professional investors face compounding challenges in equity research:

| Challenge | Impact |
|-----------|--------|
| Information overload | Investors waste time filtering noise instead of evaluating signal |
| No structured research workflow | Ideas surface and disappear without systematic follow-through |
| Static screeners lack context | A stock looks "cheap" but investors don't know *why now* matters |
| Thesis drift goes unnoticed | Original investment assumptions change; investors don't see it |
| Valuation is done ad hoc | No scenario modeling or probability-weighted fair values |
| Timing decisions are emotional | No objective signals for when entry conditions have been met |
| Research is fragmented | Filings, news, ratings, and models live in different tools |
| Conviction is vague | Investors can't articulate *why* they believe in a stock |

---

## 3. Product Vision & Principles

**Vision:** A platform that feels like having a junior research analyst and a senior portfolio manager in a single interface — one that never sleeps, always remembers context, and helps you think clearly about every stock in your research pipeline.

### Design Principles

1. **Living over static** — Every piece of data is connected to a process that updates, drifts, and evolves.
2. **Conviction is earned, not assumed** — The system makes you prove your thesis before awarding high conviction.
3. **Why now is a first-class signal** — Timing context is embedded everywhere, not optional.
4. **Transparency over black boxes** — Every score, rating, and suggestion shows its reasoning.
5. **Progressive depth** — A discovery card is fast; deep research is available when needed.
6. **AI as copilot, not autopilot** — Claude assists and synthesizes; the investor decides.

---

## 4. Target Users & Personas

### Persona 1: The Active Individual Investor — "Morgan"

- **Profile:** Manages a personal portfolio of 15–30 positions; invests 5–10 hours/week on research
- **Tools today:** Stock screeners, Seeking Alpha, earnings call transcripts, Excel models
- **Pain points:** No structured way to track theses; misses entry points; loses track of prior research
- **Goals:** Find 2–4 high-conviction ideas per quarter; avoid value traps; invest at better timing

### Persona 2: The Part-Time Portfolio Manager — "Alex"

- **Profile:** Manages a small fund or family office; covers 50–100 names; needs an audit trail
- **Tools today:** Bloomberg (partial), FactSet exports, Word documents, shared spreadsheets
- **Pain points:** Difficulty tracking which ideas have been researched vs. are fresh; thesis documentation is informal
- **Goals:** Systematize research process; catch thesis drift early; present evidence-backed conviction to stakeholders

### Persona 3: The Research-Oriented Trader — "Sam"

- **Profile:** Active trader with a value overlay; combines fundamental triggers with technical timing
- **Tools today:** TradingView, SEC EDGAR, earnings calendars, Twitter/X feeds
- **Pain points:** Misses catalysts; enters too early before thesis is confirmed
- **Goals:** Combine fundamental conviction with optimal entry timing; reduce false positives

---

## 5. Goals & Success Metrics

### Business Goals

| Goal | Metric | Target (6 months) |
|------|--------|-------------------|
| User engagement | Weekly active sessions | ≥ 4 sessions/user/week |
| Research depth | Avg. watchlist items per user | ≥ 12 |
| AI copilot adoption | % users using Claude queries/week | ≥ 70% |
| Retention | 30-day retention rate | ≥ 65% |
| Conviction accuracy | % high-conviction picks outperforming benchmark 6M | ≥ 55% |

### User Experience Goals

| Goal | Metric | Target |
|------|--------|--------|
| Time to first conviction | Days from discovery to first High Conviction | < 14 days |
| Thesis drift detection | % of significant thesis changes flagged before user notices | ≥ 80% |
| Alert relevance | % alerts acted upon | ≥ 40% |
| AI response quality | User satisfaction rating on Claude responses | ≥ 4.2/5 |

---

## 6. User Journey

The platform supports a linear but non-sequential journey from discovery to conviction:

```
DISCOVER → RESEARCH → BUILD CONVICTION → HIGH CONVICTION → POSITION → MONITOR → EXIT
```

At each stage, the platform provides:

| Stage | Primary Action | Platform Support |
|-------|---------------|-----------------|
| **Discover** | Find new stock ideas | Screening, Why Now surface, trending ideas |
| **Research** | Gather and organize evidence | Claude copilot, filing summaries, peer comparison |
| **Build Conviction** | Validate thesis assumptions | Conviction scoring, valuation scenarios |
| **High Conviction** | Prepare for entry | Timing signals, alert setup, entry conditions |
| **Position** | Track and monitor | Thesis monitoring, score drift alerts |
| **Monitor** | Detect thesis changes | Drift tracking, catalyst calendar |
| **Exit** | Evidence-based exit | Exit condition alerts, thesis invalidation signals |

---

## 7. Core Modules & Feature Requirements

---

### 7.1 Stock Discovery & Screening

**Purpose:** Identify stock ideas from the universe that match user-defined criteria. Results are enriched with Why Now signals and AI ranking.

#### Functional Requirements

| ID | Requirement |
|----|-------------|
| SCR-01 | Users can define multi-factor screening criteria: sector, market cap, P/E, EV/EBITDA, revenue growth, ROIC, FCF yield, debt/equity, price momentum |
| SCR-02 | System screens a universe of ≥ 5,000 securities (US markets, major ETFs) |
| SCR-03 | Screening results display conviction-relevant enrichment: Why Now score, analyst consensus, 52-week position, earnings proximity |
| SCR-04 | Users can save and name custom screening templates |
| SCR-05 | System provides 5–10 curated thematic screens updated weekly (e.g., "AI infrastructure plays," "Rate beneficiaries") |
| SCR-06 | Results can be sorted by Why Now score, conviction score (if already tracked), upside to consensus target |
| SCR-07 | One-click add to watchlist from any discovery result |
| SCR-08 | System shows "similar stocks" based on factor similarity when viewing a stock |

#### Screen States

- **Fresh:** Never seen by user
- **Viewed:** User has opened the stock card
- **Considered:** User has spent > 2 minutes reviewing
- **Dismissed:** User explicitly removed from view

---

### 7.2 Why Now Engine

**Purpose:** Explain why a specific stock is relevant *at this moment* — not just whether it's fundamentally sound. Combines event-driven signals, catalyst proximity, technical conditions, and macro context.

#### Signal Categories

| Signal Type | Description | Weight |
|-------------|-------------|--------|
| Earnings Proximity | Days until next earnings; guidance quality | 20% |
| Filing Event | Recent 10-K/10-Q/8-K with material disclosures | 15% |
| Analyst Activity | Recent upgrades, initiation of coverage, target raises | 15% |
| Price Action | Breakout above resistance, volume surge, 52-week high | 15% |
| Macro Alignment | Current macro regime matches sector tailwinds | 15% |
| News Sentiment | Positive shift in news sentiment (30-day) | 10% |
| Insider Activity | Recent material insider buys | 10% |

#### Functional Requirements

| ID | Requirement |
|----|-------------|
| WHY-01 | Each stock has a Why Now score (0–100) updated daily |
| WHY-02 | Score is broken down by contributing signal with individual weights |
| WHY-03 | Claude generates a 3–5 sentence Why Now narrative updated when score changes > 10 points |
| WHY-04 | Historical Why Now score chart shows how urgency has evolved |
| WHY-05 | Why Now score ≥ 70 triggers a "Hot Window" badge visible in watchlist and discovery |
| WHY-06 | Why Now score is one of the inputs to the Conviction Score |
| WHY-07 | Users can pin specific Why Now signals as their primary thesis catalyst |

---

### 7.3 Conviction Score System

**Purpose:** A composite, transparent score (0–100) that reflects how strong the investment case is for a stock at the current moment. Updated continuously as underlying data changes.

#### Score Architecture

```
Conviction Score (0–100)
├── Fundamental Quality     [30%]  Quality of business (ROIC, margins, balance sheet, growth)
├── Valuation Attractiveness [25%]  Upside vs. fair value scenarios
├── Why Now Score           [20%]  Catalyst and timing context
├── Momentum                [15%]  Price and earnings momentum signals
└── Sentiment               [10%]  Analyst, news, and social sentiment
```

#### Score Bands

| Band | Range | Label | UI Treatment |
|------|-------|-------|-------------|
| 1 | 0–20 | Watch Only | Grey |
| 2 | 21–40 | Early Research | Blue |
| 3 | 41–60 | Building | Yellow |
| 4 | 61–79 | Conviction | Orange |
| 5 | 80–100 | High Conviction | Green |

#### Functional Requirements

| ID | Requirement |
|----|-------------|
| CVX-01 | Conviction score updates whenever any underlying component changes materially (> 3 points) |
| CVX-02 | Each component score is displayed with a mini-narrative explaining the key driver |
| CVX-03 | Score change history is maintained with timestamps and delta reason |
| CVX-04 | Scores ≥ 80 trigger a High Conviction alert to the user |
| CVX-05 | Score drop of ≥ 10 points triggers a "Thesis Check" prompt |
| CVX-06 | Claude can be asked to explain any score change in plain language |
| CVX-07 | Users can override component weights with custom allocation (advanced mode) |
| CVX-08 | Conviction score is shown on every stock card, watchlist, and research view |
| CVX-09 | Peer comparison shows conviction scores relative to sector peers |

---

### 7.4 Watchlist State Machine

**Purpose:** Track where each stock is in the research-to-position pipeline. Each state has entry criteria, exit triggers, and associated actions.

#### States

```
[Discovery] → [Research] → [Building Conviction] → [High Conviction] → [Position]
                                                                            ↓
                                                        [Exited] ← [Monitoring Position]
```

#### State Definitions

| State | Entry Criteria | Exit Trigger | Key Actions Available |
|-------|---------------|-------------|----------------------|
| **Discovery** | Added from screener or manual | Promoted by user or dismissed | View Why Now card, add notes |
| **Research** | User promotes or spends > 5 min researching | Promoted or dismissed | Full copilot access, filing summaries, peer comparison |
| **Building Conviction** | Conviction score ≥ 41 | Score drops < 41 or promoted | Valuation scenarios, thesis documentation |
| **High Conviction** | Conviction score ≥ 80 OR manual promotion | Score drops < 60 or position opened | Alert setup, entry condition definition |
| **Position** | User marks as "In Position" | User marks exit or thesis invalidated | Thesis monitoring, exit alerts |
| **Monitoring Position** | Active position with no recent changes | Exit signal triggered | Drift alerts, catalyst calendar |
| **Exited** | User marks exit | N/A (terminal) | Post-mortem review, lessons captured |

#### Functional Requirements

| ID | Requirement |
|----|-------------|
| WLS-01 | Each stock card displays current state prominently |
| WLS-02 | State transitions are logged with timestamp and reason |
| WLS-03 | Users can manually promote/demote states |
| WLS-04 | System auto-promotes based on conviction score thresholds |
| WLS-05 | Watchlist is grouped and filterable by state |
| WLS-06 | Users can see all stocks currently in each state via a pipeline view |
| WLS-07 | Exited stocks are archived with full research history intact |
| WLS-08 | Post-exit review prompts the user to document lessons learned |

---

### 7.5 Thesis Management & Drift Tracking

**Purpose:** Allow users to formally document investment theses and automatically monitor for drift — changes in the underlying assumptions that either strengthen or invalidate the original case.

#### Thesis Structure

```
Thesis Document
├── Core Thesis Statement (1–2 sentences)
├── Key Assumptions (3–5 bullet points with measurable metrics)
├── Primary Catalysts (events expected to unlock value)
├── Risk Factors (conditions that would invalidate thesis)
├── Time Horizon
└── Target Price / Return Expectations
```

#### Drift Detection

The system monitors the key assumptions from each thesis and compares current data against thesis-time data. Drift is classified as:

| Drift Level | Definition | Action |
|-------------|-----------|--------|
| **Confirming** | Data is tracking ahead of thesis assumptions | Score boost; notify user |
| **On Track** | Data within ±10% of thesis assumptions | No action |
| **Diverging** | Data is 10–25% away from assumptions | Yellow alert; "Thesis Check" |
| **Broken** | Core assumption violated | Red alert; "Thesis Invalidated" prompt |

#### Functional Requirements

| ID | Requirement |
|----|-------------|
| THX-01 | Users can create structured thesis documents for any stock |
| THX-02 | Claude can assist thesis creation by pre-filling from available data and filings |
| THX-03 | System extracts monitored metrics from thesis key assumptions |
| THX-04 | Drift score is calculated weekly and shown on the stock card |
| THX-05 | Thesis timeline view shows all drift events with Claude commentary |
| THX-06 | Users are notified when a catalyst fires, a risk is triggered, or an assumption breaks |
| THX-07 | Thesis versions are maintained; user can view diff between versions |
| THX-08 | Thesis health indicator (green/yellow/red) is visible in watchlist |

---

### 7.6 Valuation & Scenario Analysis

**Purpose:** Provide a structured framework for understanding what a stock is worth under different conditions. Supports DCF, EV/EBITDA multiples, and P/E relative valuation.

#### Scenario Framework

| Scenario | Description | Default Probability |
|----------|-------------|---------------------|
| **Bull Case** | Strong execution, sector tailwind, multiple expansion | 25% |
| **Base Case** | Consensus assumptions, stable conditions | 50% |
| **Bear Case** | Execution miss, macro headwind, multiple compression | 25% |

#### Functional Requirements

| ID | Requirement |
|----|-------------|
| VAL-01 | Users can build DCF models with editable assumptions (revenue growth, margins, WACC, terminal growth) |
| VAL-02 | System pre-fills model with consensus analyst estimates as default |
| VAL-03 | Users define three scenarios (Bull/Base/Bear) with independent assumption sets |
| VAL-04 | Probability-weighted fair value is calculated from scenario assumptions and probabilities |
| VAL-05 | System calculates and displays upside/downside from current price to each scenario target |
| VAL-06 | Multiples-based valuation supports NTM P/E, EV/EBITDA, P/FCF with peer benchmark ranges |
| VAL-07 | Sensitivity tables show fair value across a matrix of key input variations |
| VAL-08 | Valuation summary integrates into the Conviction Score (Valuation Attractiveness component) |
| VAL-09 | Historical valuation chart shows where current price stands vs. historical multiple ranges |
| VAL-10 | Claude can be asked to critique assumptions or identify where the model is most sensitive |

---

### 7.7 Competitor & Peer Analysis

**Purpose:** Help investors understand a company's position relative to its peers on key financial, operational, and valuation metrics.

#### Functional Requirements

| ID | Requirement |
|----|-------------|
| COMP-01 | System auto-identifies 5–8 peer companies based on sector, size, and business model |
| COMP-02 | Users can customize the peer group |
| COMP-03 | Comparative metrics include: revenue growth, gross margin, EBITDA margin, ROIC, FCF yield, NTM P/E, EV/Revenue, debt/EBITDA |
| COMP-04 | Heatmap view shows how the stock ranks across all metrics relative to peers |
| COMP-05 | Conviction scores for all peers are visible for cross-peer comparison |
| COMP-06 | Why Now scores are visible across the peer group to identify the most timely opportunity |
| COMP-07 | Claude can generate a comparative narrative: "Why this company vs. peers at this price?" |
| COMP-08 | Users can switch focus stock to a peer and carry over the thesis framework |

---

### 7.8 AI Research Copilot (Claude)

**Purpose:** An embedded, context-aware AI assistant that helps users research, synthesize, and reason about stocks. Claude has full access to the user's watchlist, theses, conviction scores, and valuation models.

#### Research Modes

| Mode | Trigger | Claude Output |
|------|---------|--------------|
| **Filing Summary** | User requests 10-K/10-Q/8-K summary | Structured summary with key financials, management guidance, risk factors |
| **Score Explanation** | User asks "Why did conviction drop?" | Plain-language breakdown of score component changes |
| **Thesis Review** | User asks "Is my thesis still intact?" | Drift analysis with confirming/diverging data points |
| **Company Comparison** | User asks "Why X vs. Y?" | Side-by-side analysis with differentiated factors |
| **Risk Analysis** | User asks "What could go wrong?" | Prioritized risk register with mitigation considerations |
| **Entry Timing** | User asks "Is now a good time to enter?" | Why Now analysis + technical conditions + catalyst proximity |
| **Valuation Critique** | User asks "Are my DCF assumptions reasonable?" | Sensitivity analysis + peer-benchmarked assumptions |
| **Thesis Drafting** | User asks "Help me write my thesis" | Pre-filled thesis template from available data |
| **Missing Evidence** | Unprompted | Claude flags when a stock is missing key evidence to support current conviction level |

#### Functional Requirements

| ID | Requirement |
|----|-------------|
| AI-01 | Claude has read access to the user's full watchlist, theses, scores, and models |
| AI-02 | Claude can cite specific data points, filing excerpts, and news events in responses |
| AI-03 | All Claude responses are stored in the stock's research history |
| AI-04 | Users can save specific Claude responses as "Research Notes" |
| AI-05 | Claude proactively surfaces insights when it detects a significant change (score shift, news event) |
| AI-06 | Claude flags incomplete theses — e.g., "Your bear case doesn't have a price target" |
| AI-07 | Claude maintains conversation context within a stock research session |
| AI-08 | Users can ask Claude to compare its current response to what it said 30/60/90 days ago |
| AI-09 | Claude's confidence in its responses is surfaced (high/medium/low) with explanation |
| AI-10 | Users can ask Claude to play devil's advocate on any thesis |

---

### 7.9 Alerts & Notification System

**Purpose:** Deliver timely, relevant alerts tied to specific investment conditions — not generic price notifications. Alerts are contextual, actionable, and linked to the research workflow.

#### Alert Types

| Alert Type | Trigger | Linked Action |
|------------|---------|--------------|
| **Conviction Surge** | Score rises ≥ 10 pts in 24h | Open score breakdown |
| **Conviction Drop** | Score falls ≥ 10 pts in 24h | Thesis check prompt |
| **Why Now Hot Window** | Why Now score crosses 70 | Open Why Now analysis |
| **Thesis Drift** | Any assumption moves to "Diverging" | Open thesis monitor |
| **Thesis Broken** | Core assumption violated | Urgent: open stock + thesis |
| **Earnings Countdown** | T-7, T-3, T-1 before earnings | Open earnings prep view |
| **Catalyst Event** | Pinned catalyst fires (filing, rating change) | Open catalyst details |
| **Entry Condition Met** | User-defined entry price or technical level reached | Open position sizing view |
| **Exit Signal** | User-defined exit condition met | Open exit review |
| **Peer Dislocation** | Peer stocks diverging sharply | Open peer comparison |

#### Functional Requirements

| ID | Requirement |
|----|-------------|
| ALT-01 | Users can subscribe to any alert type per stock |
| ALT-02 | Alert delivery channels: in-app, email, push notification |
| ALT-03 | Each alert includes a 2–3 sentence Claude summary of the trigger |
| ALT-04 | Alerts link directly to the relevant platform view |
| ALT-05 | Users can set alert thresholds (e.g., alert only when conviction drops > 15 points) |
| ALT-06 | Alert history is maintained per stock |
| ALT-07 | Users can snooze alerts by time period |
| ALT-08 | System suggests relevant alerts based on current watchlist state |

---

## 8. User Stories

### Discovery

- **US-01** As Morgan, I want to screen for high-quality businesses with a recent catalyst so I can identify stocks worth researching today.
- **US-02** As Morgan, I want to see why a stock is relevant *right now* so I don't have to read five articles to understand the context.
- **US-03** As Alex, I want to save screening templates so I can run the same scan for different sectors in my coverage universe.

### Research & Conviction

- **US-04** As Morgan, I want a conviction score that tells me how strong my case is so I know when I'm ready to invest.
- **US-05** As Alex, I want to see which component of conviction changed and why so I can update my thesis quickly.
- **US-06** As Sam, I want to know when both the fundamental case AND the technical timing align so I can enter with confidence.

### Thesis Management

- **US-07** As Morgan, I want the system to alert me when an assumption in my thesis is no longer tracking so I can reassess before the market does.
- **US-08** As Alex, I want to document my thesis in a structured way so I can review it with my investment committee.
- **US-09** As Sam, I want to see how my thesis has evolved over time so I can learn from my research process.

### AI Copilot

- **US-10** As Morgan, I want Claude to summarize the latest 10-Q so I don't have to read 80 pages to find the key changes.
- **US-11** As Alex, I want Claude to tell me what evidence is missing before I can move a stock to High Conviction.
- **US-12** As Sam, I want Claude to play devil's advocate on my thesis so I can identify blind spots.

### Valuation

- **US-13** As Alex, I want to model Bull/Base/Bear scenarios so I can understand the full range of outcomes.
- **US-14** As Morgan, I want to see a probability-weighted fair value so I can quickly assess if the risk/reward is compelling.

### Alerts

- **US-15** As Sam, I want an alert when my entry condition is met so I don't have to monitor the price manually.
- **US-16** As Morgan, I want an alert when a stock I'm watching enters a "Hot Window" so I don't miss the catalyst.

---

## 9. Non-Functional Requirements

### Performance

| Requirement | Target |
|-------------|--------|
| Conviction score refresh latency | < 5 minutes after data change |
| Screen results load time | < 2 seconds for 5,000 securities |
| Claude response time | < 8 seconds for standard queries; < 20 seconds for filing summaries |
| Alert delivery latency | < 60 seconds from trigger to notification |
| Historical chart load | < 1 second |

### Security & Privacy

| Requirement |
|-------------|
| All user research data (theses, notes, models) encrypted at rest and in transit |
| OAuth 2.0 authentication with MFA support |
| Claude queries do not use user data to train models |
| Users can export and delete all their data |
| Audit log of all data access events |

### Scalability

| Requirement |
|-------------|
| Support 10,000+ concurrent users without degradation |
| Watchlist size: up to 500 stocks per user |
| Conviction score calculation handles 5,000 securities simultaneously |
| Claude queries: rate-limited at 100 queries/user/day with clear UI feedback |

### Reliability

| Requirement |
|-------------|
| System uptime: 99.5% (excluding scheduled maintenance) |
| Market data freshness: ≤ 15 minutes during market hours |
| Graceful degradation: if a data source fails, display last known value with timestamp |
| Claude unavailability: fallback message with retry option |

### Accessibility

| Requirement |
|-------------|
| WCAG 2.1 AA compliance |
| Keyboard navigable watchlist and research views |
| Color-blind safe palette for conviction score bands |
| Screen reader support for all key UI elements |

---

## 10. Technical Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                             │
│  React Web App  │  Mobile (iOS/Android)  │  API (3rd party)    │
└────────────────────────────┬────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────┐
│                        API GATEWAY                              │
│  Auth (OAuth2/JWT)  │  Rate Limiting  │  Request Routing        │
└────────────────────────────┬────────────────────────────────────┘
                             │
       ┌─────────────────────┼─────────────────────┐
       │                     │                     │
┌──────▼──────┐   ┌──────────▼──────┐   ┌─────────▼────────┐
│  Research   │   │  Conviction &   │   │   AI Copilot     │
│  Service   │   │  Scoring Engine │   │   Service        │
│             │   │                 │   │  (Claude API)    │
└──────┬──────┘   └────────┬────────┘   └─────────┬────────┘
       │                   │                       │
┌──────▼───────────────────▼───────────────────────▼────────┐
│                     DATA LAYER                             │
│  PostgreSQL (user data)  │  Redis (cache/real-time)        │
│  TimescaleDB (time-series)  │  S3 (filing storage)         │
└────────────────────────────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────┐
│                     EXTERNAL DATA FEEDS                         │
│  Market Data API  │  SEC EDGAR  │  News APIs  │  Analyst Data   │
└─────────────────────────────────────────────────────────────────┘
```

### Key Services

| Service | Responsibility |
|---------|----------------|
| **Research Service** | Manages watchlist states, thesis documents, research notes, and filing retrieval |
| **Conviction Engine** | Calculates and updates conviction scores; manages component weights and scoring logic |
| **Why Now Engine** | Aggregates catalyst signals, calculates Why Now scores, triggers urgency notifications |
| **Thesis Monitor** | Monitors key metrics for drift; calculates drift scores; generates drift events |
| **Valuation Service** | Manages DCF/multiples models; runs scenario calculations; stores model history |
| **Alert Service** | Monitors conditions; triggers and delivers alerts; manages user alert preferences |
| **AI Copilot Service** | Routes requests to Claude API; manages context; stores research conversations |
| **Data Ingestion Service** | Fetches, normalizes, and stores data from external sources; manages freshness |

---

## 11. Data Sources & Integrations

| Data Type | Source Options | Update Frequency |
|-----------|----------------|-----------------|
| Real-time price & volume | Polygon.io, Alpaca, Yahoo Finance | Real-time / 15min delay |
| Financial statements | Financial Modeling Prep, SimFin, Intrinio | Quarterly |
| Analyst estimates | FactSet, Refinitiv, Visible Alpha | Daily |
| SEC filings | SEC EDGAR API | Real-time |
| News & sentiment | NewsAPI, Benzinga, Refinitiv News | Real-time |
| Insider transactions | OpenInsider, SEC Form 4 EDGAR | Real-time |
| Institutional ownership | SEC 13F EDGAR | Quarterly |
| Technical indicators | Computed from price data | Daily |
| Macro indicators | FRED (Federal Reserve) | As released |
| Earnings calendar | Earnings Whispers, EarningsWhispers API | Daily |

---

## 12. BPMN Process Reference

All key processes in the platform are modeled as BPMN 2.0 diagrams. The following diagrams are available in `/docs/bpmn/`:

| File | Process | Description |
|------|---------|-------------|
| `01_system_overview.bpmn` | System Overview | High-level collaboration between user, platform, and AI |
| `02_stock_discovery.bpmn` | Stock Discovery & Screening | Full discovery-to-watchlist flow |
| `03_why_now_engine.bpmn` | Why Now Engine | Signal aggregation and urgency scoring |
| `04_conviction_scoring.bpmn` | Conviction Score System | Multi-component scoring and update cycle |
| `05_thesis_drift_tracking.bpmn` | Thesis Management & Drift | Thesis creation, monitoring, and drift detection |
| `06_watchlist_states.bpmn` | Watchlist State Machine | State transitions and progression rules |
| `07_ai_research_copilot.bpmn` | AI Research Copilot | Claude query routing and research modes |
| `08_valuation_scenarios.bpmn` | Valuation & Scenario Analysis | DCF/multiples modeling and scenario framework |
| `09_alerts_notifications.bpmn` | Alerts & Notifications | Alert lifecycle from definition to action |

To view these diagrams, open them in:
- **draw.io (diagrams.net)** — File > Open > select `.bpmn` file
- **Camunda Modeler** — File > Open
- **Bizagi Modeler** — File > Open

---

## 13. Glossary

| Term | Definition |
|------|-----------|
| **Conviction Score** | A composite 0–100 score reflecting how strong the current investment case is for a stock |
| **Why Now Score** | A 0–100 score reflecting how timely and catalyst-rich a stock opportunity is at this moment |
| **Thesis Drift** | A measurable divergence between the assumptions documented in an investment thesis and current observed data |
| **Drift Event** | A specific moment when a key thesis assumption moves from "On Track" to "Diverging" or "Broken" |
| **Hot Window** | A period where the Why Now score exceeds 70, indicating a high concentration of positive catalysts |
| **Watchlist State** | The current stage in the research pipeline: Discovery, Research, Building Conviction, High Conviction, Position, Monitoring, Exited |
| **Probability-Weighted Fair Value** | The weighted average of Bull/Base/Bear scenario price targets using user-defined probabilities |
| **Catalyst** | A specific event expected to unlock value and move the stock price (earnings, FDA approval, contract win, etc.) |
| **Thesis Invalidation** | The point at which a core assumption has been broken and the original investment case no longer holds |
| **BPMN** | Business Process Model and Notation — a standardized graphical notation for modeling business processes |
| **DCF** | Discounted Cash Flow — a valuation method that estimates value based on projected future cash flows |
| **ROIC** | Return on Invested Capital — a measure of how efficiently a company generates profit from its capital |
| **FCF** | Free Cash Flow — operating cash flow minus capital expenditures |
| **NTM** | Next Twelve Months — used for forward-looking financial estimates |
