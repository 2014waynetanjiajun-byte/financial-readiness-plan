'use client';

import { useFinancialStore } from '@/lib/store';
import { PageLayout } from '@/components/layout/PageLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { generateId } from '@/lib/utils';
import type { Dependant } from '@/lib/types';
import { Plus, Trash2 } from 'lucide-react';

export default function ClientPage() {
  const { plan, updatePlan } = useFinancialStore();
  const client = plan.client;

  function update<K extends keyof typeof client>(key: K, value: typeof client[K]) {
    updatePlan({ client: { ...client, [key]: value } });
  }

  function addDependant() {
    const dep: Dependant = {
      id: generateId(),
      relationship: 'child',
      age: 5,
      isFinanciallyDependent: true,
    };
    update('dependants', [...client.dependants, dep]);
  }

  function updateDependant(id: string, field: keyof Dependant, value: any) {
    update(
      'dependants',
      client.dependants.map((d) => (d.id === id ? { ...d, [field]: value } : d))
    );
  }

  function removeDependant(id: string) {
    update('dependants', client.dependants.filter((d) => d.id !== id));
  }

  return (
    <PageLayout title="Client Profile" description="Personal information used across all calculations">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle>Personal Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input
                value={client.name}
                onChange={(e) => update('name', e.target.value)}
                placeholder="e.g. Tan Wei Ming"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Current Age</Label>
                <Input
                  type="number" min={18} max={80}
                  value={client.age}
                  onChange={(e) => update('age', parseInt(e.target.value) || 35)}
                />
              </div>
              <div className="space-y-2">
                <Label>Gender</Label>
                <Select value={client.gender} onValueChange={(v) => update('gender', v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Marital Status</Label>
                <Select value={client.maritalStatus} onValueChange={(v) => update('maritalStatus', v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="single">Single</SelectItem>
                    <SelectItem value="married">Married</SelectItem>
                    <SelectItem value="divorced">Divorced</SelectItem>
                    <SelectItem value="widowed">Widowed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Residency Status</Label>
                <Select value={client.residencyStatus} onValueChange={(v) => update('residencyStatus', v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="citizen">Singapore Citizen</SelectItem>
                    <SelectItem value="pr">Permanent Resident</SelectItem>
                    <SelectItem value="foreigner">Foreigner (EP/SP)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Occupation</Label>
              <Input
                value={client.occupation}
                onChange={(e) => update('occupation', e.target.value)}
                placeholder="e.g. Software Engineer, Business Owner"
              />
            </div>
            <div className="space-y-2">
              <Label>Employer Type</Label>
              <Select value={client.employerType} onValueChange={(v) => update('employerType', v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="private">Private Sector</SelectItem>
                  <SelectItem value="government">Government / Statutory Board</SelectItem>
                  <SelectItem value="self-employed">Self-Employed</SelectItem>
                  <SelectItem value="none">Not Employed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <Label>Smoker?</Label>
              <Switch
                checked={client.smokingStatus}
                onCheckedChange={(v) => update('smokingStatus', v)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Planning Assumptions */}
        <Card>
          <CardHeader>
            <CardTitle>Planning Horizons</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Desired Retirement Age</Label>
                <Input
                  type="number" min={45} max={75}
                  value={client.retirementAge}
                  onChange={(e) => update('retirementAge', parseInt(e.target.value) || 62)}
                />
              </div>
              <div className="space-y-2">
                <Label>Life Expectancy Assumption</Label>
                <Input
                  type="number" min={80} max={100}
                  value={client.lifeExpectancy}
                  onChange={(e) => update('lifeExpectancy', parseInt(e.target.value) || 100)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Known Health Conditions (optional)</Label>
              <Input
                value={client.healthConditions}
                onChange={(e) => update('healthConditions', e.target.value)}
                placeholder="e.g. Hypertension, Diabetes"
              />
            </div>

            {/* Statistics panel */}
            <div className="rounded-lg bg-blue-50 border border-blue-100 p-4 mt-2">
              <p className="text-xs font-semibold text-blue-800 mb-2">Singapore Life Expectancy (2024)</p>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-700">82.2</div>
                  <div className="text-xs text-blue-600">Male average</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-700">86.7</div>
                  <div className="text-xs text-blue-600">Female average</div>
                </div>
              </div>
              <p className="text-xs text-blue-600 mt-2">We recommend planning to age 100 to be conservative.</p>
            </div>
          </CardContent>
        </Card>

        {/* Dependants */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Dependants</CardTitle>
            <Button size="sm" onClick={addDependant}>
              <Plus className="h-4 w-4 mr-1" /> Add Dependant
            </Button>
          </CardHeader>
          <CardContent>
            {client.dependants.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                No dependants added. Click &ldquo;Add Dependant&rdquo; to include children, parents, or others.
              </p>
            ) : (
              <div className="space-y-4">
                {client.dependants.map((dep) => (
                  <div key={dep.id} className="grid grid-cols-4 gap-3 items-end p-3 rounded-lg bg-muted/30 border">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Relationship</Label>
                      <Select
                        value={dep.relationship}
                        onValueChange={(v) => updateDependant(dep.id, 'relationship', v)}
                      >
                        <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="child">Child</SelectItem>
                          <SelectItem value="parent">Parent</SelectItem>
                          <SelectItem value="spouse">Spouse</SelectItem>
                          <SelectItem value="sibling">Sibling</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Age</Label>
                      <Input
                        type="number" className="h-9" value={dep.age}
                        onChange={(e) => updateDependant(dep.id, 'age', parseInt(e.target.value) || 0)}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={dep.isFinanciallyDependent}
                        onCheckedChange={(v) => updateDependant(dep.id, 'isFinanciallyDependent', v)}
                      />
                      <Label className="text-xs">Financially Dependent</Label>
                    </div>
                    <div className="flex justify-end">
                      <Button variant="ghost" size="icon" onClick={() => removeDependant(dep.id)} className="text-destructive hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}
