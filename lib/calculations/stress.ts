import type { FinancialPlan, StressTestInput, StressTestResult } from '../types';
import { generateLifetimeCashflow, findAssetExhaustionAge } from './cashflow';
import { CURRENT_YEAR } from '../utils';

function applyScenario(plan: FinancialPlan, modifyFn: (p: FinancialPlan) => FinancialPlan): FinancialPlan {
  return modifyFn(JSON.parse(JSON.stringify(plan)));
}

// Liquid assets = cash + investments (CPF OA from 55 and SRS from retirement age are
// already folded into investmentBalance by the engine once accessible)
function liquidAt(p: ReturnType<typeof generateLifetimeCashflow>[number]): number {
  return (p.cashBalance ?? 0) + (p.investmentBalance ?? 0);
}

function impactVsBase(
  basePlan: FinancialPlan,
  stressedProjections: ReturnType<typeof generateLifetimeCashflow>,
  atAge?: number
) {
  const baseProjections = generateLifetimeCashflow(basePlan);
  const age = atAge ?? basePlan.client.retirementAge;
  const baseL   = liquidAt(baseProjections.find((p) => p.age === age)   ?? baseProjections[baseProjections.length - 1]);
  const stressL = liquidAt(stressedProjections.find((p) => p.age === age) ?? stressedProjections[stressedProjections.length - 1]);
  const impact  = stressL - baseL;
  const pct     = baseL !== 0 ? (impact / Math.abs(baseL)) * 100 : 0;
  return { impact, pct };
}

// ─── Critical Illness ─────────────────────────────────────────────────────────

// ─── Liquid asset simulation (used for CI chart) ──────────────────────────────
// Tracks cash + investments + SRS + CPF OA/RA (from 55) year-by-year.
// ciOptions: if provided, applies the CI event at the given age.

interface CIOptions {
  ciAge: number;
  recoveryMonths: number;
  medicalCost: number;
  ciPayout: number;
}

