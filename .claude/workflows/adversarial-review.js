export const meta = {
  name: 'adversarial-review',
  description: 'Adversarial multi-agent review of the Conviction app across 8 dimensions with judge synthesis',
  phases: [
    { title: 'Scout', detail: 'Map the codebase structure' },
    { title: 'Review', detail: 'Parallel adversarial reviewers across 8 dimensions' },
    { title: 'Verify', detail: 'Independent skeptics challenge each finding' },
    { title: 'Judge', detail: 'Senior judge panel synthesizes and prioritizes' },
  ],
};

const FINDINGS_SCHEMA = {
  type: 'object',
  properties: {
    findings: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id:       { type: 'string' },
          severity: { type: 'string', enum: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] },
          title:    { type: 'string' },
          file:     { type: 'string' },
          line:     { type: 'string' },
          detail:   { type: 'string' },
          fix:      { type: 'string' },
        },
        required: ['id', 'severity', 'title', 'file', 'detail', 'fix'],
      },
    },
  },
  required: ['findings'],
};

const VERDICT_SCHEMA = {
  type: 'object',
  properties: {
    findingId:    { type: 'string' },
    real:         { type: 'boolean' },
    severity:     { type: 'string', enum: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] },
    verdict:      { type: 'string' },
    counterpoint: { type: 'string' },
  },
  required: ['findingId', 'real', 'severity', 'verdict'],
};

const SYNTHESIS_SCHEMA = {
  type: 'object',
  properties: {
    executiveSummary: { type: 'string' },
    overallGrade: { type: 'string', enum: ['A', 'B', 'C', 'D', 'F'] },
    criticalItems: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title:  { type: 'string' },
          file:   { type: 'string' },
          impact: { type: 'string' },
          fix:    { type: 'string' },
        },
        required: ['title', 'file', 'impact', 'fix'],
      },
    },
    dimensionGrades: {
      type: 'object',
      additionalProperties: { type: 'string' },
    },
    topRecommendations: {
      type: 'array',
      items: { type: 'string' },
    },
    whatWorksWell: {
      type: 'array',
      items: { type: 'string' },
    },
  },
  required: ['executiveSummary', 'overallGrade', 'criticalItems', 'dimensionGrades', 'topRecommendations', 'whatWorksWell'],
};

// Phase 1: Scout
phase('Scout');
const codeMap = await agent(
  'Map the entire Conviction stock research app at /home/valentina/stock-conviction-app. ' +
  'Read every file in src/ (lib/, app/api/, app/, components/, db/). ' +
  'Also read CLAUDE.md (if exists), docs/PRD.md, and the BPMN files in docs/bpmn/. ' +
  'Return a structured inventory: all source files with purpose, all API routes, all DB tables and relationships, all lib modules, all React components, key architectural decisions. ' +
  'Be exhaustive — this map is used by 8 parallel reviewers.',
  { label: 'scout:map', effort: 'high' }
);

log('Codebase mapped. Starting 8 parallel adversarial reviewers...');

// Phase 2: 8 parallel adversarial reviewers
phase('Review');

const accuracyPrompt =
  'You are a hostile, sceptical senior quant engineer doing an adversarial review of a stock research app. ' +
  'Your job is to find EVERY factually incorrect calculation, wrong formula, or logically broken algorithm. ' +
  'Be scathing. Assume the developer made mistakes. ' +
  'Codebase context: ' + codeMap + ' ' +
  'Focus on: ' +
  '1. DCF formula in src/lib/valuation-calc.ts — is the projection math correct? Is terminal value computed right? Is equity value bridge (EV - netDebt) correct? ' +
  '2. Conviction scoring in src/lib/conviction-scorer.ts — are the 5 components each 0-20? Does total sum to 0-100? Are band thresholds WATCH/RESEARCH/BUILDING/HIGH/CONVICTION correct? ' +
  '3. Why Now engine in src/lib/why-now-engine.ts — do the 7 signal weights sum to 1.0? Is Hot Window threshold >= 70 correctly applied? Is the weighted sum formula correct? ' +
  '4. Margin of safety calculation — is it ((implied - current) / current) * 100 or wrong convention? ' +
  '5. P/E and EV/EBITDA valuation methods — are formulas correct? ' +
  '6. Alert delta threshold logic in src/lib/alert-engine.ts — are the conditions right? ' +
  '7. Technical breakout signal — is volume surge detection correct? MA calculations? ' +
  '8. Off-by-one errors, wrong date arithmetic, incorrect percentage conversions (e.g. debtToEquity is percentage not ratio). ' +
  'Read the actual source files at /home/valentina/stock-conviction-app/src/lib/ before reporting. ' +
  'Report every finding. Be merciless.';

