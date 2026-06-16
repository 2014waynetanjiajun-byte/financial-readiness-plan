// Singapore CPF Engine
import { CURRENT_YEAR } from '../utils';

// ─── Allocation Rates (% of gross wage going to each account) ────────────────
interface CpfAllocation {
  minAge: number;
  maxAge: number;
  oa: number;
  sa: number;
  ma: number;
}

const CPF_ALLOCATION: CpfAllocation[] = [
  { minAge: 0,   maxAge: 35,  oa: 0.23,  sa: 0.06,  ma: 0.08  },
  { minAge: 35,  maxAge: 45,  oa: 0.21,  sa: 0.07,  ma: 0.09  },
  { minAge: 45,  maxAge: 50,  oa: 0.19,  sa: 0.08,  ma: 0.10  },
  { minAge: 50,  maxAge: 55,  oa: 0.15,  sa: 0.115, ma: 0.105 },
  { minAge: 55,  maxAge: 60,  oa: 0.155, sa: 0.035, ma: 0.105 },
  { minAge: 60,  maxAge: 65,  oa: 0.08,  sa: 0.025, ma: 0.105 },
  { minAge: 65,  maxAge: 70,  oa: 0.045, sa: 0.01,  ma: 0.105 },
  { minAge: 70,  maxAge: 999, oa: 0.02,  sa: 0.01,  ma: 0.095 },
];

export function getCpfAllocationRates(age: number): { oa: number; sa: number; ma: number } {
  const found = CPF_ALLOCATION.find((a) => age >= a.minAge && age < a.maxAge);
  return found ? { oa: found.oa, sa: found.sa, ma: found.ma } : { oa: 0, sa: 0, ma: 0 };
}

// ─── Employee + Employer Rates (employed only) ────────────────────────────────
function getEmployeeEmployerRates(age: number): { employee: number; employer: number } {
  if (age < 55) return { employee: 0.20, employer: 0.17 };
  if (age < 60) return { employee: 0.15, employer: 0.15 };
  if (age < 65) return { employee: 0.095, employer: 0.115 };
  if (age < 70) return { employee: 0.07,  employer: 0.09  };
  return             { employee: 0.05,  employer: 0.075 };
}

// ─── Self-Employed MediSave Contribution Rates ───────────────────────────────
// CPF Board: mandatory MediSave only; OA/SA contributions are voluntary.
// Rates are % of annual net trade income, capped at the Annual Limit.
const SE_MA_RATES: Array<{ minAge: number; maxAge: number; rate: number }> = [
  { minAge: 0,   maxAge: 35,  rate: 0.08  },
  { minAge: 35,  maxAge: 45,  rate: 0.085 },
  { minAge: 45,  maxAge: 50,  rate: 0.09  },
  { minAge: 50,  maxAge: 55,  rate: 0.095 },
  { minAge: 55,  maxAge: 60,  rate: 0.085 },
  { minAge: 60,  maxAge: 65,  rate: 0.08  },
  { minAge: 65,  maxAge: 70,  rate: 0.075 },
  { minAge: 70,  maxAge: 999, rate: 0.07  },
];

export function getSelfEmployedMARate(age: number): number {
  return SE_MA_RATES.find((r) => age >= r.minAge && age < r.maxAge)?.rate ?? 0.08;
}

// ─── Retirement Sums 2024 (escalate ~3.5% p.a.) ──────────────────────────────
export const BRS_2024 = 102900;
export const FRS_2024 = 205800;
export const ERS_2024 = 308700;
export const BHS_2024 = 71500;

export function projectRetirementSum(baseAmount: number, yearsFromNow: number): number {
  return baseAmount * Math.pow(1.035, yearsFromNow);
}

// ─── CPF Interest Rates ───────────────────────────────────────────────────────
export const CPF_RATES = {
  oa: 0.025,
  sa: 0.04,
  ma: 0.04,
  ra: 0.04,
  extraOnFirst20kOA: 0.01,
  extraOnFirst40kSAMARA: 0.01,
};

