import type { FinancialPlan, YearlyProjection } from '../types';
import {
  calculateIncomeTax,
  calculateChargeableIncome,
  calculateCpfContribution,
  CPF_OW_CEILING_MONTHLY,
} from './tax';
import { stepCpfOneYear, getCpfAllocationRates, type EmployerType } from './cpf';
import { inflateValue, CURRENT_YEAR } from '../utils';

// ─── Main Cashflow Engine ─────────────────────────────────────────────────────

export function generateLifetimeCashflow(plan: FinancialPlan): YearlyProjection[] {
  const { client, income, expenses, cpf, assets, liabilities, goals, assumptions } = plan;
  const projections: YearlyProjection[] = [];

  // ── Initial balances ──────────────────────────────────────────────────────
  // Cash and investments are tracked as a single combined liquid pool — there's no
  // split between "cash" and "investments" buckets; surplus/deficit and growth all
  // apply to the one number.
  let liquidBalance = assets.savingsAccounts + assets.fixedDeposits + assets.singaporeSavingsBonds +
    assets.investments.reduce((s, inv) => s + inv.currentValue, 0);
  let srsBalance = assets.srsBalance;
  let businessValue = assets.businessValuation * (assets.businessOwnershipPct / 100);

  let cpfOA = cpf.oaBalance;
  let cpfSA = cpf.saBalance;
  let cpfMA = cpf.maBalance;
  let cpfRA = cpf.raBalance;
  let raFormed = cpf.raBalance > 0;

  // Liability tracking: sum of all outstanding balances
  let liabilityBalances: Record<string, number> = {};
  liabilities.forEach((l) => { liabilityBalances[l.id] = l.outstandingBalance; });

  let propertyValues: Record<string, number> = {};
  let propertyLoans: Record<string, number> = {};
  assets.properties.forEach((p) => {
    propertyValues[p.id] = p.marketValue;
    propertyLoans[p.id] = p.outstandingLoan;
  });

  // ── Year-by-year projection ───────────────────────────────────────────────
  for (let age = client.age; age <= client.lifeExpectancy; age++) {
    const year = CURRENT_YEAR + (age - client.age);
    const yearsElapsed = age - client.age;
    const isRetired = age >= client.retirementAge;
    const isSemiRetired = age >= income.semiRetirementAge && age < client.retirementAge;

    // ── INCOME ──────────────────────────────────────────────────────────────
    let employmentIncome = 0;
    if (!isRetired) {
      const salaryAtAge = income.monthlySalary * 12 * Math.pow(1 + income.salaryGrowthRate / 100, yearsElapsed);
      const bonusAtAge = income.annualBonus * Math.pow(1 + income.salaryGrowthRate / 100, yearsElapsed);
      const varComp = income.variableComp * Math.pow(1 + income.salaryGrowthRate / 100, yearsElapsed);

      if (isSemiRetired) {
        employmentIncome = income.semiRetirementIncome * 12;
      } else {
        employmentIncome = salaryAtAge + bonusAtAge + varComp;
      }
    }

    const rentalIncome = inflateValue(income.rentalIncome * 12, assumptions.propertyGrowthRate, yearsElapsed);
    const dividendIncome = inflateValue(income.dividendIncome * 12, assumptions.generalInflation, yearsElapsed);
    const businessIncome = isRetired ? 0 : income.businessIncome * 12;
    const otherPassive = inflateValue(income.otherIncome * 12, assumptions.generalInflation, yearsElapsed);

    const passiveIncome = rentalIncome + dividendIncome + businessIncome + otherPassive;

    // CPF LIFE payout
    let cpfLifePayout = 0;
    if (age >= 65) {
      cpfLifePayout = plan.cpf.raBalance > 0 || cpfRA > 0 ? 0 : 0; // computed via CPF step below
    }

    // ── CPF ──────────────────────────────────────────────────────────────────
    const monthlySalaryForCpf = !isRetired && !isSemiRetired
      ? Math.min(income.monthlySalary * Math.pow(1 + income.salaryGrowthRate / 100, yearsElapsed), CPF_OW_CEILING_MONTHLY)
      : isSemiRetired ? Math.min(income.semiRetirementIncome, CPF_OW_CEILING_MONTHLY) : 0;

    const annualBonusForCpf = !isRetired && !isSemiRetired
      ? income.annualBonus * Math.pow(1 + income.salaryGrowthRate / 100, yearsElapsed)
      : 0;

    // Determine effective employer type: retired people have no employment income
    const effectiveEmployerType: EmployerType = (isRetired || isSemiRetired)
      ? 'none'
      : (client.employerType as EmployerType) ?? 'private';

    const cpfResult = stepCpfOneYear({
      age,
      oa: cpfOA,
      sa: cpfSA,
      ma: cpfMA,
      ra: cpfRA,
      annualGrossWage: monthlySalaryForCpf * 12 + annualBonusForCpf,
      voluntaryContrib: isRetired ? 0 : cpf.voluntaryContributions,
      rstuTopUp: isRetired ? 0 : cpf.rstuTopUps,
      is55ThisYear: age === 55,
      cpfOWCeiling: CPF_OW_CEILING_MONTHLY,
      alreadyFormedRA: raFormed,
      gender: client.gender,
      employerType: effectiveEmployerType,
      calendarYear: year,
    });

    cpfOA = cpfResult.oa;
    cpfSA = cpfResult.sa;
    cpfMA = cpfResult.ma;
    cpfRA = cpfResult.ra;
    if (age >= 55) raFormed = true;

    cpfLifePayout = cpfResult.cpfLifeMonthly * 12;

    // ── OA WITHDRAWAL INTENT ──────────────────────────────────────────────────
    let oaWithdrawal = 0;
    const oaIntent = cpf.oaWithdrawalIntent ?? 'compound';
    const oaWithdrawAge = cpf.oaWithdrawalAge ?? 55;

    if (oaIntent === 'lump_sum' && age === oaWithdrawAge && cpfOA > 0) {
      // Withdraw specified amount (or full balance if amount is 0 / exceeds balance)
      const requestedAmount = cpf.oaLumpSumAmount ?? 0;
      oaWithdrawal = requestedAmount > 0 ? Math.min(requestedAmount, cpfOA) : cpfOA;
      liquidBalance += oaWithdrawal;
      cpfOA = Math.max(0, cpfOA - oaWithdrawal);
    } else if (oaIntent === 'monthly' && age >= oaWithdrawAge && cpfOA > 0) {
      // Draw monthly amount annually until OA is exhausted
      const annual = Math.min((cpf.oaMonthlyDrawdown ?? 0) * 12, cpfOA);
      oaWithdrawal = annual;
      cpfOA = Math.max(0, cpfOA - annual);
      liquidBalance += oaWithdrawal;
    }

    // ── TAXES ─────────────────────────────────────────────────────────────────
    const chargeableIncome = calculateChargeableIncome(
      employmentIncome,
      cpfResult.employeeContrib,
      isRetired ? 0 : cpf.rstuTopUps,
      0
    );
    const taxes = isRetired ? 0 : calculateIncomeTax(chargeableIncome);

    // ── EXPENSES ─────────────────────────────────────────────────────────────
    // Pre-retirement: use age-aware expense model (time-limited items drop out)
    // Post-retirement: use the user's stated retirement expense target (inflated)
    const baseMonthlyExpenses = isRetired
      ? plan.retirementGoals.monthlyExpenses
      : computeMonthlyExpenses(expenses, age);

    const inflatedExpenses = inflateValue(baseMonthlyExpenses * 12, assumptions.generalInflation, yearsElapsed);

    // Extra healthcare inflation only applies pre-retirement where expenses are itemised.
    // Post-retirement the user's stated monthly expense figure is taken as-is (they set it
    // knowing their healthcare costs), so we don't double-count a healthcare surcharge on top.
    const healthcareBase  = expenses.healthcare * 12;
    const healthcareExtra = isRetired ? 0 :
      inflateValue(healthcareBase, assumptions.healthcareInflation, yearsElapsed) -
      inflateValue(healthcareBase, assumptions.generalInflation, yearsElapsed);

    const totalExpenses = inflatedExpenses + Math.max(0, healthcareExtra);

    // SWR withdrawal in retirement — an optional top-up that only covers the shortfall
    // between expenses and other income (passive + CPF LIFE), capped at SWR% of the
    // portfolio. If passive income already covers expenses, no withdrawal is taken.
    let swrWithdrawal = 0;
    if (isRetired && liquidBalance > 0) {
      const swr = plan.retirementGoals?.safeWithdrawalRate ?? 4;
      const incomeGap = Math.max(0, totalExpenses - passiveIncome - cpfLifePayout);
      swrWithdrawal = Math.min(incomeGap, liquidBalance * (swr / 100));
      liquidBalance -= swrWithdrawal;
    }

    const totalIncome = employmentIncome + passiveIncome + cpfLifePayout + swrWithdrawal;

    // ── GOAL FUNDING ──────────────────────────────────────────────────────────
    let goalFunding = 0;
    goals.forEach((goal) => {
      const goalYear = goal.targetYear;
      if (goalYear === year) {
        const yearsToGoal = goalYear - CURRENT_YEAR;
        if (goal.category === 'property' && goal.propertyDownpayment != null && goal.propertyDownpayment > 0) {
          const inflatedDownpayment = inflateValue(goal.propertyDownpayment, goal.inflationRate, yearsToGoal);
          if (goal.downpaymentSource === 'cpf_oa') {
            // CPF OA downpayment: deduct directly from OA balance, not from cash outflow
            cpfOA = Math.max(0, cpfOA - inflatedDownpayment);
          } else {
            // Cash downpayment: regular outflow
            goalFunding += inflatedDownpayment;
          }
        } else {
          goalFunding += inflateValue(goal.currentCost, goal.inflationRate, yearsToGoal);
        }
      }
    });

    // ── DEBT REPAYMENTS ───────────────────────────────────────────────────────
    let debtRepayments = 0;
    liabilities.forEach((liability) => {
      const remaining = liabilityBalances[liability.id] ?? 0;
      if (remaining > 0) {
        const payment = Math.min(liability.monthlyPayment * 12, remaining);
        debtRepayments += payment;
        liabilityBalances[liability.id] = Math.max(0, remaining - payment + remaining * (liability.interestRate / 100));
      }
    });

    // Post-retirement, only the stated retirement expense target counts against liquid
    // assets — goal funding and debt repayments are excluded (taxes are already 0).
    const totalOutflows = isRetired ? totalExpenses : totalExpenses + goalFunding + taxes + debtRepayments;
    const netCashflow = totalIncome - totalOutflows - cpfResult.employeeContrib;

    // ── UPDATE BALANCE ────────────────────────────────────────────────────────
    // Investment contributions stop at retirement — passive income and SWR cover expenses
    const annualContributions = isRetired
      ? 0
      : assets.investments.reduce((s, inv) => s + (inv.monthlyContribution ?? 0) * 12, 0);

    // One combined liquid pool: contributions go in, net cashflow (surplus or deficit) applies directly
    liquidBalance += annualContributions + netCashflow;
    liquidBalance = Math.max(0, liquidBalance);

    // Investment growth
    const weightedReturn = computeWeightedReturn(assets.investments, assumptions.investmentReturn);
    liquidBalance *= (1 + weightedReturn / 100);
    srsBalance *= (1 + weightedReturn / 100);
    businessValue *= (1 + assumptions.investmentReturn / 100);

    // Property appreciation
    assets.properties.forEach((p) => {
      propertyValues[p.id] *= (1 + p.annualAppreciation / 100);
      if (propertyLoans[p.id] > 0) {
        const loanPayment = Math.min(p.monthlyMortgage * 12, propertyLoans[p.id]);
        propertyLoans[p.id] = Math.max(0, propertyLoans[p.id] - loanPayment + propertyLoans[p.id] * 0.03);
      }
    });

    const totalPropertyValue = Object.values(propertyValues).reduce((s, v) => s + v, 0);
    const totalPropertyLoans = Object.values(propertyLoans).reduce((s, v) => s + v, 0);
    const totalLiabilities = Object.values(liabilityBalances).reduce((s, v) => s + v, 0) + totalPropertyLoans;

    const totalAssets =
      liquidBalance +
      srsBalance +
      businessValue +
      totalPropertyValue +
      cpfOA +
      cpfSA +
      cpfMA +
      cpfRA;

    const netWorth = totalAssets - totalLiabilities;
    const savingsRate = totalIncome > 0 ? ((totalIncome - totalOutflows) / totalIncome) * 100 : 0;

    projections.push({
      age,
      year,
      isRetired,
      isSemiRetired,
      employmentIncome,
      passiveIncome,
      cpfLifePayout,
      swrWithdrawal,
      totalIncome,
      totalExpenses,
      goalFunding,
      taxes,
      debtRepayments,
      totalOutflows,
      netCashflow,
      savingsRate,
      cpfEmployee: cpfResult.employeeContrib,
      cpfEmployer: cpfResult.employerContrib,
      cpfOA,
      cpfSA,
      cpfMA,
      cpfRA,
      cpfTotal: cpfOA + cpfSA + cpfMA + cpfRA,
      // Cash and investments are a single combined pool — stored under investmentBalance,
      // cashBalance kept at 0 for backward compatibility with code that sums the two.
      cashBalance: 0,
      investmentBalance: liquidBalance,
      propertyValue: totalPropertyValue,
      srsBalance,
      businessValue,
      totalLiabilities,
      totalAssets,
      netWorth,
    });
  }

  return projections;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function computeMonthlyExpenses(
  expenses: FinancialPlan['expenses'],
  age: number
): number {
  // Ongoing — always included
  let total =
    expenses.food +
    expenses.utilities +
    expenses.healthcare +
    expenses.transport +
    expenses.travel +
    expenses.dining +
    expenses.entertainment +
    expenses.hobbies;

  // Time-limited essential — only while active
  if (age < (expenses.mortgageEndAge ?? 999))          total += expenses.mortgage;
  if (age < (expenses.insurancePremiumsEndAge ?? 999)) total += expenses.insurancePremiums;

  // Time-limited family — only while active
  if (age < (expenses.parentsAllowanceEndAge ?? 999))  total += expenses.parentsAllowance;
  if (age < (expenses.childrenExpensesEndAge ?? 999))  total += expenses.childrenExpenses;
  if (age < (expenses.otherDependantsEndAge ?? 999))   total += expenses.otherDependants;

  // Custom items — respect individual endAge if set
  const customTotal =
    (expenses.customEssential ?? []).reduce((s, i) => s + (!i.endAge || age < i.endAge ? i.amount : 0), 0) +
    (expenses.customLifestyle  ?? []).reduce((s, i) => s + (!i.endAge || age < i.endAge ? i.amount : 0), 0) +
    (expenses.customFamily     ?? []).reduce((s, i) => s + (!i.endAge || age < i.endAge ? i.amount : 0), 0);

  return total + customTotal;
}


function computeWeightedReturn(
  investments: FinancialPlan['assets']['investments'],
  defaultReturn: number
): number {
  if (investments.length === 0) return defaultReturn;
  const totalValue = investments.reduce((s, inv) => s + inv.currentValue, 0);
  if (totalValue === 0) return defaultReturn;
  return investments.reduce((s, inv) => s + (inv.currentValue / totalValue) * inv.annualReturn, 0);
}

// ─── Find asset exhaustion age ───────────────────────────────────────────────
// Only checks liquid investable assets (cash + investments + SRS).
// CPF MA sits at BHS permanently and should not prevent exhaustion detection.
export function findAssetExhaustionAge(projections: YearlyProjection[]): number | null {
  const found = projections.find(
    (p) => p.cashBalance <= 0 && p.investmentBalance <= 0 && p.srsBalance <= 0
  );
  return found ? found.age : null;
}

