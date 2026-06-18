'use client';

import { useState } from 'react';
import { useFinancialStore } from '@/lib/store';
import { PageLayout } from '@/components/layout/PageLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { formatCurrency } from '@/lib/utils';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, ReferenceLine,
} from 'recharts';
import {
  Heart, Activity, Briefcase, TrendingDown, Flame,
  CheckCircle, XCircle, ChevronRight, Play,
} from 'lucide-react';
import type { StressTestResult } from '@/lib/types';

// ─── Scenario config ──────────────────────────────────────────────────────────

const SCENARIOS = [
  {
    key: 'criticalIllness',
    label: 'Critical Illness',
    description: 'Unexpected diagnosis requiring medical treatment and recovery time',
    icon: Heart,
    color: 'text-rose-600',
    bg: 'bg-rose-50 border-rose-200',
    activeBg: 'bg-rose-600',
  },
  {
    key: 'permanentDisability',
    label: 'Permanent Disability',
    description: 'Unable to work for the rest of your life from a certain age',
    icon: Activity,
    color: 'text-orange-600',
    bg: 'bg-orange-50 border-orange-200',
    activeBg: 'bg-orange-600',
  },
  {
    key: 'jobLoss',
    label: 'Job Loss',
    description: 'Period of unemployment before finding new employment',
    icon: Briefcase,
    color: 'text-amber-600',
    bg: 'bg-amber-50 border-amber-200',
    activeBg: 'bg-amber-600',
  },
  {
    key: 'bearMarket',
    label: 'Bear Market',
    description: 'Significant portfolio decline over a sustained downturn period',
    icon: TrendingDown,
    color: 'text-blue-600',
    bg: 'bg-blue-50 border-blue-200',
    activeBg: 'bg-blue-600',
  },
  {
    key: 'inflation',
    label: 'Inflation Shock',
    description: 'Prolonged period of elevated inflation eroding purchasing power',
    icon: Flame,
    color: 'text-purple-600',
    bg: 'bg-purple-50 border-purple-200',
    activeBg: 'bg-purple-600',
  },
] as const;

type ScenarioKey = typeof SCENARIOS[number]['key'];

// ─── Result card ──────────────────────────────────────────────────────────────

function liquidAssets(p: any): number {
  // SRS is only paid out from retirement age
  const base = (p.cashBalance ?? 0) + (p.investmentBalance ?? 0) + (p.isRetired ? (p.srsBalance ?? 0) : 0);
  // CPF is only accessible (liquid) from age 55 onwards
  const cpf = p.age >= 55 ? (p.cpfOA ?? 0) + (p.cpfRA ?? 0) : 0;
  return Math.max(0, base + cpf);
}

