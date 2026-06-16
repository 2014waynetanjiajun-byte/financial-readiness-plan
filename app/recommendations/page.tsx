'use client';

import { useFinancialStore } from '@/lib/store';
import { PageLayout } from '@/components/layout/PageLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';
import { CheckCircle, AlertCircle, Clock, TrendingUp, Shield, PiggyBank, Home, Target } from 'lucide-react';

interface Recommendation {
  id: string;
  priority: 'immediate' | 'medium' | 'long';
  category: 'retirement' | 'insurance' | 'cashflow' | 'cpf' | 'investment' | 'estate' | 'tax';
  title: string;
  description: string;
  impact: string;
  quantifiedImpact?: number;
  action: string;
}

const CATEGORY_ICONS = {
  retirement: TrendingUp,
  insurance:  Shield,
  cashflow:   PiggyBank,
  cpf:        PiggyBank,
  investment: TrendingUp,
  estate:     Home,
  tax:        Target,
};

const CATEGORY_COLORS = {
  retirement: 'bg-blue-100 text-blue-700',
  insurance:  'bg-green-100 text-green-700',
  cashflow:   'bg-amber-100 text-amber-700',
  cpf:        'bg-purple-100 text-purple-700',
  investment: 'bg-teal-100 text-teal-700',
  estate:     'bg-slate-100 text-slate-700',
  tax:        'bg-orange-100 text-orange-700',
};