function simulateLiquidAssets(
  plan: FinancialPlan,
  ci?: CIOptions
): { age: number; liquid: number }[] {
  const { client, income, expenses, assumptions, insurance, cpf, assets } = plan;
  const inflationRate  = (assumptions?.generalInflation ?? 2.5) / 100;
  const salaryGrowth   = (income.salaryGrowthRate ?? 3) / 100;
  const investRet      = (() => {
    const invs = assets.investments;
    const total = invs.reduce((s, i) => s + i.currentValue, 0);
    if (!total) return (assumptions?.investmentReturn ?? 5) / 100;
    return invs.reduce((s, i) => s + (i.currentValue / total) * i.annualReturn / 100, 0);
  })();

  // Starting balances
  let cash        = (assets.savingsAccounts ?? 0) + (assets.fixedDeposits ?? 0) + (assets.singaporeSavingsBonds ?? 0);
  let investments = assets.investments.reduce((s, i) => s + i.currentValue, 0);
  let srs         = assets.srsBalance ?? 0;
  let cpfOA       = cpf.oaBalance ?? 0;
  let cpfSA       = cpf.saBalance ?? 0;
  let cpfRA       = cpf.raBalance ?? 0;

  // Base monthly expenses (will be inflated each year)
  const baseMonthlyExpenses =
    expenses.food + expenses.utilities + expenses.healthcare + expenses.transport +
    expenses.mortgage + expenses.dining + expenses.travel + expenses.entertainment +
    expenses.hobbies + expenses.parentsAllowance + expenses.childrenExpenses +
    (expenses.otherDependants ?? 0) +
    insurance.policies.reduce((s, p) => s + (p.annualPremium ?? 0) / 12, 0);

  const returnToWorkAge = ci ? ci.ciAge + ci.recoveryMonths / 12 : Infinity;
  let ciApplied = false;
  const results: { age: number; liquid: number }[] = [];

  for (let age = client.age; age <= client.lifeExpectancy; age++) {
    const t = age - client.age;
    const isInRecovery = ci != null && age >= ci.ciAge && age < returnToWorkAge;
    const isRetired    = age >= client.retirementAge && !isInRecovery;

    // CPF rates by age band
    const empRate = age < 55 ? 0.20 : age < 60 ? 0.15 : age < 65 ? 0.095 : 0.07;
    const erRate  = age < 55 ? 0.17 : age < 60 ? 0.15 : age < 65 ? 0.115 : 0.09;
    const oaAlloc = age < 35 ? 0.23 : age < 45 ? 0.21 : age < 50 ? 0.19 : age < 55 ? 0.15 : 0.155;

    // Gross monthly salary at this age
    const grossMonthly = (!isRetired && !isInRecovery)
      ? income.monthlySalary * Math.pow(1 + salaryGrowth, t)
      : 0;

    // Monthly take-home after employee CPF
    const takeHome = grossMonthly * (1 - empRate);

    // Passive income (flows to cash regardless of CI status)
    const passiveMonthly = (income.rentalIncome ?? 0) + (income.dividendIncome ?? 0) +
      (age >= 55 && income.otherIncome ? income.otherIncome : 0);

    // Monthly expenses inflated to current age
    const monthlyExpenses = baseMonthlyExpenses * Math.pow(1 + inflationRate, t);

    // Net cash flow this year
    const netAnnual = (takeHome + passiveMonthly - monthlyExpenses) * 12;

    if (netAnnual >= 0) {
      cash        += netAnnual * 0.3;
      investments += netAnnual * 0.7;
    } else {
      const deficit = Math.abs(netAnnual);
      if (cash >= deficit) {
        cash -= deficit;
      } else {
        const fromInv = deficit - cash;
        cash = 0;
        investments = Math.max(0, investments - fromInv);
      }
    }

    // Investment growth
    investments = Math.max(0, investments * (1 + investRet));
    srs = Math.max(0, srs * (1 + investRet));

    // CPF contributions (employer + employee) allocated to OA
    if (!isRetired && !isInRecovery && grossMonthly > 0) {
      const totalCPF = grossMonthly * (empRate + erRate);
      cpfOA += totalCPF * oaAlloc * 12;
    }

    // CPF interest
    cpfOA = cpfOA * 1.025;
    cpfSA = cpfSA * 1.04;
    cpfRA = cpfRA * 1.04;

    // RA formation at 55
    if (age === 55 && cpfRA === 0) {
      const frs = 205800;
      const fromSA = Math.min(cpfSA, frs);
      cpfSA -= fromSA;
      cpfRA  = fromSA;
      if (cpfRA < frs) {
        const fromOA = Math.min(cpfOA, frs - cpfRA);
        cpfOA -= fromOA;
        cpfRA  += fromOA;
      }
      cpfOA += cpfSA; // SA closes
      cpfSA  = 0;
    }

    // CPF LIFE from 65
    if (age >= 65 && cpfRA > 0) {
      const lifeMonthly = cpfRA * 0.0099;
      cash  += lifeMonthly * 12;
      cpfRA  = Math.max(0, cpfRA - lifeMonthly * 12);
    }

    // Apply CI event: CI payout arrives, medical cost deducted
    if (ci && age === ci.ciAge && !ciApplied) {
      cash += ci.ciPayout;
      cash -= ci.medicalCost;
      cash  = Math.max(0, cash);
      ciApplied = true;
    }

    // Liquid assets this year
    const cpfLiquid = age >= 55 ? cpfOA + cpfRA : 0;
    results.push({ age, liquid: Math.max(0, cash + investments + srs + cpfLiquid) });
  }

  return results;
}

