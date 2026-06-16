'use client';

import { useFinancialStore } from '@/lib/store';
import { PageLayout } from '@/components/layout/PageLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, generateId } from '@/lib/utils';
import type { CustomExpenseItem, InsurancePolicy, InsuranceType } from '@/lib/types';
import { Plus, Trash2, Shield } from 'lucide-react';

// ─── Reusable row components ─────────────────────────────────────────────────

function OngoingExpenseRow({ label, value, onChange, description }: {
  label: string; value: number; onChange: (v: number) => void; description?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{label}</p>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className="text-xs text-muted-foreground hidden sm:block">Ongoing</span>
        <div className="relative w-36">
          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">S$</span>
          <Input type="number" min={0} className="pl-7 h-9 text-right"
            value={value || ''}
            onChange={(e) => onChange(parseFloat(e.target.value) || 0)} />
        </div>
      </div>
    </div>
  );
}

function TimedExpenseRow({ label, value, onValueChange, endAge, onEndAgeChange, description, endAgeLabel }: {
  label: string; value: number; onValueChange: (v: number) => void;
  endAge: number; onEndAgeChange: (v: number) => void;
  description?: string; endAgeLabel?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{label}</p>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <div className="relative w-36">
          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">S$</span>
          <Input type="number" min={0} className="pl-7 h-9 text-right"
            value={value || ''}
            onChange={(e) => onValueChange(parseFloat(e.target.value) || 0)} />
        </div>
        <div className="flex flex-col items-end gap-0.5">
          <span className="text-xs text-muted-foreground whitespace-nowrap">{endAgeLabel ?? 'Stops at age'}</span>
          <div className="relative w-20">
            <Input type="number" min={18} max={100} className="h-9 text-center text-sm"
              value={endAge || ''}
              onChange={(e) => onEndAgeChange(parseInt(e.target.value) || 65)} />
          </div>
        </div>
      </div>
    </div>
  );
}

