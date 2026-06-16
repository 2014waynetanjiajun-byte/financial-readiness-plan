'use client';

import { useFinancialStore } from '@/lib/store';
import { PageLayout } from '@/components/layout/PageLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { formatCurrency } from '@/lib/utils';
import type { InsurancePolicy, InsuranceType } from '@/lib/types';
import {
  Shield, ShieldCheck, ShieldAlert, ShieldOff,
  Heart, Activity, Building2, AlertTriangle,
  CheckCircle, XCircle, Info,
} from 'lucide-react';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

// ─── Type metadata ────────────────────────────────────────────────────────────

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

const TYPE_COLORS: Record<InsuranceType, { bg: string; text: string; dot: string }> = {
  hospitalisation:      { bg: 'bg-cyan-50',    text: 'text-cyan-700',   dot: '#06b6d4' },
  term:                 { bg: 'bg-blue-50',    text: 'text-blue-700',   dot: '#3b82f6' },
  wholeLife:            { bg: 'bg-indigo-50',  text: 'text-indigo-700', dot: '#6366f1' },
  ci:                   { bg: 'bg-emerald-50', text: 'text-emerald-700',dot: '#10b981' },
  eci:                  { bg: 'bg-teal-50',    text: 'text-teal-700',   dot: '#0d9488' },
  disabilityIncome:     { bg: 'bg-amber-50',   text: 'text-amber-700',  dot: '#f59e0b' },
  personalAccident:     { bg: 'bg-orange-50',  text: 'text-orange-700', dot: '#f97316' },
  careShield:           { bg: 'bg-purple-50',  text: 'text-purple-700', dot: '#a855f7' },
  careShieldSupplement: { bg: 'bg-violet-50',  text: 'text-violet-700', dot: '#8b5cf6' },
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function CoverageStatCard({ icon: Icon, title, value, sub, status }: {
  icon: React.ElementType; title: string; value: string; sub?: string;
  status: 'ok' | 'warning' | 'missing';
}) {
  const statusColor = status === 'ok' ? 'text-emerald-600' : status === 'warning' ? 'text-amber-600' : 'text-muted-foreground';
  const bgColor = status === 'ok' ? 'bg-emerald-50 border-emerald-100' : status === 'warning' ? 'bg-amber-50 border-amber-100' : 'bg-muted/40 border-border';
  const iconColor = status === 'ok' ? 'text-emerald-600' : status === 'warning' ? 'text-amber-600' : 'text-muted-foreground/60';
  return (
    <Card className={`border ${bgColor}`}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{title}</p>
            <p className={`text-xl font-bold mt-1 ${statusColor}`}>{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
          </div>
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ml-3 ${bgColor}`}>
            <Icon className={`h-5 w-5 ${iconColor}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function GapBar({ label, held, required }: { label: string; held: number; required: number }) {
  const pct = required > 0 ? Math.min(100, (held / required) * 100) : 100;
  const status = pct >= 100 ? 'ok' : pct >= 50 ? 'partial' : 'low';
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <span className="text-sm font-medium">{label}</span>
        <Badge variant={status === 'ok' ? 'success' : status === 'partial' ? 'warning' : 'destructive'} className="flex items-center gap-1">
          {status === 'ok' ? <ShieldCheck className="h-3 w-3" /> : <ShieldAlert className="h-3 w-3" />}
          {pct.toFixed(0)}% covered
        </Badge>
      </div>
      <Progress value={pct} className={
        status === 'ok' ? '[&>div]:bg-emerald-500' :
        status === 'partial' ? '[&>div]:bg-amber-500' : '[&>div]:bg-red-500'
      } />
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>Have: <span className="font-medium text-foreground">{formatCurrency(held)}</span></span>
        <span>Need: <span className="font-medium text-foreground">{formatCurrency(required)}</span></span>
        {held < required && (
          <span className="text-red-500 font-medium">Gap: {formatCurrency(required - held)}</span>
        )}
      </div>
    </div>
  );
}

function PolicyCard({ policy, currentAge }: { policy: InsurancePolicy; currentAge: number }) {
  const colors = TYPE_COLORS[policy.type];
  const isActive = currentAge < policy.premiumEndAge;
  const coverageYears = Math.max(0, policy.premiumEndAge - currentAge);

  const keyMetric = (() => {
    if (policy.type === 'disabilityIncome' || policy.type === 'careShieldSupplement')
      return { label: 'Monthly Benefit', value: policy.monthlyBenefit > 0 ? `${formatCurrency(policy.monthlyBenefit)}/mo` : '—' };
    if (policy.type === 'term' || policy.type === 'wholeLife')
      return { label: 'Death / TPD Sum Assured', value: policy.deathTPDSumAssured > 0 ? formatCurrency(policy.deathTPDSumAssured) : '—' };
    if (policy.type === 'ci')
      return { label: 'CI Sum Assured', value: policy.ciSumAssured > 0 ? formatCurrency(policy.ciSumAssured) : '—' };
    if (policy.type === 'eci')
      return { label: 'ECI Sum Assured', value: policy.eciSumAssured > 0 ? formatCurrency(policy.eciSumAssured) : '—' };
    if (policy.type === 'hospitalisation')
      return { label: 'Ward Type', value: policy.wardType === 'private' ? 'Private Hospital' : policy.wardType === 'a' ? 'Class A Ward' : 'Class B1 Ward' };
    return { label: 'Sum Assured', value: policy.sumAssured > 0 ? formatCurrency(policy.sumAssured) : '—' };
  })();

  return (
    <div className={`rounded-xl border p-4 transition-opacity ${isActive ? 'opacity-100' : 'opacity-50'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          {/* Type badge */}
          <div className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex-shrink-0 ${colors.bg} ${colors.text}`}>
            {TYPE_LABELS[policy.type]}
          </div>
        </div>
        {/* Status */}
        <div className="flex-shrink-0">
          {isActive
            ? <span className="text-xs text-emerald-600 font-medium flex items-center gap-1"><CheckCircle className="h-3 w-3" />Active</span>
            : <span className="text-xs text-muted-foreground flex items-center gap-1"><XCircle className="h-3 w-3" />Lapsed</span>
          }
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-3 text-sm">
        {/* Insurer */}
        <div>
          <p className="text-xs text-muted-foreground">Insurer</p>
          <p className="font-medium truncate">{policy.insurer || '—'}</p>
        </div>
        {/* Key metric */}
        <div>
          <p className="text-xs text-muted-foreground">{keyMetric.label}</p>
          <p className="font-semibold text-foreground">{keyMetric.value}</p>
        </div>
        {/* Premium */}
        <div>
          <p className="text-xs text-muted-foreground">Annual Premium</p>
          <p className="font-semibold">{policy.annualPremium > 0 ? formatCurrency(policy.annualPremium) : '—'}</p>
          <p className="text-xs text-muted-foreground">until age {policy.premiumEndAge}</p>
        </div>
      </div>

      {/* Term/WL CI details */}
      {(policy.type === 'term' || policy.type === 'wholeLife') && (policy.ciSumAssured > 0 || policy.eciSumAssured > 0) && (
        <div className="mt-2 pt-2 border-t grid grid-cols-2 gap-2 text-xs text-muted-foreground">
          {policy.ciSumAssured > 0 && (
            <span>CI rider: <span className="font-medium text-foreground">{formatCurrency(policy.ciSumAssured)}</span></span>
          )}
          {policy.eciSumAssured > 0 && (
            <span>ECI rider: <span className="font-medium text-foreground">{formatCurrency(policy.eciSumAssured)}</span></span>
          )}
        </div>
      )}

      {/* ISP rider detail */}
      {policy.type === 'hospitalisation' && policy.hasRider && (
        <div className="mt-2 pt-2 border-t text-xs">
          <span className="text-cyan-700 font-medium">✓ Full Rider (no co-payment / deductible)</span>
        </div>
      )}

      {/* Coverage timeline bar */}
      {isActive && coverageYears > 0 && (
        <div className="mt-3">
          <div className="flex justify-between text-xs text-muted-foreground mb-1">
            <span>Premiums: age {currentAge} → {policy.premiumEndAge}</span>
            <span>{coverageYears} yr{coverageYears !== 1 ? 's' : ''} remaining</span>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{
                width: `${Math.min(100, (coverageYears / 40) * 100)}%`,
                backgroundColor: colors.dot,
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function InsurancePage() {
  const { plan, insuranceGap } = useFinancialStore();
  const { insurance, client } = plan;
  const currentAge = client.age;
  const monthlyIncome = plan.income.monthlySalary + plan.income.dividendIncome + plan.income.otherIncome;

  // ── Computed totals ─────────────────────────────────────────────────────────
  const totalAnnualPremiums = insurance.policies.reduce((s, p) => s + p.annualPremium, 0);
  const activeAnnualPremiums = insurance.policies.reduce((s, p) =>
    s + (currentAge < p.premiumEndAge ? p.annualPremium : 0), 0);

  const totalDeathTPD = insurance.policies
    .filter((p) => p.type === 'term' || p.type === 'wholeLife')
    .reduce((s, p) => s + (p.deathTPDSumAssured ?? 0), 0);

  const totalCI = insurance.policies.reduce((s, p) => {
    if (p.type === 'term' || p.type === 'wholeLife') return s + (p.ciSumAssured ?? 0) + (p.eciSumAssured ?? 0);
    if (p.type === 'ci')  return s + (p.ciSumAssured  ?? p.sumAssured ?? 0);
    if (p.type === 'eci') return s + (p.eciSumAssured ?? p.sumAssured ?? 0);
    return s;
  }, 0);

  const totalDisabilityMonthly = insurance.policies
    .filter((p) => p.type === 'disabilityIncome')
    .reduce((s, p) => s + (p.monthlyBenefit ?? 0), 0);

  const ispPolicy = insurance.policies.find((p) => p.type === 'hospitalisation');

  // Premium donut chart data
  const premiumByType = Object.entries(
    insurance.policies.reduce<Record<string, number>>((acc, p) => {
      const label = TYPE_LABELS[p.type];
      acc[label] = (acc[label] ?? 0) + p.annualPremium;
      return acc;
    }, {})
  ).filter(([, v]) => v > 0).map(([name, value]) => ({ name, value }));

  const donutColors = ['#0d9488', '#3b82f6', '#6366f1', '#10b981', '#f59e0b', '#f97316', '#a855f7', '#06b6d4'];

  // Coverage status helpers
  const deathStatus = totalDeathTPD === 0 ? 'missing' : totalDeathTPD >= monthlyIncome * 12 * 9 ? 'ok' : 'warning';
  const ciStatus    = totalCI === 0 ? 'missing' : totalCI >= monthlyIncome * 12 * 3 ? 'ok' : 'warning';
  const diStatus    = totalDisabilityMonthly === 0 ? 'missing' : totalDisabilityMonthly >= monthlyIncome * 0.75 ? 'ok' : 'warning';
  const ispStatus   = !ispPolicy ? 'missing' : ispPolicy.hasRider ? 'ok' : 'warning';

  const hasPolicies = insurance.policies.length > 0;

  return (
    <PageLayout title="Insurance Portfolio" description="Coverage overview and protection gap analysis — manage policies in Expenses → Insurance Premiums">

      {/* ── Coverage Stat Cards ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <CoverageStatCard
          icon={Shield}
          title="Death / TPD"
          value={totalDeathTPD > 0 ? formatCurrency(totalDeathTPD) : 'Not covered'}
          sub={totalDeathTPD > 0 ? `${(totalDeathTPD / (monthlyIncome * 12) || 0).toFixed(1)}× annual income` : undefined}
          status={deathStatus}
        />
        <CoverageStatCard
          icon={Heart}
          title="Critical Illness"
          value={totalCI > 0 ? formatCurrency(totalCI) : 'Not covered'}
          sub={totalCI > 0 ? `${(totalCI / (monthlyIncome * 12) || 0).toFixed(1)}× annual income` : undefined}
          status={ciStatus}
        />
        <CoverageStatCard
          icon={Activity}
          title="Disability Income"
          value={totalDisabilityMonthly > 0 ? `${formatCurrency(totalDisabilityMonthly)}/mo` : 'Not covered'}
          sub={totalDisabilityMonthly > 0 ? `${((totalDisabilityMonthly / (monthlyIncome || 1)) * 100).toFixed(0)}% of income` : undefined}
          status={diStatus}
        />
        <CoverageStatCard
          icon={Building2}
          title="Hospitalisation"
          value={ispPolicy
            ? (ispPolicy.wardType === 'private' ? 'Private' : ispPolicy.wardType === 'a' ? 'Class A' : 'Class B1')
            : 'Not entered'}
          sub={ispPolicy
            ? `${ispPolicy.insurer || 'ISP'}${ispPolicy.hasRider ? ' • Full Rider' : ' • No rider'}`
            : undefined}
          status={ispStatus}
        />
      </div>

      {!hasPolicies && (
        <div className="rounded-xl border-2 border-dashed border-muted-foreground/20 p-10 text-center mb-6">
          <ShieldOff className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
          <p className="text-base font-medium text-muted-foreground">No insurance policies entered yet</p>
          <p className="text-sm text-muted-foreground/70 mt-1">
            Go to <span className="font-medium">Expenses → Insurance Premiums</span> to add your policies.
          </p>
        </div>
      )}

      {hasPolicies && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Policy Portfolio */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-foreground">Policy Portfolio</h2>
              <span className="text-xs text-muted-foreground">{insurance.policies.length} polic{insurance.policies.length === 1 ? 'y' : 'ies'}</span>
            </div>

            <div className="space-y-3">
              {insurance.policies.map((p) => (
                <PolicyCard key={p.id} policy={p} currentAge={currentAge} />
              ))}
            </div>

            {/* CareShield Life status */}
            <div className={`rounded-xl border p-4 flex items-center gap-3 ${insurance.hasCareShieldLife ? 'bg-purple-50 border-purple-100' : 'bg-muted/40 border-border'}`}>
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${insurance.hasCareShieldLife ? 'bg-purple-100' : 'bg-muted'}`}>
                <Shield className={`h-5 w-5 ${insurance.hasCareShieldLife ? 'text-purple-700' : 'text-muted-foreground/50'}`} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold">CareShield Life (Government Scheme)</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  S$600/month base payout for severe disability. Auto-enrolled if born 1980 or later.
                </p>
              </div>
              <div className={`text-sm font-semibold flex-shrink-0 ${insurance.hasCareShieldLife ? 'text-purple-700' : 'text-muted-foreground'}`}>
                {insurance.hasCareShieldLife ? '✓ Enrolled' : 'Not enrolled'}
              </div>
            </div>
          </div>

          {/* Right: Analysis sidebar */}
          <div className="space-y-4">

            {/* Gap Analysis */}
            {insuranceGap && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <ShieldAlert className="h-4 w-4 text-amber-500" />
                    Protection Gap Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  <GapBar
                    label="Death / TPD Coverage"
                    held={insuranceGap.deathCoverageHeld}
                    required={insuranceGap.deathCoverageRequired}
                  />
                  <GapBar
                    label="Critical Illness"
                    held={insuranceGap.ciCoverageHeld}
                    required={insuranceGap.ciCoverageRequired}
                  />
                  <GapBar
                    label="Disability Income (monthly)"
                    held={insuranceGap.disabilityMonthlyHeld}
                    required={insuranceGap.disabilityMonthlyRequired}
                  />
                  <div className="p-3 rounded-lg bg-muted/40 text-xs space-y-1">
                    <p className="font-semibold text-foreground flex items-center gap-1.5">
                      <Info className="h-3.5 w-3.5 text-muted-foreground" />Hospitalisation
                    </p>
                    <p className="text-muted-foreground">{insuranceGap.hospitalisationGap}</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Premium Summary */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Premium Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Active annual premiums</span>
                  <span className="font-semibold">{formatCurrency(activeAnnualPremiums)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Active monthly cost</span>
                  <span className="font-semibold">{formatCurrency(activeAnnualPremiums / 12)}</span>
                </div>
                {monthlyIncome > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">% of income</span>
                    <span className={`font-semibold ${activeAnnualPremiums / 12 / monthlyIncome <= 0.15 ? 'text-emerald-600' : 'text-amber-600'}`}>
                      {((activeAnnualPremiums / 12 / monthlyIncome) * 100).toFixed(1)}%
                    </span>
                  </div>
                )}

                {/* Donut chart */}
                {premiumByType.length > 0 && (
                  <div className="pt-2">
                    <p className="text-xs text-muted-foreground font-medium mb-2">Premium split by type</p>
                    <ResponsiveContainer width="100%" height={160}>
                      <PieChart>
                        <Pie data={premiumByType} cx="50%" cy="50%" innerRadius={40} outerRadius={60} dataKey="value" paddingAngle={3}>
                          {premiumByType.map((_, i) => (
                            <Cell key={i} fill={donutColors[i % donutColors.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v: number) => formatCurrency(v)} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="space-y-1 mt-1">
                      {premiumByType.map((d, i) => (
                        <div key={d.name} className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: donutColors[i % donutColors.length] }} />
                            <span className="text-muted-foreground truncate">{d.name}</span>
                          </div>
                          <span className="font-medium ml-2">{formatCurrency(d.value)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Singapore Benchmarks */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Singapore Benchmarks</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  {
                    label: 'Life Insurance',
                    bench: '9–10× annual income',
                    held: totalDeathTPD,
                    target: monthlyIncome * 12 * 9,
                  },
                  {
                    label: 'Critical Illness',
                    bench: '3–5× annual income',
                    held: totalCI,
                    target: monthlyIncome * 12 * 3,
                  },
                  {
                    label: 'Disability Income',
                    bench: '75% of monthly income',
                    held: totalDisabilityMonthly,
                    target: monthlyIncome * 0.75,
                  },
                ].map(({ label, bench, held, target }) => {
                  const met = held >= target && target > 0;
                  return (
                    <div key={label} className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-xs font-medium">{label}</p>
                        <p className="text-xs text-muted-foreground">{bench}</p>
                      </div>
                      {target > 0 ? (
                        met
                          ? <span className="text-xs text-emerald-600 font-semibold flex-shrink-0">✓ Met</span>
                          : <span className="text-xs text-amber-600 font-semibold flex-shrink-0">Below</span>
                      ) : (
                        <span className="text-xs text-muted-foreground flex-shrink-0">—</span>
                      )}
                    </div>
                  );
                })}
                <div className="pt-1 border-t space-y-2">
                  {[
                    ['ISP Rider',       'Full rider recommended'],
                    ['CareShield Life', 'Auto-enrolled if born ≥ 1980'],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between text-xs">
                      <span className="text-muted-foreground">{k}</span>
                      <span className="font-medium text-right">{v}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

          </div>
        </div>
      )}
    </PageLayout>
  );
}
