'use client';

import { useEffect } from 'react';
import { useFinancialStore } from '@/lib/store';
import { PageLayout } from '@/components/layout/PageLayout';
import type { InvestmentType } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { formatCurrency, formatPercent } from '@/lib/utils';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import {
  TrendingUp, TrendingDown, AlertCircle, CheckCircle,
  DollarSign, Shield, Activity, Clock,
} from 'lucide-react';

const CHART_COLORS = ['#0d9488', '#4f46e5', '#f59e0b', '#ef4444', '#10b981', '#06b6d4'];

const INVESTMENT_TYPE_COLORS: Record<InvestmentType, string> = {
  stocks:      '#f97316',
  etf:         '#3b82f6',
  reit:        '#f59e0b',
  bonds:       '#1d4ed8',
  unitTrust:   '#8b5cf6',
  endowment:   '#6366f1',
  crypto:      '#22c55e',
  srs:         '#0d9488',
  tbills:      '#06b6d4',
  ssb:         '#14b8a6',
  other:       '#9ca3af',
};

const INVESTMENT_TYPE_LABELS: Record<InvestmentType, string> = {
  stocks:      'Stocks',
  etf:         'ETFs',
  reit:        'REITs',
  bonds:       'Bonds',
  unitTrust:   'Unit Trusts',
  endowment:   'Endowment',
  crypto:      'Crypto',
  srs:         'SRS',
  tbills:      'T-Bills',
  ssb:         'SSBs',
  other:       'Other',
};

function ScoreGauge({ score, label, color }: { score: number; label: string; color: string }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-20 h-20">
        <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
          <circle cx="18" cy="18" r="15.9" fill="none" stroke="#e5e7eb" strokeWidth="3" />
          <circle
            cx="18" cy="18" r="15.9" fill="none" stroke={color} strokeWidth="3"
            strokeDasharray={`${score} 100`} strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-lg font-bold">{score}</span>
        </div>
      </div>
      <p className="text-xs text-muted-foreground text-center font-medium">{label}</p>
    </div>
  );
}

