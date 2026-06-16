// ─── Core Domain Types ───────────────────────────────────────────────────────

export interface Dependant {
  id: string;
  relationship: 'child' | 'parent' | 'spouse' | 'sibling' | 'other';
  age: number;
  isFinanciallyDependent: boolean;
}

export interface ClientProfile {
  name: string;
  age: number;
  gender: 'male' | 'female';
  maritalStatus: 'single' | 'married' | 'divorced' | 'widowed';
  dependants: Dependant[];
  retirementAge: number;
  lifeExpectancy: number;
  occupation: string;
  employerType: 'private' | 'government' | 'self-employed' | 'none';
  healthConditions: string;
  smokingStatus: boolean;
  residencyStatus: 'citizen' | 'pr' | 'foreigner';
}

export interface IncomeData {
  monthlySalary: number;
  annualBonus: number;
  variableComp: number;
  rentalIncome: number;
  dividendIncome: number;
  businessIncome: number;
  otherIncome: number;
  salaryGrowthRate: number;
  semiRetirementAge: number;
  semiRetirementIncome: number;
  retirementPassiveIncome: number;
}

export interface CustomExpenseItem {
  id: string;
  label: string;
  amount: number;
  endAge?: number;   // if set, expense stops at this age
}

export interface ExpenseData {
  // ── Ongoing essential (no end age) ────────────────────────────────────────
  food: number;
  utilities: number;
  healthcare: number;
  transport: number;

  // ── Time-limited essential ─────────────────────────────────────────────────
  mortgage: number;
  mortgageEndAge: number;          // age when mortgage/rent stops

  insurancePremiums: number;
  insurancePremiumsEndAge: number; // age when premiums stop (e.g. term ends at 65)

  customEssential: CustomExpenseItem[];

  // ── Ongoing lifestyle (no end age) ────────────────────────────────────────
  travel: number;
  dining: number;
  entertainment: number;
  hobbies: number;
  customLifestyle: CustomExpenseItem[];

  // ── Time-limited family support ───────────────────────────────────────────
  parentsAllowance: number;
  parentsAllowanceEndAge: number;  // age when parents allowance stops

  childrenExpenses: number;
  childrenExpensesEndAge: number;  // age when children are financially independent

  otherDependants: number;
  otherDependantsEndAge: number;

  customFamily: CustomExpenseItem[];
}

export type OAWithdrawalIntent = 'compound' | 'lump_sum' | 'monthly';

export interface CPFData {
  oaBalance: number;
  saBalance: number;
  maBalance: number;
  raBalance: number;
  housingWithdrawals: number;
  voluntaryContributions: number;
  rstuTopUps: number;
  oaWithdrawalIntent: OAWithdrawalIntent;
  oaWithdrawalAge: number;
  oaLumpSumAmount: number;
  oaMonthlyDrawdown: number;
}

export type PropertyType = 'hdb' | 'condo' | 'landed' | 'commercial';

export interface Property {
  id: string;
  name: string;
  type: PropertyType;
  marketValue: number;
  outstandingLoan: number;
  monthlyMortgage: number;
  rentalIncome: number;
  remainingLease: number;
  isMainResidence: boolean;
  annualAppreciation: number;
}

export type InvestmentType =
  | 'stocks'
  | 'etf'
  | 'reit'
  | 'bonds'
  | 'unitTrust'
  | 'endowment'
  | 'crypto'
  | 'srs'
  | 'tbills'
  | 'ssb'
  | 'other';

export interface Investment {
  id: string;
  type: InvestmentType;
  name: string;
  currentValue: number;
  annualReturn: number;
  monthlyContribution: number;
}

export interface AssetsData {
  savingsAccounts: number;
  fixedDeposits: number;
  singaporeSavingsBonds: number;
  srsBalance: number;
  properties: Property[];
  investments: Investment[];
  businessValuation: number;
  businessOwnershipPct: number;
}

export type LiabilityType =
  | 'mortgage'
  | 'car'
  | 'renovation'
  | 'personal'
  | 'creditCard'
  | 'education'
  | 'other';

export interface LiabilityItem {
  id: string;
  type: LiabilityType;
  name: string;
  outstandingBalance: number;
  monthlyPayment: number;
  interestRate: number;
  remainingMonths: number;
}

export type InsuranceType =
  | 'hospitalisation'
  | 'term'
  | 'wholeLife'
  | 'ci'
  | 'eci'
  | 'disabilityIncome'
  | 'personalAccident'
  | 'careShield'
  | 'careShieldSupplement';

export interface InsurancePolicy {
  id: string;
  type: InsuranceType;
  insurer: string;
  name: string;
  annualPremium: number;
  premiumEndAge: number;       // age at which premium payments stop

  // ── Term / Whole Life specific ─────────────────────────────────────────────
  // Death and TPD coverage (can end earlier than CI, e.g. term to 65 for death)
  deathTPDSumAssured: number;
  deathTPDCoverageUntilAge: number;

  // Late-stage Critical Illness rider/benefit
  ciSumAssured: number;
  ciCoverageUntilAge: number;