export function runCriticalIllnessScenario(plan: FinancialPlan, input: StressTestInput): StressTestResult {
  const recoveryMonths = input.criticalIllnessRecoveryMonths ?? 0;
  const ciAge          = input.criticalIllnessAge;
  const yearsToAge     = Math.max(0, ciAge - plan.client.age);
  const diagnosisYear  = CURRENT_YEAR + yearsToAge;
  const inflationRate  = plan.assumptions?.generalInflation ?? 2.5;

  // Insurance payout depends on type: early CI uses ECI sum assured, late CI uses CI sum assured
  const ciType = input.criticalIllnessType ?? 'late';
  const ciPayout = plan.insurance.policies
    .filter((p) => ['ci', 'eci', 'term', 'wholeLife'].includes(p.type))
    .reduce((s, p) => {
      if (ciType === 'early') {
        // Early CI: ECI policies + ECI riders on term/whole life
        return s + (p.eciSumAssured ?? 0) + (p.type === 'eci' ? (p.sumAssured ?? 0) : 0);
      } else {
        // Late CI: CI policies + CI riders on term/whole life
        return s + (p.ciSumAssured ?? 0) + (p.type === 'ci' ? (p.sumAssured ?? 0) : 0);
      }
    }, 0);

  const netMedicalCost = Math.max(0, input.criticalIllnessMedicalCost - ciPayout);

  // Key figures for the breakdown display
  const monthlyIncomeAtAge = plan.income.monthlySalary *
    Math.pow(1 + (plan.income.salaryGrowthRate ?? 3) / 100, yearsToAge);
  const currentMonthlyExpenses =
    plan.expenses.food + plan.expenses.utilities + plan.expenses.healthcare +
    plan.expenses.transport + plan.expenses.mortgage + plan.expenses.dining +
    plan.expenses.travel + plan.expenses.entertainment + plan.expenses.hobbies +
    plan.expenses.parentsAllowance + plan.expenses.childrenExpenses;
  const monthlyExpensesAtAge    = currentMonthlyExpenses * Math.pow(1 + inflationRate / 100, yearsToAge);
  const expensesDuringRecovery  = monthlyExpensesAtAge * recoveryMonths;
  const lostIncome              = monthlyIncomeAtAge * recoveryMonths;
  const erRate = ciAge < 55 ? 0.17 : ciAge < 60 ? 0.15 : ciAge < 65 ? 0.115 : 0.09;
  const missedCPF = Math.min(monthlyIncomeAtAge, 6800) * erRate * recoveryMonths;

  // ── Two-track simulation: base case vs CI scenario ───────────────────────────
  // Both use the same simplified liquid-asset engine for a fair apples-to-apples
  // comparison. Base = no event. CI = income stops during recovery, expenses
  // drain assets, CI payout + medical cost applied at diagnosis age.
  const baseSeries = simulateLiquidAssets(plan);
  const ciSeries   = simulateLiquidAssets(plan, {
    ciAge,
    recoveryMonths,
    medicalCost: netMedicalCost,
    ciPayout,
  });

  const chartData = baseSeries.map((b, i) => ({
    age:      b.age,
    baseCase: b.liquid,
    stressed: ciSeries[i]?.liquid ?? 0,
  }));

  // ── Exhaustion check via main cashflow engine ────────────────────────────────
  const modifiedPlan = applyScenario(plan, (p) => {
    if (netMedicalCost > 0) p.goals.push({ id: 'ci-med', name: 'CI Medical Cost', category: 'other', currentCost: netMedicalCost, targetYear: diagnosisYear, priority: 'high', inflationRate: 0, isFunded: false });
    if (expensesDuringRecovery > 0) p.goals.push({ id: 'ci-exp', name: 'CI Recovery Expenses', category: 'other', currentCost: expensesDuringRecovery, targetYear: diagnosisYear, priority: 'high', inflationRate: 0, isFunded: false });
    if (lostIncome > 0) p.goals.push({ id: 'ci-inc', name: 'CI Lost Income', category: 'other', currentCost: lostIncome, targetYear: diagnosisYear, priority: 'high', inflationRate: 0, isFunded: false });
    p.expenses.healthcare *= 1.5;
    return p;
  });
  const projections   = generateLifetimeCashflow(modifiedPlan);
  const exhaustionAge = findAssetExhaustionAge(projections);

  // Impact at retirement
  const retEntry = chartData.find((d) => d.age === plan.client.retirementAge) ?? chartData[chartData.length - 1];
  const impact   = (retEntry?.stressed ?? 0) - (retEntry?.baseCase ?? 0);
  const pct      = retEntry?.baseCase ? (impact / Math.abs(retEntry.baseCase)) * 100 : 0;

  return {
    scenarioName: ciType === 'early' ? 'Early Critical Illness (ECI)' : 'Late Critical Illness (CI)',
    assetExhaustionAge: exhaustionAge,
    retirementImpact: impact < 0
      ? `Liquid assets at retirement reduced by ${formatCurrencySimple(Math.abs(impact))}`
      : 'Retirement liquid assets unaffected',
    netWorthImpact:    impact,
    netWorthImpactPct: pct,
    projections,
    isViable:  exhaustionAge === null,
    eventAge:  ciAge,
    chartData,
    eventBreakdown: [
      { label: 'Medical cost (gross)',                                                              amount: input.criticalIllnessMedicalCost },
      { label: ciType === 'early' ? 'ECI insurance payout' : 'CI insurance payout',               amount: -ciPayout },
      { label: `Expenses during recovery (${recoveryMonths} mths × ${formatCurrencySimple(monthlyExpensesAtAge)}/mo)`, amount: expensesDuringRecovery },
      { label: `Lost salary income (${recoveryMonths} mths × ${formatCurrencySimple(monthlyIncomeAtAge)}/mo)`,         amount: lostIncome },
      { label: `Missed employer CPF (${(erRate * 100).toFixed(0)}%)`,                              amount: missedCPF },
    ],
  };
}

