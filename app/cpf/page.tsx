'use client';

import { useFinancialStore } from '@/lib/store';
import { PageLayout } from '@/components/layout/PageLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { formatCurrency } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { OAWithdrawalIntent } from '@/lib/types';
import {
  projectCPFTo55,
  estimateCpfLifePayout,
  getSelfEmployedMARate,
  BRS_2024, FRS_2024, ERS_2024, BHS_2024,
  type EmployerType,
} from '@/lib/calculations/cpf';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

// Re-export the employee/employer rates for display purposes
// (we add a public wrapper below in cpf.ts — or inline the logic here)
function getDisplayRates(age: number, employerType: string) {
  if (employerType === 'self-employed') {
    const maRate = getSelfEmployedMARate(age);
    return { employee: maRate, employer: 0, label: 'Self-Employed (MediSave only)' };
  }
  if (employerType === 'none') {
    return { employee: 0, employer: 0, label: 'Not Employed' };
  }
  if (age < 55) return { employee: 0.20, employer: 0.17, label: 'Employed' };
  if (age < 60) return { employee: 0.15, employer: 0.15, label: 'Employed (age 55–60)' };
  if (age < 65) return { employee: 0.095, employer: 0.115, label: 'Employed (age 60–65)' };
  if (age < 70) return { employee: 0.07, employer: 0.09, label: 'Employed (age 65–70)' };
  return { employee: 0.05, employer: 0.075, label: 'Employed (age 70+)' };
}

