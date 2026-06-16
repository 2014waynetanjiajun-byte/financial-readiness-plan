'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard, User, Wallet, PiggyBank, Building2, Shield,
  Target, TrendingUp, AlertTriangle, Lightbulb, FileText, ChevronRight,
} from 'lucide-react';

const navItems = [
  { href: '/',                  label: 'Dashboard',         icon: LayoutDashboard },
  { href: '/client',            label: 'Client Profile',    icon: User },
  { href: '/income',            label: 'Income',            icon: Wallet },
  { href: '/expenses',          label: 'Expenses',          icon: PiggyBank },
  { href: '/assets',            label: 'Assets & Liabilities', icon: Building2 },
  { href: '/cpf',               label: 'CPF Analysis',      icon: Shield },
  { href: '/insurance',         label: 'Insurance',         icon: Shield },
  { href: '/goals',             label: 'Future Goals',      icon: Target },
  { href: '/retirement',        label: 'Retirement',        icon: TrendingUp },
  { href: '/stress-test',       label: 'Stress Testing',    icon: AlertTriangle },
  { href: '/recommendations',   label: 'Recommendations',   icon: Lightbulb },
  { href: '/reports',           label: 'Reports',           icon: FileText },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-50 w-64 flex flex-col" style={{
      background: 'linear-gradient(180deg, #0f4c41 0%, #134e4a 60%, #0d3d3a 100%)',
    }}>
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-white/10">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm shadow-lg"
          style={{ background: 'linear-gradient(135deg, #5eead4 0%, #14b8a6 100%)', color: '#0f4c41' }}>
          SG
        </div>
        <div>
          <p className="text-sm font-semibold leading-none text-white">Financial Planner</p>
          <p className="text-xs mt-0.5" style={{ color: '#5eead4' }}>Singapore Edition</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3">
        <ul className="space-y-0.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group',
                    isActive
                      ? 'text-white shadow-sm'
                      : 'text-teal-100/70 hover:text-white hover:bg-white/8'
                  )}
                  style={isActive ? {
                    background: 'linear-gradient(90deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.10) 100%)',
                    borderLeft: '3px solid #5eead4',
                  } : undefined}
                >
                  <Icon className={cn('h-4 w-4 flex-shrink-0', isActive ? 'text-teal-300' : 'text-teal-400/60 group-hover:text-teal-300')} />
                  <span className="flex-1">{item.label}</span>
                  {isActive && <ChevronRight className="h-3 w-3 text-teal-300/70" />}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-white/10">
        <p className="text-xs" style={{ color: '#5eead4' }}>Singapore ChFC/CFP Planning Tool</p>
        <p className="text-xs mt-0.5" style={{ color: 'rgba(94,234,212,0.45)' }}>Deterministic cashflow model</p>
      </div>
    </aside>
  );
}
