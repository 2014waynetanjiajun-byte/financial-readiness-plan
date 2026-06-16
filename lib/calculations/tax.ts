// Singapore Personal Income Tax Calculator (YA 2024 rates)

interface TaxBracket {
  from: number;
  to: number;
  rate: number;
  fixedAmount: number;
}

const TAX_BRACKETS: TaxBracket[] = [
  { from: 0,       to: 20000,  rate: 0,    fixedAmount: 0 },
  { from: 20000,   to: 30000,  rate: 0.02, fixedAmount: 0 },
  { from: 30000,   to: 40000,  rate: 0.035,fixedAmount: 200 },
  { from: 40000,   to: 80000,  rate: 0.07, fixedAmount: 550 },
  { from: 80000,   to: 120000, rate: 0.115,fixedAmount: 3350 },
  { from: 120000,  to: 160000, rate: 0.15, fixedAmount: 7950 },
  { from: 160000,  to: 200000, rate: 0.18, fixedAmount: 13950 },
  { from: 200000,  to: 240000, rate: 0.19, fixedAmount: 21150 },
  { from: 240000,  to: 280000, rate: 0.195,fixedAmount: 28750 },
  { from: 280000,  to: 320000, rate: 0.20, fixedAmount: 36550 },
  { from: 320000,  to: Infinity,rate: 0.22,fixedAmount: 44550 },
];

export function calculateIncomeTax(chargeableIncome: number): number {
  if (chargeableIncome <= 0) return 0;
  chargeableIncome = Math.max(0, chargeableIncome);

  for (let i = TAX_BRACKETS.length - 1; i >= 0; i--) {
    const bracket = TAX_BRACKETS[i];
    if (chargeableIncome > bracket.from) {
      return bracket.fixedAmount + (chargeableIncome - bracket.from) * bracket.rate;
    }
  }
  return 0;
}

// CPF employee contribution rates (Singapore Citizens / PRs)
interface CpfRate {
  minAge: number;
  maxAge: number;
  employeeRate: number;
  employerRate: number;
}

export const CPF_CONTRIBUTION_RATES: CpfRate[] = [
  { minAge: 0,  maxAge: 55, employeeRate: 0.20, employerRate: 0.17 },
  { minAge: 55, maxAge: 60, employeeRate: 0.15, employerRate: 0.15 },
  { minAge: 60, maxAge: 65, employeeRate: 0.095,employerRate: 0.115 },
  { minAge: 65, maxAge: 70, employeeRate: 0.07, employerRate: 0.09 },
  { minAge: 70, maxAge: 999,employeeRate: 0.05, employerRate: 0.075 },
];

export function getCpfRates(age: number): { employeeRate: number; employerRate: number } {
  const found = CPF_CONTRIBUTION_RATES.find(
    (r) => age >= r.minAge && age < r.maxAge
  );
  return found
    ? { employeeRate: found.employeeRate, employerRate: found.employerRate }
    : { employeeRate: 0, employerRate: 0 };
}

// CPF Ordinary Wage ceiling (monthly) — increases to $7,400 in 2025, $8,000 in 2026
export const CPF_OW_CEILING_MONTHLY = 6800;
// Annual CPF limit for total contributions
export const CPF_ANNUAL_LIMIT = 37740;

export function calculateCpfContribution(
  monthlySalary: number,
  annualBonus: number,
  age: number,
  isEmployee: boolean = true
): {
  employeeContribution: number;
  employerContribution: number;
  totalContribution: number;
  chargeableForTax: number;
} {
  if (age >= 65 && !isEmployee) {
    return { employeeContribution: 0, employerContribution: 0, totalContribution: 0, chargeableForTax: 0 };
  }

  const { employeeRate, employerRate } = getCpfRates(age);
  const cappedMonthlySalary = Math.min(monthlySalary, CPF_OW_CEILING_MONTHLY);
  const annualOW = cappedMonthlySalary * 12;

  // Additional wage ceiling
  const awCeiling = Math.max(0, 102000 - annualOW);
  const cappedBonus = Math.min(annualBonus, awCeiling);

  const totalWages = annualOW + cappedBonus;
  const employeeContrib = totalWages * employeeRate;
  const employerContrib = totalWages * employerRate;
  const total = employeeContrib + employerContrib;

  // Cap at annual limit
  const cappedTotal = Math.min(total, CPF_ANNUAL_LIMIT);
  const ratio = cappedTotal / (total || 1);

  return {
    employeeContribution: employeeContrib * ratio,
    employerContribution: employerContrib * ratio,
    totalContribution: cappedTotal,
    chargeableForTax: employeeContrib * ratio,
  };
}

// Calculate chargeable income after key reliefs
export function calculateChargeableIncome(
  grossIncome: number,
  cpfEmployeeContrib: number,
  rstuTopUp: number = 0,
  srsContrib: number = 0
): number {
  const cpfRelief = Math.min(cpfEmployeeContrib, 37740); // capped at annual limit
  const rstuRelief = Math.min(rstuTopUp, 8000);
  const srsRelief = Math.min(srsContrib, 15300);
  return Math.max(0, grossIncome - cpfRelief - rstuRelief - srsRelief);
}

// Effective tax rate helper
export function effectiveTaxRate(chargeableIncome: number): number {
  if (chargeableIncome <= 0) return 0;
  return (calculateIncomeTax(chargeableIncome) / chargeableIncome) * 100;
}
