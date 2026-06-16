'use client';

import { useRef } from 'react';
import { useFinancialStore } from '@/lib/store';
import { PageLayout } from '@/components/layout/PageLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { formatCurrency, formatPercent, CURRENT_YEAR } from '@/lib/utils';
import { FileText, Printer, Download, CheckCircle, AlertCircle, XCircle } from 'lucide-react';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-8">
      <div className="flex items-center gap-3 mb-4">
        <h2 className="text-lg font-bold text-slate-800">{title}</h2>
        <div className="flex-1 h-px bg-slate-200" />
      </div>
      {children}
    </div>
  );
}

function DataRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`flex justify-between py-1.5 border-b border-slate-100 text-sm ${highlight ? 'font-semibold' : ''}`}>
      <span className="text-slate-500">{label}</span>
      <span className={highlight ? 'text-slate-900' : 'text-slate-700'}>{value}</span>
    </div>
  );
}

export default function ReportsPage() {
  const reportRef = useRef<HTMLDivElement>(null);
  const { plan, projections, retirementAnalysis, insuranceGap, healthScores, stressTestResults, stressTestInput } = useFinancialStore();

  const today = new Date().toLocaleDateString('en-SG', { year: 'numeric', month: 'long', day: 'numeric' });

  const totalAssets = projections[0]?.totalAssets ?? 0;
  const totalLiabilities = projections[0]?.totalLiabilities ?? 0;
  const netWorth = projections[0]?.netWorth ?? 0;
  const cpfTotal = projections[0]?.cpfTotal ?? 0;

  const monthlyExpenses = plan.expenses.food + plan.expenses.utilities + plan.expenses.healthcare +
    plan.expenses.mortgage + plan.expenses.insurancePremiums + plan.expenses.transport +
    plan.expenses.travel + plan.expenses.dining + plan.expenses.entertainment +
    plan.expenses.hobbies + plan.expenses.parentsAllowance + plan.expenses.childrenExpenses;
  const monthlyIncome = plan.income.monthlySalary + plan.income.dividendIncome + plan.income.otherIncome;
  const savingsRate = monthlyIncome > 0 ? ((monthlyIncome - monthlyExpenses) / monthlyIncome) * 100 : 0;

  const fundingConfig = {
    'comfortable':           { label: 'COMFORTABLE',          verdict: 'YES', color: 'text-green-700', bg: 'bg-green-50' },
    'adequate':              { label: 'ADEQUATE',             verdict: 'YES', color: 'text-blue-700',  bg: 'bg-blue-50' },
    'at-risk':               { label: 'AT RISK',              verdict: 'BORDERLINE', color: 'text-amber-700', bg: 'bg-amber-50' },
    'significant-shortfall': { label: 'SIGNIFICANT SHORTFALL',verdict: 'NO', color: 'text-red-700',   bg: 'bg-red-50' },
  };
  const fundingStatus = retirementAnalysis?.fundingStatus ?? 'adequate';
  const statusConf = fundingConfig[fundingStatus];

  function handlePrint() {
    window.print();
  }

  const stressTestScenarios = [
    { key: 'criticalIllness',    name: 'Critical Illness' },
    { key: 'permanentDisability',name: 'Permanent Disability' },
    { key: 'prematureDeath',     name: 'Premature Death' },
    { key: 'jobLoss',            name: `Job Loss (${stressTestInput?.jobLossMonths ?? 12}mo)` as string },
    { key: 'marketCrash30',      name: '30% Market Crash' },
    { key: 'inflation7',         name: '7% Inflation Shock' },
  ] as const;

  return (
    <PageLayout title="Financial Planning Report" description="Professional client-ready report — print or save as PDF">
      {/* Print Controls */}
      <div className="flex items-center gap-3 mb-6 no-print">
        <Button onClick={handlePrint} className="gap-2">
          <Printer className="h-4 w-4" /> Print / Save as PDF
        </Button>
        <p className="text-sm text-muted-foreground">Use your browser&apos;s print dialog to save as PDF. Select &ldquo;Save as PDF&rdquo; as the destination for best results.</p>
      </div>

      {/* ─────────────────────────────────────────────────────────────── */}
      {/* PRINT-FRIENDLY REPORT                                          */}
      {/* ─────────────────────────────────────────────────────────────── */}
      <div ref={reportRef} className="bg-white rounded-xl border shadow-sm p-8 print:shadow-none print:border-none">

        {/* Cover / Header */}
        <div className="flex items-start justify-between mb-8 pb-6 border-b-2 border-slate-800">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold">SG</div>
              <div>
                <p className="text-lg font-bold text-slate-800">Singapore Lifetime Financial Planner</p>
                <p className="text-xs text-slate-500">Deterministic Cashflow Sustainability Analysis</p>
              </div>
            </div>
          </div>
          <div className="text-right text-sm text-slate-500">
            <p>Date of Report: {today}</p>
            <p>Planning Horizon: Age {plan.client.age} to {plan.client.lifeExpectancy}</p>
            <p>Model: Deterministic — No Monte Carlo</p>
          </div>
        </div>

        {/* Client Details */}
        <div className="grid grid-cols-2 gap-4 mb-8 p-4 bg-slate-50 rounded-lg">
          <div>
            <p className="text-xs text-slate-500 mb-2 uppercase tracking-wide font-semibold">Client Information</p>
            {[
              ['Name', plan.client.name || '—'],
              ['Age', `${plan.client.age} years old`],
              ['Gender', plan.client.gender === 'male' ? 'Male' : 'Female'],
              ['Marital Status', plan.client.maritalStatus.charAt(0).toUpperCase() + plan.client.maritalStatus.slice(1)],
              ['Residency', plan.client.residencyStatus === 'citizen' ? 'Singapore Citizen' : plan.client.residencyStatus === 'pr' ? 'Permanent Resident' : 'Foreigner'],
              ['Occupation', plan.client.occupation || '—'],
            ].map(([k, v]) => <DataRow key={k} label={k} value={v} />)}
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-2 uppercase tracking-wide font-semibold">Planning Parameters</p>
            {[
              ['Desired Retirement Age', `Age ${plan.client.retirementAge}`],
              ['Life Expectancy Assumption', `Age ${plan.client.lifeExpectancy}`],
              ['Years to Retirement', `${Math.max(0, plan.client.retirementAge - plan.client.age)} years`],
              ['General Inflation', `${plan.assumptions.generalInflation}% p.a.`],
              ['Investment Return Assumption', `${plan.assumptions.investmentReturn}% p.a.`],
              ['Healthcare Inflation', `${plan.assumptions.healthcareInflation}% p.a.`],
            ].map(([k, v]) => <DataRow key={k} label={k} value={v} />)}
          </div>
        </div>

        {/* ── SECTION 1: EXECUTIVE SUMMARY ── */}
        <Section title="1. Executive Summary">
          <div className={`rounded-xl border-2 p-6 mb-4 ${statusConf.bg}`}>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Retirement Sustainability Verdict</p>
            <div className="flex items-center gap-4 flex-wrap">
              <p className={`text-4xl font-bold ${statusConf.color}`}>{statusConf.verdict}</p>
              <Badge className={`text-sm ${statusConf.color}`}>{statusConf.label}</Badge>
            </div>
            {retirementAnalysis && (
              <div className="grid grid-cols-3 gap-4 mt-4 text-center">
                <div>
                  <p className="text-xs text-slate-500">Asset Exhaustion Age</p>
                  <p className={`text-xl font-bold ${statusConf.color}`}>
                    {retirementAnalysis.assetExhaustionAge ? `Age ${retirementAnalysis.assetExhaustionAge}` : 'Survives to 100 ✓'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Projected Surplus at 100</p>
                  <p className={`text-xl font-bold ${statusConf.color}`}>{formatCurrency(retirementAnalysis.surplusAtAge100)}</p>
                </div>
              </div>
            )}
          </div>
          {healthScores && (
            <div className="grid grid-cols-5 gap-3">
              {[
                { label: 'Overall', score: healthScores.overall },
                { label: 'Retirement', score: healthScores.retirementReadiness },
                { label: 'Protection', score: healthScores.protectionScore },
                { label: 'Liquidity', score: healthScores.liquidityScore },
                { label: 'Estate', score: healthScores.estatePlanningScore },
              ].map(({ label, score }) => (
                <div key={label} className="p-3 rounded-lg bg-slate-50 text-center border">
                  <p className={`text-2xl font-bold ${score >= 75 ? 'text-green-700' : score >= 50 ? 'text-amber-700' : 'text-red-700'}`}>{score}</p>
                  <p className="text-xs text-slate-500 mt-1">{label}</p>
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* ── SECTION 2: NET WORTH STATEMENT ── */}
        <Section title="2. Net Worth Statement">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="text-xs font-semibold text-slate-500 mb-3 uppercase tracking-wide">Assets</p>
              {[
                ['Cash & Savings Accounts', plan.assets.savingsAccounts + plan.assets.fixedDeposits],
                ['Singapore Savings Bonds / T-Bills', plan.assets.singaporeSavingsBonds],
                ['SRS Balance', plan.assets.srsBalance],
                ['Investment Portfolio', plan.assets.investments.reduce((s: number, i: any) => s + i.currentValue, 0)],
                ['Property (Market Value)', plan.assets.properties.reduce((s: number, p: any) => s + p.marketValue, 0)],
                ['CPF — OA', plan.cpf.oaBalance],
                ['CPF — SA', plan.cpf.saBalance],
                ['CPF — MA', plan.cpf.maBalance],
                ['CPF — RA', plan.cpf.raBalance],
                ['Business Interest', plan.assets.businessValuation * plan.assets.businessOwnershipPct / 100],
              ].filter(([, v]) => (v as number) > 0).map(([k, v]) => (
                <DataRow key={k as string} label={k as string} value={formatCurrency(v as number)} />
              ))}
              <div className="flex justify-between py-2 font-bold text-sm border-t-2 border-slate-300 mt-1">
                <span>Total Assets</span><span>{formatCurrency(totalAssets)}</span>
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 mb-3 uppercase tracking-wide">Liabilities</p>
              {plan.liabilities.length === 0 && plan.assets.properties.every((p: any) => p.outstandingLoan === 0)
                ? <p className="text-sm text-slate-400">No liabilities</p>
                : <>
                  {plan.assets.properties.filter((p: any) => p.outstandingLoan > 0).map((p: any) => (
                    <DataRow key={p.id} label={`Mortgage — ${p.name}`} value={formatCurrency(p.outstandingLoan)} />
                  ))}
                  {plan.liabilities.map((l: any) => (
                    <DataRow key={l.id} label={l.name} value={formatCurrency(l.outstandingBalance)} />
                  ))}
                </>
              }
              <div className="flex justify-between py-2 font-bold text-sm border-t-2 border-slate-300 mt-1">
                <span>Total Liabilities</span><span className="text-red-600">{formatCurrency(totalLiabilities)}</span>
              </div>
              <div className="flex justify-between py-3 text-lg font-bold border-t-2 border-slate-800 mt-2">
                <span>Net Worth</span><span className={netWorth >= 0 ? 'text-green-700' : 'text-red-700'}>{formatCurrency(netWorth)}</span>
              </div>
            </div>
          </div>
        </Section>

        {/* ── SECTION 3: INCOME & CASHFLOW ── */}
        <Section title="3. Income & Cashflow Summary">
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <DataRow label="Monthly Gross Salary" value={formatCurrency(plan.income.monthlySalary)} />
              <DataRow label="Annual Bonus" value={formatCurrency(plan.income.annualBonus)} />
              <DataRow label="Passive Income (monthly)" value={formatCurrency((plan.income.rentalIncome + plan.income.dividendIncome + plan.income.businessIncome + plan.income.otherIncome))} />
              <DataRow label="Total Annual Income" value={formatCurrency(monthlyIncome * 12)} highlight />
              <DataRow label="Total Monthly Expenses" value={formatCurrency(monthlyExpenses)} />
              <DataRow label="Monthly Surplus / Deficit" value={formatCurrency(monthlyIncome - monthlyExpenses)} highlight />
              <DataRow label="Savings Rate" value={`${savingsRate.toFixed(1)}%`} highlight />
            </div>
            <div className="p-4 rounded-lg bg-slate-50 border">
              <p className="text-xs font-semibold text-slate-500 mb-3 uppercase">Expense Breakdown</p>
              {[
                ['Essential', plan.expenses.food + plan.expenses.utilities + plan.expenses.healthcare + plan.expenses.mortgage + plan.expenses.insurancePremiums + plan.expenses.transport],
                ['Lifestyle', plan.expenses.travel + plan.expenses.dining + plan.expenses.entertainment + plan.expenses.hobbies],
                ['Family Support', plan.expenses.parentsAllowance + plan.expenses.childrenExpenses + plan.expenses.otherDependants],
              ].map(([k, v]) => (
                <div key={k as string} className="flex justify-between text-xs py-1">
                  <span className="text-slate-500">{k as string}</span>
                  <span className="font-medium">{formatCurrency(v as number)}/mo</span>
                </div>
              ))}
            </div>
          </div>
        </Section>

        {/* ── SECTION 4: CPF ANALYSIS ── */}
        <Section title="4. CPF Analysis">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <DataRow label="CPF Ordinary Account (OA)" value={formatCurrency(plan.cpf.oaBalance)} />
              <DataRow label="CPF Special Account (SA)" value={formatCurrency(plan.cpf.saBalance)} />
              <DataRow label="CPF MediSave Account (MA)" value={formatCurrency(plan.cpf.maBalance)} />
              <DataRow label="CPF Retirement Account (RA)" value={formatCurrency(plan.cpf.raBalance)} />
              <DataRow label="Total CPF" value={formatCurrency(cpfTotal)} highlight />
            </div>
            <div>
              {retirementAnalysis && (
                <>
                  <DataRow label="Projected CPF LIFE (monthly)" value={formatCurrency(retirementAnalysis.cpfLifeMonthlyIncome)} highlight />
                  <DataRow label="CPF LIFE (annual)" value={formatCurrency(retirementAnalysis.cpfLifeMonthlyIncome * 12)} />
                  <DataRow label="RSTU Top-up (annual)" value={formatCurrency(plan.cpf.rstuTopUps)} />
                  <DataRow label="FRS 2024" value={formatCurrency(205800)} />
                  <DataRow label="BHS 2024" value={formatCurrency(71500)} />
                </>
              )}
            </div>
          </div>
        </Section>

        {/* ── SECTION 5: RETIREMENT ANALYSIS ── */}
        <Section title="5. Retirement Sustainability Analysis">
          {retirementAnalysis ? (
            <div className="grid grid-cols-2 gap-6">
              <div>
                <DataRow label="Retirement Corpus Required" value={formatCurrency(retirementAnalysis.corpusRequired)} />
                <DataRow label="Retirement Corpus Projected" value={formatCurrency(retirementAnalysis.corpusProjected)} highlight />
                <DataRow label="Corpus Surplus / (Deficit)" value={formatCurrency(retirementAnalysis.corpusProjected - retirementAnalysis.corpusRequired)} highlight />
                <DataRow label="Monthly Expenses at Retirement" value={formatCurrency(retirementAnalysis.monthlyExpenseTarget)} />
                <DataRow label="CPF LIFE Monthly Income" value={formatCurrency(retirementAnalysis.cpfLifeMonthlyIncome)} />
                <DataRow label="Monthly Income Gap" value={formatCurrency(retirementAnalysis.passiveIncomeGap)} />
              </div>
              <div>
                <DataRow label="Asset Exhaustion Age" value={retirementAnalysis.assetExhaustionAge ? `Age ${retirementAnalysis.assetExhaustionAge}` : 'Survives to Age 100 ✓'} />
                <DataRow label="Projected Surplus at Age 100" value={formatCurrency(retirementAnalysis.surplusAtAge100)} />
                <DataRow label="Funding Status" value={statusConf.label} />
                <DataRow label="Retirement Feasible?" value={retirementAnalysis.retirementFeasible ? 'YES' : 'BORDERLINE'} highlight />
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-400">Enter financial data to generate retirement analysis.</p>
          )}
        </Section>

        {/* ── SECTION 6: INSURANCE GAP ANALYSIS ── */}
        <Section title="6. Insurance Coverage & Gap Analysis">
          {insuranceGap ? (
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">Life Insurance</p>
                <DataRow label="Coverage Required (DIME Method)" value={formatCurrency(insuranceGap.deathCoverageRequired)} />
                <DataRow label="Coverage Held" value={formatCurrency(insuranceGap.deathCoverageHeld)} />
                <DataRow label="Protection Gap" value={insuranceGap.deathCoverageGap > 0 ? formatCurrency(insuranceGap.deathCoverageGap) : 'None ✓'} highlight />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">Critical Illness & Disability</p>
                <DataRow label="CI Coverage Required" value={formatCurrency(insuranceGap.ciCoverageRequired)} />
                <DataRow label="CI Coverage Held" value={formatCurrency(insuranceGap.ciCoverageHeld)} />
                <DataRow label="CI Gap" value={insuranceGap.ciCoverageGap > 0 ? formatCurrency(insuranceGap.ciCoverageGap) : 'None ✓'} highlight />
                <DataRow label="Disability Income (monthly)" value={`${formatCurrency(insuranceGap.disabilityMonthlyHeld)} / ${formatCurrency(insuranceGap.disabilityMonthlyRequired)} required`} />
                <DataRow label="Hospitalisation" value={insuranceGap.hospitalisationGap} />
              </div>
              {plan.insurance.policies.length > 0 && (
                <div className="col-span-2">
                  <p className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">Policy Inventory</p>
                  <table className="w-full text-xs">
                    <thead><tr className="border-b">
                      {['Type', 'Insurer', 'Sum Assured', 'Annual Premium', 'Coverage Until'].map((h) => (
                        <th key={h} className="text-left py-1.5 pr-4 text-slate-500 font-semibold">{h}</th>
                      ))}
                    </tr></thead>
                    <tbody>
                      {plan.insurance.policies.map((p: any) => (
                        <tr key={p.id} className="border-b">
                          <td className="py-1.5 pr-4 capitalize">{p.type}</td>
                          <td className="py-1.5 pr-4">{p.insurer || '—'}</td>
                          <td className="py-1.5 pr-4">{formatCurrency(p.sumAssured)}</td>
                          <td className="py-1.5 pr-4">{formatCurrency(p.annualPremium)}</td>
                          <td className="py-1.5">Age {p.coverageUntilAge}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-slate-400">Enter insurance data to generate gap analysis.</p>
          )}
        </Section>

        {/* ── SECTION 7: STRESS TEST RESULTS ── */}
        {Object.keys(stressTestResults).length > 0 && (
          <Section title="7. Stress Test Results">
            <table className="w-full text-sm">
              <thead><tr className="border-b-2 border-slate-300">
                {['Scenario', 'Asset Exhaustion', 'Net Worth Impact', 'Viable?', 'Finding'].map((h) => (
                  <th key={h} className="text-left py-2 pr-4 text-xs font-semibold text-slate-500 uppercase">{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {stressTestScenarios.map(({ key, name }) => {
                  const r = stressTestResults[key];
                  if (!r) return null;
                  return (
                    <tr key={key} className="border-b">
                      <td className="py-2 pr-4 font-medium">{name}</td>
                      <td className="py-2 pr-4">{r.assetExhaustionAge ? `Age ${r.assetExhaustionAge}` : '> 100 ✓'}</td>
                      <td className={`py-2 pr-4 font-semibold ${r.netWorthImpact >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                        {r.netWorthImpact >= 0 ? '+' : ''}{formatCurrency(r.netWorthImpact)}
                      </td>
                      <td className="py-2 pr-4">
                        {r.isViable
                          ? <span className="text-green-700 font-semibold">YES</span>
                          : <span className="text-red-600 font-semibold">NO</span>}
                      </td>
                      <td className="py-2 text-slate-500 text-xs">{r.retirementImpact}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Section>
        )}

        {/* ── SECTION 8: CASHFLOW PROJECTION ── */}
        <Section title="8. Lifetime Cashflow Projection (Key Ages)">
          <table className="w-full text-xs">
            <thead><tr className="border-b-2 border-slate-300">
              {['Age', 'Status', 'Total Income', 'Total Expenses', 'Net Cashflow', 'Net Worth', 'CPF Total'].map((h) => (
                <th key={h} className="text-left py-2 pr-3 font-semibold text-slate-500 uppercase">{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {projections
                .filter((p) => p.age % 5 === 0 || p.age === plan.client.age || p.age === plan.client.retirementAge || p.age === 55 || p.age === 65 || p.age === 70)
                .map((p) => (
                  <tr key={p.age} className={`border-b ${p.isRetired ? 'bg-blue-50/30' : ''}`}>
                    <td className="py-1.5 pr-3 font-bold">{p.age}</td>
                    <td className="py-1.5 pr-3 text-slate-500">{p.isRetired ? 'Retired' : p.isSemiRetired ? 'Semi-Ret.' : 'Working'}</td>
                    <td className="py-1.5 pr-3 text-green-700">{formatCurrency(p.totalIncome)}</td>
                    <td className="py-1.5 pr-3 text-red-600">{formatCurrency(p.totalOutflows)}</td>
                    <td className={`py-1.5 pr-3 font-semibold ${p.netCashflow >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                      {p.netCashflow >= 0 ? '+' : ''}{formatCurrency(p.netCashflow)}
                    </td>
                    <td className="py-1.5 pr-3 font-semibold">{formatCurrency(p.netWorth)}</td>
                    <td className="py-1.5 text-purple-700">{formatCurrency(p.cpfTotal)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </Section>

        {/* Footer */}
        <div className="mt-10 pt-6 border-t border-slate-200 text-xs text-slate-400 text-center">
          <p className="font-medium text-slate-500 mb-1">IMPORTANT DISCLAIMER</p>
          <p>This report is prepared for financial planning purposes only and does not constitute financial advice under the Financial Advisers Act (Cap. 110). All projections are based on deterministic assumptions and are subject to uncertainty. Past performance is not indicative of future results. Please consult a licensed financial adviser before making financial decisions.</p>
          <p className="mt-2">Report generated by Singapore Lifetime Financial Planner · {today}</p>
        </div>
      </div>

      {/* Print styles */}
      <style jsx global>{`
        @media print {
          .no-print { display: none !important; }
          aside { display: none !important; }
          main { margin-left: 0 !important; }
          body { background: white !important; }
        }
      `}</style>
    </PageLayout>
  );
}
