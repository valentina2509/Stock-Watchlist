import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";

// Watchlist state machine: Discovery → Research → Building → High Conviction → Position → Monitoring → Exited
export const WATCHLIST_STATES = [
  "DISCOVERY",
  "RESEARCH",
  "BUILDING_CONVICTION",
  "HIGH_CONVICTION",
  "POSITION",
  "MONITORING",
  "EXITED",
] as const;
export type WatchlistState = (typeof WATCHLIST_STATES)[number];

export const stocks = sqliteTable("stocks", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  ticker: text("ticker").notNull().unique(),
  name: text("name").notNull(),
  sector: text("sector"),
  industry: text("industry"),
  marketCap: real("market_cap"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

export const watchlistItems = sqliteTable("watchlist_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  stockId: integer("stock_id")
    .notNull()
    .references(() => stocks.id, { onDelete: "cascade" }),
  state: text("state", { enum: WATCHLIST_STATES }).notNull().default("DISCOVERY"),
  addedAt: integer("added_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  notes: text("notes"),
  // entry/exit tracking
  targetEntryPrice: real("target_entry_price"),
  averageCostBasis: real("average_cost_basis"),
  positionSize: integer("position_size"),
  exitPrice: real("exit_price"),
  exitReason: text("exit_reason"),
});

export const convictionScores = sqliteTable("conviction_scores", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  watchlistItemId: integer("watchlist_item_id")
    .notNull()
    .references(() => watchlistItems.id, { onDelete: "cascade" }),
  // 5 components (0–20 each → total 0–100)
  fundamentalScore: real("fundamental_score").notNull().default(0),
  valuationScore: real("valuation_score").notNull().default(0),
  momentumScore: real("momentum_score").notNull().default(0),
  thesisScore: real("thesis_score").notNull().default(0),
  whyNowScore: real("why_now_score").notNull().default(0),
  totalScore: real("total_score").notNull().default(0),
  scoreBand: text("score_band", {
    enum: ["WATCH", "RESEARCH", "BUILDING", "HIGH", "CONVICTION"],
  })
    .notNull()
    .default("WATCH"),
  calculatedAt: integer("calculated_at", { mode: "timestamp" }).notNull(),
});

export const theses = sqliteTable("theses", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  watchlistItemId: integer("watchlist_item_id")
    .notNull()
    .references(() => watchlistItems.id, { onDelete: "cascade" }),
  version: integer("version").notNull().default(1),
  bullCase: text("bull_case"),
  bearCase: text("bear_case"),
  keyAssumptions: text("key_assumptions"), // JSON array
  targetPrice: real("target_price"),
  timeHorizon: text("time_horizon"),
  driftStatus: text("drift_status", {
    enum: ["ON_TRACK", "CONFIRMING", "DIVERGING", "BROKEN"],
  })
    .notNull()
    .default("ON_TRACK"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

export const priceHistory = sqliteTable("price_history", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  stockId: integer("stock_id")
    .notNull()
    .references(() => stocks.id, { onDelete: "cascade" }),
  date: integer("date", { mode: "timestamp" }).notNull(),
  open: real("open"),
  high: real("high"),
  low: real("low"),
  close: real("close").notNull(),
  volume: integer("volume"),
  adjClose: real("adj_close"),
});

export const whyNowSignals = sqliteTable("why_now_signals", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  stockId: integer("stock_id")
    .notNull()
    .references(() => stocks.id, { onDelete: "cascade" }),
  signalType: text("signal_type", {
    enum: [
      "EARNINGS_CATALYST",
      "ANALYST_UPGRADE",
      "INSIDER_BUYING",
      "TECHNICAL_BREAKOUT",
      "NEWS_SENTIMENT",
      "MACRO_TAILWIND",
      "SECTOR_ROTATION",
    ],
  }).notNull(),
  score: real("score").notNull().default(0), // 0–100
  description: text("description"),
  detectedAt: integer("detected_at", { mode: "timestamp" }).notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp" }),
});

export const alerts = sqliteTable("alerts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  watchlistItemId: integer("watchlist_item_id")
    .notNull()
    .references(() => watchlistItems.id, { onDelete: "cascade" }),
  alertType: text("alert_type", {
    enum: [
      "CONVICTION_SURGE",
      "CONVICTION_DROP",
      "WHY_NOW_HOT_WINDOW",
      "THESIS_DRIFT",
      "THESIS_BROKEN",
      "EARNINGS_COUNTDOWN",
      "CATALYST_EVENT",
      "ENTRY_CONDITION_MET",
      "EXIT_SIGNAL",
      "PEER_DISLOCATION",
    ],
  }).notNull(),
  status: text("status", { enum: ["ACTIVE", "FIRED", "SNOOZED", "DISMISSED"] })
    .notNull()
    .default("ACTIVE"),
  threshold: real("threshold"),
  message: text("message"),
  firedAt: integer("fired_at", { mode: "timestamp" }),
  snoozedUntil: integer("snoozed_until", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

export const researchNotes = sqliteTable("research_notes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  watchlistItemId: integer("watchlist_item_id")
    .notNull()
    .references(() => watchlistItems.id, { onDelete: "cascade" }),
  source: text("source", { enum: ["USER", "CLAUDE", "SYSTEM"] })
    .notNull()
    .default("USER"),
  content: text("content").notNull(),
  tags: text("tags"), // JSON array
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

export const whyNowScores = sqliteTable("why_now_scores", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  stockId: integer("stock_id")
    .notNull()
    .references(() => stocks.id, { onDelete: "cascade" }),
  totalScore: real("total_score").notNull(),
  isHotWindow: integer("is_hot_window", { mode: "boolean" }).notNull().default(false),
  breakdown: text("breakdown").notNull(), // JSON: { signals: SignalResult[] }
  calculatedAt: integer("calculated_at", { mode: "timestamp" }).notNull(),
});

export const valuationScenarios = sqliteTable("valuation_scenarios", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  watchlistItemId: integer("watchlist_item_id")
    .notNull()
    .references(() => watchlistItems.id, { onDelete: "cascade" }),
  method: text("method", { enum: ["DCF", "PE_MULTIPLE", "EV_EBITDA"] }).notNull(),
  bearAssumptions: text("bear_assumptions").notNull(), // JSON
  baseAssumptions: text("base_assumptions").notNull(),
  bullAssumptions: text("bull_assumptions").notNull(),
  bearPrice:    real("bear_price"),
  basePrice:    real("base_price"),
  bullPrice:    real("bull_price"),
  currentPrice: real("current_price"),
  calculatedAt: integer("calculated_at", { mode: "timestamp" }).notNull(),
});

// Relations for Drizzle relational query API
export const stocksRelations = relations(stocks, ({ many }) => ({
  watchlistItems: many(watchlistItems),
  priceHistory: many(priceHistory),
  whyNowSignals: many(whyNowSignals),
  whyNowScores: many(whyNowScores),
}));

export const watchlistItemsRelations = relations(watchlistItems, ({ one, many }) => ({
  stock: one(stocks, { fields: [watchlistItems.stockId], references: [stocks.id] }),
  convictionScores: many(convictionScores),
  theses: many(theses),
  alerts: many(alerts),
  researchNotes: many(researchNotes),
  valuationScenarios: many(valuationScenarios),
}));

export const convictionScoresRelations = relations(convictionScores, ({ one }) => ({
  watchlistItem: one(watchlistItems, { fields: [convictionScores.watchlistItemId], references: [watchlistItems.id] }),
}));

export const thesesRelations = relations(theses, ({ one }) => ({
  watchlistItem: one(watchlistItems, { fields: [theses.watchlistItemId], references: [watchlistItems.id] }),
}));

export const priceHistoryRelations = relations(priceHistory, ({ one }) => ({
  stock: one(stocks, { fields: [priceHistory.stockId], references: [stocks.id] }),
}));

export const whyNowSignalsRelations = relations(whyNowSignals, ({ one }) => ({
  stock: one(stocks, { fields: [whyNowSignals.stockId], references: [stocks.id] }),
}));

export const alertsRelations = relations(alerts, ({ one }) => ({
  watchlistItem: one(watchlistItems, { fields: [alerts.watchlistItemId], references: [watchlistItems.id] }),
}));

export const researchNotesRelations = relations(researchNotes, ({ one }) => ({
  watchlistItem: one(watchlistItems, { fields: [researchNotes.watchlistItemId], references: [watchlistItems.id] }),
}));

export const whyNowScoresRelations = relations(whyNowScores, ({ one }) => ({
  stock: one(stocks, { fields: [whyNowScores.stockId], references: [stocks.id] }),
}));

export const valuationScenariosRelations = relations(valuationScenarios, ({ one }) => ({
  watchlistItem: one(watchlistItems, { fields: [valuationScenarios.watchlistItemId], references: [watchlistItems.id] }),
}));