// ─── Permanent Disability ─────────────────────────────────────────────────────

export function runPermanentDisabilityScenario(plan: FinancialPlan, input: StressTestInput): StressTestResult {
  const disabilityMonthlyPayout = plan.insurance.policies
    .filter((p) => p.type === 'disabilityIncome')
    .reduce((s, p) => s + (p.monthlyBenefit ?? 0), 0);
  const careShieldMonthly = plan.insurance.hasCareShieldLife ? 600 : 0;

  const modifiedPlan = applyScenario(plan, (p) => {
    // From disability age onwards: no employment income, only insurance payouts
    p.income.monthlySalary = disabilityMonthlyPayout + careShieldMonthly;
    p.income.annualBonus = 0;
    p.income.variableComp = 0;
    p.income.businessIncome = 0;
    p.income.salaryGrowthRate = 0;
    // Healthcare costs double permanently
    p.expenses.healthcare *= 2;
    // Set retirement age = disability age so model treats all years post-disability as "retired"
    p.client.retirementAge = Math.max(input.disabilityAge, p.client.age);
    return p;
  });

  const projections = generateLifetimeCashflow(modifiedPlan);
  const exhaustionAge = findAssetExhaustionAge(projections);
  const baseProjections = generateLifetimeCashflow(plan);
  const baseEndL   = liquidAt(baseProjections[baseProjections.length - 1]);
  const stressEndL = liquidAt(projections[projections.length - 1]);
  const impact = stressEndL - baseEndL;
  const pct = baseEndL !== 0 ? (impact / Math.abs(baseEndL)) * 100 : 0;

  return {
    scenarioName: 'Permanent Disability',
    assetExhaustionAge: exhaustionAge,
    retirementImpact: exhaustionAge
      ? `Assets exhausted at age ${exhaustionAge} — disability payout + CPF insufficient`
      : `Assets survive to age 100 with ${disabilityMonthlyPayout > 0 ? formatCurrencySimple(disabilityMonthlyPayout) + '/mo disability payout' : 'no disability payout'}`,
    netWorthImpact: impact,
    netWorthImpactPct: pct,
    projections,
    isViable: exhaustionAge === null,
  };
}

// ─── Job Loss ─────────────────────────────────────────────────────────────────

export function runJobLossScenario(plan: FinancialPlan, input: StressTestInput): StressTestResult {
  const monthlyExpenses =
    plan.expenses.food + plan.expenses.utilities + plan.expenses.healthcare +
    plan.expenses.mortgage + plan.expenses.transport;
  const monthsCoverage = plan.assets.savingsAccounts / (monthlyExpenses || 1);
  const incomeLost = plan.income.monthlySalary * input.jobLossMonths;

  const modifiedPlan = applyScenario(plan, (p) => {
    // Deplete savings by income lost during unemployment (after any emergency fund buffer)
    p.assets.savingsAccounts = Math.max(0, p.assets.savingsAccounts - incomeLost);
    return p;
  });

  const projections = generateLifetimeCashflow(modifiedPlan);
  const exhaustionAge = findAssetExhaustionAge(projections);
  const { impact, pct } = impactVsBase(plan, projections);

  return {
    scenarioName: `Job Loss (${input.jobLossMonths} months)`,
    assetExhaustionAge: exhaustionAge,
    retirementImpact: `Emergency fund covers ${monthsCoverage.toFixed(1)} of ${input.jobLossMonths} months needed`,
    netWorthImpact: impact,
    netWorthImpactPct: pct,
    projections,
    isViable: monthsCoverage >= input.jobLossMonths,
  };
}