export default function CPFPage() {
  const { plan, updatePlan, projections } = useFinancialStore();
  const cpf = plan.cpf;
  const { age, gender, employerType, retirementAge } = plan.client;
  const annualSalary = plan.income.monthlySalary * 12;

  function update<K extends keyof typeof cpf>(key: K, value: typeof cpf[K]) {
    updatePlan({ cpf: { ...cpf, [key]: value } });
  }

  // ── Employment type display ─────────────────────────────────────────────────
  const rates = getDisplayRates(age, employerType);
  const isSelfEmployed = employerType === 'self-employed';
  const isNotEmployed  = employerType === 'none';

  // ── Projected CPF to age 55 (uses full year-by-year simulation) ────────────
  const proj55 = projectCPFTo55(
    age,
    cpf.oaBalance,
    cpf.saBalance,
    cpf.maBalance,
    cpf.raBalance,
    annualSalary,
    employerType as EmployerType,
    gender,
    plan.income.salaryGrowthRate,
    cpf.voluntaryContributions,
    cpf.rstuTopUps,
    6800
  );

  // ── CPF LIFE estimate (use projected RA at 65 from cashflow projections) ───
  const proj65 = projections.find((p) => p.age === 65);
  const raAt65 = proj65?.cpfRA ?? proj55.projectedRA * Math.pow(1.04, Math.max(0, 65 - Math.max(age, 55)));
  const cpfLifeMonthly = estimateCpfLifePayout(raAt65, gender);

  const totalCPF = cpf.oaBalance + cpf.saBalance + cpf.maBalance + cpf.raBalance;

  // ── CPF projections chart (from computed projections) ──────────────────────
  const cpfChartData = projections
    .filter((p) => p.age % 5 === 0 || p.age === age || p.age === 55 || p.age === 65)
    .map((p) => ({ age: p.age, OA: p.cpfOA, SA: p.cpfSA, MA: p.cpfMA, RA: p.cpfRA }));

  // ── Estimated annual mandatory CPF contributions ───────────────────────────
  const cappedSalary = Math.min(plan.income.monthlySalary, 6800);
  let estEmployeeAnnual = 0;
  let estEmployerAnnual = 0;
  if (!isNotEmployed) {
    if (isSelfEmployed) {
      estEmployeeAnnual = Math.min(annualSalary, 6800 * 12) * getSelfEmployedMARate(age);
      estEmployerAnnual = 0;
    } else {
      estEmployeeAnnual = cappedSalary * 12 * rates.employee;
      estEmployerAnnual = cappedSalary * 12 * rates.employer;
    }
  }

  return (
    <PageLayout title="CPF Analysis" description="Central Provident Fund balances, projections, and CPF LIFE estimates">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">

          {/* Employment Type Banner */}
          <div className={`rounded-lg border p-4 ${
            isNotEmployed  ? 'bg-slate-50 border-slate-200' :
            isSelfEmployed ? 'bg-amber-50 border-amber-200' :
                             'bg-blue-50 border-blue-200'
          }`}>
            <div className="flex items-start justify-between flex-wrap gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">CPF Contribution Mode</p>
                <p className={`text-base font-bold ${
                  isNotEmployed ? 'text-slate-700' : isSelfEmployed ? 'text-amber-800' : 'text-blue-800'
                }`}>{rates.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {isNotEmployed
                    ? 'No mandatory CPF contributions. Only voluntary top-ups and RSTU apply.'
                    : isSelfEmployed
                    ? `Mandatory MediSave only (${(rates.employee * 100).toFixed(1)}% of net trade income). OA and SA only via voluntary contributions.`
                    : `Employee: ${(rates.employee * 100).toFixed(1)}%  ·  Employer: ${(rates.employer * 100).toFixed(1)}%  ·  Total: ${((rates.employee + rates.employer) * 100).toFixed(1)}% of gross wage`
                  }
                </p>
              </div>
              <div className="flex gap-4 text-center">
                <div>
                  <p className="text-xs text-muted-foreground">Est. Employee Contribution</p>
                  <p className="text-lg font-bold">{formatCurrency(estEmployeeAnnual)}<span className="text-xs font-normal text-muted-foreground">/yr</span></p>
                </div>
                {!isSelfEmployed && !isNotEmployed && (
                  <div>
                    <p className="text-xs text-muted-foreground">Est. Employer Contribution</p>
                    <p className="text-lg font-bold text-green-700">{formatCurrency(estEmployerAnnual)}<span className="text-xs font-normal text-muted-foreground">/yr</span></p>
                  </div>
                )}
              </div>
            </div>
            {isSelfEmployed && (
              <p className="text-xs text-amber-700 mt-2 border-t border-amber-200 pt-2">
                ⚠ Self-employed individuals do not receive employer CPF contributions. Consider maximising voluntary CPF and RSTU top-ups to build retirement savings.
              </p>
            )}
            {isNotEmployed && (
              <p className="text-xs text-slate-600 mt-2 border-t border-slate-200 pt-2">
                ℹ No employment means no mandatory CPF. Your CPF balances will grow only from interest and any voluntary contributions or RSTU top-ups entered below.
              </p>
            )}
          </div>

          {/* Current Balances */}
          <Card>
            <CardHeader>
              <CardTitle>Current CPF Balances</CardTitle>
              <CardDescription>Enter your latest CPF statement balances</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              {([
                ['oaBalance', 'Ordinary Account (OA)', 'Housing, investments, insurance. 2.5% p.a.'],
                ['saBalance', 'Special Account (SA)', 'Retirement savings. 4% p.a.'],
                ['maBalance', 'MediSave Account (MA)', 'Healthcare. 4% p.a. Capped at BHS.'],
                ['raBalance', 'Retirement Account (RA)', 'Formed at age 55 from SA + OA. 4% p.a.'],
              ] as const).map(([key, label, desc]) => (
                <div key={key} className="space-y-1.5">
                  <Label>{label}</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">S$</span>
                    <Input type="number" min={0} className="pl-8" value={cpf[key] || ''}
                      onChange={(e) => update(key, parseFloat(e.target.value) || 0)} />
                  </div>
                  <p className="text-xs text-muted-foreground">{desc}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Top-ups */}
          <Card>
            <CardHeader>
              <CardTitle>Voluntary Contributions & Top-ups</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Annual RSTU Top-up (S$)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">S$</span>
                  <Input type="number" min={0} max={8000} className="pl-8" value={cpf.rstuTopUps || ''}
                    onChange={(e) => update('rstuTopUps', parseFloat(e.target.value) || 0)} />
                </div>
                <p className="text-xs text-muted-foreground">Max S$8,000/year to SA (under 55) or RA (55+). Tax relief available.</p>
              </div>
              <div className="space-y-1.5">
                <Label>Annual Voluntary CPF Contribution (S$)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">S$</span>
                  <Input type="number" min={0} className="pl-8" value={cpf.voluntaryContributions || ''}
                    onChange={(e) => update('voluntaryContributions', parseFloat(e.target.value) || 0)} />
                </div>
                <p className="text-xs text-muted-foreground">
                  {isSelfEmployed
                    ? 'Voluntary top-ups go to OA/SA/MA at 60%/20%/20%. Subject to Annual Limit of S$37,740.'
                    : 'Subject to CPF Annual Limit of S$37,740.'}
                </p>
              </div>
              <div className="space-y-1.5">
                <Label>CPF OA Housing Withdrawals to Date (S$)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">S$</span>
                  <Input type="number" min={0} className="pl-8" value={cpf.housingWithdrawals || ''}
                    onChange={(e) => update('housingWithdrawals', parseFloat(e.target.value) || 0)} />
                </div>
                <p className="text-xs text-muted-foreground">Accrued interest applies on property sale.</p>
              </div>
            </CardContent>
          </Card>

          {/* OA Withdrawal Intent */}
          <Card>
            <CardHeader>
              <CardTitle>CPF OA Withdrawal Intent (from Age 55)</CardTitle>
              <CardDescription>
                After RA formation, your remaining OA balance is accessible. Tell us what you plan to do with it.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Intent selector */}
                <div className="space-y-1.5">
                  <Label>What will you do with OA?</Label>
                  <Select
                    value={cpf.oaWithdrawalIntent ?? 'compound'}
                    onValueChange={(v) => update('oaWithdrawalIntent', v as OAWithdrawalIntent)}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="compound">Leave to compound at 2.5%</SelectItem>
                      <SelectItem value="lump_sum">Withdraw as lump sum</SelectItem>
                      <SelectItem value="monthly">Draw down monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Withdrawal age — shown for lump sum and monthly */}
                {(cpf.oaWithdrawalIntent === 'lump_sum' || cpf.oaWithdrawalIntent === 'monthly') && (
                  <div className="space-y-1.5">
                    <Label>
                      {cpf.oaWithdrawalIntent === 'lump_sum' ? 'Withdraw at Age' : 'Start Drawdown at Age'}
                    </Label>
                    <Input
                      type="number" min={55} max={100}
                      value={cpf.oaWithdrawalAge || ''}
                      onChange={(e) => update('oaWithdrawalAge', parseInt(e.target.value) || 55)}
                    />
                    <p className="text-xs text-muted-foreground">Minimum age 55 (CPF withdrawal eligibility)</p>
                  </div>
                )}

                {/* Lump sum amount */}
                {cpf.oaWithdrawalIntent === 'lump_sum' && (
                  <div className="space-y-1.5">
                    <Label>Amount to Withdraw (S$)</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">S$</span>
                      <Input
                        type="number" min={0} className="pl-8"
                        placeholder="Leave blank to withdraw full balance"
                        value={cpf.oaLumpSumAmount || ''}
                        onChange={(e) => update('oaLumpSumAmount', parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">Leave as 0 to withdraw the full OA balance at that age</p>
                  </div>
                )}

                {/* Monthly amount — only for monthly intent */}
                {cpf.oaWithdrawalIntent === 'monthly' && (
                  <div className="space-y-1.5">
                    <Label>Monthly Drawdown Amount (S$)</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">S$</span>
                      <Input
                        type="number" min={0} className="pl-8"
                        placeholder="e.g. 500"
                        value={cpf.oaMonthlyDrawdown || ''}
                        onChange={(e) => update('oaMonthlyDrawdown', parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">Drawn from OA balance until exhausted</p>
                  </div>
                )}
              </div>

              {/* Contextual explanation */}
              <div className={`rounded-lg p-3 text-xs border ${
                (cpf.oaWithdrawalIntent ?? 'compound') === 'compound'
                  ? 'bg-blue-50 border-blue-100 text-blue-800'
                  : (cpf.oaWithdrawalIntent) === 'lump_sum'
                  ? 'bg-amber-50 border-amber-100 text-amber-800'
                  : 'bg-emerald-50 border-emerald-100 text-emerald-800'
              }`}>
                {(cpf.oaWithdrawalIntent ?? 'compound') === 'compound' && (
                  <>OA balance remains in CPF earning 2.5% p.a. (plus extra 1% on first S$20k). It is available as a safety net but not projected as spendable income.</>
                )}
                {cpf.oaWithdrawalIntent === 'lump_sum' && (
                  <>At age {cpf.oaWithdrawalAge ?? 55}, {cpf.oaLumpSumAmount > 0 ? `up to ${formatCurrency(cpf.oaLumpSumAmount)}` : 'your full OA balance'} (after RA formation) will be withdrawn and added to your investable assets as a one-time cash inflow.</>
                )}
                {cpf.oaWithdrawalIntent === 'monthly' && (
                  <>From age {cpf.oaWithdrawalAge ?? 55}, S${(cpf.oaMonthlyDrawdown || 0).toLocaleString()}/month will be drawn from your OA balance until the account is exhausted. This supplements your retirement income in the cashflow model.</>
                )}
              </div>
            </CardContent>
          </Card>

          {/* CPF Growth Chart */}
          <Card>
            <CardHeader>
              <CardTitle>CPF Growth Projection</CardTitle>
              <CardDescription>Year-by-year CPF account balances to age {plan.client.lifeExpectancy}</CardDescription>
            </CardHeader>
            <CardContent>
              {cpfChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={cpfChartData}>
                    <defs>
                      {[['oaG','#3b82f6'],['saG','#10b981'],['maG','#f59e0b'],['raG','#8b5cf6']].map(([id, c]) => (
                        <linearGradient key={id} id={id} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={c} stopOpacity={0.4} />
                          <stop offset="95%" stopColor={c} stopOpacity={0} />
                        </linearGradient>
                      ))}
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="age" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}K`} />
                    <Tooltip formatter={(v: number) => formatCurrency(v)} labelFormatter={(l) => `Age ${l}`} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Area type="monotone" dataKey="OA" stroke="#3b82f6" fill="url(#oaG)" strokeWidth={2} />
                    <Area type="monotone" dataKey="SA" stroke="#10b981" fill="url(#saG)" strokeWidth={2} />
                    <Area type="monotone" dataKey="MA" stroke="#f59e0b" fill="url(#maG)" strokeWidth={2} />
                    <Area type="monotone" dataKey="RA" stroke="#8b5cf6" fill="url(#raG)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-12">Enter CPF balances to view projections</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column */}
        <div className="space-y-4">
          {/* Summary */}
          <Card className="bg-slate-900 text-white">
            <CardHeader className="pb-2"><CardTitle className="text-white text-sm">Current CPF Summary</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              {[['OA Balance', cpf.oaBalance], ['SA Balance', cpf.saBalance], ['MA Balance', cpf.maBalance], ['RA Balance', cpf.raBalance]].map(([l, v]) => (
                <div key={l as string} className="flex justify-between">
                  <span className="text-slate-400">{l as string}</span>
                  <span>{formatCurrency(v as number)}</span>
                </div>
              ))}
              <div className="h-px bg-slate-700" />
              <div className="flex justify-between font-bold text-lg">
                <span className="text-white">Total CPF</span>
                <span className="text-blue-400">{formatCurrency(totalCPF)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Retirement Sum Attainment — projected to age 55 */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Retirement Sum Attainment</CardTitle>
              <CardDescription className="text-xs">
                Projected at age 55, accounting for ongoing {isSelfEmployed ? 'MediSave' : isNotEmployed ? 'voluntary' : 'employee + employer'} contributions and CPF interest
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Projected balances at 55 */}
              <div className="rounded-lg bg-muted/40 p-3 text-xs space-y-1.5 border">
                <p className="font-semibold text-foreground mb-2">Projected at Age 55</p>
                {[
                  ['OA', proj55.projectedOA],
                  ['SA', proj55.projectedSA],
                  ['MA', proj55.projectedMA],
                  ...(age < 55 ? [['RA (formed at 55)', proj55.projectedRA] as [string, number]] : [['RA', cpf.raBalance] as [string, number]]),
                ].map(([l, v]) => (
                  <div key={l as string} className="flex justify-between">
                    <span className="text-muted-foreground">{l as string}</span>
                    <span className="font-medium">{formatCurrency(v as number)}</span>
                  </div>
                ))}
                {age < 55 && (
                  <div className="flex justify-between border-t pt-1.5 mt-1 font-semibold">
                    <span>RA after SA+OA transfer</span>
                    <span>{formatCurrency(proj55.projectedRA)}</span>
                  </div>
                )}
              </div>

              {/* BRS / FRS / ERS progress bars */}
              {[
                { label: 'Basic Retirement Sum (BRS)', amount: proj55.brsAt55, attained: proj55.brsAttained },
                { label: 'Full Retirement Sum (FRS)', amount: proj55.frsAt55,  attained: proj55.frsAttained },
                { label: 'Enhanced Retirement Sum (ERS)', amount: proj55.ersAt55, attained: proj55.ersAttained },
              ].map(({ label, amount, attained }) => {
                const pct = Math.min(100, (proj55.projectedRA / amount) * 100);
                return (
                  <div key={label}>
                    <div className="flex justify-between items-center text-xs mb-1">
                      <span className="text-muted-foreground font-medium">{label}</span>
                      <Badge variant={attained ? 'success' : 'warning'}>
                        {attained ? 'On Track ✓' : 'Gap'}
                      </Badge>
                    </div>
                    <Progress
                      value={pct}
                      className={attained ? '[&>div]:bg-green-500' : '[&>div]:bg-amber-500'}
                    />
                    <div className="flex justify-between text-xs mt-1 text-muted-foreground">
                      <span>{formatCurrency(Math.min(proj55.projectedRA, amount))} of {formatCurrency(amount)}</span>
                      <span>
                        {attained
                          ? `Surplus: ${formatCurrency(proj55.projectedRA - amount)}`
                          : `Gap: ${formatCurrency(amount - proj55.projectedRA)}`}
                      </span>
                    </div>
                  </div>
                );
              })}

              {isSelfEmployed && (
                <div className="p-2 rounded bg-amber-50 border border-amber-200 text-xs text-amber-800">
                  ⚠ As self-employed, only MediSave contributions are mandatory. OA and SA projections above reflect voluntary contributions only. Top up SA via RSTU to improve your FRS attainment.
                </div>
              )}
            </CardContent>
          </Card>

          {/* CPF LIFE Estimate */}
          <Card className="border-purple-200 bg-purple-50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-purple-800">CPF LIFE Estimate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-2">
                <p className="text-3xl font-bold text-purple-700">{formatCurrency(cpfLifeMonthly)}</p>
                <p className="text-sm text-purple-600 mt-1">estimated monthly payout</p>
                <p className="text-xs text-purple-500 mt-0.5">from age 65 (Standard Plan)</p>
              </div>
              <div className="mt-3 space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-purple-600">Projected RA at 65</span>
                  <span className="font-medium text-purple-800">{formatCurrency(raAt65)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-purple-600">Annual CPF LIFE income</span>
                  <span className="font-medium text-purple-800">{formatCurrency(cpfLifeMonthly * 12)}</span>
                </div>
              </div>
              <p className="text-xs text-purple-500 mt-3">* ~S$950–990 per S$100,000 RA. Actual payouts depend on plan, bequests, and cohort.</p>
            </CardContent>
          </Card>

          {/* Key CPF Facts */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">2024 CPF Key Figures</CardTitle></CardHeader>
            <CardContent className="text-xs space-y-2">
              {[
                ['BRS 2024', formatCurrency(BRS_2024)],
                ['FRS 2024', formatCurrency(FRS_2024)],
                ['ERS 2024', formatCurrency(ERS_2024)],
                ['BHS 2024', formatCurrency(BHS_2024)],
                ['OW Ceiling', 'S$6,800/month'],
                ['Annual Limit', 'S$37,740'],
                ['OA Interest', '2.5% p.a.'],
                ['SA/MA/RA Interest', '4.0% p.a.'],
                ['Extra 1%', 'First S$60,000 combined'],
              ].map(([k, v]) => (
                <div key={k as string} className="flex justify-between">
                  <span className="text-muted-foreground">{k as string}</span>
                  <span className="font-medium">{v as string}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </PageLayout>
  );
}