const completenessPrompt =
  'You are a hostile QA engineer doing an adversarial review of a stock research app. ' +
  'Your job is to find EVERY missing edge case, unhandled null, incomplete implementation, and silent failure. ' +
  'Codebase context: ' + codeMap + ' ' +
  'Focus on: ' +
  '1. Every Yahoo Finance API call — what happens when the API returns null/undefined for a field? Silent 0s masquerading as real data? ' +
  '2. What happens when a stock has no price history (newly listed)? ' +
  '3. What happens when freeCashFlow is null in the DCF? Does buildDefaultScenarios handle this? ' +
  '4. What happens when sharesOutstanding is 0 or null? Division by zero risk. ' +
  '5. The conviction scorer whyNow component — does it duplicate logic already in the Why Now engine? ' +
  '6. Alert deduplication — what if checkConvictionAlerts is called but there are no prior scores? Does the length < 2 guard work? ' +
  '7. Thesis score — what if keyAssumptions is invalid JSON? Is scoring 0 correct? ' +
  '8. Valuation panel — what if discountRate <= terminalGrowthRate in DCF? Is the guard correct? ' +
  '9. Peer comparison loads peers from localStorage — what if the stored ticker is delisted? ' +
  '10. State machine transitions — are all 7 states fully covered? What about transitions TO exited? ' +
  '11. Missing loading/error states in any component. ' +
  'Read source files at /home/valentina/stock-conviction-app/src/ before reporting.';

const architecturePrompt =
  'You are a hostile staff engineer doing an adversarial architectural review of a stock research app. ' +
  'Your job is to find EVERY architectural flaw, design smell, leaky abstraction, and structural problem. ' +
  'Codebase context: ' + codeMap + ' ' +
  'Focus on: ' +
  '1. Client/server boundary violations — are any server-only modules (yahoo-finance2, drizzle, better-sqlite3) imported into client components? Check every use-client file. ' +
  '2. The valuation-calc.ts / valuation-engine.ts split — is the abstraction clean? Any server code leaking into valuation-calc.ts? ' +
  '3. The Why Now engine duplicates some logic from the conviction scorer whyNow component. Is this intentional? What is the source of truth? ' +
  '4. The alert engine uses fire-and-forget (.catch). Can alerts be silently lost? ' +
  '5. The Drizzle singleton pattern — is the hot-reload guard correct for Next.js 14? What happens in production? ' +
  '6. API route organisation — are there routes that do too much (mixing concerns)? ' +
  '7. The db.query.* relational API — are all relations correctly declared? Missing with: clauses causing N+1 queries? ' +
  '8. Schema design — tables that should be normalised but are not? JSON columns that should be relational? ' +
  '9. Does the app have any global error boundary? What happens when a server component throws? ' +
  '10. Is there any circular dependency risk between lib modules? ' +
  'Read source files at /home/valentina/stock-conviction-app/src/ before reporting.';

const engineeringPrompt =
  'You are a hostile principal engineer doing an adversarial code quality review of a stock research app. ' +
  'Your job is to find EVERY TypeScript safety issue, error handling gap, code smell, and quality failure. ' +
  'Codebase context: ' + codeMap + ' ' +
  'Focus on: ' +
  '1. TypeScript safety — find every as-unknown-as-X, as-any, or unsafe cast. Are they justified? ' +
  '2. Error handling — find every place where errors are swallowed silently (.catch(() => {})). What data loss could this cause? ' +
  '3. The YFClass require() pattern — used in 3+ files with slightly different type declarations. Is this consistent? ' +
  '4. Zod validation — are all API route inputs validated? Any routes that accept raw JSON without zod? ' +
  '5. The conviction scorer returns score: 10 as a fallback. Is 10/20 the right default or should it be 0? ' +
  '6. The why-now-engine has 500+ lines with 7 signal functions. Should this be split? ' +
  '7. React hooks dependency array issues (useEffect, useCallback, useMemo)? ' +
  '8. Inconsistent null handling — some places use ?? null, others use || null, others use undefined. ' +
  '9. The ThesisEditor saves full thesis as new version every time. Any deduplication or diff check? ' +
  '10. Date handling — are timestamps consistently stored as Date objects or ms integers in SQLite? ' +
  '11. Components that could cause infinite re-render loops? ' +
  'Read source files at /home/valentina/stock-conviction-app/src/ before reporting.';