// ─── Bear Market ──────────────────────────────────────────────────────────────

export function runBearMarketScenario(plan: FinancialPlan, input: StressTestInput): StressTestResult {
  const lossPct = input.bearMarketLossPct;

  const modifiedPlan = applyScenario(plan, (p) => {
    // Immediate portfolio loss
    p.assets.investments = p.assets.investments.map((inv) => ({
      ...inv,
      currentValue: inv.currentValue * (1 - lossPct / 100),
    }));
    // Business valuation also hit
    p.assets.businessValuation *= (1 - (lossPct / 100) * 0.5);
    // Reduce the assumed investment return for the duration of the downturn
    // by lowering the base return rate proportionally
    const durationFactor = Math.min(input.bearMarketDurationYears / 10, 0.5);
    p.assumptions.investmentReturn = Math.max(0, p.assumptions.investmentReturn * (1 - durationFactor));
    return p;
  });

  const projections = generateLifetimeCashflow(modifiedPlan);
  const exhaustionAge = findAssetExhaustionAge(projections);
  const baseProjections = generateLifetimeCashflow(plan);
  const baseL   = liquidAt(baseProjections[0]);
  const stressL = liquidAt(projections[0]);
  const impact  = stressL - baseL;
  const pct     = baseL !== 0 ? (impact / Math.abs(baseL)) * 100 : 0;

  return {
    scenarioName: `Bear Market (−${lossPct}%)`,
    assetExhaustionAge: exhaustionAge,
    retirementImpact: `Immediate portfolio loss of ${formatCurrencySimple(Math.abs(impact))} over ${input.bearMarketDurationYears} year${input.bearMarketDurationYears !== 1 ? 's' : ''}`,
    netWorthImpact: impact,
    netWorthImpactPct: pct,
    projections,
    isViable: exhaustionAge === null,
  };
}

// ─── Inflation Shock ──────────────────────────────────────────────────────────

export function runInflationScenario(plan: FinancialPlan, input: StressTestInput): StressTestResult {
  const modifiedPlan = applyScenario(plan, (p) => {
    p.assumptions.generalInflation = input.inflationRate;
    p.assumptions.healthcareInflation = input.inflationRate + 2;
    return p;
  });

  const projections = generateLifetimeCashflow(modifiedPlan);
  const exhaustionAge = findAssetExhaustionAge(projections);
  const baseProjections = generateLifetimeCashflow(plan);
  const baseEndL   = liquidAt(baseProjections[baseProjections.length - 1]);
  const stressEndL = liquidAt(projections[projections.length - 1]);
  const impact = stressEndL - baseEndL;
  const pct = baseEndL !== 0 ? (impact / Math.abs(baseEndL)) * 100 : 0;

  return {
    scenarioName: `Inflation Shock (${input.inflationRate}%)`,
    assetExhaustionAge: exhaustionAge,
    retirementImpact: exhaustionAge
      ? `Assets exhausted at age ${exhaustionAge} under ${input.inflationRate}% inflation`
      : `Plan survives — surplus reduced by ${Math.abs(pct).toFixed(1)}%`,
    netWorthImpact: impact,
    netWorthImpactPct: pct,
    projections,
    isViable: exhaustionAge === null,
  };
}

// ─── Run all ──────────────────────────────────────────────────────────────────

export function runAllStressTests(plan: FinancialPlan, input: StressTestInput): Record<string, StressTestResult> {
  return {
    criticalIllness:    runCriticalIllnessScenario(plan, input),
    permanentDisability:runPermanentDisabilityScenario(plan, input),
    jobLoss:            runJobLossScenario(plan, input),
    bearMarket:         runBearMarketScenario(plan, input),
    inflation:          runInflationScenario(plan, input),
  };
}

function formatCurrencySimple(v: number): string {
  return `S$${Math.round(v).toLocaleString('en-SG')}`;
}
