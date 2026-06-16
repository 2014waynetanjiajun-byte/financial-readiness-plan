'use client';

import { useFinancialStore } from '@/lib/store';
import { PageLayout } from '@/components/layout/PageLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { formatCurrency } from '@/lib/utils';
import { defaultRetirementGoals } from '@/lib/types';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine, Cell,
} from 'recharts';
import { CheckCircle, AlertCircle, XCircle, Target, TrendingUp } from 'lucide-react';

const FUNDING_STATUS_CONFIG = {
  'comfortable':           { label: 'COMFORTABLE',           verdict: 'YES',        color: 'text-green-700',  bg: 'bg-green-50 border-green-200',   icon: CheckCircle },
  'adequate':              { label: 'ADEQUATE',              verdict: 'YES',        color: 'text-blue-700',   bg: 'bg-blue-50 border-blue-200',     icon: CheckCircle },
  'at-risk':               { label: 'AT RISK',               verdict: 'BORDERLINE', color: 'text-amber-700',  bg: 'bg-amber-50 border-amber-200',   icon: AlertCircle },
  'significant-shortfall': { label: 'SIGNIFICANT SHORTFALL', verdict: 'NO',         color: 'text-red-700',    bg: 'bg-red-50 border-red-200',       icon: XCircle },
};

const SOURCE_COLORS: Record<string, string> = {
  'CPF LIFE':            '#8b5cf6',
  'Rental Income':       '#10b981',
  'Dividends':           '#3b82f6',
  'Portfolio Withdrawal':'#f59e0b',
  'Other Passive':       '#06b6d4',
};

