'use client';

import { useFinancialStore } from '@/lib/store';
import { PageLayout } from '@/components/layout/PageLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, generateId, inflateValue, CURRENT_YEAR } from '@/lib/utils';
import type { Goal, GoalCategory } from '@/lib/types';
import { Plus, Trash2, Target, Home, GraduationCap, Car, Plane, Heart, Hammer, Package } from 'lucide-react';

const CATEGORY_CONFIG: Record<GoalCategory, { label: string; icon: React.ElementType; defaultInflation: number; color: string }> = {
  property:   { label: 'Property',       icon: Home,          defaultInflation: 2.5, color: 'bg-blue-100 text-blue-700' },
  education:  { label: 'Education',      icon: GraduationCap, defaultInflation: 5.0, color: 'bg-green-100 text-green-700' },
  vehicle:    { label: 'Vehicle',        icon: Car,           defaultInflation: 2.0, color: 'bg-slate-100 text-slate-700' },
  travel:     { label: 'Travel',         icon: Plane,         defaultInflation: 3.0, color: 'bg-sky-100 text-sky-700' },
  wedding:    { label: 'Wedding',        icon: Heart,         defaultInflation: 3.0, color: 'bg-pink-100 text-pink-700' },
  renovation: { label: 'Renovation',     icon: Hammer,        defaultInflation: 4.0, color: 'bg-amber-100 text-amber-700' },
  legacy:     { label: 'Legacy/Estate',  icon: Package,       defaultInflation: 0.0, color: 'bg-purple-100 text-purple-700' },
  sabbatical: { label: 'Sabbatical',     icon: Plane,         defaultInflation: 2.5, color: 'bg-teal-100 text-teal-700' },
  other:      { label: 'Other',          icon: Target,        defaultInflation: 2.5, color: 'bg-gray-100 text-gray-700' },
};

const PRIORITY_CONFIG = {
  high:   { label: 'High',   variant: 'destructive' as const },
  medium: { label: 'Medium', variant: 'warning' as const },
  low:    { label: 'Low',    variant: 'secondary' as const },
};