function generateRecommendations(plan: any, retirementAnalysis: any, insuranceGap: any, healthScores: any): Recommendation[] {
  const recs: Recommendation[] = [];

  // ── Immediate Actions ──────────────────────────────────────────────────────

  // Emergency fund
  const monthlyEssentials = (plan.expenses.food + plan.expenses.utilities + plan.expenses.healthcare +
    plan.expenses.mortgage + plan.expenses.insurancePremiums + plan.expenses.transport);
  const emergencyFundTarget = monthlyEssentials * 6;
  const liquidAssets = plan.assets.savingsAccounts;
  const monthsCoverage = liquidAssets / (monthlyEssentials || 1);

  if (monthsCoverage < 3) {
    recs.push({
      id: 'ef-critical',
      priority: 'immediate',
      category: 'cashflow',
      title: 'Build Emergency Fund — URGENT',
      description: `You have only ${monthsCoverage.toFixed(1)} months of essential expenses in liquid savings. This leaves you highly vulnerable to job loss or unexpected costs.`,
      impact: 'Eliminates risk of forced asset liquidation or debt during income disruption.',
      quantifiedImpact: emergencyFundTarget - liquidAssets,
      action: `Immediately redirect all surplus income to savings until you reach ${formatCurrency(emergencyFundTarget)} (6 months of essential expenses).`,
    });
  } else if (monthsCoverage < 6) {
    recs.push({
      id: 'ef-low',
      priority: 'immediate',
      category: 'cashflow',
      title: 'Top Up Emergency Fund to 6 Months',
      description: `Current coverage: ${monthsCoverage.toFixed(1)} months. Target: 6 months.`,
      impact: 'Provides financial cushion for job loss or unexpected major expenses.',
      quantifiedImpact: emergencyFundTarget - liquidAssets,
      action: `Save an additional ${formatCurrency(emergencyFundTarget - liquidAssets)} in a high-yield savings account or Singapore Savings Bond.`,
    });
  }

  // Insurance gaps
  if (insuranceGap) {
    if (!insuranceGap.hasHospitalisationCoverage) {
      recs.push({
        id: 'hosp-gap',
        priority: 'immediate',
        category: 'insurance',
        title: 'Purchase Integrated Shield Plan',
        description: 'No Integrated Shield Plan detected. You are relying solely on MediShield Life, which only covers Class B2/C subsidised wards.',
        impact: 'Prevents financial devastation from large hospitalisation bills.',
        action: 'Compare ISP plans from AIA, NTUC Income, Great Eastern, or Prudential. Recommend minimum Class A ward coverage with full rider.',
      });
    } else if (!plan.insurance.hasRider) {
      recs.push({
        id: 'isp-rider',
        priority: 'immediate',
        category: 'insurance',
        title: 'Add Full Rider to Integrated Shield Plan',
        description: 'Without a rider, you are exposed to co-insurance and deductible costs that can reach S$3,000+ per hospitalisation.',
        impact: 'Eliminates out-of-pocket costs for hospitalisation.',
        action: 'Contact your ISP insurer to add the full rider. Premium increase is typically S$100–300/year.',
      });
    }

    if (insuranceGap.deathCoverageGap > 0) {
      recs.push({
        id: 'life-gap',
        priority: 'immediate',
        category: 'insurance',
        title: 'Increase Life Insurance Coverage',
        description: `Your current death coverage of ${formatCurrency(insuranceGap.deathCoverageHeld)} falls short of the recommended ${formatCurrency(insuranceGap.deathCoverageRequired)}.`,
        impact: `Protects your family from a ${formatCurrency(insuranceGap.deathCoverageGap)} funding shortfall.`,
        quantifiedImpact: insuranceGap.deathCoverageGap,
        action: `Purchase additional term life cover of ${formatCurrency(insuranceGap.deathCoverageGap)} expiring at retirement. Term life is cost-effective — at age ${plan.client.age}, expect S$500–1,500/year for S$500K cover.`,
      });
    }

    if (insuranceGap.ciCoverageGap > 0) {
      recs.push({
        id: 'ci-gap',
        priority: 'immediate',
        category: 'insurance',
        title: 'Increase Critical Illness Coverage',
        description: `CI coverage gap of ${formatCurrency(insuranceGap.ciCoverageGap)}. CI diagnoses (cancer, heart attack, stroke) require 3–5 years income replacement plus treatment costs.`,
        impact: `Eliminates CI funding gap. Preserves retirement savings during recovery.`,
        quantifiedImpact: insuranceGap.ciCoverageGap,
        action: `Add a standalone CI or ECI policy. Recommended: ${formatCurrency(insuranceGap.ciCoverageRequired)} total CI coverage.`,
      });
    }
  }

  // Retirement shortfall
  if (retirementAnalysis) {
    if (!retirementAnalysis.retirementFeasible) {
      const deficit = retirementAnalysis.corpusRequired - retirementAnalysis.corpusProjected;
      recs.push({
        id: 'ret-shortfall',
        priority: 'immediate',
        category: 'retirement',
        title: 'Address Retirement Corpus Shortfall',
        description: `Projected retirement corpus of ${formatCurrency(retirementAnalysis.corpusProjected)} falls short of the required ${formatCurrency(retirementAnalysis.corpusRequired)} by ${formatCurrency(deficit)}.`,
        impact: `Closing this gap ensures financial sustainability to age ${plan.client.lifeExpectancy}.`,
        quantifiedImpact: deficit,
        action: 'Increase monthly savings rate, defer retirement by 2–3 years, or reduce retirement spending. See medium-term actions for specific steps.',
      });
    }
  }

  // ── Medium-Term Actions ────────────────────────────────────────────────────

  // CPF Top-up (RSTU)
  if (plan.client.age < 55 && plan.cpf.rstuTopUps < 8000) {
    const topUpAmount = 8000 - plan.cpf.rstuTopUps;
    const taxSaving = topUpAmount * 0.07; // rough 7% effective rate
    recs.push({
      id: 'rstu',
      priority: 'medium',
      category: 'cpf',
      title: 'Maximise CPF RSTU Top-up (S$8,000/year)',
      description: `You are currently contributing ${formatCurrency(plan.cpf.rstuTopUps)}/year via RSTU. The maximum is S$8,000/year, which earns 4% p.a. and qualifies for income tax relief.`,
      impact: `Additional S${topUpAmount.toLocaleString()} top-up earns S$${(topUpAmount * 0.04).toFixed(0)}/year in CPF interest and saves approximately ${formatCurrency(taxSaving)} in income tax annually.`,
      quantifiedImpact: topUpAmount * 0.04 * 20, // 20-year compounded interest benefit
      action: `Top up your SA (under 55) or RA (over 55) with ${formatCurrency(topUpAmount)} this year via the CPF website. Claim tax relief in your income tax return.`,
    });
  }

  // Savings rate below 20%
  const monthlyIncome = plan.income.monthlySalary + plan.income.dividendIncome + plan.income.otherIncome;
  const monthlyExpenses = monthlyEssentials + plan.expenses.travel + plan.expenses.dining +
    plan.expenses.entertainment + plan.expenses.hobbies + plan.expenses.parentsAllowance +
    plan.expenses.childrenExpenses;
  const savingsRate = monthlyIncome > 0 ? ((monthlyIncome - monthlyExpenses) / monthlyIncome) * 100 : 0;

  if (savingsRate < 20 && savingsRate >= 0) {
    recs.push({
      id: 'savings-rate',
      priority: 'medium',
      category: 'cashflow',
      title: `Increase Savings Rate to 20% (Current: ${savingsRate.toFixed(0)}%)`,
      description: 'A 20% savings rate is the minimum recommended for retirement planning. Rates below 20% typically result in retirement corpus shortfalls.',
      impact: 'Each 5% increase in savings rate on a S$5,000/month salary generates approximately S$370,000 additional retirement corpus over 25 years (at 6% returns).',
      action: 'Review discretionary spending (dining, travel, entertainment). Automate transfers to investment account on payday to enforce savings discipline.',
    });
  }

  // Investment diversification
  const totalInvestments = plan.assets.investments.reduce((s: number, i: any) => s + i.currentValue, 0);
  const totalAssets = plan.assets.savingsAccounts + totalInvestments;
  if (totalInvestments < totalAssets * 0.4 && totalAssets > 50000) {
    recs.push({
      id: 'invest-alloc',
      priority: 'medium',
      category: 'investment',
      title: 'Increase Invested Assets for Long-Term Growth',
      description: `${((totalInvestments / totalAssets) * 100).toFixed(0)}% of liquid assets are invested. Excess cash in low-yield savings accounts loses real purchasing power to inflation.`,
      impact: 'Moving excess cash to diversified ETFs can generate 3–4% more in annual returns, compounding significantly over the long term.',
      action: 'Consider a low-cost globally diversified ETF portfolio (e.g., VWRA or VT). Invest monthly via IBKR, FSMOne, or SGX. Ensure 6-month emergency fund remains in cash.',
    });
  }

  // SRS contribution for tax planning
  if (plan.income.monthlySalary > 5000 && plan.assets.srsBalance < 15300) {
    recs.push({
      id: 'srs',
      priority: 'medium',
      category: 'tax',
      title: 'Open and Fund SRS Account for Tax Relief',
      description: 'Supplementary Retirement Scheme contributions (max S$15,300/year for Singapore Citizens/PRs) are deductible against income tax.',
      impact: `On a salary of ${formatCurrency(plan.income.monthlySalary * 12)}, S$15,300 SRS contribution saves approximately ${formatCurrency(15300 * 0.07)} in tax annually.`,
      action: 'Open an SRS account with DBS, OCBC, or UOB. Invest SRS funds in ETFs or unit trusts rather than leaving in cash (SRS cash earns only 0.05%).',
    });
  }

  // Disability income insurance
  if (insuranceGap && insuranceGap.disabilityGap > 0) {
    recs.push({
      id: 'dis-income',
      priority: 'medium',
      category: 'insurance',
      title: 'Purchase Disability Income Insurance',
      description: `You are under-insured for disability income. Current monthly coverage: ${formatCurrency(insuranceGap.disabilityMonthlyHeld)}. Required: ${formatCurrency(insuranceGap.disabilityMonthlyRequired)}.`,
      impact: 'Disability income insurance replaces 75% of your income if you cannot work, protecting your retirement savings.',
      action: `Purchase a disability income policy with ${formatCurrency(insuranceGap.disabilityGap)}/month additional benefit. Waiting period: 60–90 days. Benefit period: to age 65.`,
    });
  }

  // ── Long-Term Actions ──────────────────────────────────────────────────────

  // CPF LIFE tier
  const estimatedRA = plan.cpf.saBalance + plan.cpf.oaBalance * 0.5;
  if (estimatedRA < 205800 * 0.8) {
    recs.push({
      id: 'cpf-life-ers',
      priority: 'long',
      category: 'cpf',
      title: 'Work Towards Full Retirement Sum (FRS) for CPF LIFE',
      description: `Your projected RA at 55 may fall below the FRS (S$205,800). Achieving FRS generates ~S$1,800–2,000/month in CPF LIFE payout from age 65.`,
      impact: 'Every S$100,000 additional in RA generates approximately S$950–1,000/month in lifelong CPF LIFE income.',
      action: 'Maximise RSTU top-ups annually. Reduce housing OA withdrawals where possible. Avoid SA early withdrawal after 55.',
    });
  }

  // Estate planning
  recs.push({
    id: 'estate-will',
    priority: 'long',
    category: 'estate',
    title: 'Establish Estate Planning Documents',
    description: 'A valid Will, CPF nomination, insurance policy nomination, and Lasting Power of Attorney (LPA) are essential for ensuring your assets are distributed per your wishes.',
    impact: 'Without a Will, assets are distributed per Intestate Succession Act. Without CPF nomination, CPF monies are paid to Public Trustee and subject to delays.',
    action: '(1) Draft a Will with a lawyer (cost: S$200–500). (2) Submit CPF Nomination via CPF website — free. (3) Register an LPA via Office of the Public Guardian — S$75 application fee. (4) Review insurance policy nominations.',
  });

  // Property retirement strategy (if approaching retirement)
  if (plan.assets.properties.length > 0 && plan.client.age >= 50) {
    const mainProperty = plan.assets.properties.find((p: any) => p.isMainResidence);
    if (mainProperty) {
      recs.push({
        id: 'property-strategy',
        priority: 'long',
        category: 'retirement',
        title: 'Evaluate Property Monetisation Strategy',
        description: `Your main property (${formatCurrency(mainProperty.marketValue)}) represents significant wealth. Consider the Silver Housing Bonus, downgrading, or lease buyback to generate retirement income.`,
        impact: 'Downsizing from a 4-room to 3-room HDB can release S$200,000–400,000 in equity, providing significant retirement cashflow.',
        action: 'Explore (a) Silver Housing Bonus (downgrade to 3-room or smaller HDB), (b) HDB Lease Buyback Scheme, or (c) renting out rooms (Rental Scheme). Consult a financial adviser before age 60.',
      });
    }
  }

  return recs;
}