export default function RetirementPage() {
  const { plan, projections, retirementAnalysis, updatePlan, recalculate } = useFinancialStore();
  const rg = plan.retirementGoals ?? defaultRetirementGoals;

  function updateGoals(updates: Partial<typeof rg>) {
    updatePlan({ retirementGoals: { ...rg, ...updates } });
    recalculate();
  }

  const fundingStatus = retirementAnalysis?.fundingStatus ?? 'adequate';
  const statusConfig  = FUNDING_STATUS_CONFIG[fundingStatus];

  // Net worth chart
  const nwData = projections
    .filter((p) => p.age % 5 === 0 || p.age === plan.client.age || p.age === plan.client.retirementAge || p.age === plan.client.lifeExpectancy)
    .map((p) => ({
      age: p.age,
      'Liquid Assets': Math.max(0, p.cashBalance + p.investmentBalance + p.srsBalance),
      'CPF Total': p.cpfTotal,
    }));

  // Passive income sources breakdown (bar)
  const ra = retirementAnalysis;
  const sourcesData = ra ? [
    { name: 'CPF LIFE',              value: ra.cpfLifeMonthlyIncome,        color: SOURCE_COLORS['CPF LIFE'] },
    { name: 'Rental',                value: ra.rentalMonthly,               color: SOURCE_COLORS['Rental Income'] },
    { name: 'Dividends',             value: ra.dividendMonthly,             color: SOURCE_COLORS['Dividends'] },
    { name: 'Portfolio\nWithdrawal', value: ra.portfolioWithdrawalMonthly,  color: SOURCE_COLORS['Portfolio Withdrawal'] },
    { name: 'Other',                 value: ra.otherPassiveMonthly,         color: SOURCE_COLORS['Other Passive'] },
  ].filter((s) => s.value > 0) : [];

  const totalSources   = sourcesData.reduce((s, d) => s + d.value, 0);
  const coveragePct    = ra ? Math.min(100, (ra.totalProjectedPassiveIncome / ra.monthlyPassiveIncomeTarget) * 100) : 0;

  return (
    <PageLayout
      title="Retirement Analysis"
      description="Can your savings and investments generate the passive income you need to retire?"
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left / Main column */}
        <div className="lg:col-span-2 space-y-6">

          {/* Retirement Goal Inputs */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Target className="h-5 w-5 text-blue-600" />Your Retirement Income Goals</CardTitle>
              <CardDescription>Enter your targets in today&apos;s dollars — the model inflates them to your retirement year automatically</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label>Expected Monthly Expenses in Retirement</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">S$</span>
                  <Input type="number" min={0} className="pl-9 text-lg font-semibold h-12"
                    value={rg.monthlyExpenses || ''}
                    onChange={(e) => updateGoals({ monthlyExpenses: parseFloat(e.target.value) || 0 })} />
                </div>
                <p className="text-xs text-muted-foreground">What you plan to spend monthly in retirement (today&apos;s S$)</p>
              </div>
              <div className="space-y-2">
                <Label>Monthly Passive Income Target</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">S$</span>
                  <Input type="number" min={0} className="pl-9 text-lg font-semibold h-12"
                    value={rg.monthlyPassiveIncomeTarget || ''}
                    onChange={(e) => updateGoals({ monthlyPassiveIncomeTarget: parseFloat(e.target.value) || 0 })} />
                </div>
                <p className="text-xs text-muted-foreground">Desired monthly passive income — should cover expenses plus buffer</p>
              </div>
              <div className="space-y-2">
                <Label>Safe Withdrawal Rate (%)</Label>
                <div className="relative">
                  <Input type="number" min={1} max={10} step={0.5} className="text-lg font-semibold h-12 pr-8"
                    value={rg.safeWithdrawalRate || ''}
                    onChange={(e) => updateGoals({ safeWithdrawalRate: parseFloat(e.target.value) || 4 })} />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span>
                </div>
                <p className="text-xs text-muted-foreground">Annual % of portfolio you can withdraw sustainably (4% is standard)</p>
              </div>
            </CardContent>
          </Card>

          {/* Verdict Banner */}
          {ra && (
            <div className={`rounded-xl border-2 p-6 ${statusConfig.bg}`}>
              <div className="flex items-start gap-4 flex-wrap">
                <statusConfig.icon className={`h-8 w-8 flex-shrink-0 mt-0.5 ${statusConfig.color}`} />
                <div className="flex-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                    Can you retire on your target passive income?
                  </p>
                  <div className="flex items-center gap-3 flex-wrap">
                    <h2 className={`text-3xl font-bold ${statusConfig.color}`}>{statusConfig.verdict}</h2>
                    <Badge variant={
                      fundingStatus === 'comfortable' ? 'success' :
                      fundingStatus === 'adequate'    ? 'info' :
                      fundingStatus === 'at-risk'     ? 'warning' : 'destructive'
                    }>{statusConfig.label}</Badge>
                  </div>
                  <p className={`text-sm mt-2 ${statusConfig.color} opacity-90`}>
                    {ra.retirementFeasible
                      ? `Projected passive income of ${formatCurrency(ra.totalProjectedPassiveIncome)}/month covers your target of ${formatCurrency(ra.monthlyPassiveIncomeTarget)}/month at retirement.`
                      : `There is a projected shortfall of ${formatCurrency(ra.passiveIncomeGap)}/month. You would need an additional portfolio of ${formatCurrency(ra.passiveIncomeGap * 12 / (rg.safeWithdrawalRate / 100))} to close the gap.`
                    }
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4 text-center ml-auto text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Asset Exhaustion</p>
                    <p className={`text-lg font-bold ${statusConfig.color}`}>
                      {ra.assetExhaustionAge ? `Age ${ra.assetExhaustionAge}` : '> 100 ✓'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Passive Income vs Target */}
          {ra && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Projected Passive Income vs Target</CardTitle>
                <CardDescription>
                  At retirement (age {plan.client.retirementAge}), in {plan.client.retirementAge - plan.client.age > 0 ? `${plan.client.retirementAge - plan.client.age} years` : "today's"} dollars
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* Coverage bar */}
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="font-medium">Target: {formatCurrency(ra.monthlyPassiveIncomeTarget)}/month</span>
                    <span className={`font-bold ${coveragePct >= 100 ? 'text-green-600' : 'text-amber-600'}`}>
                      {coveragePct.toFixed(0)}% covered
                    </span>
                  </div>
                  <div className="relative h-6 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${coveragePct >= 100 ? 'bg-green-500' : coveragePct >= 75 ? 'bg-amber-500' : 'bg-red-500'}`}
                      style={{ width: `${Math.min(100, coveragePct)}%` }}
                    />
                    {ra.passiveIncomeGap > 0 && (
                      <div className="absolute inset-0 flex items-center justify-end pr-3">
                        <span className="text-xs font-semibold text-white drop-shadow">
                          Gap: {formatCurrency(ra.passiveIncomeGap)}/mo
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Source breakdown */}
                <div className="space-y-2">
                  {[
                    { label: 'CPF LIFE',             value: ra.cpfLifeMonthlyIncome,       color: SOURCE_COLORS['CPF LIFE'],            note: 'from age 65' },
                    { label: 'Rental Income',         value: ra.rentalMonthly,              color: SOURCE_COLORS['Rental Income'],        note: 'inflation-adjusted' },
                    { label: 'Dividends',             value: ra.dividendMonthly,            color: SOURCE_COLORS['Dividends'],            note: 'from portfolio' },
                    { label: 'Portfolio Withdrawal',  value: ra.portfolioWithdrawalMonthly, color: SOURCE_COLORS['Portfolio Withdrawal'], note: `${rg.safeWithdrawalRate}% SWR on ${formatCurrency(ra.corpusProjected)}` },
                    { label: 'Other Passive',         value: ra.otherPassiveMonthly,        color: SOURCE_COLORS['Other Passive'],        note: 'as specified' },
                  ].filter((s) => s.value > 0 || s.label === 'Portfolio Withdrawal').map((src) => {
                    const pct = ra.monthlyPassiveIncomeTarget > 0 ? (src.value / ra.monthlyPassiveIncomeTarget) * 100 : 0;
                    return (
                      <div key={src.label} className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: src.color }} />
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between text-sm mb-0.5">
                            <span className="font-medium">{src.label}</span>
                            <span className="font-semibold">{formatCurrency(src.value)}/mo</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                              <div className="h-full rounded-full" style={{ width: `${Math.min(100, pct)}%`, backgroundColor: src.color }} />
                            </div>
                            <span className="text-xs text-muted-foreground w-8 text-right">{pct.toFixed(0)}%</span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">{src.note}</p>
                        </div>
                      </div>
                    );
                  })}
                  <div className="flex justify-between pt-3 border-t text-sm font-bold">
                    <span>Total Projected Passive Income</span>
                    <span className={ra.totalProjectedPassiveIncome >= ra.monthlyPassiveIncomeTarget ? 'text-green-600' : 'text-amber-600'}>
                      {formatCurrency(ra.totalProjectedPassiveIncome)}/mo
                    </span>
                  </div>
                </div>

                {/* What target amounts to in today's vs retirement dollars */}
                <div className="rounded-lg bg-muted/50 p-3 grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Your target (today&apos;s S$)</p>
                    <p className="font-bold text-lg">{formatCurrency(rg.monthlyPassiveIncomeTarget)}/mo</p>
                    <p className="text-xs text-muted-foreground">{formatCurrency(rg.monthlyExpenses)}/mo in expenses</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Inflation-adjusted at retirement</p>
                    <p className="font-bold text-lg">{formatCurrency(ra.monthlyPassiveIncomeTarget)}/mo</p>
                    <p className="text-xs text-muted-foreground">{formatCurrency(ra.monthlyExpenseTarget)}/mo in expenses</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Net Worth Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Lifetime Net Worth Projection</CardTitle>
              <CardDescription>Age {plan.client.age} to {plan.client.lifeExpectancy}</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={nwData}>
                  <defs>
                    <linearGradient id="nwG" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="age" tick={{ fontSize: 11 }} domain={[plan.client.age, plan.client.lifeExpectancy]} label={{ value: 'Age', position: 'insideBottom', offset: -2, fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${(v / 1000000).toFixed(1)}M`} />
                  <Tooltip formatter={(v: number) => formatCurrency(v)} labelFormatter={(l) => `Age ${l}`} />
                  <ReferenceLine x={plan.client.retirementAge} stroke="#ef4444" strokeDasharray="6 3"
                    label={{ value: 'Retire', position: 'insideTopRight', fontSize: 10, fill: '#ef4444' }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Area type="monotone" dataKey="Liquid Assets" stroke="#0d9488" fill="url(#nwG)" strokeWidth={2.5} />
                  <Area type="monotone" dataKey="CPF Total"     stroke="#8b5cf6" fill="none" strokeWidth={1.5} strokeDasharray="4 2" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Cashflow table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Lifetime Cashflow — Key Ages</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b">
                      {['Age','Status','Income','Expenses','Net CF','Liquid Assets','CPF'].map((h) => (
                        <th key={h} className="text-left py-2 pr-3 font-semibold text-muted-foreground">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {projections
                      .filter((p) => p.age % 5 === 0 || p.age === plan.client.age || p.age === plan.client.retirementAge || p.age === 55 || p.age === 65)
                      .map((p) => (
                        <tr key={p.age} className={`border-b ${p.isRetired ? 'bg-blue-50/40' : ''}`}>
                          <td className="py-1.5 pr-3 font-bold">{p.age}</td>
                          <td className="py-1.5 pr-3">
                            <Badge variant={p.isRetired ? 'info' : p.isSemiRetired ? 'warning' : 'secondary'} className="text-xs">
                              {p.isRetired ? 'Retired' : p.isSemiRetired ? 'Semi-Ret.' : 'Working'}
                            </Badge>
                          </td>
                          <td className="py-1.5 pr-3 text-green-700">{formatCurrency(p.totalIncome)}</td>
                          <td className="py-1.5 pr-3 text-red-600">{formatCurrency(p.totalOutflows)}</td>
                          <td className={`py-1.5 pr-3 font-medium ${p.netCashflow >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                            {p.netCashflow >= 0 ? '+' : ''}{formatCurrency(p.netCashflow)}
                          </td>
                          <td className="py-1.5 pr-3 font-semibold">{formatCurrency(p.cashBalance + p.investmentBalance + p.srsBalance)}</td>
                          <td className="py-1.5 text-purple-700">{formatCurrency(p.cpfTotal)}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {/* Key numbers */}
          {ra && (
            <Card className="bg-slate-900 text-white">
              <CardHeader className="pb-2"><CardTitle className="text-white text-sm">Key Retirement Metrics</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">
                {[
                  ['Target (today\'s S$)',   formatCurrency(rg.monthlyPassiveIncomeTarget) + '/mo'],
                  ['Target at retirement',   formatCurrency(ra.monthlyPassiveIncomeTarget) + '/mo'],
                  ['Projected income',       formatCurrency(ra.totalProjectedPassiveIncome) + '/mo'],
                  ['Monthly gap',            ra.passiveIncomeGap > 0 ? formatCurrency(ra.passiveIncomeGap) + '/mo' : 'None ✓'],
                  ['Corpus required',        formatCurrency(ra.corpusRequired)],
                  ['Corpus projected',       formatCurrency(ra.corpusProjected)],
                  ['Asset exhaustion',       ra.assetExhaustionAge ? `Age ${ra.assetExhaustionAge}` : 'Survives 100 ✓'],
                  ['Surplus at 100',         formatCurrency(ra.surplusAtAge100)],
                ].map(([k, v]) => (
                  <div key={k as string} className="flex justify-between">
                    <span className="text-slate-400">{k as string}</span>
                    <span className="font-medium text-right">{v as string}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Assumptions */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Planning Assumptions</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {([
                ['generalInflation',  'General Inflation (%)'],
                ['healthcareInflation','Healthcare Inflation (%)'],
                ['investmentReturn',  'Investment Return (%)'],
                ['propertyGrowthRate','Property Growth (%)'],
              ] as const).map(([key, label]) => (
                <div key={key} className="flex items-center justify-between gap-3">
                  <Label className="text-xs text-muted-foreground flex-1">{label}</Label>
                  <Input type="number" min={0} max={20} step={0.5}
                    className="h-7 w-20 text-sm text-right"
                    value={plan.assumptions[key]}
                    onChange={(e) => {
                      updatePlan({ assumptions: { ...plan.assumptions, [key]: parseFloat(e.target.value) || 0 } });
                      recalculate();
                    }} />
                </div>
              ))}
            </CardContent>
          </Card>

          {/* How corpus is calculated */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">How the Corpus Is Calculated</CardTitle></CardHeader>
            <CardContent className="text-xs text-muted-foreground space-y-2">
              <p><strong>Corpus Required</strong> = Monthly passive income target ÷ (SWR / 12)</p>
              <p>This is the portfolio size needed so that withdrawing at your safe rate produces your target income indefinitely.</p>
              <p><strong>Corpus Projected</strong> = cash + investments + SRS at retirement age (from cashflow model).</p>
              <p><strong>Portfolio Withdrawal</strong> = Corpus Projected × SWR ÷ 12</p>
              <p>CPF LIFE, rental, and dividends are added on top and reduce how much corpus you need.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageLayout>
  );
}
