import type { FinancialPlan, InsuranceGap, InsurancePolicy } from '../types';

// ─── Singapore Insurance Gap Analysis ────────────────────────────────────────

export function calculateInsuranceGap(plan: FinancialPlan): InsuranceGap {
  const { client, income, liabilities, insurance, goals } = plan;

  const annualIncome = income.monthlySalary * 12 + income.annualBonus + income.variableComp;

  // ── DEATH / TPD COVERAGE (DIME method) ─────────────────────────────────────
  const incomeReplacement    = annualIncome * 10;
  const totalDebt            = liabilities.reduce((s, l) => s + l.outstandingBalance, 0);
  const childEducationCost   = goals.filter((g) => g.category === 'education').reduce((s, g) => s + g.currentCost, 0);
  const parentsSupport       = plan.expenses.parentsAllowance * 12 * 10;
  const deathCoverageRequired = incomeReplacement + totalDebt + childEducationCost + parentsSupport;

  // Death/TPD held: sum deathTPDSumAssured from term/whole life policies
  const deathCoverageHeld = insurance.policies
    .filter((p) => ['term', 'wholeLife'].includes(p.type))
    .reduce((s, p) => s + (p.deathTPDSumAssured ?? p.sumAssured ?? 0), 0);

  const deathCoverageGap = Math.max(0, deathCoverageRequired - deathCoverageHeld);

  // ── CRITICAL ILLNESS ───────────────────────────────────────────────────────
  const ciIncomeReplacement  = annualIncome * 5;
  const estimatedTreatment   = 150000;
  const ciCoverageRequired   = ciIncomeReplacement + estimatedTreatment;

  // CI held: ciSumAssured on term/whole life + sum assured on standalone CI/ECI
  const ciCoverageHeld = insurance.policies.reduce((s, p) => {
    if (['term', 'wholeLife'].includes(p.type)) {
      return s + (p.ciSumAssured ?? 0) + (p.eciSumAssured ?? 0);
    }
    if (p.type === 'ci' || p.type === 'eci') {
      return s + (p.ciSumAssured ?? p.sumAssured ?? 0) + (p.eciSumAssured ?? 0);
    }
    return s;
  }, 0);

  const ciCoverageGap = Math.max(0, ciCoverageRequired - ciCoverageHeld);

  // ── DISABILITY INCOME ──────────────────────────────────────────────────────
  const disabilityMonthlyRequired = (income.monthlySalary + income.variableComp) * 0.75;
  const disabilityMonthlyHeld     = insurance.policies
    .filter((p) => p.type === 'disabilityIncome')
    .reduce((s, p) => s + (p.monthlyBenefit ?? 0), 0);
  const disabilityGap = Math.max(0, disabilityMonthlyRequired - disabilityMonthlyHeld);

  // ── HOSPITALISATION ────────────────────────────────────────────────────────
  const ispPolicy = insurance.policies.find((p) => p.type === 'hospitalisation');
  const hasHospitalisationCoverage = !!ispPolicy;
  let hospitalisationGap = 'No Integrated Shield Plan detected';
  if (ispPolicy) {
    const ward = ispPolicy.wardType ?? 'b1';
    hospitalisationGap = ispPolicy.hasRider
      ? `Adequate — ${ward.toUpperCase()} Ward with full rider (${ispPolicy.insurer || 'ISP'})`
      : `${ward.toUpperCase()} Ward — no rider, exposed to co-insurance costs (${ispPolicy.insurer || 'ISP'})`;
  }

  return {
    deathCoverageRequired,
    deathCoverageHeld,
    deathCoverageGap,
    ciCoverageRequired,
    ciCoverageHeld,
    ciCoverageGap,
    disabilityMonthlyRequired,
    disabilityMonthlyHeld,
    disabilityGap,
    hasHospitalisationCoverage,
    hospitalisationGap,
  };
}

export function summarisePoliciesByType(policies: InsurancePolicy[]): Record<string, InsurancePolicy[]> {
  return policies.reduce((acc, policy) => {
    if (!acc[policy.type]) acc[policy.type] = [];
    acc[policy.type].push(policy);
    return acc;
  }, {} as Record<string, InsurancePolicy[]>);
}

export function calculateProtectionScore(gap: InsuranceGap): number {
  let score = 100;
  if (gap.deathCoverageGap > 0) score -= (1 - Math.min(1, gap.deathCoverageHeld / gap.deathCoverageRequired)) * 30;
  if (gap.ciCoverageGap > 0)    score -= (1 - Math.min(1, gap.ciCoverageHeld    / gap.ciCoverageRequired))    * 25;
  if (gap.disabilityGap > 0)    score -= (1 - Math.min(1, gap.disabilityMonthlyHeld / gap.disabilityMonthlyRequired)) * 25;
  if (!gap.hasHospitalisationCoverage) score -= 20;
  return Math.max(0, Math.round(score));
}
