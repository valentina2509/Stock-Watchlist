// Pure calculation functions — safe to import in client components (no Node.js deps)

export type ValuationMethod = "DCF" | "PE_MULTIPLE" | "EV_EBITDA";

export interface DCFAssumptions {
  baseFCF: number;
  revenueGrowthRate: number;
  fcfMargin: number;
  discountRate: number;
  terminalGrowthRate: number;
  projectionYears: number;
  sharesOutstanding: number;
  netDebt: number;
}

export interface PEAssumptions {
  forwardEPS: number;
  targetPE: number;
}

export interface EVEBITDAAssumptions {
  ebitda: number;
  targetMultiple: number;
  netDebt: number;
  sharesOutstanding: number;
}

export type Assumptions = DCFAssumptions | PEAssumptions | EVEBITDAAssumptions;

export interface ScenarioSet {
  bear: Assumptions;
  base: Assumptions;
  bull: Assumptions;
}

export interface ValuationResult {
  impliedPrice: number;
  marginOfSafety: number;
}

export interface ValuationPrefill {
  currentPrice: number;
  freeCashFlow: number | null;
  sharesOutstanding: number | null;
  netDebt: number | null;
  revenueGrowth: number | null;
  forwardEPS: number | null;
  trailingEPS: number | null;
  forwardPE: number | null;
  trailingPE: number | null;
  ebitda: number | null;
  enterpriseToEbitda: number | null;
}

export function calcDCF(a: DCFAssumptions, currentPrice: number): ValuationResult {
  const { baseFCF, revenueGrowthRate, discountRate, terminalGrowthRate, projectionYears, sharesOutstanding, netDebt } = a;
  if (sharesOutstanding <= 0 || discountRate <= terminalGrowthRate) return { impliedPrice: 0, marginOfSafety: -100 };
  let pv = 0;
  let fcf = baseFCF;
  for (let t = 1; t <= projectionYears; t++) {
    fcf = fcf * (1 + revenueGrowthRate);
    pv += fcf / Math.pow(1 + discountRate, t);
  }
  const terminalValue = fcf * (1 + terminalGrowthRate) / (discountRate - terminalGrowthRate);
  pv += terminalValue / Math.pow(1 + discountRate, projectionYears);
  const equityValue = pv - netDebt;
  const impliedPrice = Math.max(0, equityValue / sharesOutstanding);
  const marginOfSafety = currentPrice > 0 ? ((impliedPrice - currentPrice) / currentPrice) * 100 : 0;
  return { impliedPrice: round2(impliedPrice), marginOfSafety: round1(marginOfSafety) };
}

export function calcPE(a: PEAssumptions, currentPrice: number): ValuationResult {
  const impliedPrice = Math.max(0, a.forwardEPS * a.targetPE);
  const marginOfSafety = currentPrice > 0 ? ((impliedPrice - currentPrice) / currentPrice) * 100 : 0;
  return { impliedPrice: round2(impliedPrice), marginOfSafety: round1(marginOfSafety) };
}

export function calcEVEBITDA(a: EVEBITDAAssumptions, currentPrice: number): ValuationResult {
  const { ebitda, targetMultiple, netDebt, sharesOutstanding } = a;
  if (sharesOutstanding <= 0) return { impliedPrice: 0, marginOfSafety: -100 };
  const equityValue = Math.max(0, ebitda * targetMultiple - netDebt);
  const impliedPrice = equityValue / sharesOutstanding;
  const marginOfSafety = currentPrice > 0 ? ((impliedPrice - currentPrice) / currentPrice) * 100 : 0;
  return { impliedPrice: round2(impliedPrice), marginOfSafety: round1(marginOfSafety) };
}

export function calculate(method: ValuationMethod, assumptions: Assumptions, currentPrice: number): ValuationResult {
  if (method === "DCF")         return calcDCF(assumptions as DCFAssumptions, currentPrice);
  if (method === "PE_MULTIPLE") return calcPE(assumptions as PEAssumptions, currentPrice);
  return calcEVEBITDA(assumptions as EVEBITDAAssumptions, currentPrice);
}

export function buildDefaultScenarios(method: ValuationMethod, prefill: ValuationPrefill): ScenarioSet {
  if (method === "DCF") {
    const baseGrowth = prefill.revenueGrowth ?? 0.10;
    const base: DCFAssumptions = {
      baseFCF:            prefill.freeCashFlow ?? 1_000_000_000,
      revenueGrowthRate:  baseGrowth,
      fcfMargin:          0.20,
      discountRate:       0.10,
      terminalGrowthRate: 0.03,
      projectionYears:    10,
      sharesOutstanding:  prefill.sharesOutstanding ?? 1_000_000_000,
      netDebt:            prefill.netDebt ?? 0,
    };
    return {
      bear: { ...base, revenueGrowthRate: Math.max(0, baseGrowth - 0.10), discountRate: 0.12 },
      base,
      bull: { ...base, revenueGrowthRate: baseGrowth + 0.10, discountRate: 0.09 },
    };
  }

  if (method === "PE_MULTIPLE") {
    const baseEPS = prefill.forwardEPS ?? prefill.trailingEPS ?? 1;
    const basePE  = prefill.forwardPE  ?? prefill.trailingPE  ?? 20;
    return {
      bear: { forwardEPS: baseEPS * 0.85, targetPE: basePE * 0.75 },
      base: { forwardEPS: baseEPS,         targetPE: basePE },
      bull: { forwardEPS: baseEPS * 1.15,  targetPE: basePE * 1.25 },
    };
  }

  // EV/EBITDA
  const baseEBITDA   = prefill.ebitda ?? 1_000_000_000;
  const baseMultiple = prefill.enterpriseToEbitda ?? 15;
  const shares = prefill.sharesOutstanding ?? 1_000_000_000;
  const debt   = prefill.netDebt ?? 0;
  return {
    bear: { ebitda: baseEBITDA * 0.85, targetMultiple: baseMultiple * 0.75, netDebt: debt, sharesOutstanding: shares },
    base: { ebitda: baseEBITDA,         targetMultiple: baseMultiple,        netDebt: debt, sharesOutstanding: shares },
    bull: { ebitda: baseEBITDA * 1.15,  targetMultiple: baseMultiple * 1.25, netDebt: debt, sharesOutstanding: shares },
  };
}

function round2(n: number) { return Math.round(n * 100) / 100; }
function round1(n: number) { return Math.round(n * 10) / 10; }
