'use client';

import { useFinancialStore } from '@/lib/store';
import { PageLayout } from '@/components/layout/PageLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatCurrency } from '@/lib/utils';
import { calculateIncomeTax } from '@/lib/calculations/tax';

function CurrencyInput({ label, value, onChange, description }: {
  label: string; value: number; onChange: (v: number) => void; description?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">S$</span>
        <Input
          type="number" min={0} className="pl-9"
          value={value || ''}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        />
      </div>
      {description && <p className="text-xs text-muted-foreground">{description}</p>}
    </div>
  );
}

export default function IncomePage() {
  const { plan, updatePlan } = useFinancialStore();
  const income = plan.income;

  function update<K extends keyof typeof income>(key: K, value: typeof income[K]) {
    updatePlan({ income: { ...income, [key]: value } });
  }

  const annualEmployment = income.monthlySalary * 12 + income.annualBonus + income.variableComp;
  const annualPassive = (income.rentalIncome + income.dividendIncome + income.businessIncome + income.otherIncome) * 12;
  const totalAnnual = annualEmployment + annualPassive;
  const monthlyExpenses =
    plan.expenses.food + plan.expenses.utilities + plan.expenses.healthcare +
    plan.expenses.mortgage + plan.expenses.insurancePremiums + plan.expenses.transport +
    plan.expenses.travel + plan.expenses.dining + plan.expenses.entertainment +
    plan.expenses.hobbies + plan.expenses.parentsAllowance + plan.expenses.childrenExpenses;
  const savingsRate = income.monthlySalary > 0
    ? (((income.monthlySalary + income.dividendIncome + income.otherIncome) - monthlyExpenses) / (income.monthlySalary + income.dividendIncome + income.otherIncome)) * 100
    : 0;

  return (
    <PageLayout title="Income" description="All income sources and growth assumptions">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Employment Income */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Employment Income</CardTitle>
              <CardDescription>Monthly gross salary and bonus (before CPF and tax)</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <CurrencyInput label="Monthly Gross Salary" value={income.monthlySalary} onChange={(v) => update('monthlySalary', v)} description="Inclusive of allowances" />
              <CurrencyInput label="Annual Bonus" value={income.annualBonus} onChange={(v) => update('annualBonus', v)} description="Fixed annual bonus" />
              <CurrencyInput label="Variable / Commission" value={income.variableComp} onChange={(v) => update('variableComp', v)} description="Annual variable compensation" />
              <div className="space-y-1.5">
                <Label>Annual Salary Growth Rate (%)</Label>
                <div className="relative">
                  <Input
                    type="number" min={0} max={20} step={0.5}
                    value={income.salaryGrowthRate}
                    onChange={(e) => update('salaryGrowthRate', parseFloat(e.target.value) || 0)}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span>
                </div>
                <p className="text-xs text-muted-foreground">Expected annual salary growth until retirement</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Passive & Other Income</CardTitle>
              <CardDescription>Monthly amounts from passive sources</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <CurrencyInput label="Rental Income (monthly)" value={income.rentalIncome} onChange={(v) => update('rentalIncome', v)} description="Net of expenses" />
              <CurrencyInput label="Dividend Income (monthly)" value={income.dividendIncome} onChange={(v) => update('dividendIncome', v)} description="REITs, stocks, funds" />
              <CurrencyInput label="Business Income (monthly)" value={income.businessIncome} onChange={(v) => update('businessIncome', v)} description="Net business profit share" />
              <CurrencyInput label="Other Income (monthly)" value={income.otherIncome} onChange={(v) => update('otherIncome', v)} description="Side income, royalties" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Semi-Retirement & Retirement Income</CardTitle>
              <CardDescription>Plan for phased retirement</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Semi-Retirement Age</Label>
                <Input
                  type="number" min={plan.client.age} max={plan.client.retirementAge}
                  value={income.semiRetirementAge}
                  onChange={(e) => update('semiRetirementAge', parseInt(e.target.value) || 55)}
                />
                <p className="text-xs text-muted-foreground">Age to transition to part-time work</p>
              </div>
              <CurrencyInput
                label="Semi-Retirement Monthly Income"
                value={income.semiRetirementIncome}
                onChange={(v) => update('semiRetirementIncome', v)}
                description="Part-time or consulting income"
              />
              <CurrencyInput
                label="Additional Passive Income at Retirement (monthly)"
                value={income.retirementPassiveIncome}
                onChange={(v) => update('retirementPassiveIncome', v)}
                description="New passive sources activated at retirement"
              />
            </CardContent>
          </Card>
        </div>

        {/* Summary Panel */}
        <div className="space-y-4">
          <Card className="bg-slate-900 text-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-white text-sm">Income Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-xs text-slate-400">Monthly Gross Salary</p>
                <p className="text-xl font-bold">{formatCurrency(income.monthlySalary)}</p>
              </div>
              <div className="h-px bg-slate-700" />
              <div>
                <p className="text-xs text-slate-400">Annual Employment Income</p>
                <p className="text-lg font-semibold">{formatCurrency(annualEmployment)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Annual Passive Income</p>
                <p className="text-lg font-semibold text-green-400">{formatCurrency(annualPassive)}</p>
              </div>
              <div className="h-px bg-slate-700" />
              <div>
                <p className="text-xs text-slate-400">Total Annual Income</p>
                <p className="text-2xl font-bold text-blue-400">{formatCurrency(totalAnnual)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Estimated Savings Rate</p>
                <p className={`text-lg font-bold ${savingsRate >= 20 ? 'text-green-400' : savingsRate >= 10 ? 'text-amber-400' : 'text-red-400'}`}>
                  {savingsRate.toFixed(1)}%
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">CPF Contribution (Est.)</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              {(() => {
                const cappedSalary = Math.min(income.monthlySalary, 6800);
                const annualOW = cappedSalary * 12;
                const empRate = plan.client.age < 55 ? 0.20 : plan.client.age < 60 ? 0.15 : 0.095;
                const erRate = plan.client.age < 55 ? 0.17 : plan.client.age < 60 ? 0.15 : 0.115;
                const empContrib = annualOW * empRate;
                const erContrib = annualOW * erRate;
                return (
                  <>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Employee (annual)</span>
                      <span className="font-medium">{formatCurrency(empContrib)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Employer (annual)</span>
                      <span className="font-medium">{formatCurrency(erContrib)}</span>
                    </div>
                    <div className="flex justify-between font-semibold border-t pt-2">
                      <span>Total CPF</span>
                      <span>{formatCurrency(empContrib + erContrib)}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Based on OW ceiling of S$6,800/month</p>
                  </>
                );
              })()}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Income Tax (Est.)</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              {(() => {
                const cappedSalary = Math.min(income.monthlySalary, 6800);
                const annualOW = cappedSalary * 12;
                const empRate = plan.client.age < 55 ? 0.20 : 0.15;
                const empContrib = annualOW * empRate;
                const grossIncome = income.monthlySalary * 12 + income.annualBonus + income.variableComp;
                const chargeableIncome = Math.max(0, grossIncome - empContrib);
                const tax = calculateIncomeTax(chargeableIncome);
                const effective = grossIncome > 0 ? (tax / grossIncome) * 100 : 0;
                return (
                  <>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Gross Income</span>
                      <span>{formatCurrency(grossIncome)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Chargeable Income</span>
                      <span>{formatCurrency(chargeableIncome)}</span>
                    </div>
                    <div className="flex justify-between font-semibold border-t pt-2">
                      <span>Estimated Tax</span>
                      <span>{formatCurrency(tax)}</span>
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Effective Rate</span>
                      <span>{effective.toFixed(2)}%</span>
                    </div>
                  </>
                );
              })()}
            </CardContent>
          </Card>
        </div>
      </div>
    </PageLayout>
  );
}