export function calculateCpfInterest(oa: number, sa: number, ma: number, ra: number) {
  const baseOAInterest = oa * CPF_RATES.oa;
  const baseSAInterest = sa * CPF_RATES.sa;
  const baseMAInterest = ma * CPF_RATES.ma;
  const baseRAInterest = ra * CPF_RATES.ra;

  const extraOABase       = Math.min(oa, 20000);
  const remainingExtra    = Math.max(0, 60000 - extraOABase);
  const extraNonOA        = Math.min(sa + ma + ra, remainingExtra);
  const extraOAInterest   = extraOABase * CPF_RATES.extraOnFirst20kOA;
  const nonOATotal        = sa + ma + ra || 1;
  const extraNonOAInterest = extraNonOA * CPF_RATES.extraOnFirst40kSAMARA;

  return {
    oaInterest: baseOAInterest + extraOAInterest,
    saInterest: baseSAInterest + (sa / nonOATotal) * extraNonOAInterest,
    maInterest: baseMAInterest + (ma / nonOATotal) * extraNonOAInterest,
    raInterest: baseRAInterest + (ra / nonOATotal) * extraNonOAInterest,
  };
}

// ─── CPF LIFE Payout Estimation ───────────────────────────────────────────────
export function estimateCpfLifePayout(
  raBalanceAtAge65: number,
  gender: 'male' | 'female',
  plan: 'basic' | 'standard' | 'escalating' = 'standard'
): number {
  const baseFactor      = gender === 'male' ? 0.0099 : 0.0087;
  const planAdjustment  = plan === 'escalating' ? 0.9 : plan === 'basic' ? 1.05 : 1.0;
  return raBalanceAtAge65 * baseFactor * planAdjustment;
}

// ─── Step CPF Balances Forward One Year ──────────────────────────────────────

export type EmployerType = 'private' | 'government' | 'self-employed' | 'none';

export interface CpfYearInput {
  age: number;
  oa: number;
  sa: number;
  ma: number;
  ra: number;
  annualGrossWage: number;
  voluntaryContrib: number;
  rstuTopUp: number;
  is55ThisYear: boolean;
  cpfOWCeiling: number;
  alreadyFormedRA: boolean;
  gender: 'male' | 'female';
  employerType: EmployerType;
  calendarYear?: number;  // used to project the correct FRS at age 55
}

export interface CpfYearOutput {
  oa: number;
  sa: number;
  ma: number;
  ra: number;
  employeeContrib: number;
  employerContrib: number;
  cpfLifeMonthly: number;
  bhsExcess: number;
}

