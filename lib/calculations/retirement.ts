import type { FinancialPlan, RetirementAnalysis, YearlyProjection } from '../types';
import { findAssetExhaustionAge } from './cashflow';
import { estimateCpfLifePayout } from './cpf';
import { inflateValue } from '../utils';

export function calculateRetirementAnalysis(
  plan: FinancialPlan,
  projections: YearlyProjection[]
): RetirementAnalysis {
  const { client, income, assumptions, retirementGoals } = plan;
  const retirementAge   = client.retirementAge;
  const yearsToRetirement = Math.max(0, retirementAge - client.age);

  // ── Inflate user's stated targets to retirement-year dollars ───────────────
  const monthlyExpenseTarget = inflateValue(
    retirementGoals.monthlyExpenses,
    assumptions.generalInflation,
    yearsToRetirement
  );
  const monthlyPassiveIncomeTarget = inflateValue(
    retirementGoals.monthlyPassiveIncomeTarget,
    assumptions.generalInflation,
    yearsToRetirement
  );

  // ── Projected income sources at retirement ─────────────────────────────────
  const retirementProjection = projections.find((p) => p.age === retirementAge);
  const proj65               = projections.find((p) => p.age === 65);

  // CPF LIFE — available from 65 only
  const raAt65         = proj65?.cpfRA ?? 0;
  const cpfLifeMonthly = retirementAge >= 65
    ? estimateCpfLifePayout(raAt65, client.gender)
    : estimateCpfLifePayout(
        // project RA from retirement to 65 with 4% interest if retiring before 65
        raAt65 * Math.pow(1.04, Math.max(0, 65 - retirementAge)),
        client.gender
      );

  // Rental income (inflated to retirement)
  const rentalMonthly = inflateValue(
    income.rentalIncome,
    assumptions.propertyGrowthRate,
    yearsToRetirement
  );

  // Dividends (nominal — assumed to grow with portfolio)
  const dividendMonthly = income.dividendIncome;

  // Other passive income specified
  const otherPassiveMonthly = income.retirementPassiveIncome;

  // Portfolio withdrawal — safe withdrawal rate applied to investable assets at retirement
  const investableAtRetirement =
    (retirementProjection?.cashBalance       ?? 0) +
    (retirementProjection?.investmentBalance ?? 0) +
    (retirementProjection?.srsBalance        ?? 0);

  const swr = retirementGoals.safeWithdrawalRate / 100;
  const portfolioWithdrawalMonthly = (investableAtRetirement * swr) / 12;

  const totalProjectedPassiveIncome =
    cpfLifeMonthly +
    rentalMonthly +
    dividendMonthly +
    portfolioWithdrawalMonthly +
    otherPassiveMonthly;

  // ── Gap ────────────────────────────────────────────────────────────────────
  const passiveIncomeGap = Math.max(0, monthlyPassiveIncomeTarget - totalProjectedPassiveIncome);

  // ── Portfolio corpus needed to fund the gap via SWR ───────────────────────
  // Additional corpus needed on top of current portfolio to close the monthly gap
  const additionalCorpusNeeded = (passiveIncomeGap > 0 && swr > 0) ? (passiveIncomeGap * 12) / swr : 0;
  const corpusRequired  = swr > 0 ? (monthlyPassiveIncomeTarget * 12) / swr : 0;
  const corpusProjected = investableAtRetirement;

  // ── Sustainability ─────────────────────────────────────────────────────────
  const exhaustionAge   = findAssetExhaustionAge(projections);
  const lastProjection  = projections[projections.length - 1];
  const surplusAtAge100 = Math.max(0,
    (lastProjection?.cashBalance ?? 0) +
    (lastProjection?.investmentBalance ?? 0) +
    (lastProjection?.srsBalance ?? 0)
  );

  let fundingStatus: RetirementAnalysis['fundingStatus'];
  const lifeExpectancy = plan.client.lifeExpectancy ?? 100;

  if (exhaustionAge === null) {
    // Liquid assets survive to end of plan
    fundingStatus = passiveIncomeGap <= 0 && surplusAtAge100 > 0
      ? 'comfortable'
      : 'adequate';
  } else if (passiveIncomeGap <= 0) {
    // Income analysis confirms no gap — the asset depletion is a simulation
    // artefact from the SWR approximation vs actual year-by-year drawdown.
    // The ongoing income sources (CPF LIFE + passive) cover the target, so
    // cap the verdict at at-risk rather than jumping to significant-shortfall.
    const yearsShort = lifeExpectancy - exhaustionAge;
    fundingStatus = yearsShort <= 10 ? 'adequate' : 'at-risk';
  } else {
    // Both an income gap AND asset depletion — genuine shortfall
    const yearsShort = lifeExpectancy - exhaustionAge;
    if (yearsShort <= 5)       fundingStatus = 'adequate';
    else if (yearsShort <= 15) fundingStatus = 'at-risk';
    else                       fundingStatus = 'significant-shortfall';
  }

  const retirementFeasible = fundingStatus === 'comfortable' || fundingStatus === 'adequate';

  return {
    monthlyExpenseTarget,
    monthlyPassiveIncomeTarget,
    cpfLifeMonthlyIncome: cpfLifeMonthly,
    rentalMonthly,
    dividendMonthly,
    portfolioWithdrawalMonthly,
    otherPassiveMonthly,
    totalProjectedPassiveIncome,
    passiveIncomeGap,
    corpusRequired,
    corpusProjected,
    fundingStatus,
    assetExhaustionAge: exhaustionAge,
    surplusAtAge100,
    retirementFeasible,
  };
}
