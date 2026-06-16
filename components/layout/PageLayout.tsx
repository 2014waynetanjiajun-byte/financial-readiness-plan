'use client';

import { Sidebar } from './Sidebar';

interface PageLayoutProps {
  children: React.ReactNode;
  title: string;
  description?: string;
}

export function PageLayout({ children, title, description }: PageLayoutProps) {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 ml-64 min-h-screen">
        {/* Page header with subtle teal accent bar */}
        <div className="bg-card border-b px-8 py-5" style={{
          borderTop: '3px solid hsl(174 72% 32%)',
        }}>
          <h1 className="text-2xl font-bold text-foreground">{title}</h1>
          {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
        </div>
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}