export function stepCpfOneYear(input: CpfYearInput): CpfYearOutput {
  let { oa, sa, ma, ra } = input;
  const { age, voluntaryContrib, rstuTopUp, employerType } = input;

  let employeeContrib = 0;
  let employerContrib = 0;

  if (employerType === 'private' || employerType === 'government') {
    // ── Fully employed: both employee + employer CPF ────────────────────────
    const cappedWage    = Math.min(input.annualGrossWage, input.cpfOWCeiling * 12);
    const rates         = getEmployeeEmployerRates(age);
    const alloc         = getCpfAllocationRates(age);

    employeeContrib = cappedWage * rates.employee;
    employerContrib = cappedWage * rates.employer;

    const toOA = cappedWage * alloc.oa;
    const toSA = cappedWage * alloc.sa;
    const toMA = cappedWage * alloc.ma;

    oa += toOA;
    if (age < 55) {
      sa += toSA;
    } else if (ra > 0) {
      ra += toSA; // post-55 SA portion credited to RA
    } else {
      oa += toSA;
    }
    ma += toMA;

  } else if (employerType === 'self-employed') {
    // ── Self-employed: mandatory MediSave only; OA/SA only via voluntary ───
    // CPF Board: self-employed must contribute to MA based on net trade income
    const cappedIncome  = Math.min(input.annualGrossWage, input.cpfOWCeiling * 12);
    const maRate        = getSelfEmployedMARate(age);
    const mandatoryMA   = cappedIncome * maRate;

    // Treat the mandatory MA contribution as the "employee" side for tax purposes
    employeeContrib = mandatoryMA;
    employerContrib = 0;         // no employer contribution for self-employed

    ma += mandatoryMA;
    // OA/SA get nothing mandatory — only voluntary top-ups below
  }
  // employerType === 'none': no mandatory contributions at all

  // ── Voluntary contributions (any employment type) ─────────────────────────
  if (rstuTopUp > 0) {
    const capped = Math.min(rstuTopUp, 8000);
    if (age < 55) sa += capped;
    else          ra += capped;
  }

  if (voluntaryContrib > 0) {
    oa += voluntaryContrib * 0.6;
    sa += voluntaryContrib * 0.2;
    ma += voluntaryContrib * 0.2;
  }

  // ── BHS cap on MA — excess redirected to SA (pre-55) or RA (post-55) ──────
  const bhsThisYear = BHS_2024 * Math.pow(1.035, Math.max(0, age - 55));
  const bhsExcess   = Math.max(0, ma - bhsThisYear);
  if (bhsExcess > 0) {
    ma = bhsThisYear;
    if (age < 55) sa += bhsExcess;
    else          ra += bhsExcess;
  }

  // ── RA formation at age 55 ────────────────────────────────────────────────
  if (input.is55ThisYear && !input.alreadyFormedRA) {
    // Project FRS to the actual calendar year so it reflects the escalated sum
    const yearsFrom2024 = Math.max(0, (input.calendarYear ?? 2024) - 2024);
    const frs = projectRetirementSum(FRS_2024, yearsFrom2024);

    // Step 1: SA transfers to RA first (up to FRS)
    const fromSA = Math.min(sa, frs);
    sa -= fromSA;
    ra += fromSA;

    // Step 2: If RA still below FRS, top up from OA
    if (ra < frs) {
      const fromOA = Math.min(oa, frs - ra);
      oa -= fromOA;
      ra += fromOA;
    }

    // Step 3: SA account closes — any remaining SA balance moves to OA
    oa += sa;
    sa = 0;
  }

  // ── CPF interest ──────────────────────────────────────────────────────────
  const interest = calculateCpfInterest(oa, sa, ma, ra);
  oa += interest.oaInterest;
  sa += interest.saInterest;
  ma += interest.maInterest;
  ra += interest.raInterest;

  // ── CPF LIFE drawdown from age 65 ────────────────────────────────────────
  let cpfLifeMonthly = 0;
  if (age >= 65) {
    cpfLifeMonthly = estimateCpfLifePayout(ra, input.gender);
    ra = Math.max(0, ra - cpfLifeMonthly * 12);
  }

  return {
    oa: Math.max(0, oa),
    sa: Math.max(0, sa),
    ma: Math.max(0, ma),
    ra: Math.max(0, ra),
    employeeContrib,
    employerContrib,
    cpfLifeMonthly,
    bhsExcess,
  };
}

// ─── Project CPF balances forward to age 55 ──────────────────────────────────
// Used by the CPF page to show a realistic retirement sum attainment estimate.
export interface CPFProjectionAt55 {
  projectedOA: number;
  projectedSA: number;
  projectedMA: number;
  projectedRA: number;         // RA formed at 55 from SA + OA
  remainingOA: number;         // OA left after RA formation
  remainingSA: number;         // SA left after RA formation (if SA > FRS)
  frsAt55: number;
  brsAt55: number;
  ersAt55: number;
  brsAttained: boolean;
  frsAttained: boolean;
  ersAttained: boolean;
}