export default function GoalsPage() {
  const { plan, updatePlan } = useFinancialStore();
  const goals = plan.goals;

  function addGoal(category: GoalCategory = 'other') {
    const cat = CATEGORY_CONFIG[category];
    const g: Goal = {
      id: generateId(),
      name: cat.label + ' Goal',
      category,
      currentCost: 50000,
      targetYear: CURRENT_YEAR + 5,
      priority: 'medium',
      inflationRate: cat.defaultInflation,
      isFunded: false,
    };
    updatePlan({ goals: [...goals, g] });
  }

  function updateGoal(id: string, field: keyof Goal, value: any) {
    updatePlan({ goals: goals.map((g) => (g.id === id ? { ...g, [field]: value } : g)) });
  }

  function removeGoal(id: string) {
    updatePlan({ goals: goals.filter((g) => g.id !== id) });
  }

  const totalCurrentCost = goals.reduce((s, g) => s + g.currentCost, 0);
  const totalFutureValue = goals.reduce((s, g) => {
    const years = Math.max(0, g.targetYear - CURRENT_YEAR);
    return s + inflateValue(g.currentCost, g.inflationRate, years);
  }, 0);

  const sortedGoals = [...goals].sort((a, b) => a.targetYear - b.targetYear);
  const currentYear = CURRENT_YEAR;

  return (
    <PageLayout title="Future Goals" description="Define your financial goals — inflation adjustment applied automatically">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Quick Add */}
          <Card>
            <CardHeader><CardTitle className="text-sm">Quick Add Goal</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
                {(Object.keys(CATEGORY_CONFIG) as GoalCategory[]).map((cat) => {
                  const { label, icon: Icon, color } = CATEGORY_CONFIG[cat];
                  return (
                    <button key={cat} onClick={() => addGoal(cat)}
                      className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 border-transparent hover:border-primary transition-colors ${color}`}>
                      <Icon className="h-5 w-5" />
                      <span className="text-xs font-medium text-center leading-tight">{label}</span>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Goals List */}
          {sortedGoals.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Target className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm font-medium text-muted-foreground">No financial goals added yet</p>
                <p className="text-xs text-muted-foreground mt-1">Use the quick add buttons above to get started</p>
              </CardContent>
            </Card>
          ) : (
            sortedGoals.map((g) => {
              const { icon: Icon, color } = CATEGORY_CONFIG[g.category];
              const yearsToGoal = Math.max(0, g.targetYear - currentYear);
              const futureValue = inflateValue(g.currentCost, g.inflationRate, yearsToGoal);
              return (
                <Card key={g.id} className="overflow-hidden">
                  <div className={`h-1 ${g.priority === 'high' ? 'bg-red-400' : g.priority === 'medium' ? 'bg-amber-400' : 'bg-slate-300'}`} />
                  <CardContent className="p-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="col-span-2 md:col-span-1 space-y-1">
                        <Label className="text-xs">Goal Name</Label>
                        <Input className="h-8 text-sm" value={g.name} onChange={(e) => updateGoal(g.id, 'name', e.target.value)} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Category</Label>
                        <Select value={g.category} onValueChange={(v) => updateGoal(g.id, 'category', v as GoalCategory)}>
                          <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {(Object.entries(CATEGORY_CONFIG) as [GoalCategory, any][]).map(([k, v]) => (
                              <SelectItem key={k} value={k}>{v.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Priority</Label>
                        <Select value={g.priority} onValueChange={(v) => updateGoal(g.id, 'priority', v as any)}>
                          <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="high">High</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="low">Low</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-end justify-end">
                        <Button variant="ghost" size="icon" className="text-destructive h-8 w-8" onClick={() => removeGoal(g.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3 mt-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Current Cost (S$)</Label>
                        <div className="relative">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">S$</span>
                          <Input type="number" className="h-8 text-sm pl-7" value={g.currentCost || ''}
                            onChange={(e) => updateGoal(g.id, 'currentCost', parseFloat(e.target.value) || 0)} />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Target Year</Label>
                        <Input type="number" min={currentYear} max={currentYear + 60} className="h-8 text-sm" value={g.targetYear}
                          onChange={(e) => updateGoal(g.id, 'targetYear', parseInt(e.target.value) || currentYear + 5)} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Inflation Rate (%)</Label>
                        <Input type="number" min={0} max={15} step={0.5} className="h-8 text-sm" value={g.inflationRate}
                          onChange={(e) => updateGoal(g.id, 'inflationRate', parseFloat(e.target.value) || 0)} />
                      </div>
                    </div>
                    {/* Property-specific downpayment fields */}
                    {g.category === 'property' && (
                      <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t">
                        <div className="space-y-1">
                          <Label className="text-xs">Initial Downpayment (S$)</Label>
                          <div className="relative">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">S$</span>
                            <Input type="number" min={0} className="h-8 text-sm pl-7" placeholder="e.g. 100000"
                              value={g.propertyDownpayment || ''}
                              onChange={(e) => updateGoal(g.id, 'propertyDownpayment', parseFloat(e.target.value) || 0)} />
                          </div>
                          {g.propertyDownpayment && g.currentCost > 0 && (
                            <p className="text-xs text-muted-foreground">
                              {((g.propertyDownpayment / g.currentCost) * 100).toFixed(1)}% of property cost
                            </p>
                          )}
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Downpayment Source</Label>
                          <Select
                            value={g.downpaymentSource ?? 'cash'}
                            onValueChange={(v) => updateGoal(g.id, 'downpaymentSource', v as 'cash' | 'cpf_oa')}
                          >
                            <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="cash">Cash / Savings</SelectItem>
                              <SelectItem value="cpf_oa">CPF Ordinary Account (OA)</SelectItem>
                            </SelectContent>
                          </Select>
                          <p className="text-xs text-muted-foreground">
                            {(g.downpaymentSource ?? 'cash') === 'cpf_oa'
                              ? 'Deducted from CPF OA at purchase year'
                              : 'Deducted from cash savings at purchase year'}
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="mt-3 flex items-center justify-between p-2 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-2">
                        <div className={`w-6 h-6 rounded-md flex items-center justify-center ${color}`}>
                          <Icon className="h-3.5 w-3.5" />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">{yearsToGoal} years away</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Future Value</p>
                        <p className="text-base font-bold text-foreground">{formatCurrency(futureValue)}</p>
                        {g.inflationRate > 0 && (
                          <p className="text-xs text-amber-600">+{formatCurrency(futureValue - g.currentCost)} from inflation</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        {/* Summary */}
        <div className="space-y-4">
          <Card className="bg-slate-900 text-white">
            <CardHeader className="pb-2"><CardTitle className="text-white text-sm">Goals Summary</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-400">Number of Goals</span>
                <span>{goals.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Current Cost Total</span>
                <span>{formatCurrency(totalCurrentCost)}</span>
              </div>
              <div className="h-px bg-slate-700" />
              <div className="flex justify-between font-bold">
                <span className="text-slate-300">Total Future Value</span>
                <span className="text-xl text-amber-400">{formatCurrency(totalFutureValue)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Inflation premium</span>
                <span className="text-red-400">+{formatCurrency(totalFutureValue - totalCurrentCost)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Goals Timeline */}
          {sortedGoals.length > 0 && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Goals Timeline</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {sortedGoals.map((g) => {
                    const { color } = CATEGORY_CONFIG[g.category];
                    const yearsToGoal = Math.max(0, g.targetYear - currentYear);
                    const fv = inflateValue(g.currentCost, g.inflationRate, yearsToGoal);
                    return (
                      <div key={g.id} className="flex items-center gap-3 text-xs">
                        <div className="w-12 text-center flex-shrink-0">
                          <div className="font-bold text-foreground">{g.targetYear}</div>
                          <div className="text-muted-foreground">{yearsToGoal}yr</div>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-foreground truncate">{g.name}</span>
                            <Badge variant={PRIORITY_CONFIG[g.priority].variant} className="text-xs ml-2">{g.priority}</Badge>
                          </div>
                          <div className="text-muted-foreground">{formatCurrency(fv)}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Priority breakdown */}
          {goals.length > 0 && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">By Priority</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {['high', 'medium', 'low'].map((p) => {
                  const pGoals = goals.filter((g) => g.priority === p);
                  const pTotal = pGoals.reduce((s, g) => {
                    const years = Math.max(0, g.targetYear - currentYear);
                    return s + inflateValue(g.currentCost, g.inflationRate, years);
                  }, 0);
                  return pGoals.length > 0 ? (
                    <div key={p} className="flex justify-between items-center text-sm">
                      <div className="flex items-center gap-2">
                        <Badge variant={PRIORITY_CONFIG[p as keyof typeof PRIORITY_CONFIG].variant}>{p}</Badge>
                        <span className="text-muted-foreground">{pGoals.length} goal{pGoals.length > 1 ? 's' : ''}</span>
                      </div>
                      <span className="font-semibold">{formatCurrency(pTotal)}</span>
                    </div>
                  ) : null;
                })}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </PageLayout>
  );
}