  // Early Critical Illness rider/benefit
  eciSumAssured: number;
  eciCoverageUntilAge: number;

  // ── Standalone CI / ECI ────────────────────────────────────────────────────
  // (uses ciSumAssured / eciSumAssured above + their coverage ages)

  // ── Disability Income specific ─────────────────────────────────────────────
  monthlyBenefit: number;

  // ── Integrated Shield Plan specific ───────────────────────────────────────
  wardType: 'b1' | 'a' | 'private';
  hasRider: boolean;

  // ── Generic (personal accident, careShield) ────────────────────────────────
  sumAssured: number;
  coverageUntilAge: number;
}

export interface InsuranceData {
  policies: InsurancePolicy[];
  hasCareShieldLife: boolean;
}

export type GoalCategory =
  | 'property'
  | 'education'
  | 'vehicle'
  | 'travel'
  | 'wedding'
  | 'renovation'
  | 'legacy'
  | 'sabbatical'
  | 'other';

export interface Goal {
  id: string;
  name: string;
  category: GoalCategory;
  currentCost: number;
  targetYear: number;
  priority: 'high' | 'medium' | 'low';
  inflationRate: number;
  isFunded: boolean;
  // Property-specific
  propertyDownpayment?: number;
  downpaymentSource?: 'cash' | 'cpf_oa';
}

// ─── Retirement Goals ────────────────────────────────────────────────────────

export interface RetirementGoals {
  monthlyExpenses: number;         // expected monthly spending in retirement (today's S$)
  monthlyPassiveIncomeTarget: number; // desired monthly passive income (today's S$) — should cover expenses + buffer
  safeWithdrawalRate: number;      // % p.a. to draw from portfolio (default 4%)
}

export interface PlanningAssumptions {
  generalInflation: number;
  healthcareInflation: number;
  educationInflation: number;
  investmentReturn: number;
  propertyGrowthRate: number;
  cpfOARate: number;
  cpfSARate: number;
  cpfMARate: number;
  cpfRARate: number;
}

// ─── The Complete Financial Plan ─────────────────────────────────────────────

export interface FinancialPlan {
  client: ClientProfile;
  income: IncomeData;
  expenses: ExpenseData;
  cpf: CPFData;
  assets: AssetsData;
  liabilities: LiabilityItem[];
  insurance: InsuranceData;
  goals: Goal[];
  retirementGoals: RetirementGoals;
  assumptions: PlanningAssumptions;
}

// ─── Projection Output ───────────────────────────────────────────────────────

export interface YearlyProjection {
  age: number;
  year: number;
  isRetired: boolean;
  isSemiRetired: boolean;

  // Income
  employmentIncome: number;
  passiveIncome: number;
  cpfLifePayout: number;
  swrWithdrawal: number;
  totalIncome: number;

  // Outflows
  totalExpenses: number;
  goalFunding: number;
  taxes: number;
  debtRepayments: number;
  totalOutflows: number;

  // Net
  netCashflow: number;
  savingsRate: number;

  // CPF
  cpfEmployee: number;
  cpfEmployer: number;
  cpfOA: number;
  cpfSA: number;
  cpfMA: number;
  cpfRA: number;
  cpfTotal: number;

  // Balances
  cashBalance: number;
  investmentBalance: number;
  propertyValue: number;
  srsBalance: number;
  businessValue: number;

  // Liabilities
  totalLiabilities: number;

  // Summary
  totalAssets: number;
  netWorth: number;
}

// ─── Retirement Analysis ─────────────────────────────────────────────────────

export interface RetirementAnalysis {
  // ── User targets (inflated to retirement year) ────────────────────────────
  monthlyExpenseTarget: number;
  monthlyPassiveIncomeTarget: number;

  // ── Projected income sources at retirement (monthly, retirement-year $) ───
  cpfLifeMonthlyIncome: number;
  rentalMonthly: number;
  dividendMonthly: number;
  portfolioWithdrawalMonthly: number;   // safe withdrawal rate × projected portfolio
  otherPassiveMonthly: number;
  totalProjectedPassiveIncome: number;

  // ── Gap ───────────────────────────────────────────────────────────────────
  passiveIncomeGap: number;             // target − projected (positive = shortfall)

  // ── Portfolio ─────────────────────────────────────────────────────────────
  corpusRequired: number;               // portfolio needed to generate target via SWR
  corpusProjected: number;              // projected investable assets at retirement

  // ── Sustainability ────────────────────────────────────────────────────────
  fundingStatus: 'significant-shortfall' | 'at-risk' | 'adequate' | 'comfortable';
  assetExhaustionAge: number | null;
  surplusAtAge100: number;
  retirementFeasible: boolean;
}

// ─── Insurance Analysis ──────────────────────────────────────────────────────

export interface InsuranceGap {
  deathCoverageRequired: number;
  deathCoverageHeld: number;
  deathCoverageGap: number;
  ciCoverageRequired: number;
  ciCoverageHeld: number;
  ciCoverageGap: number;
  disabilityMonthlyRequired: number;
  disabilityMonthlyHeld: number;
  disabilityGap: number;
  hasHospitalisationCoverage: boolean;
  hospitalisationGap: string;
}