const bpmnPrompt =
  'You are a hostile enterprise architect doing an adversarial review of BPMN-to-implementation alignment for a stock research app. ' +
  'Your job is to find EVERY deviation between the 9 BPMN process diagrams and what was actually built. ' +
  'The BPMN is the spec. Deviations are bugs. ' +
  'Codebase context: ' + codeMap + ' ' +
  'Read ALL 9 BPMN files at /home/valentina/stock-conviction-app/docs/bpmn/ AND the relevant source files. ' +
  'Check each BPMN against the implementation: ' +
  '1. BPMN 01 (System Overview) — Does the overall flow match the actual app architecture? ' +
  '2. BPMN 02 (Stock Discovery) — Does the search/add flow match the API routes and WatchlistTable component? ' +
  '3. BPMN 03 (Why Now Engine) — Are the 7 signals exactly as specified? Are weights exactly as specified? Is Hot Window threshold correct? ' +
  '4. BPMN 04 (Conviction Scoring) — Are the 5 components correct? Are band thresholds correct? Does scoring happen at the right trigger points? ' +
  '5. BPMN 05 (Thesis Drift Tracking) — Does the versioning work as specified? Are all drift states implemented? ' +
  '6. BPMN 06 (Watchlist States) — Are all 7 states implemented? Are all valid transitions correct? Are invalid transitions rejected? ' +
  '7. BPMN 07 (AI Copilot) — This sprint was skipped. Document what is missing vs the spec. ' +
  '8. BPMN 08 (Valuation Scenarios) — Are all 3 valuation methods implemented? Are 3 scenarios (bear/base/bull) implemented? ' +
  '9. BPMN 09 (Alerts) — Are all alert types implemented? Is the alert lifecycle (ACTIVE/FIRED/SNOOZED/DISMISSED) correctly implemented? ' +
  'For each deviation: state the BPMN element, what the spec says, what the code does, severity.';

const safetyPrompt =
  'You are a hostile security engineer doing an adversarial safety review of a stock research app. ' +
  'Your job is to find EVERY safety issue, injection risk, data corruption vector, and defensive gap. ' +
  'Codebase context: ' + codeMap + ' ' +
  'Focus on: ' +
  '1. SQL injection — Drizzle uses parameterised queries but check for any raw SQL or dynamic query construction. ' +
  '2. Input validation — every POST/PATCH API route: is the body validated with zod before touching the DB? ' +
  '3. Number injection — can a user send Infinity, NaN, or extremely large numbers that break the DCF? ' +
  '4. The state machine — what happens if a PATCH request sends an invalid state? Is the error message revealing? ' +
  '5. The alerts PATCH endpoint — can an alert for watchlist item A be dismissed using item B ID? IDOR risk. ' +
  '6. The thesis PATCH endpoint — same IDOR check. ' +
  '7. The valuation scenarios POST — can a user send negative sharesOutstanding to cause division by zero? ' +
  '8. Error messages — do any API routes leak stack traces or internal details to the client? ' +
  '9. The conviction.db SQLite file — is it gitignored? Check .gitignore. ' +
  '10. Environment variables — are there any hardcoded credentials or API keys in source files? ' +
  '11. The Yahoo Finance API calls are unauthenticated — what happens if rate-limited or blocked? ' +
  '12. Are Next.js headers (CORS, CSP, etc.) configured anywhere? ' +
  'Read source files at /home/valentina/stock-conviction-app/src/ and .gitignore before reporting.';

const performancePrompt =
  'You are a hostile performance engineer doing an adversarial review of a stock research app. ' +
  'Your job is to find EVERY performance problem, N+1 query, blocking operation, and scalability concern. ' +
  'Codebase context: ' + codeMap + ' ' +
  'Focus on: ' +
  '1. The stock detail page server component — how many DB queries? How many Yahoo Finance API calls? Are they parallelised? ' +
  '2. The Why Now engine — 7 signals run in parallel but each signal makes 1-3 Yahoo Finance API calls (up to 21 calls). What is the latency impact? ' +
  '3. N+1 queries — does the watchlist GET endpoint load stocks and conviction scores efficiently? ' +
  '4. The conviction scorer makes 3 separate Yahoo Finance API calls. Can these be batched? ' +
  '5. The dev server singleton — is it safe under concurrent requests? SQLite is not concurrent-write safe. ' +
  '6. The score history table on stock detail — does it fetch ALL score history? Is there pagination? ' +
  '7. The alerts query on global /api/alerts endpoint — does it join properly? Is there an index on alerts.status? ' +
  '8. Price history is fetched fresh on every chart render. Is there any caching? ' +
  '9. The PeerComparison fetches each peer ticker serially or in parallel? ' +
  '10. Are there any Drizzle queries missing .limit() that could return unbounded result sets? ' +
  'Read source files at /home/valentina/stock-conviction-app/src/ before reporting.';