export default function RecommendationsPage() {
  const { plan, retirementAnalysis, insuranceGap, healthScores } = useFinancialStore();
  const recommendations = generateRecommendations(plan, retirementAnalysis, insuranceGap, healthScores);

  const immediate = recommendations.filter((r) => r.priority === 'immediate');
  const medium    = recommendations.filter((r) => r.priority === 'medium');
  const longTerm  = recommendations.filter((r) => r.priority === 'long');

  function RecGroup({ title, recs, color, icon: Icon, subtitle }: any) {
    if (recs.length === 0) return null;
    return (
      <div>
        <div className={`flex items-center gap-3 px-4 py-3 rounded-lg mb-4 ${color}`}>
          <Icon className="h-5 w-5" />
          <div>
            <h2 className="font-bold text-base">{title}</h2>
            <p className="text-xs opacity-80">{subtitle}</p>
          </div>
          <Badge variant="secondary" className="ml-auto">{recs.length} action{recs.length > 1 ? 's' : ''}</Badge>
        </div>
        <div className="space-y-4 mb-8">
          {recs.map((r: Recommendation, i: number) => {
            const CatIcon = CATEGORY_ICONS[r.category];
            return (
              <Card key={r.id} className="overflow-hidden">
                <div className={`h-1 ${r.priority === 'immediate' ? 'bg-red-400' : r.priority === 'medium' ? 'bg-amber-400' : 'bg-blue-400'}`} />
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 font-bold text-sm ${CATEGORY_COLORS[r.category]}`}>
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3 flex-wrap mb-2">
                        <h3 className="font-semibold text-base text-foreground">{r.title}</h3>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${CATEGORY_COLORS[r.category]}`}>
                            {r.category.charAt(0).toUpperCase() + r.category.slice(1)}
                          </span>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">{r.description}</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="p-3 rounded-lg bg-green-50 border border-green-100">
                          <p className="text-xs font-semibold text-green-700 mb-1 uppercase tracking-wide">Impact</p>
                          <p className="text-sm text-green-800">{r.impact}</p>
                          {r.quantifiedImpact && (
                            <p className="text-base font-bold text-green-700 mt-1">{formatCurrency(r.quantifiedImpact)}</p>
                          )}
                        </div>
                        <div className="p-3 rounded-lg bg-blue-50 border border-blue-100">
                          <p className="text-xs font-semibold text-blue-700 mb-1 uppercase tracking-wide">Action Required</p>
                          <p className="text-sm text-blue-800">{r.action}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <PageLayout title="Recommendations" description="Prioritised action plan based on your financial analysis">
      {/* Score Overview */}
      {healthScores && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Overall Score',         score: healthScores.overall,            color: 'text-blue-600' },
            { label: 'Retirement Readiness',  score: healthScores.retirementReadiness, color: 'text-green-600' },
            { label: 'Protection Score',      score: healthScores.protectionScore,     color: 'text-purple-600' },
            { label: 'Liquidity Score',       score: healthScores.liquidityScore,      color: 'text-amber-600' },
          ].map(({ label, score, color }) => (
            <Card key={label}>
              <CardContent className="p-4 text-center">
                <p className={`text-4xl font-bold ${color}`}>{score}</p>
                <p className="text-xs text-muted-foreground mt-1 font-medium">{label}</p>
                <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${score >= 80 ? 'bg-green-500' : score >= 60 ? 'bg-amber-500' : 'bg-red-500'}`}
                    style={{ width: `${score}%` }}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {recommendations.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
            <p className="text-lg font-semibold">Complete your financial profile first</p>
            <p className="text-sm text-muted-foreground mt-1">Fill in client info, income, expenses, assets, and insurance to generate personalised recommendations.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <RecGroup
            title="Immediate Actions" subtitle="Complete within 0–12 months — high impact, high urgency"
            recs={immediate} color="bg-red-50 text-red-800 border border-red-200" icon={AlertCircle}
          />
          <RecGroup
            title="Medium-Term Actions" subtitle="Complete within 1–5 years — builds financial resilience"
            recs={medium} color="bg-amber-50 text-amber-800 border border-amber-200" icon={Clock}
          />
          <RecGroup
            title="Long-Term Actions" subtitle="5+ year horizon — secures your retirement future"
            recs={longTerm} color="bg-blue-50 text-blue-800 border border-blue-200" icon={TrendingUp}
          />
        </>
      )}
    </PageLayout>
  );
}