// ─── Stress Test ─────────────────────────────────────────────────────────────

export interface StressTestScenario {
  id: string;
  name: string;
  description: string;
}

export interface StressTestInput {
  // Critical Illness
  criticalIllnessAge: number;
  criticalIllnessMedicalCost: number;
  criticalIllnessRecoveryMonths: number;
  criticalIllnessType: 'early' | 'late';
  // Permanent Disability
  disabilityAge: number;
  // Job Loss
  jobLossMonths: number;
  // Bear Market
  bearMarketLossPct: number;
  bearMarketDurationYears: number;
  // Inflation
  inflationRate: number;
  inflationDurationYears: number;
}

export interface StressTestResult {
  scenarioName: string;
  assetExhaustionAge: number | null;
  retirementImpact: string;
  netWorthImpact: number;
  netWorthImpactPct: number;
  projections: YearlyProjection[];
  isViable: boolean;
  eventAge?: number;
  chartData?: { age: number; baseCase: number; stressed: number }[];
  eventBreakdown?: { label: string; amount: number }[]; // cost components
}

// ─── Financial Health Scores ─────────────────────────────────────────────────

export interface FinancialHealthScores {
  overall: number;
  retirementReadiness: number;
  protectionScore: number;
  liquidityScore: number;
  estatePlanningScore: number;
  debtScore: number;
  savingsScore: number;
}

// ─── Default Values ───────────────────────────────────────────────────────────

export const defaultRetirementGoals: RetirementGoals = {
  monthlyExpenses: 3000,
  monthlyPassiveIncomeTarget: 3500,
  safeWithdrawalRate: 4,
};

export const defaultAssumptions: PlanningAssumptions = {
  generalInflation: 2.5,
  healthcareInflation: 5.0,
  educationInflation: 5.0,
  investmentReturn: 5.0,
  propertyGrowthRate: 2.0,
  cpfOARate: 2.5,
  cpfSARate: 4.0,
  cpfMARate: 4.0,
  cpfRARate: 4.0,
};

export const defaultClient: ClientProfile = {
  name: '',
  age: 35,
  gender: 'male',
  maritalStatus: 'single',
  dependants: [],
  retirementAge: 62,
  lifeExpectancy: 100,
  occupation: '',
  employerType: 'private',
  healthConditions: '',
  smokingStatus: false,
  residencyStatus: 'citizen',
};

export const defaultIncome: IncomeData = {
  monthlySalary: 5000,
  annualBonus: 0,
  variableComp: 0,
  rentalIncome: 0,
  dividendIncome: 0,
  businessIncome: 0,
  otherIncome: 0,
  salaryGrowthRate: 3,
  semiRetirementAge: 58,
  semiRetirementIncome: 2000,
  retirementPassiveIncome: 0,
};

export const defaultExpenses: ExpenseData = {
  food: 600,
  utilities: 200,
  healthcare: 100,
  transport: 400,
  mortgage: 1500,
  mortgageEndAge: 65,
  insurancePremiums: 300,
  insurancePremiumsEndAge: 65,
  customEssential: [],
  travel: 300,
  dining: 300,
  entertainment: 100,
  hobbies: 100,
  customLifestyle: [],
  parentsAllowance: 500,
  parentsAllowanceEndAge: 75,
  childrenExpenses: 0,
  childrenExpensesEndAge: 55,
  otherDependants: 0,
  otherDependantsEndAge: 65,
  customFamily: [],
};

export const defaultCPF: CPFData = {
  oaBalance: 50000,
  saBalance: 30000,
  maBalance: 40000,
  raBalance: 0,
  housingWithdrawals: 0,
  voluntaryContributions: 0,
  rstuTopUps: 0,
  oaWithdrawalIntent: 'compound',
  oaWithdrawalAge: 55,
  oaLumpSumAmount: 0,
  oaMonthlyDrawdown: 0,
};

export const defaultAssets: AssetsData = {
  savingsAccounts: 30000,
  fixedDeposits: 0,
  singaporeSavingsBonds: 0,
  srsBalance: 0,
  properties: [],
  investments: [],
  businessValuation: 0,
  businessOwnershipPct: 0,
};

export const defaultInsurance: InsuranceData = {
  policies: [],
  hasCareShieldLife: false,
};

export const defaultStressTestInput: StressTestInput = {
  criticalIllnessAge: 50,
  criticalIllnessMedicalCost: 150000,
  criticalIllnessRecoveryMonths: 12,
  criticalIllnessType: 'late',
  disabilityAge: 45,
  jobLossMonths: 6,
  bearMarketLossPct: 30,
  bearMarketDurationYears: 2,
  inflationRate: 5,
  inflationDurationYears: 3,
};

export const defaultPlan: FinancialPlan = {
  client: defaultClient,
  income: defaultIncome,
  expenses: defaultExpenses,
  cpf: defaultCPF,
  assets: defaultAssets,
  liabilities: [],
  insurance: defaultInsurance,
  goals: [],
  retirementGoals: defaultRetirementGoals,
  assumptions: defaultAssumptions,
};