const uxPrompt =
  'You are a hostile product designer and UX engineer doing an adversarial review of a stock research app. ' +
  'Your job is to find EVERY broken user flow, missing state, confusing interaction, and UX failure. ' +
  'The user is a solo investor who wants a frictionless research workflow. ' +
  'Codebase context: ' + codeMap + ' ' +
  'Focus on: ' +
  '1. The main pipeline page — when there are no stocks, what does the user see? Is there an onboarding empty state? ' +
  '2. The stock detail page order — does Alerts, Score, Why Now, Price Chart, Valuation, Peers, Thesis, Score History make sense? ' +
  '3. The conviction score Calculate Score button takes 5-10 seconds. Is there any indication of what is happening? ' +
  '4. The Why Now panel — same loading concern. Any feedback? ' +
  '5. The valuation panel — it loads financial data on mount. Skeleton or just spinner? What if data fails? ' +
  '6. The thesis editor — if you click Edit/New Version and cancel, is state correctly reset? Stale form data risk? ' +
  '7. The AlertsPanel only appears if alerts.length > 0. Does the user know they need to run a score to generate alerts? ' +
  '8. The PeerComparison best/worst highlighting — if only 1 row, does it highlight itself green everywhere? Misleading? ' +
  '9. The drift status quick-toggle on the thesis — is it clear that clicking changes it immediately without confirm? ' +
  '10. The score history table only shows if scoreHistory.length > 1. So the first score is never shown. Is this intentional? ' +
  '11. Navigation — is there a way to get back to the pipeline from the stock detail page? Check header breadcrumb. ' +
  '12. Mobile — the 3-column valuation scenarios grid and peer comparison table. Do they work on small screens? ' +
  'Read source files at /home/valentina/stock-conviction-app/src/ before reporting.';

const DIMENSIONS = [
  { key: 'accuracy',     label: 'Accuracy & Correctness',          prompt: accuracyPrompt },
  { key: 'completeness', label: 'Completeness & Edge Cases',        prompt: completenessPrompt },
  { key: 'architecture', label: 'Architecture & Design',            prompt: architecturePrompt },
  { key: 'engineering',  label: 'Engineering Excellence',           prompt: engineeringPrompt },
  { key: 'bpmn',         label: 'Architectural Rigour & BPMN',      prompt: bpmnPrompt },
  { key: 'safety',       label: 'Safety & Defensiveness',           prompt: safetyPrompt },
  { key: 'performance',  label: 'Performance & Scalability',        prompt: performancePrompt },
  { key: 'ux',           label: 'UX & Completeness of Experience',  prompt: uxPrompt },
];

const allReviews = await parallel(
  DIMENSIONS.map(function(d) {
    return function() {
      return agent(d.prompt, {
        label: 'review:' + d.key,
        phase: 'Review',
        schema: FINDINGS_SCHEMA,
        effort: 'high',
      }).then(function(r) {
        return { dimension: d.key, label: d.label, findings: (r && r.findings) ? r.findings : [] };
      });
    };
  })
);

const validReviews = allReviews.filter(Boolean);
const totalRaw = validReviews.reduce(function(s, r) { return s + r.findings.length; }, 0);
log('Reviews complete. ' + totalRaw + ' raw findings across ' + validReviews.length + ' dimensions.');

const allFindings = validReviews.reduce(function(acc, r) {
  return acc.concat(r.findings.map(function(f) {
    return Object.assign({}, f, { dimension: r.dimension, dimensionLabel: r.label });
  }));
}, []);

// Phase 3: Adversarial verify
phase('Verify');
log('Verifying ' + allFindings.length + ' findings with adversarial skeptics...');

