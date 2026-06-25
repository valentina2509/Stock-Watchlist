# BPMN Process Diagrams — Intelligent Stock Conviction Platform

## Overview

This directory contains 9 BPMN 2.0 process diagrams covering all major workflows in the platform. Each file is valid BPMN 2.0 XML and can be opened directly in:

- **draw.io / diagrams.net** — File > Open > select `.bpmn` file (free, recommended)
- **Camunda Modeler** — File > Open (free desktop app)
- **Bizagi Modeler** — File > Open
- **Visual Paradigm** — Import > BPMN

## Diagram Index

| # | File | Process | Lanes / Pools |
|---|------|---------|--------------|
| 1 | `01_system_overview.bpmn` | System Collaboration Overview | User, Platform, AI Engine, Data Feeds |
| 2 | `02_stock_discovery.bpmn` | Stock Discovery & Screening | User, Discovery Service, Data Layer |
| 3 | `03_why_now_engine.bpmn` | Why Now Engine | Platform Engine, Signal Sources, AI |
| 4 | `04_conviction_scoring.bpmn` | Conviction Score Calculation | Platform Engine, Data Sources, User |
| 5 | `05_thesis_drift_tracking.bpmn` | Thesis Management & Drift | User, Platform Monitor, AI Copilot |
| 6 | `06_watchlist_states.bpmn` | Watchlist State Machine | User, Platform Logic |
| 7 | `07_ai_research_copilot.bpmn` | AI Research Copilot | User, AI Router, Claude, Research Store |
| 8 | `08_valuation_scenarios.bpmn` | Valuation & Scenario Analysis | User, Valuation Engine, Data Layer |
| 9 | `09_alerts_notifications.bpmn` | Alerts & Notification System | User, Alert Engine, Delivery Service |

## BPMN Notation Key

| Shape | Meaning |
|-------|---------|
| Thin circle | Start Event |
| Thick double-ring circle | End Event |
| Rounded rectangle | Task (User Task = person icon; Service Task = gear icon) |
| Diamond (X) | Exclusive Gateway — one path taken |
| Diamond (+) | Parallel Gateway — all paths taken simultaneously |
| Diamond (~) | Event-Based Gateway — first event wins |
| Circle with clock | Timer Intermediate Event |
| Circle with envelope | Message Intermediate Event |
| Dashed arrow | Message Flow (between pools) |
| Solid arrow | Sequence Flow (within pool) |

## PRD Mapping

Each BPMN diagram maps to specific PRD sections:

| Diagram | PRD Section |
|---------|-------------|
| 01 System Overview | §3 Product Vision, §6 User Journey, §10 Architecture |
| 02 Stock Discovery | §7.1 Stock Discovery & Screening |
| 03 Why Now Engine | §7.2 Why Now Engine |
| 04 Conviction Scoring | §7.3 Conviction Score System |
| 05 Thesis Drift | §7.5 Thesis Management & Drift Tracking |
| 06 Watchlist States | §7.4 Watchlist State Machine |
| 07 AI Copilot | §7.8 AI Research Copilot |
| 08 Valuation Scenarios | §7.6 Valuation & Scenario Analysis |
| 09 Alerts | §7.9 Alerts & Notification System |