function SummaryCard({
  title, value, subtitle, icon: Icon, trend, color,
}: {
  title: string; value: string; subtitle?: string;
  icon: React.ElementType; trend?: 'up' | 'down' | 'neutral'; color?: string;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-sm text-muted-foreground font-medium truncate">{title}</p>
            <p className="text-2xl font-bold mt-1 text-foreground">{value}</p>
            {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
          </div>
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ml-3 ${color ?? 'bg-teal-50'}`}>
            <Icon className={`h-5 w-5 ${color ? 'text-white' : 'text-teal-600'}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const { plan, projections, retirementAnalysis, insuranceGap, healthScores, recalculate } = useFinancialStore();

  useEffect(() => {
    if (projections.length === 0) recalculate();
  }, []);

  const currentNetWorth = projections[0]?.netWorth ?? 0;
  const monthlyIncome = plan.income.monthlySalary + plan.income.dividendIncome + plan.income.otherIncome;
  const monthlyExpenses =
    plan.expenses.food + plan.expenses.utilities + plan.expenses.healthcare +
    plan.expenses.mortgage + plan.expenses.insurancePremiums + plan.expenses.transport +
    plan.expenses.travel + plan.expenses.dining + plan.expenses.entertainment +
    plan.expenses.hobbies + plan.expenses.parentsAllowance + plan.expenses.childrenExpenses;
  const savingsRate = monthlyIncome > 0 ? ((monthlyIncome - monthlyExpenses) / monthlyIncome) * 100 : 0;

  // Net worth over time (every 5 years)
  const netWorthData = projections
    .filter((p) => p.age % 5 === 0 || p.age === plan.client.age)
    .map((p) => ({
      age: p.age,
      'Liquid Assets': Math.max(0, p.cashBalance + p.investmentBalance +
        (p.age >= 55 ? p.cpfOA : 0) +
        (p.isRetired ? p.srsBalance : 0)),
    }));

  // Income vs expenses for working years
  const incomeExpenseData = projections
    .filter((p) => p.age % 5 === 0 || p.age === plan.client.age)
    .slice(0, 10)
    .map((p) => ({
      age: p.age,
      Income: p.totalIncome,
      Expenses: p.totalOutflows,
    }));

  // Asset allocation — per investment type for richer colour coding
  const firstProj = projections[0];
  const investmentsByType = plan.assets.investments.reduce<Partial<Record<InvestmentType, number>>>((acc, inv) => {
    acc[inv.type] = (acc[inv.type] ?? 0) + inv.currentValue;
    return acc;
  }, {});
  const totalProperty = plan.assets.properties.reduce((s, p) => s + p.marketValue, 0);
  const totalBusiness = plan.assets.businessValuation * (plan.assets.businessOwnershipPct / 100);
  const cpfTotal = firstProj?.cpfTotal ?? 0;
  const allocationData = [
    { name: 'Cash & Savings', value: plan.assets.savingsAccounts + plan.assets.fixedDeposits, color: '#0d9488' },
    { name: 'SSB / T-Bills',  value: plan.assets.singaporeSavingsBonds, color: '#06b6d4' },
    { name: 'SRS',            value: plan.assets.srsBalance, color: '#8b5cf6' },
    ...(Object.entries(investmentsByType) as [InvestmentType, number][]).map(([type, value]) => ({
      name: INVESTMENT_TYPE_LABELS[type],
      value,
      color: INVESTMENT_TYPE_COLORS[type],
    })),
    { name: 'Property',  value: totalProperty, color: '#f59e0b' },
    { name: 'CPF',       value: cpfTotal,      color: '#10b981' },
    { name: 'Business',  value: totalBusiness, color: '#a855f7' },
  ].filter((d) => d.value > 0);

  const fundingStatusConfig = {
    'comfortable': { label: 'Comfortable', color: 'success' as const, icon: CheckCircle },
    'adequate': { label: 'Adequate', color: 'info' as const, icon: CheckCircle },
    'at-risk': { label: 'At Risk', color: 'warning' as const, icon: AlertCircle },
    'significant-shortfall': { label: 'Significant Shortfall', color: 'destructive' as const, icon: TrendingDown },
  };
  const fundingStatus = retirementAnalysis?.fundingStatus ?? 'adequate';
  const statusConfig = fundingStatusConfig[fundingStatus];

  const retirementVerdict = !retirementAnalysis ? null
    : retirementAnalysis.fundingStatus === 'comfortable' || retirementAnalysis.fundingStatus === 'adequate'
      ? { label: 'YES — Retirement Feasible',       color: 'text-green-600', bg: 'bg-green-50 border-green-200' }
      : retirementAnalysis.fundingStatus === 'at-risk'
      ? { label: 'BORDERLINE — Needs Attention',    color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200' }
      : { label: 'NO — Significant Shortfall',      color: 'text-red-600',   bg: 'bg-red-50 border-red-200' };

  return (
    <PageLayout
      title={`Financial Dashboard${plan.client.name ? ` — ${plan.client.name}` : ''}`}
      description="Lifetime cashflow sustainability analysis | Deterministic model | Singapore Edition"
    >
      {/* Retirement Verdict Banner */}
      <div className={`rounded-lg border p-4 mb-6 ${retirementVerdict ? retirementVerdict.bg : 'bg-slate-50 border-slate-200'}`}>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Retirement Sustainability Verdict</p>
            <p className={`text-xl font-bold mt-1 ${retirementVerdict ? retirementVerdict.color : 'text-slate-500'}`}>
              {retirementVerdict ? retirementVerdict.label : 'Enter your data to generate analysis'}
            </p>
          </div>
          <div className="flex gap-6 text-center">
            <div>
              <p className="text-xs text-muted-foreground">Asset Exhaustion Age</p>
              <p className="text-xl font-bold text-foreground">
                {retirementAnalysis?.assetExhaustionAge
                  ? `Age ${retirementAnalysis.assetExhaustionAge}`
                  : retirementAnalysis ? '> Age 100 ✓' : '—'}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Surplus at Age 100</p>
              <p className="text-xl font-bold text-foreground">
                {retirementAnalysis ? formatCurrency(retirementAnalysis.surplusAtAge100) : '—'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <SummaryCard
          title="Net Worth"
          value={formatCurrency(currentNetWorth)}
          subtitle={`Age ${plan.client.age}`}
          icon={DollarSign}
          color="bg-teal-500"
        />
        <SummaryCard
          title="Monthly Savings"
          value={formatCurrency(monthlyIncome - monthlyExpenses)}
          subtitle={`${formatPercent(savingsRate)} savings rate`}
          icon={TrendingUp}
          color="bg-emerald-500"
        />
        <SummaryCard
          title="CPF Total"
          value={formatCurrency((projections[0]?.cpfTotal ?? 0))}
          subtitle="All CPF accounts"
          icon={Shield}
          color="bg-indigo-500"
        />
        <SummaryCard
          title="Retirement Age"
          value={`Age ${plan.client.retirementAge}`}
          subtitle={`${Math.max(0, plan.client.retirementAge - plan.client.age)} years away`}
          icon={Clock}
          color="bg-amber-500"
        />
      </div>

      {/* Health Scores */}
      <Card className="mb-6">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Financial Health Scores</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-around flex-wrap gap-4 py-2">
            {healthScores ? (
              <>
                <div className="text-center">
                  <div className="text-4xl font-bold" style={{ color: '#0d9488' }}>{healthScores.overall}</div>
                  <div className="text-sm font-semibold text-foreground mt-1">Overall Score</div>
                  <div className="text-xs text-muted-foreground">out of 100</div>
                </div>
                <div className="h-16 w-px bg-border hidden md:block" />
                <ScoreGauge score={healthScores.retirementReadiness} label="Retirement Readiness" color="#0d9488" />
                <ScoreGauge score={healthScores.protectionScore} label="Protection" color="#10b981" />
                <ScoreGauge score={healthScores.liquidityScore} label="Liquidity" color="#f59e0b" />
                <ScoreGauge score={healthScores.savingsScore} label="Savings" color="#4f46e5" />
                <ScoreGauge score={healthScores.debtScore} label="Debt" color="#06b6d4" />
                <ScoreGauge score={healthScores.estatePlanningScore} label="Estate Planning" color="#ef4444" />
              </>
            ) : (
              <p className="text-sm text-muted-foreground py-4">Complete your profile to generate health scores</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Net Worth Over Time */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Net Worth Projection</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={netWorthData}>
                <defs>
                  <linearGradient id="nwGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0d9488" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#0d9488" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="age" tick={{ fontSize: 11 }} label={{ value: 'Age', position: 'insideBottom', offset: -2, fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${(v / 1000000).toFixed(1)}M`} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} labelFormatter={(l) => `Age ${l}`} />
                <Area type="monotone" dataKey="Liquid Assets" stroke="#0d9488" fill="url(#nwGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Income vs Expenses */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Income vs Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={incomeExpenseData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="age" tick={{ fontSize: 11 }} label={{ value: 'Age', position: 'insideBottom', offset: -2, fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}K`} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} labelFormatter={(l) => `Age ${l}`} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="Income" fill="#0d9488" radius={[2, 2, 0, 0]} />
                <Bar dataKey="Expenses" fill="#f87171" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Asset Allocation */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Asset Allocation</CardTitle>
          </CardHeader>
          <CardContent>
            {allocationData.length > 0 ? (
              <div className="flex flex-col items-center">
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie data={allocationData} cx="50%" cy="50%" outerRadius={65} dataKey="value">
                      {allocationData.map((entry, index) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => formatCurrency(v)} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 w-full mt-2">
                  {allocationData.map((d) => {
                    const total = allocationData.reduce((s, x) => s + x.value, 0);
                    return (
                      <div key={d.name} className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }} />
                        <span className="text-xs text-muted-foreground truncate">{d.name}</span>
                        <span className="text-xs font-medium ml-auto">
                          {total > 0 ? ((d.value / total) * 100).toFixed(0) : 0}%
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">Enter asset data to view allocation</p>
            )}
          </CardContent>
        </Card>

        {/* Insurance Gaps */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Insurance Coverage Gaps</CardTitle>
          </CardHeader>
          <CardContent>
            {insuranceGap ? (
              <div className="space-y-3">
                {[
                  { label: 'Death Coverage', held: insuranceGap.deathCoverageHeld, required: insuranceGap.deathCoverageRequired },
                  { label: 'Critical Illness', held: insuranceGap.ciCoverageHeld, required: insuranceGap.ciCoverageRequired },
                  { label: 'Disability Income', held: insuranceGap.disabilityMonthlyHeld * 12, required: insuranceGap.disabilityMonthlyRequired * 12 },
                ].map((item) => {
                  const pct = item.required > 0 ? Math.min(100, (item.held / item.required) * 100) : 100;
                  return (
                    <div key={item.label}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-muted-foreground">{item.label}</span>
                        <span className={pct >= 100 ? 'text-green-600 font-medium' : 'text-amber-600 font-medium'}>
                          {pct.toFixed(0)}% covered
                        </span>
                      </div>
                      <Progress value={pct} className={pct >= 100 ? '[&>div]:bg-green-500' : pct >= 50 ? '[&>div]:bg-amber-500' : '[&>div]:bg-red-500'} />
                    </div>
                  );
                })}
                <div className="text-xs mt-2 p-2 rounded bg-muted">
                  <span className="font-medium">Hospitalisation:</span>{' '}
                  <span className="text-muted-foreground">{insuranceGap.hospitalisationGap}</span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">Enter insurance data to view gaps</p>
            )}
          </CardContent>
        </Card>

        {/* Key Metrics */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Key Retirement Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            {retirementAnalysis ? (
              <div className="space-y-3">
                {[
                  { label: 'Corpus Required', value: formatCurrency(retirementAnalysis.corpusRequired), highlight: false },
                  { label: 'Corpus Projected', value: formatCurrency(retirementAnalysis.corpusProjected), highlight: true },
                  { label: 'CPF LIFE (monthly)', value: formatCurrency(retirementAnalysis.cpfLifeMonthlyIncome), highlight: false },
                  { label: 'Monthly Expenses at Retirement', value: formatCurrency(retirementAnalysis.monthlyExpenseTarget), highlight: false },
                  { label: 'Income Gap (monthly)', value: formatCurrency(retirementAnalysis.passiveIncomeGap), highlight: false },
                  { label: 'Funding Status', value: statusConfig.label, highlight: false, badge: true, badgeVariant: statusConfig.color },
                ].map((item) => (
                  <div key={item.label} className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">{item.label}</span>
                    {item.badge ? (
                      <Badge variant={item.badgeVariant as any}>{item.value}</Badge>
                    ) : (
                      <span className={`font-semibold ${item.highlight ? 'text-teal-600' : 'text-foreground'}`}>
                        {item.value}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">Run calculation to view metrics</p>
            )}
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}