function CustomExpenseRow({ item, onLabelChange, onAmountChange, onEndAgeChange, onRemove }: {
  item: CustomExpenseItem; onLabelChange: (v: string) => void;
  onAmountChange: (v: number) => void; onEndAgeChange: (v: number | undefined) => void; onRemove: () => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <Input className="h-9 text-sm flex-1" placeholder="Expense name"
        value={item.label} onChange={(e) => onLabelChange(e.target.value)} />
      <div className="relative w-36 flex-shrink-0">
        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">S$</span>
        <Input type="number" min={0} className="pl-7 h-9 text-right"
          value={item.amount || ''} onChange={(e) => onAmountChange(parseFloat(e.target.value) || 0)} />
      </div>
      <div className="flex flex-col items-center gap-0.5 flex-shrink-0">
        <span className="text-xs text-muted-foreground">End age</span>
        <Input type="number" min={18} max={100} placeholder="—"
          className="h-9 w-20 text-center text-sm" value={item.endAge ?? ''}
          onChange={(e) => { const v = parseInt(e.target.value); onEndAgeChange(isNaN(v) ? undefined : v); }} />
      </div>
      <Button variant="ghost" size="icon" className="h-9 w-9 flex-shrink-0 text-muted-foreground hover:text-destructive" onClick={onRemove}>
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

function AddItemButton({ onClick, label = 'Add custom expense' }: { onClick: () => void; label?: string }) {
  return (
    <Button variant="ghost" size="sm"
      className="w-full h-8 text-xs text-muted-foreground border border-dashed hover:border-primary hover:text-primary mt-1"
      onClick={onClick}>
      <Plus className="h-3.5 w-3.5 mr-1.5" />{label}
    </Button>
  );
}

function SectionTotal({ label, amount }: { label: string; amount: number }) {
  return (
    <div className="flex justify-between items-center py-2 px-3 rounded-md bg-muted/50">
      <span className="text-sm font-semibold">{label}</span>
      <span className="text-sm font-bold">{formatCurrency(amount)}</span>
    </div>
  );
}

// ─── Insurance type config ────────────────────────────────────────────────────

const TYPE_LABELS: Record<InsuranceType, string> = {
  hospitalisation:      'Integrated Shield Plan',
  term:                 'Term Life',
  wholeLife:            'Whole Life',
  ci:                   'Critical Illness',
  eci:                  'Early CI (ECI)',
  disabilityIncome:     'Disability Income',
  personalAccident:     'Personal Accident',
  careShield:           'CareShield Life',
  careShieldSupplement: 'CareShield Supplement',
};

const TYPE_COLORS: Record<InsuranceType, string> = {
  hospitalisation:      'bg-cyan-100 text-cyan-800',
  term:                 'bg-blue-100 text-blue-800',
  wholeLife:            'bg-indigo-100 text-indigo-800',
  ci:                   'bg-emerald-100 text-emerald-800',
  eci:                  'bg-teal-100 text-teal-800',
  disabilityIncome:     'bg-amber-100 text-amber-800',
  personalAccident:     'bg-orange-100 text-orange-800',
  careShield:           'bg-purple-100 text-purple-800',
  careShieldSupplement: 'bg-violet-100 text-violet-800',
};

function blankPolicy(): InsurancePolicy {
  return {
    id: generateId(), type: 'term', insurer: '', name: '',
    annualPremium: 0, premiumEndAge: 65,
    deathTPDSumAssured: 0, deathTPDCoverageUntilAge: 65,
    ciSumAssured: 0, ciCoverageUntilAge: 65,
    eciSumAssured: 0, eciCoverageUntilAge: 65,
    monthlyBenefit: 0, wardType: 'b1', hasRider: false,
    sumAssured: 0, coverageUntilAge: 65,
  };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ExpensesPage() {
  const { plan, updatePlan } = useFinancialStore();
  const expenses = plan.expenses;
  const insurance = plan.insurance;
  const currentAge = plan.client.age;

  function update<K extends keyof typeof expenses>(key: K, value: typeof expenses[K]) {
    updatePlan({ expenses: { ...expenses, [key]: value } });
  }

  type CustomKey = 'customEssential' | 'customLifestyle' | 'customFamily';
  function addCustomItem(section: CustomKey) {
    update(section, [...(expenses[section] ?? []), { id: generateId(), label: '', amount: 0 }]);
  }
  function updateCustomItem(section: CustomKey, id: string, field: keyof CustomExpenseItem, value: any) {
    update(section, (expenses[section] ?? []).map((i) => i.id === id ? { ...i, [field]: value } : i));
  }
  function removeCustomItem(section: CustomKey, id: string) {
    update(section, (expenses[section] ?? []).filter((i) => i.id !== id));
  }

  // Insurance policy management
  function addPolicy() {
    updatePlan({ insurance: { ...insurance, policies: [...insurance.policies, blankPolicy()] } });
  }
  function updatePolicy(id: string, field: keyof InsurancePolicy, value: any) {
    updatePlan({ insurance: { ...insurance, policies: insurance.policies.map((p) => p.id === id ? { ...p, [field]: value } : p) } });
  }
  function removePolicy(id: string) {
    updatePlan({ insurance: { ...insurance, policies: insurance.policies.filter((p) => p.id !== id) } });
  }

  // ── Totals ──────────────────────────────────────────────────────────────────
  const mortgageActive   = currentAge < (expenses.mortgageEndAge ?? 999);
  const parentsActive    = currentAge < (expenses.parentsAllowanceEndAge ?? 999);
  const childrenActive   = currentAge < (expenses.childrenExpensesEndAge ?? 999);
  const otherDepActive   = currentAge < (expenses.otherDependantsEndAge ?? 999);

  const customEssentialTotal = (expenses.customEssential ?? []).reduce((s, i) => s + (!i.endAge || currentAge < i.endAge ? i.amount : 0), 0);
  const customLifestyleTotal = (expenses.customLifestyle ?? []).reduce((s, i) => s + (!i.endAge || currentAge < i.endAge ? i.amount : 0), 0);
  const customFamilyTotal    = (expenses.customFamily    ?? []).reduce((s, i) => s + (!i.endAge || currentAge < i.endAge ? i.amount : 0), 0);

  const essentialTotal =
    expenses.food + expenses.utilities + expenses.healthcare + expenses.transport +
    (mortgageActive ? expenses.mortgage : 0) +
    customEssentialTotal;

  const lifestyleTotal = expenses.travel + expenses.dining + expenses.entertainment + expenses.hobbies + customLifestyleTotal;

  const familyTotal =
    (parentsActive  ? expenses.parentsAllowance  : 0) +
    (childrenActive ? expenses.childrenExpenses  : 0) +
    (otherDepActive ? expenses.otherDependants   : 0) +
    customFamilyTotal;

  const insuranceMonthlyTotal = insurance.policies.reduce((s, p) =>
    s + (currentAge < p.premiumEndAge ? p.annualPremium / 12 : 0), 0);

  const totalMonthly = essentialTotal + lifestyleTotal + familyTotal + insuranceMonthlyTotal;
  const totalAnnual  = totalMonthly * 12;

  const monthlyIncome  = plan.income.monthlySalary + plan.income.dividendIncome + plan.income.otherIncome;
  const savingsRate    = monthlyIncome > 0 ? ((monthlyIncome - totalMonthly) / monthlyIncome) * 100 : 0;
  const emergencyFundNeeded = (expenses.food + expenses.utilities + expenses.healthcare + expenses.transport +
    (mortgageActive ? expenses.mortgage : 0)) * 6;
  const liquidAssets   = plan.assets.savingsAccounts;
  const monthsCoverage = liquidAssets / ((emergencyFundNeeded / 6) || 1);

  return (
    <PageLayout title="Expenses" description="Monthly spending breakdown — time-limited expenses drop out automatically at their end age">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">

          {/* Column header hint */}
          <div className="flex justify-end pr-1 text-xs text-muted-foreground gap-16 mr-1">
            <span>Monthly (S$)</span>
            <span>Stops at age</span>
          </div>

          {/* Essential Expenses */}
          <Card>
            <CardHeader>
              <CardTitle>Essential Expenses</CardTitle>
              <CardDescription>Ongoing items have no end date. Time-limited items stop at the age you specify.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <OngoingExpenseRow label="Food & Groceries" value={expenses.food} onChange={(v) => update('food', v)} description="Supermarket, hawker, daily meals" />
              <Separator />
              <OngoingExpenseRow label="Utilities & Telco" value={expenses.utilities} onChange={(v) => update('utilities', v)} description="Electricity, water, gas, mobile, broadband" />
              <Separator />
              <OngoingExpenseRow label="Healthcare & Medications" value={expenses.healthcare} onChange={(v) => update('healthcare', v)} description="GP, specialists, medications" />
              <Separator />
              <OngoingExpenseRow label="Transport" value={expenses.transport} onChange={(v) => update('transport', v)} description="MRT, bus, petrol, ERP, parking" />
              <Separator />
              <TimedExpenseRow
                label="Housing / Mortgage"
                description="Monthly mortgage instalment or rent"
                value={expenses.mortgage}
                onValueChange={(v) => update('mortgage', v)}
                endAge={expenses.mortgageEndAge}
                onEndAgeChange={(v) => update('mortgageEndAge', v)}
              />
              {!mortgageActive && (
                <p className="text-xs text-green-600 pl-1">✓ Already paid off at current age {currentAge}</p>
              )}

              {(expenses.customEssential ?? []).length > 0 && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    {(expenses.customEssential ?? []).map((item) => (
                      <CustomExpenseRow key={item.id} item={item}
                        onLabelChange={(v) => updateCustomItem('customEssential', item.id, 'label', v)}
                        onAmountChange={(v) => updateCustomItem('customEssential', item.id, 'amount', v)}
                        onEndAgeChange={(v) => updateCustomItem('customEssential', item.id, 'endAge', v)}
                        onRemove={() => removeCustomItem('customEssential', item.id)} />
                    ))}
                  </div>
                </>
              )}
              <AddItemButton onClick={() => addCustomItem('customEssential')} />
              <SectionTotal label="Essential Monthly Total (current age)" amount={essentialTotal} />
            </CardContent>
          </Card>

          {/* Lifestyle Expenses */}
          <Card>
            <CardHeader>
              <CardTitle>Lifestyle Expenses</CardTitle>
              <CardDescription>Discretionary monthly spending — adjusted by retirement phase multipliers</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <OngoingExpenseRow label="Travel & Holidays" value={expenses.travel} onChange={(v) => update('travel', v)} description="Amortised monthly amount from annual travel budget" />
              <Separator />
              <OngoingExpenseRow label="Dining Out" value={expenses.dining} onChange={(v) => update('dining', v)} description="Restaurants, cafes, food delivery" />
              <Separator />
              <OngoingExpenseRow label="Entertainment" value={expenses.entertainment} onChange={(v) => update('entertainment', v)} description="Movies, concerts, subscriptions" />
              <Separator />
              <OngoingExpenseRow label="Hobbies & Personal Care" value={expenses.hobbies} onChange={(v) => update('hobbies', v)} description="Sports, grooming, shopping" />

              {(expenses.customLifestyle ?? []).length > 0 && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    {(expenses.customLifestyle ?? []).map((item) => (
                      <CustomExpenseRow key={item.id} item={item}
                        onLabelChange={(v) => updateCustomItem('customLifestyle', item.id, 'label', v)}
                        onAmountChange={(v) => updateCustomItem('customLifestyle', item.id, 'amount', v)}
                        onEndAgeChange={(v) => updateCustomItem('customLifestyle', item.id, 'endAge', v)}
                        onRemove={() => removeCustomItem('customLifestyle', item.id)} />
                    ))}
                  </div>
                </>
              )}
              <AddItemButton onClick={() => addCustomItem('customLifestyle')} />
              <SectionTotal label="Lifestyle Monthly Total" amount={lifestyleTotal} />
            </CardContent>
          </Card>

          {/* Family Support */}
          <Card>
            <CardHeader>
              <CardTitle>Family Support</CardTitle>
              <CardDescription>Set an end age for each item — the cashflow model drops it out automatically</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <TimedExpenseRow
                label="Parents Allowance"
                description="Monthly pocket money or support to parents"
                value={expenses.parentsAllowance}
                onValueChange={(v) => update('parentsAllowance', v)}
                endAge={expenses.parentsAllowanceEndAge}
                onEndAgeChange={(v) => update('parentsAllowanceEndAge', v)}
              />
              {!parentsActive && <p className="text-xs text-green-600 pl-1">✓ No longer active at current age {currentAge}</p>}
              <Separator />
              <TimedExpenseRow
                label="Children Expenses"
                description="School fees, enrichment, allowance"
                value={expenses.childrenExpenses}
                onValueChange={(v) => update('childrenExpenses', v)}
                endAge={expenses.childrenExpensesEndAge}
                onEndAgeChange={(v) => update('childrenExpensesEndAge', v)}
                endAgeLabel="Your age when ends"
              />
              {!childrenActive && <p className="text-xs text-green-600 pl-1">✓ Children independent at current age {currentAge}</p>}
              <Separator />
              <TimedExpenseRow
                label="Other Dependants"
                description="Other financial dependants"
                value={expenses.otherDependants}
                onValueChange={(v) => update('otherDependants', v)}
                endAge={expenses.otherDependantsEndAge}
                onEndAgeChange={(v) => update('otherDependantsEndAge', v)}
              />

              {(expenses.customFamily ?? []).length > 0 && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    {(expenses.customFamily ?? []).map((item) => (
                      <CustomExpenseRow key={item.id} item={item}
                        onLabelChange={(v) => updateCustomItem('customFamily', item.id, 'label', v)}
                        onAmountChange={(v) => updateCustomItem('customFamily', item.id, 'amount', v)}
                        onEndAgeChange={(v) => updateCustomItem('customFamily', item.id, 'endAge', v)}
                        onRemove={() => removeCustomItem('customFamily', item.id)} />
                    ))}
                  </div>
                </>
              )}
              <AddItemButton onClick={() => addCustomItem('customFamily')} />
              <SectionTotal label="Family Support Monthly Total (current age)" amount={familyTotal} />
            </CardContent>
          </Card>

          {/* Insurance Premiums */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  Insurance Premiums
                </CardTitle>
                <CardDescription>Add each policy — premiums feed directly into your monthly expense total and coverage analysis</CardDescription>
              </div>
              <Button size="sm" onClick={addPolicy}>
                <Plus className="h-4 w-4 mr-1" />Add Policy
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {insurance.policies.length === 0 ? (
                <div className="text-center py-8 border-2 border-dashed rounded-lg border-muted-foreground/20">
                  <Shield className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">No policies added yet.</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Click "Add Policy" to enter your insurance policies.</p>
                </div>
              ) : (
                <>
                  {/* Column headers */}
                  <div className="grid grid-cols-12 gap-2 px-1 text-xs text-muted-foreground font-medium">
                    <div className="col-span-3">Type</div>
                    <div className="col-span-3">Insurer</div>
                    <div className="col-span-2">Coverage (S$)</div>
                    <div className="col-span-2">Annual Premium</div>
                    <div className="col-span-1 text-center">End Age</div>
                    <div className="col-span-1" />
                  </div>
                  <Separator />
                  {insurance.policies.map((p) => {
                    const isActive = currentAge < p.premiumEndAge;
                    const isLifePolicy = p.type === 'term' || p.type === 'wholeLife';

                    // For non-life policies, single coverage value
                    const coverageValue = p.type === 'disabilityIncome' || p.type === 'careShieldSupplement'
                      ? p.monthlyBenefit
                      : p.type === 'ci'  ? p.ciSumAssured
                      : p.type === 'eci' ? p.eciSumAssured
                      : p.sumAssured;
                    const coverageLabel = p.type === 'disabilityIncome' || p.type === 'careShieldSupplement'
                      ? '/mo' : 'SA';

                    return (
                      <div key={p.id} className={`rounded-lg border px-3 py-2 space-y-2 transition-opacity ${isActive ? '' : 'opacity-50'}`}>
                        {/* Main row: type, insurer, [coverage for non-life], premium, end age, remove */}
                        <div className="grid grid-cols-12 gap-2 items-center">
                          {/* Type */}
                          <div className="col-span-3">
                            <Select value={p.type} onValueChange={(v) => updatePolicy(p.id, 'type', v as InsuranceType)}>
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {(Object.entries(TYPE_LABELS) as [InsuranceType, string][]).map(([k, v]) => (
                                  <SelectItem key={k} value={k} className="text-xs">{v}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Insurer */}
                          <div className="col-span-3">
                            <Input className="h-8 text-xs" placeholder="e.g. AIA, NTUC"
                              value={p.insurer}
                              onChange={(e) => updatePolicy(p.id, 'insurer', e.target.value)} />
                          </div>

                          {/* Coverage — life policies span 2 cols with placeholder text; others show single field */}
                          <div className="col-span-2">
                            {isLifePolicy ? (
                              <span className="text-xs text-muted-foreground italic pl-1">see below ↓</span>
                            ) : p.type === 'hospitalisation' ? (
                              <Select value={p.wardType ?? 'b1'} onValueChange={(v) => updatePolicy(p.id, 'wardType', v)}>
                                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="b1" className="text-xs">B1 Ward</SelectItem>
                                  <SelectItem value="a" className="text-xs">A Ward</SelectItem>
                                  <SelectItem value="private" className="text-xs">Private</SelectItem>
                                </SelectContent>
                              </Select>
                            ) : (
                              <div className="relative">
                                <Input type="number" min={0} className="h-8 text-xs pr-7" placeholder="0"
                                  value={coverageValue || ''}
                                  onChange={(e) => {
                                    const v = parseFloat(e.target.value) || 0;
                                    if (p.type === 'disabilityIncome' || p.type === 'careShieldSupplement') updatePolicy(p.id, 'monthlyBenefit', v);
                                    else if (p.type === 'ci')  updatePolicy(p.id, 'ciSumAssured', v);
                                    else if (p.type === 'eci') updatePolicy(p.id, 'eciSumAssured', v);
                                    else updatePolicy(p.id, 'sumAssured', v);
                                  }} />
                                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">{coverageLabel}</span>
                              </div>
                            )}
                          </div>

                          {/* Annual premium */}
                          <div className="col-span-2">
                          <div className="relative">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">S$</span>
                            <Input type="number" min={0} className="h-8 text-xs pl-6 text-right"
                              value={p.annualPremium || ''}
                              onChange={(e) => updatePolicy(p.id, 'annualPremium', parseFloat(e.target.value) || 0)} />
                          </div>
                        </div>

                        {/* Premium end age */}
                        <div className="col-span-1">
                          <Input type="number" min={18} max={100} className="h-8 text-xs text-center"
                            value={p.premiumEndAge || ''}
                            onChange={(e) => updatePolicy(p.id, 'premiumEndAge', parseInt(e.target.value) || 65)} />
                        </div>

                        {/* Remove */}
                        <div className="col-span-1 flex justify-center">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => removePolicy(p.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                        </div>{/* end main row */}

                        {/* Life policy sum assured sub-row */}
                        {isLifePolicy && (
                          <div className="grid grid-cols-3 gap-3 pt-1 pb-0.5 border-t border-dashed">
                            {/* Death / TPD */}
                            <div className="space-y-1">
                              <Label className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Death / TPD SA</Label>
                              <div className="relative">
                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">S$</span>
                                <Input type="number" min={0} className="h-8 text-xs pl-6"
                                  placeholder="0"
                                  value={p.deathTPDSumAssured || ''}
                                  onChange={(e) => updatePolicy(p.id, 'deathTPDSumAssured', parseFloat(e.target.value) || 0)} />
                              </div>
                            </div>
                            {/* Early CI */}
                            <div className="space-y-1">
                              <Label className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Early CI SA</Label>
                              <div className="relative">
                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">S$</span>
                                <Input type="number" min={0} className="h-8 text-xs pl-6"
                                  placeholder="0"
                                  value={p.eciSumAssured || ''}
                                  onChange={(e) => updatePolicy(p.id, 'eciSumAssured', parseFloat(e.target.value) || 0)} />
                              </div>
                            </div>
                            {/* Late CI */}
                            <div className="space-y-1">
                              <Label className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Late CI SA</Label>
                              <div className="relative">
                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">S$</span>
                                <Input type="number" min={0} className="h-8 text-xs pl-6"
                                  placeholder="0"
                                  value={p.ciSumAssured || ''}
                                  onChange={(e) => updatePolicy(p.id, 'ciSumAssured', parseFloat(e.target.value) || 0)} />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </>
              )}

              {insurance.policies.length > 0 && (
                <div className="space-y-2 pt-2 border-t">
                  <div className="flex justify-between items-center py-1 px-3 rounded-md bg-muted/30 text-xs text-muted-foreground">
                    <span>Active premiums only (age {currentAge})</span>
                    <span className="font-medium text-foreground">{formatCurrency(insuranceMonthlyTotal)}/mo</span>
                  </div>
                  <SectionTotal label="Insurance Premiums Monthly Total" amount={insuranceMonthlyTotal} />
                  <div className="flex justify-between px-3 text-xs text-muted-foreground">
                    <span>Annual total</span>
                    <span className="font-medium">{formatCurrency(insuranceMonthlyTotal * 12)}/yr</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

        </div>

        {/* Summary Panel */}
        <div className="space-y-4">
          <Card className="text-white" style={{ background: 'linear-gradient(160deg, #0f4c41 0%, #134e4a 100%)' }}>
            <CardHeader className="pb-2"><CardTitle className="text-white text-sm">Monthly Summary (Age {currentAge})</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              {[
                { label: 'Essential',        amount: essentialTotal,       color: 'text-white' },
                { label: 'Lifestyle',         amount: lifestyleTotal,       color: 'text-teal-300' },
                { label: 'Family Support',    amount: familyTotal,          color: 'text-cyan-300' },
                { label: 'Insurance',         amount: insuranceMonthlyTotal,color: 'text-emerald-300' },
              ].map(({ label, amount, color }) => (
                <div key={label} className="flex justify-between">
                  <span style={{ color: 'rgba(255,255,255,0.55)' }}>{label}</span>
                  <span className={`font-medium ${color}`}>{formatCurrency(amount)}</span>
                </div>
              ))}
              <div className="h-px" style={{ background: 'rgba(255,255,255,0.15)' }} />
              <div className="flex justify-between">
                <span style={{ color: 'rgba(255,255,255,0.8)' }} className="font-medium">Total Monthly</span>
                <span className="font-bold text-xl">{formatCurrency(totalMonthly)}</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: 'rgba(255,255,255,0.55)' }}>Total Annual</span>
                <span className="font-semibold">{formatCurrency(totalAnnual)}</span>
              </div>
              <div className="h-px" style={{ background: 'rgba(255,255,255,0.15)' }} />
              <div>
                <p style={{ color: 'rgba(255,255,255,0.55)' }} className="text-xs mb-1">Savings Rate</p>
                <p className={`text-xl font-bold ${savingsRate >= 20 ? 'text-emerald-400' : savingsRate >= 10 ? 'text-amber-400' : 'text-red-400'}`}>
                  {savingsRate.toFixed(1)}%
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Expenses at Retirement */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Expenses at Retirement (Age {plan.client.retirementAge})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs">
              {(() => {
                const retAge = plan.client.retirementAge;
                const items = [
                  { label: 'Mortgage',          active: retAge < (expenses.mortgageEndAge ?? 999),         amount: expenses.mortgage },
                  { label: 'Parents allowance', active: retAge < (expenses.parentsAllowanceEndAge ?? 999), amount: expenses.parentsAllowance },
                  { label: 'Children expenses', active: retAge < (expenses.childrenExpensesEndAge ?? 999), amount: expenses.childrenExpenses },
                  ...insurance.policies.map((p) => ({
                    label: `${TYPE_LABELS[p.type]}${p.insurer ? ` (${p.insurer})` : ''}`,
                    active: retAge < p.premiumEndAge,
                    amount: p.annualPremium / 12,
                  })),
                ];
                const dropped = items.filter((i) => !i.active && i.amount > 0);
                const active  = items.filter((i) => i.active && i.amount > 0);
                return (
                  <>
                    {dropped.length > 0 && (
                      <div className="p-2 rounded bg-green-50 border border-green-200 space-y-1">
                        <p className="font-semibold text-green-800">Dropped out by retirement:</p>
                        {dropped.map((i) => (
                          <div key={i.label} className="flex justify-between text-green-700">
                            <span className="truncate mr-2">{i.label}</span>
                            <span className="flex-shrink-0">−{formatCurrency(i.amount)}/mo</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {active.length > 0 && (
                      <div className="p-2 rounded bg-amber-50 border border-amber-200 space-y-1">
                        <p className="font-semibold text-amber-800">Still active at retirement:</p>
                        {active.map((i) => (
                          <div key={i.label} className="flex justify-between text-amber-700">
                            <span className="truncate mr-2">{i.label}</span>
                            <span className="flex-shrink-0">{formatCurrency(i.amount)}/mo</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {dropped.length === 0 && active.length === 0 && (
                      <p className="text-muted-foreground">No time-limited expenses entered yet.</p>
                    )}
                  </>
                );
              })()}
            </CardContent>
          </Card>

          {/* Emergency Fund */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Emergency Fund Check</CardTitle></CardHeader>
            <CardContent className="text-sm space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Essential monthly needs</span>
                <span className="font-medium">{formatCurrency(emergencyFundNeeded / 6)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">6-month target</span>
                <span className="font-medium">{formatCurrency(emergencyFundNeeded)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Liquid assets</span>
                <span className="font-medium">{formatCurrency(liquidAssets)}</span>
              </div>
              <div className="flex justify-between font-semibold border-t pt-2">
                <span>Coverage</span>
                <span className={monthsCoverage >= 6 ? 'text-green-600' : monthsCoverage >= 3 ? 'text-amber-600' : 'text-red-600'}>
                  {monthsCoverage.toFixed(1)} months
                </span>
              </div>
              {monthsCoverage < 6 && (
                <div className="p-2 rounded bg-amber-50 border border-amber-200 text-xs text-amber-800">
                  ⚠ Top up by {formatCurrency(emergencyFundNeeded - liquidAssets)} to reach 6-month coverage.
                </div>
              )}
            </CardContent>
          </Card>

          {/* Breakdown */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Expense Breakdown</CardTitle></CardHeader>
            <CardContent>
              {totalMonthly > 0 ? (
                <div className="space-y-2">
                  {[
                    { label: 'Essential',  amount: essentialTotal,        color: 'bg-teal-500' },
                    { label: 'Lifestyle',  amount: lifestyleTotal,        color: 'bg-indigo-400' },
                    { label: 'Family',     amount: familyTotal,           color: 'bg-amber-400' },
                    { label: 'Insurance',  amount: insuranceMonthlyTotal, color: 'bg-emerald-500' },
                  ].map(({ label, amount, color }) => (
                    <div key={label}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-muted-foreground">{label}</span>
                        <span>{((amount / totalMonthly) * 100).toFixed(0)}%</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div className={`h-full ${color} rounded-full`} style={{ width: `${(amount / totalMonthly) * 100}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground text-center py-4">Enter expenses to see breakdown</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </PageLayout>
  );
}