const verified = await pipeline(
  allFindings,
  function(finding) {
    var verifyPrompt =
      'You are a skeptical senior engineer. A reviewer made the following finding about the Conviction stock research app at /home/valentina/stock-conviction-app. ' +
      'Your job is to CHALLENGE it. Try hard to refute it. Read the actual source file before deciding. ' +
      'Finding ID: ' + finding.id + ' ' +
      'Severity: ' + finding.severity + ' ' +
      'Title: ' + finding.title + ' ' +
      'File: ' + finding.file + ' ' +
      'Detail: ' + finding.detail + ' ' +
      'Proposed fix: ' + finding.fix + ' ' +
      'Read the relevant source file(s) at /home/valentina/stock-conviction-app. Then decide: ' +
      'Is this finding REAL and the severity correct? Is it a false positive or based on a misreading? ' +
      'Is the severity overstated or understated? Is the fix correct? ' +
      'Be honest. If it is a real issue, confirm it. If it is wrong, refute it with evidence.';
    return agent(verifyPrompt, {
      label: 'verify:' + finding.id,
      phase: 'Verify',
      schema: VERDICT_SCHEMA,
    }).then(function(v) {
      return { finding: finding, verdict: v };
    });
  }
);

const confirmed = verified
  .filter(Boolean)
  .filter(function(v) { return v.verdict && v.verdict.real === true; });

log('Verification complete. ' + confirmed.length + '/' + allFindings.length + ' findings confirmed as real.');

const confirmedByDimension = validReviews.map(function(r) {
  return {
    dimension: r.dimension,
    label: r.label,
    confirmed: confirmed
      .filter(function(v) { return v.finding.dimension === r.dimension; })
      .map(function(v) {
        return Object.assign({}, v.finding, {
          verifiedSeverity: (v.verdict && v.verdict.severity) ? v.verdict.severity : v.finding.severity,
          verdict: v.verdict ? v.verdict.verdict : null,
        });
      }),
  };
});

// Phase 4: Judge panel
phase('Judge');
log('Convening judge panel for final synthesis...');

var confirmedJson = JSON.stringify(confirmedByDimension, null, 2);

var judgeCTOPrompt =
  'You are a hard-nosed CTO conducting a final review of an adversarial audit of the Conviction stock research app. ' +
  'You have received confirmed findings from 8 review dimensions. Synthesise them into a definitive verdict. ' +
  'Confirmed findings by dimension: ' + confirmedJson + ' ' +
  'Produce: ' +
  '1. An executive summary (3-5 sentences, honest and direct) ' +
  '2. An overall grade A-F ' +
  '3. The top CRITICAL items that must be fixed before anyone relies on this app for real money ' +
  '4. A grade per dimension (A-F) ' +
  '5. Top 5 actionable recommendations in priority order ' +
  '6. What genuinely works well — be fair, do not trash things that are done right ' +
  'Be honest. This is a personal finance tool. Accuracy matters.';

var judgeQuantPrompt =
  'You are a senior quant who has just reviewed the adversarial audit of the Conviction stock research app. ' +
  'You care most about financial accuracy and whether you would trust this tool with real investment decisions. ' +
  'Confirmed findings by dimension: ' + confirmedJson + ' ' +
  'Produce: ' +
  '1. An executive summary focused on financial reliability (3-5 sentences) ' +
  '2. An overall grade A-F from a financial accuracy standpoint ' +
  '3. The critical items that could lead to materially wrong investment decisions ' +
  '4. A grade per dimension (A-F) ' +
  '5. Top 5 recommendations for making this trustworthy as a research tool ' +
  '6. What works well from a quant perspective ' +
  'Be direct. Would you use this tool? Why or why not?';

var judgeResults = await parallel([
  function() {
    return agent(judgeCTOPrompt, { label: 'judge:cto', phase: 'Judge', schema: SYNTHESIS_SCHEMA, effort: 'high' });
  },
  function() {
    return agent(judgeQuantPrompt, { label: 'judge:quant', phase: 'Judge', schema: SYNTHESIS_SCHEMA, effort: 'high' });
  },
]);

return {
  summary: {
    totalFindings: allFindings.length,
    confirmedFindings: confirmed.length,
    byDimension: confirmedByDimension.map(function(d) {
      return {
        dimension: d.label,
        count: d.confirmed.length,
        critical: d.confirmed.filter(function(f) { return f.verifiedSeverity === 'CRITICAL'; }).length,
        high: d.confirmed.filter(function(f) { return f.verifiedSeverity === 'HIGH'; }).length,
      };
    }),
  },
  confirmedFindings: confirmed.map(function(v) {
    return {
      id: v.finding.id,
      dimension: v.finding.dimensionLabel,
      severity: (v.verdict && v.verdict.severity) ? v.verdict.severity : v.finding.severity,
      title: v.finding.title,
      file: v.finding.file,
      detail: v.finding.detail,
      fix: v.finding.fix,
    };
  }),
  judgeCTO:   judgeResults[0],
  judgeQuant: judgeResults[1],
};