export function projectCPFTo55(
  currentAge: number,
  oa: number,
  sa: number,
  ma: number,
  ra: number,
  annualGrossWage: number,
  employerType: EmployerType,
  gender: 'male' | 'female',
  salaryGrowthRate: number = 3,
  voluntaryContrib: number = 0,
  rstuTopUp: number = 0,
  cpfOWCeiling: number = 6800
): CPFProjectionAt55 {
  if (currentAge >= 55) {
    // Already past 55 — use current RA directly
    const yearsFromNow = 0;
    return {
      projectedOA: oa,
      projectedSA: sa,
      projectedMA: ma,
      projectedRA: ra,
      remainingOA: oa,
      remainingSA: sa,
      frsAt55: projectRetirementSum(FRS_2024, yearsFromNow),
      brsAt55: projectRetirementSum(BRS_2024, yearsFromNow),
      ersAt55: projectRetirementSum(ERS_2024, yearsFromNow),
      brsAttained: ra >= projectRetirementSum(BRS_2024, yearsFromNow),
      frsAttained: ra >= projectRetirementSum(FRS_2024, yearsFromNow),
      ersAttained: ra >= projectRetirementSum(ERS_2024, yearsFromNow),
    };
  }

  let curOA = oa, curSA = sa, curMA = ma, curRA = ra;
  let alreadyFormedRA = ra > 0;

  for (let age = currentAge; age < 55; age++) {
    const yearsElapsed  = age - currentAge;
    const wage          = Math.min(annualGrossWage * Math.pow(1 + salaryGrowthRate / 100, yearsElapsed), cpfOWCeiling * 12);

    const out = stepCpfOneYear({
      age,
      oa: curOA,
      sa: curSA,
      ma: curMA,
      ra: curRA,
      annualGrossWage: wage,
      voluntaryContrib,
      rstuTopUp,
      is55ThisYear: false,
      cpfOWCeiling,
      alreadyFormedRA,
      gender,
      employerType,
      calendarYear: CURRENT_YEAR + (age - currentAge),
    });

    curOA = out.oa;
    curSA = out.sa;
    curMA = out.ma;
    curRA = out.ra;
  }

  // Simulate RA formation at 55
  const yearsTo55     = 55 - currentAge;
  const frsAt55       = projectRetirementSum(FRS_2024, yearsTo55);
  const brsAt55       = projectRetirementSum(BRS_2024, yearsTo55);
  const ersAt55       = projectRetirementSum(ERS_2024, yearsTo55);

  // SA → RA first, then OA → RA
  let raFormed    = curRA;
  const fromSA    = Math.min(curSA, frsAt55 - raFormed);
  raFormed       += fromSA;
  const postSAOA  = curOA;
  const postSASA  = curSA - fromSA;

  let finalOA = postSAOA;
  let finalSA = postSASA;
  if (raFormed < frsAt55) {
    const fromOA = Math.min(finalOA, frsAt55 - raFormed);
    raFormed    += fromOA;
    finalOA     -= fromOA;
  }

  return {
    projectedOA: curOA,
    projectedSA: curSA,
    projectedMA: curMA,
    projectedRA: raFormed,
    remainingOA: finalOA,
    remainingSA: finalSA,
    frsAt55,
    brsAt55,
    ersAt55,
    brsAttained: raFormed >= brsAt55,
    frsAttained: raFormed >= frsAt55,
    ersAttained: raFormed >= ersAt55,
  };
}

// ─── Misc helpers ─────────────────────────────────────────────────────────────
export function getCpfLifeStartAge(userPreference: number = 65): number {
  return Math.min(70, Math.max(65, userPreference));
}

export function checkRetirementSumAttainment(
  raBalance: number,
  yearsFromNow: number
) {
  const brs = projectRetirementSum(BRS_2024, yearsFromNow);
  const frs = projectRetirementSum(FRS_2024, yearsFromNow);
  const ers = projectRetirementSum(ERS_2024, yearsFromNow);
  return {
    brsAttained: raBalance >= brs,
    frsAttained: raBalance >= frs,
    ersAttained: raBalance >= ers,
    brs,
    frs,
    ers,
  };
}
