'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  FinancialPlan,
  YearlyProjection,
  RetirementAnalysis,
  InsuranceGap,
  FinancialHealthScores,
  StressTestInput,
  StressTestResult,
} from './types';
import { defaultPlan, defaultStressTestInput } from './types';
import { generateLifetimeCashflow, findAssetExhaustionAge } from './calculations/cashflow';
import { calculateRetirementAnalysis } from './calculations/retirement';
import { calculateInsuranceGap, calculateProtectionScore } from './calculations/insurance';
import { runAllStressTests } from './calculations/stress';

interface FinancialStore {
  plan: FinancialPlan;
  projections: YearlyProjection[];
  retirementAnalysis: RetirementAnalysis | null;
  insuranceGap: InsuranceGap | null;
  healthScores: FinancialHealthScores | null;
  stressTestInput: StressTestInput;
  stressTestResults: Record<string, StressTestResult>;
  isCalculating: boolean;

  // Actions
  updatePlan: (updates: Partial<FinancialPlan>) => void;
  recalculate: () => void;
  runStressTests: () => void;
  updateStressTestInput: (updates: Partial<StressTestInput>) => void;
  resetPlan: () => void;
}

function computeHealthScores(
  plan: FinancialPlan,
  projections: YearlyProjection[],
  insuranceGap: InsuranceGap
): FinancialHealthScores {
  const monthlyIncome = plan.income.monthlySalary + plan.income.otherIncome + plan.income.dividendIncome;
  const monthlyExpenses =
    plan.expenses.food + plan.expenses.utilities + plan.expenses.healthcare +
    plan.expenses.mortgage + plan.expenses.insurancePremiums + plan.expenses.transport +
    plan.expenses.travel + plan.expenses.dining + plan.expenses.entertainment +
    plan.expenses.hobbies + plan.expenses.parentsAllowance +
    plan.expenses.childrenExpenses + plan.expenses.otherDependants;

  const savingsRate = monthlyIncome > 0 ? ((monthlyIncome - monthlyExpenses) / monthlyIncome) * 100 : 0;
  const totalLiabilities = plan.liabilities.reduce((s, l) => s + l.outstandingBalance, 0);
  const liquidAssets = plan.assets.savingsAccounts + plan.assets.fixedDeposits + plan.assets.singaporeSavingsBonds;
  const monthsCoverage = liquidAssets / (monthlyExpenses || 1);

  // Retirement readiness (0-100)
  const yearsToRetirement = plan.client.retirementAge - plan.client.age;
  const retirementProj = projections.find((p) => p.age === plan.client.retirementAge);
  const cpfAtRetirement = (retirementProj?.cpfRA ?? 0) + (retirementProj?.cpfOA ?? 0) + (retirementProj?.cpfSA ?? 0);
  const targetCorpus = monthlyExpenses * 12 * 25; // 25x rule of thumb
  const currentProgress = Math.min(1, (cpfAtRetirement + liquidAssets) / targetCorpus);
  const retirementReadiness = Math.round(currentProgress * 100);

  // Savings score
  let savingsScore = 0;
  if (savingsRate >= 30) savingsScore = 100;
  else if (savingsRate >= 20) savingsScore = 80;
  else if (savingsRate >= 10) savingsScore = 60;
  else if (savingsRate >= 5) savingsScore = 40;
  else if (savingsRate > 0) savingsScore = 20;

  // Liquidity score (6 months = 100)
  const liquidityScore = Math.min(100, Math.round((monthsCoverage / 6) * 100));

  // Debt score
  const totalAssets = projections[0]?.totalAssets ?? 1;
  const debtRatio = totalLiabilities / (totalAssets || 1);
  const debtScore = Math.round(Math.max(0, 100 - debtRatio * 100));

  // Protection score
  const protectionScore = calculateProtectionScore(insuranceGap);

  // Estate planning (simplified)
  let estatePlanningScore = 30; // Base
  if (plan.insurance.policies.some((p) => ['term', 'wholeLife'].includes(p.type))) estatePlanningScore += 35;
  if (plan.insurance.hasCareShieldLife) estatePlanningScore += 15;
  estatePlanningScore += 20; // Assume CPF nomination considered

  const overall = Math.round(
    (retirementReadiness * 0.30 +
      protectionScore * 0.25 +
      liquidityScore * 0.15 +
      savingsScore * 0.15 +
      debtScore * 0.10 +
      estatePlanningScore * 0.05)
  );

  return {
    overall,
    retirementReadiness,
    protectionScore,
    liquidityScore,
    estatePlanningScore,
    debtScore,
    savingsScore,
  };
}

export const useFinancialStore = create<FinancialStore>()(
  persist(
    (set, get) => ({
      plan: defaultPlan,
      projections: [],
      retirementAnalysis: null,
      insuranceGap: null,
      healthScores: null,
      stressTestInput: defaultStressTestInput,
      stressTestResults: {},
      isCalculating: false,

      updatePlan: (updates) => {
        set((state) => ({ plan: { ...state.plan, ...updates } }));
        get().recalculate();
      },

      recalculate: () => {
        set({ isCalculating: true });
        const { plan } = get();
        try {
          const projections = generateLifetimeCashflow(plan);
          const insuranceGap = calculateInsuranceGap(plan);
          const retirementAnalysis = calculateRetirementAnalysis(plan, projections);
          const healthScores = computeHealthScores(plan, projections, insuranceGap);
          set({ projections, retirementAnalysis, insuranceGap, healthScores, isCalculating: false });
        } catch (e) {
          console.error('Calculation error:', e);
          set({ isCalculating: false });
        }
      },

      runStressTests: () => {
        const { plan, stressTestInput } = get();
        // Merge with defaults so any fields missing from old persisted state are filled in
        const mergedInput = { ...defaultStressTestInput, ...stressTestInput };
        try {
          const results = runAllStressTests(plan, mergedInput);
          set({ stressTestResults: results });
        } catch (e) {
          console.error('Stress test error:', e);
        }
      },

      updateStressTestInput: (updates) => {
        set((state) => ({
          stressTestInput: { ...defaultStressTestInput, ...state.stressTestInput, ...updates },
        }));
      },

      resetPlan: () => {
        set({
          plan: defaultPlan,
          projections: [],
          retirementAnalysis: null,
          insuranceGap: null,
          healthScores: null,
          stressTestResults: {},
        });
      },
    }),
    {
      name: 'sg-financial-plan',
      version: 2,
      migrate: (persisted: any, version: number) => {
        // v1→v2: stress test scenarios were renamed; wipe old results
        if (version < 2) {
          return { ...persisted, stressTestResults: {}, stressTestInput: defaultStressTestInput };
        }
        return persisted;
      },
    }
  )
);
