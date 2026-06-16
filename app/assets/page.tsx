'use client';

import { useFinancialStore } from '@/lib/store';
import { PageLayout } from '@/components/layout/PageLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, generateId } from '@/lib/utils';
import type { Property, Investment, LiabilityItem, InvestmentType, LiabilityType } from '@/lib/types';
import { Plus, Trash2 } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

// Per investment-type colors — bonds=blue, crypto=green, property-like=amber, etc.
const INVESTMENT_TYPE_COLORS: Record<InvestmentType, string> = {
  stocks:      '#f97316', // orange
  etf:         '#3b82f6', // blue
  reit:        '#f59e0b', // amber (property-like)
  bonds:       '#1d4ed8', // deep blue — as requested
  unitTrust:   '#8b5cf6', // purple
  endowment:   '#6366f1', // indigo
  crypto:      '#22c55e', // green — as requested
  srs:         '#0d9488', // teal
  tbills:      '#06b6d4', // cyan
  ssb:         '#14b8a6', // teal-cyan
  other:       '#9ca3af', // gray
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

export default function AssetsPage() {
  const { plan, updatePlan } = useFinancialStore();
  const { assets, liabilities } = plan;

  function updateAssets(updates: Partial<typeof assets>) {
    updatePlan({ assets: { ...assets, ...updates } });
  }

  // Property
  function addProperty() {
    const p: Property = { id: generateId(), name: 'My Property', type: 'hdb', marketValue: 500000, outstandingLoan: 200000, monthlyMortgage: 1500, rentalIncome: 0, remainingLease: 95, isMainResidence: true, annualAppreciation: 2 };
    updateAssets({ properties: [...assets.properties, p] });
  }
  function updateProperty(id: string, field: keyof Property, value: any) {
    updateAssets({ properties: assets.properties.map((p) => p.id === id ? { ...p, [field]: value } : p) });
  }
  function removeProperty(id: string) {
    updateAssets({ properties: assets.properties.filter((p) => p.id !== id) });
  }

  // Investments
  function addInvestment() {
    const inv: Investment = { id: generateId(), type: 'etf', name: 'IBKR ETF Portfolio', currentValue: 50000, annualReturn: 7, monthlyContribution: 0 };
    updateAssets({ investments: [...assets.investments, inv] });
  }
  function updateInvestment(id: string, field: keyof Investment, value: any) {
    updateAssets({ investments: assets.investments.map((i) => i.id === id ? { ...i, [field]: value } : i) });
  }
  function removeInvestment(id: string) {
    updateAssets({ investments: assets.investments.filter((i) => i.id !== id) });
  }

  // Liabilities
  function addLiability() {
    const l: LiabilityItem = { id: generateId(), type: 'car', name: 'Car Loan', outstandingBalance: 50000, monthlyPayment: 1000, interestRate: 2.5, remainingMonths: 60 };
    updatePlan({ liabilities: [...liabilities, l] });
  }
  function updateLiability(id: string, field: keyof LiabilityItem, value: any) {
    updatePlan({ liabilities: liabilities.map((l) => l.id === id ? { ...l, [field]: value } : l) });
  }
  function removeLiability(id: string) {
    updatePlan({ liabilities: liabilities.filter((l) => l.id !== id) });
  }

  const totalCash = assets.savingsAccounts + assets.fixedDeposits + assets.singaporeSavingsBonds;
  const totalInvestments = assets.investments.reduce((s, i) => s + i.currentValue, 0) + assets.srsBalance;
  const totalProperty = assets.properties.reduce((s, p) => s + p.marketValue, 0);
  const totalBusiness = assets.businessValuation * (assets.businessOwnershipPct / 100);
  const totalAssets = totalCash + totalInvestments + totalProperty + totalBusiness;
  const totalLiabilities = liabilities.reduce((s, l) => s + l.outstandingBalance, 0) +
    assets.properties.reduce((s, p) => s + p.outstandingLoan, 0);
  const netWorth = totalAssets - totalLiabilities;

  // Group investments by type for per-type pie slices
  const investmentsByType = assets.investments.reduce<Partial<Record<InvestmentType, number>>>((acc, inv) => {
    acc[inv.type] = (acc[inv.type] ?? 0) + inv.currentValue;
    return acc;
  }, {});

  const allocationData = [
    // Cash buckets
    { name: 'Cash & Savings', value: assets.savingsAccounts + assets.fixedDeposits, color: '#0d9488' },
    { name: 'SSB / T-Bills',  value: assets.singaporeSavingsBonds, color: '#06b6d4' },
    { name: 'SRS',            value: assets.srsBalance, color: '#8b5cf6' },
    // Per investment type
    ...(Object.entries(investmentsByType) as [InvestmentType, number][]).map(([type, value]) => ({
      name: INVESTMENT_TYPE_LABELS[type],
      value,
      color: INVESTMENT_TYPE_COLORS[type],
    })),
    // Property & Business
    { name: 'Property',  value: totalProperty,  color: '#f59e0b' },
    { name: 'Business',  value: totalBusiness,  color: '#a855f7' },
  ].filter((d) => d.value > 0);

  return (
    <PageLayout title="Assets & Liabilities" description="Complete net worth statement">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Cash & Liquidity */}
          <Card>
            <CardHeader>
              <CardTitle>Cash & Liquid Assets</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              {([['savingsAccounts', 'Bank Savings Accounts'], ['fixedDeposits', 'Fixed Deposits'], ['singaporeSavingsBonds', 'SSBs / T-Bills'], ['srsBalance', 'SRS Balance']] as const).map(([key, label]) => (
                <div key={key} className="space-y-1.5">
                  <Label className="text-sm">{label}</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">S$</span>
                    <Input type="number" min={0} className="pl-8" value={assets[key] || ''}
                      onChange={(e) => updateAssets({ [key]: parseFloat(e.target.value) || 0 })} />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Properties */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div><CardTitle>Properties</CardTitle><CardDescription>All real estate assets</CardDescription></div>
              <Button size="sm" onClick={addProperty}><Plus className="h-4 w-4 mr-1" />Add Property</Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {assets.properties.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No properties added.</p>
              ) : (
                assets.properties.map((p) => (
                  <div key={p.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="grid grid-cols-2 gap-3 flex-1 mr-3">
                        <div className="space-y-1"><Label className="text-xs">Property Name</Label>
                          <Input className="h-8 text-sm" value={p.name} onChange={(e) => updateProperty(p.id, 'name', e.target.value)} /></div>
                        <div className="space-y-1"><Label className="text-xs">Type</Label>
                          <Select value={p.type} onValueChange={(v) => updateProperty(p.id, 'type', v)}>
                            <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="hdb">HDB Flat</SelectItem>
                              <SelectItem value="condo">Private Condo</SelectItem>
                              <SelectItem value="landed">Landed</SelectItem>
                              <SelectItem value="commercial">Commercial</SelectItem>
                            </SelectContent>
                          </Select></div>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => removeProperty(p.id)} className="text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        ['marketValue', 'Market Value (S$)'],
                        ['outstandingLoan', 'Outstanding Loan (S$)'],
                        ['monthlyMortgage', 'Monthly Mortgage (S$)'],
                        ['rentalIncome', 'Rental Income/Month (S$)'],
                        ['remainingLease', 'Remaining Lease (yrs)'],
                        ['annualAppreciation', 'Annual Growth (%)'],
                      ].map(([field, label]) => (
                        <div key={field} className="space-y-1">
                          <Label className="text-xs">{label}</Label>
                          <Input type="number" className="h-8 text-sm" value={(p as any)[field] || ''}
                            onChange={(e) => updateProperty(p.id, field as keyof Property, parseFloat(e.target.value) || 0)} />
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Investments */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div><CardTitle>Investment Portfolio</CardTitle><CardDescription>Stocks, ETFs, REITs, bonds, and alternatives</CardDescription></div>
              <Button size="sm" onClick={addInvestment}><Plus className="h-4 w-4 mr-1" />Add Investment</Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {assets.investments.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No investments added.</p>
              ) : (
                assets.investments.map((inv) => (
                  <div key={inv.id} className="p-3 bg-muted/30 rounded-lg border space-y-2">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1"><Label className="text-xs">Name</Label>
                        <Input className="h-8 text-sm" value={inv.name} onChange={(e) => updateInvestment(inv.id, 'name', e.target.value)} /></div>
                      <div className="space-y-1"><Label className="text-xs">Type</Label>
                        <Select value={inv.type} onValueChange={(v) => updateInvestment(inv.id, 'type', v as InvestmentType)}>
                          <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {['stocks','etf','reit','bonds','unitTrust','endowment','crypto','tbills','ssb','srs','other'].map(t => (
                              <SelectItem key={t} value={t}>{t.toUpperCase()}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select></div>
                    </div>
                    <div className="grid grid-cols-3 gap-3 items-end">
                      <div className="space-y-1">
                        <Label className="text-xs">Current Value (S$)</Label>
                        <div className="relative">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">S$</span>
                          <Input type="number" className="h-8 text-sm pl-7" value={inv.currentValue || ''}
                            onChange={(e) => updateInvestment(inv.id, 'currentValue', parseFloat(e.target.value) || 0)} />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Monthly Contribution (S$)</Label>
                        <div className="relative">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">S$</span>
                          <Input type="number" min={0} className="h-8 text-sm pl-7" placeholder="0"
                            value={inv.monthlyContribution || ''}
                            onChange={(e) => updateInvestment(inv.id, 'monthlyContribution', parseFloat(e.target.value) || 0)} />
                        </div>
                      </div>
                      <div className="flex items-end gap-2">
                        <div className="flex-1 space-y-1">
                          <Label className="text-xs">Annual Return (%)</Label>
                          <Input type="number" className="h-8 text-sm" value={inv.annualReturn || ''}
                            onChange={(e) => updateInvestment(inv.id, 'annualReturn', parseFloat(e.target.value) || 0)} />
                        </div>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive flex-shrink-0" onClick={() => removeInvestment(inv.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Business */}
          <Card>
            <CardHeader><CardTitle>Business Ownership</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label>Business Valuation (S$)</Label>
                <div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">S$</span>
                  <Input type="number" min={0} className="pl-8" value={assets.businessValuation || ''}
                    onChange={(e) => updateAssets({ businessValuation: parseFloat(e.target.value) || 0 })} /></div></div>
              <div className="space-y-1.5"><Label>Ownership Percentage (%)</Label>
                <Input type="number" min={0} max={100} value={assets.businessOwnershipPct || ''}
                  onChange={(e) => updateAssets({ businessOwnershipPct: parseFloat(e.target.value) || 0 })} /></div>
            </CardContent>
          </Card>

          {/* Liabilities */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div><CardTitle>Other Liabilities</CardTitle><CardDescription>Loans and debts (excluding property mortgages above)</CardDescription></div>
              <Button size="sm" onClick={addLiability}><Plus className="h-4 w-4 mr-1" />Add Liability</Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {liabilities.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No liabilities added.</p>
              ) : (
                liabilities.map((l) => (
                  <div key={l.id} className="grid grid-cols-5 gap-3 items-end p-3 bg-red-50 rounded-lg border border-red-100">
                    <div className="space-y-1 col-span-2"><Label className="text-xs">Description</Label>
                      <Input className="h-8 text-sm" value={l.name} onChange={(e) => updateLiability(l.id, 'name', e.target.value)} /></div>
                    <div className="space-y-1"><Label className="text-xs">Type</Label>
                      <Select value={l.type} onValueChange={(v) => updateLiability(l.id, 'type', v as LiabilityType)}>
                        <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="car">Car Loan</SelectItem>
                          <SelectItem value="renovation">Renovation</SelectItem>
                          <SelectItem value="personal">Personal Loan</SelectItem>
                          <SelectItem value="creditCard">Credit Card</SelectItem>
                          <SelectItem value="education">Education Loan</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select></div>
                    <div className="space-y-1"><Label className="text-xs">Outstanding (S$)</Label>
                      <Input type="number" className="h-8 text-sm" value={l.outstandingBalance || ''}
                        onChange={(e) => updateLiability(l.id, 'outstandingBalance', parseFloat(e.target.value) || 0)} /></div>
                    <div className="flex items-end gap-2">
                      <div className="flex-1 space-y-1"><Label className="text-xs">Monthly (S$)</Label>
                        <Input type="number" className="h-8 text-sm" value={l.monthlyPayment || ''}
                          onChange={(e) => updateLiability(l.id, 'monthlyPayment', parseFloat(e.target.value) || 0)} /></div>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeLiability(l.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Summary */}
        <div className="space-y-4">
          <Card className="bg-slate-900 text-white">
            <CardHeader className="pb-2"><CardTitle className="text-white text-sm">Net Worth Statement</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="space-y-2">
                <p className="text-xs text-slate-400 uppercase tracking-wide">Assets</p>
                {[['Cash & Liquidity', totalCash], ['Investments', totalInvestments], ['Property (gross)', totalProperty], ['Business', totalBusiness]].map(([l, v]) => v as number > 0 && (
                  <div key={l as string} className="flex justify-between">
                    <span className="text-slate-400">{l as string}</span>
                    <span>{formatCurrency(v as number)}</span>
                  </div>
                ))}
                <div className="flex justify-between font-semibold border-t border-slate-700 pt-2">
                  <span className="text-slate-300">Total Assets</span>
                  <span>{formatCurrency(totalAssets)}</span>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-xs text-slate-400 uppercase tracking-wide">Liabilities</p>
                <div className="flex justify-between">
                  <span className="text-slate-400">Total Liabilities</span>
                  <span className="text-red-400">{formatCurrency(totalLiabilities)}</span>
                </div>
              </div>
              <div className="h-px bg-slate-600" />
              <div className="flex justify-between text-lg font-bold">
                <span className="text-white">Net Worth</span>
                <span className={netWorth >= 0 ? 'text-green-400' : 'text-red-400'}>{formatCurrency(netWorth)}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Asset Allocation</CardTitle></CardHeader>
            <CardContent>
              {allocationData.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={150}>
                    <PieChart>
                      <Pie data={allocationData} cx="50%" cy="50%" outerRadius={60} dataKey="value">
                        {allocationData.map((entry, i) => <Cell key={entry.name} fill={entry.color} />)}
                      </Pie>
                      <Tooltip formatter={(v: number) => formatCurrency(v)} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-1.5 mt-2">
                    {allocationData.map((d) => (
                      <div key={d.name} className="flex items-center gap-2 text-xs">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                        <span className="flex-1 text-muted-foreground">{d.name}</span>
                        <span className="font-medium">{((d.value / totalAssets) * 100).toFixed(0)}%</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-xs text-muted-foreground text-center py-6">Enter assets to view allocation</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </PageLayout>
  );
}