function ResultCard({ result, baseProjections, stressTestInput }: {
  result: StressTestResult;
  baseProjections: any[];
  stressTestInput: any;
}) {
  // If the scenario provides its own chart data (CI), use it; otherwise derive from projections
  const comparisonData = result.chartData
    ? result.chartData.map((d) => ({
        age:         d.age,
        'Base Case': d.baseCase,
        'With CI':   d.stressed,
      }))
    : baseProjections
        .filter((p: any) => p.age % 5 === 0)
        .map((base: any) => {
          const stressed = result.projections.find((s: any) => s.age === base.age);
          return {
            age:         base.age,
            'Base Case': liquidAssets(base),
            'Stressed':  stressed ? liquidAssets(stressed) : 0,
          };
        });

  const stressedKey = result.chartData ? 'With CI' : 'Stressed';
  const returnToWorkAge = result.eventAge != null && stressTestInput?.criticalIllnessRecoveryMonths
    ? result.eventAge + stressTestInput.criticalIllnessRecoveryMonths / 12
    : null;

  return (
    <div className="space-y-4">
      {/* Verdict banner */}
      <div className={`flex items-center gap-3 p-4 rounded-xl border ${result.isViable ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
        {result.isViable
          ? <CheckCircle className="h-6 w-6 text-emerald-600 flex-shrink-0" />
          : <XCircle    className="h-6 w-6 text-red-600 flex-shrink-0" />}
        <div className="flex-1">
          <p className={`font-semibold ${result.isViable ? 'text-emerald-800' : 'text-red-800'}`}>
            {result.isViable ? 'Plan Remains Viable' : 'Plan at Risk'}
          </p>
          <p className="text-sm text-muted-foreground mt-0.5">{result.retirementImpact}</p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-xs text-muted-foreground">Asset Exhaustion</p>
          <p className={`font-bold ${result.assetExhaustionAge ? 'text-red-600' : 'text-emerald-600'}`}>
            {result.assetExhaustionAge ? `Age ${result.assetExhaustionAge}` : 'Survives to 100 ✓'}
          </p>
        </div>
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 rounded-lg bg-muted/40 border">
          <p className="text-xs text-muted-foreground">Net Worth Impact</p>
          <p className={`font-bold text-xl mt-0.5 ${(result.netWorthImpact ?? 0) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            {(result.netWorthImpact ?? 0) >= 0 ? '+' : ''}{formatCurrency(result.netWorthImpact ?? 0)}
          </p>
          <p className="text-xs text-muted-foreground">{(result.netWorthImpactPct ?? 0).toFixed(1)}% vs base case</p>
        </div>
        <div className="p-3 rounded-lg bg-muted/40 border">
          <p className="text-xs text-muted-foreground">Resilience</p>
          <Badge variant={result.isViable ? 'success' : 'destructive'} className="mt-1 text-sm px-3 py-1">
            {result.isViable ? 'Recoverable' : 'High Risk'}
          </Badge>
        </div>
      </div>

      {/* Cost breakdown (CI-specific) */}
      {result.eventBreakdown && result.eventBreakdown.length > 0 && (
        <div className="rounded-lg border bg-muted/30 p-3 space-y-1.5">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Cost Breakdown at Age {result.eventAge}
          </p>
          {result.eventBreakdown.map((item) => (
            <div key={item.label} className="flex justify-between text-sm">
              <span className="text-muted-foreground">{item.label}</span>
              <span className={`font-semibold ${item.amount < 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {item.amount < 0 ? '−' : '+'}{formatCurrency(Math.abs(item.amount))}
              </span>
            </div>
          ))}
          <div className="border-t pt-1.5 flex justify-between text-sm font-bold">
            <span>Total net impact</span>
            <span className="text-red-600">
              {formatCurrency(result.eventBreakdown.reduce((s, i) => s + i.amount, 0))}
            </span>
          </div>
        </div>
      )}

      {/* Chart */}
      {comparisonData.length > 0 && (
        <div>
          <p className="text-xs text-muted-foreground font-medium mb-2">Liquid Assets: Base vs Stressed (cash + investments + CPF from 55)</p>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={comparisonData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="age" tick={{ fontSize: 10 }} label={{ value: 'Age', position: 'insideBottom', offset: -2, fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `$${(v / 1000000).toFixed(1)}M`} />
              <Tooltip formatter={(v: number) => formatCurrency(v)} labelFormatter={(l) => `Age ${l}`} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              {result.eventAge && (
                <ReferenceLine x={result.eventAge} stroke="#f59e0b" strokeDasharray="5 3"
                  label={{ value: `CI Age ${result.eventAge}`, position: 'insideTopRight', fontSize: 10, fill: '#b45309' }} />
              )}
              {returnToWorkAge && (
                <ReferenceLine x={Math.ceil(returnToWorkAge)} stroke="#10b981" strokeDasharray="5 3"
                  label={{ value: `Return Age ${Math.ceil(returnToWorkAge)}`, position: 'insideTopLeft', fontSize: 10, fill: '#065f46' }} />
              )}
              <Line type="monotone" dataKey="Base Case" stroke="#10b981" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey={stressedKey} stroke="#ef4444" strokeWidth={2} dot={false} strokeDasharray="5 3" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function StressTestPage() {
  const { plan, projections, stressTestInput, stressTestResults, updateStressTestInput, runStressTests } = useFinancialStore();
  const [selected, setSelected] = useState<ScenarioKey | null>(null);
  const [running, setRunning] = useState(false);
  const [accountedFor, setAccountedFor] = useState<Partial<Record<ScenarioKey, boolean>>>({});

  function upd<K extends keyof typeof stressTestInput>(key: K, value: typeof stressTestInput[K]) {
    updateStressTestInput({ [key]: value });
  }

  async function handleRun() {
    setRunning(true);
    await new Promise((r) => setTimeout(r, 80));
    runStressTests();
    setRunning(false);
  }

  const selectedConfig = selected ? SCENARIOS.find((s) => s.key === selected) : null;
  const result = selected ? stressTestResults[selected] : undefined;

  return (
    <PageLayout title="Stress Testing" description="Select a scenario to configure inputs and test your plan's resilience">

      {/* ── Scenario tiles ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        {SCENARIOS.map((s) => {
          const Icon = s.icon;
          const res = stressTestResults[s.key];
          const isSelected = selected === s.key;
          return (
            <button
              key={s.key}
              onClick={() => setSelected(s.key)}
              className={`relative p-4 rounded-xl border-2 text-left transition-all duration-150 ${
                isSelected
                  ? 'border-primary shadow-md scale-[1.02]'
                  : 'border-transparent hover:border-primary/30 hover:shadow-sm'
              } ${s.bg}`}
            >
              <Icon className={`h-6 w-6 mb-2 ${s.color}`} />
              <p className={`text-sm font-semibold ${s.color}`}>{s.label}</p>
              {accountedFor[s.key] ? (
                <div className="mt-2">
                  <Badge variant="success" className="text-xs">Accounted For</Badge>
                </div>
              ) : res && res.netWorthImpactPct != null ? (
                <div className="mt-2">
                  <Badge variant={res.isViable ? 'success' : 'destructive'} className="text-xs">
                    {res.isViable ? 'OK' : 'RISK'}
                  </Badge>
                  <p className="text-xs text-muted-foreground mt-1">{(res.netWorthImpactPct ?? 0).toFixed(0)}% impact</p>
                </div>
              ) : null}
              {isSelected && (
                <div className="absolute top-2 right-2">
                  <ChevronRight className="h-4 w-4 text-primary" />
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Empty state ─────────────────────────────────────────────────────── */}
      {!selected && (
        <Card>
          <CardContent className="py-16 text-center">
            <Activity className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
            <p className="text-base font-medium text-muted-foreground">Select a scenario above to get started</p>
            <p className="text-sm text-muted-foreground/70 mt-1">Configure the inputs and run the stress test to see how your plan holds up</p>
          </CardContent>
        </Card>
      )}

      {/* ── Selected scenario ───────────────────────────────────────────────── */}
      {selected && selectedConfig && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

          {/* Input panel */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <selectedConfig.icon className={`h-5 w-5 ${selectedConfig.color}`} />
                    <CardTitle className="text-base">{selectedConfig.label}</CardTitle>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`text-xs font-medium ${accountedFor[selected] ? 'text-emerald-600' : 'text-muted-foreground'}`}>
                      {accountedFor[selected] ? 'Accounted For' : 'Not Accounted For'}
                    </span>
                    <Switch
                      checked={!!accountedFor[selected]}
                      onCheckedChange={(v) => setAccountedFor((prev) => ({ ...prev, [selected]: v }))}
                    />
                  </div>
                </div>
                <CardDescription>{selectedConfig.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">

                {/* Critical Illness inputs */}
                {selected === 'criticalIllness' && (
                  <>
                    {/* Early vs Late CI toggle */}
                    <div className="space-y-1.5">
                      <Label>Type of Critical Illness</Label>
                      <div className="grid grid-cols-2 gap-2">
                        {(['early', 'late'] as const).map((type) => (
                          <button
                            key={type}
                            onClick={() => upd('criticalIllnessType', type)}
                            className={`py-2.5 px-3 rounded-lg border-2 text-sm font-medium transition-colors ${
                              (stressTestInput.criticalIllnessType ?? 'late') === type
                                ? type === 'early'
                                  ? 'border-teal-500 bg-teal-50 text-teal-700'
                                  : 'border-red-500 bg-red-50 text-red-700'
                                : 'border-muted text-muted-foreground hover:border-primary/40'
                            }`}
                          >
                            {type === 'early' ? 'Early CI (ECI)' : 'Late CI'}
                          </button>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {(stressTestInput.criticalIllnessType ?? 'late') === 'early'
                          ? 'Early stage — ECI insurance payouts apply. Typically higher chance of occurrence, lower medical cost.'
                          : 'Late stage — CI insurance payouts apply. More severe, higher medical cost and longer recovery.'}
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <Label>At what age are they diagnosed?</Label>
                      <Input type="number" min={plan.client.age} max={80}
                        value={stressTestInput.criticalIllnessAge || ''}
                        onChange={(e) => { const v = parseInt(e.target.value); if (!isNaN(v)) upd('criticalIllnessAge', v); }} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Medical cost incurred (S$)</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">S$</span>
                        <Input type="number" min={0} className="pl-8"
                          value={stressTestInput.criticalIllnessMedicalCost || ''}
                          onChange={(e) => { const v = parseFloat(e.target.value); if (!isNaN(v)) upd('criticalIllnessMedicalCost', v); }} />
                      </div>
                      <p className="text-xs text-muted-foreground">Any CI insurance payout will be deducted automatically</p>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Duration of recovery (months)</Label>
                      <Input type="number" min={0} max={60}
                        value={stressTestInput.criticalIllnessRecoveryMonths || ''}
                        onChange={(e) => { const v = parseInt(e.target.value); if (!isNaN(v)) upd('criticalIllnessRecoveryMonths', v); }} />
                      <p className="text-xs text-muted-foreground">Income is assumed to stop during recovery</p>
                    </div>
                  </>
                )}

                {/* Permanent Disability inputs */}
                {selected === 'permanentDisability' && (
                  <>
                    <div className="space-y-1.5">
                      <Label>At what age does the disability occur?</Label>
                      <Input type="number" min={plan.client.age} max={80}
                        value={stressTestInput.disabilityAge || ''}
                        onChange={(e) => { const v = parseInt(e.target.value); if (!isNaN(v)) upd('disabilityAge', v); }} />
                    </div>
                    <div className="p-3 rounded-lg bg-muted/40 text-xs text-muted-foreground space-y-1">
                      <p className="font-medium text-foreground">What this models:</p>
                      <p>• Employment income stops permanently from that age</p>
                      <p>• Only disability insurance payouts + CPF LIFE remain as income</p>
                      <p>• Healthcare costs double permanently</p>
                      <p>• Assets are projected for the rest of your life</p>
                    </div>
                  </>
                )}

                {/* Job Loss inputs */}
                {selected === 'jobLoss' && (
                  <>
                    <div className="space-y-1.5">
                      <Label>How long until re-employed? (months)</Label>
                      <Input type="number" min={1} max={60}
                        value={stressTestInput.jobLossMonths || ''}
                        onChange={(e) => { const v = parseInt(e.target.value); if (!isNaN(v)) upd('jobLossMonths', v); }} />
                      <p className="text-xs text-muted-foreground">
                        Your emergency fund covers {(() => {
                          const monthly = plan.expenses.food + plan.expenses.utilities + plan.expenses.healthcare + plan.expenses.mortgage + plan.expenses.transport;
                          return monthly > 0 ? (plan.assets.savingsAccounts / monthly).toFixed(1) : '—';
                        })()} months of essential expenses
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/40 text-xs text-muted-foreground space-y-1">
                      <p className="font-medium text-foreground">What this models:</p>
                      <p>• Savings are drawn down by the income lost during unemployment</p>
                      <p>• Employment resumes at the same salary after the period</p>
                    </div>
                  </>
                )}

                {/* Bear Market inputs */}
                {selected === 'bearMarket' && (
                  <>
                    <div className="space-y-1.5">
                      <Label>Portfolio decline (%)</Label>
                      <div className="relative">
                        <Input type="number" min={1} max={90} className="pr-8"
                          value={stressTestInput.bearMarketLossPct || ''}
                          onChange={(e) => { const v = parseFloat(e.target.value); if (!isNaN(v)) upd('bearMarketLossPct', v); }} />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
                      </div>
                      <p className="text-xs text-muted-foreground">e.g. 30% for a typical bear market, 50% for a severe crash</p>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Duration of downturn (years)</Label>
                      <Input type="number" min={1} max={10}
                        value={stressTestInput.bearMarketDurationYears || ''}
                        onChange={(e) => { const v = parseFloat(e.target.value); if (!isNaN(v)) upd('bearMarketDurationYears', v); }} />
                      <p className="text-xs text-muted-foreground">Longer duration further depresses assumed returns during recovery</p>
                    </div>
                  </>
                )}

                {/* Inflation inputs */}
                {selected === 'inflation' && (
                  <>
                    <div className="space-y-1.5">
                      <Label>Elevated inflation rate (%)</Label>
                      <div className="relative">
                        <Input type="number" min={1} max={30} step={0.5} className="pr-8"
                          value={stressTestInput.inflationRate || ''}
                          onChange={(e) => { const v = parseFloat(e.target.value); if (!isNaN(v)) upd('inflationRate', v); }} />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
                      </div>
                      <p className="text-xs text-muted-foreground">Normal assumption is {plan.assumptions.generalInflation}% — enter the elevated rate</p>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Duration (years)</Label>
                      <Input type="number" min={1} max={20}
                        value={stressTestInput.inflationDurationYears || ''}
                        onChange={(e) => { const v = parseFloat(e.target.value); if (!isNaN(v)) upd('inflationDurationYears', v); }} />
                      <p className="text-xs text-muted-foreground">Stress test applies elevated rate for this period</p>
                    </div>
                  </>
                )}

                <Button className="w-full" onClick={handleRun} disabled={running}>
                  <Play className="h-4 w-4 mr-2" />
                  {running ? 'Running...' : 'Run Stress Test'}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Result panel */}
          <div className="lg:col-span-3">
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="text-base">Results</CardTitle>
                <CardDescription>
                  {accountedFor[selected]
                    ? 'This scenario has been marked as accounted for'
                    : result
                    ? `${selectedConfig.label} scenario vs your base plan`
                    : 'Configure inputs and run the test to see results'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {accountedFor[selected] ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mb-4">
                      <CheckCircle className="h-8 w-8 text-emerald-600" />
                    </div>
                    <p className="text-base font-semibold text-emerald-700">Accounted For</p>
                    <p className="text-sm text-muted-foreground mt-2 max-w-xs">
                      You have indicated that this scenario is already planned for in your financial strategy. Toggle off to view the stress test impact.
                    </p>
                  </div>
                ) : result ? (
                  <ResultCard result={result} baseProjections={projections} stressTestInput={stressTestInput} />
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <selectedConfig.icon className={`h-12 w-12 mb-3 ${selectedConfig.color} opacity-30`} />
                    <p className="text-sm text-muted-foreground">No results yet — fill in the inputs and click Run</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

        </div>
      )}
    </PageLayout>
  );
}
