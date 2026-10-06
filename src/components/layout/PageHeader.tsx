import React from 'react';
import { ChevronRight } from 'lucide-react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  breadcrumb?: string[];
  actionBtn?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ title, subtitle, breadcrumb, actionBtn }) => {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        {breadcrumb && breadcrumb.length > 0 && (
          <nav className="mb-1 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            {breadcrumb.map((item, idx) => (
              <React.Fragment key={idx}>
                {idx > 0 && <ChevronRight className="h-3 w-3 text-slate-400" />}
                <span>{item}</span>
              </React.Fragment>
            ))}
          </nav>
        )}
        <h1 className="font-serif text-2xl font-bold tracking-tight text-charcoal-900 dark:text-slate-100 sm:text-3xl">
          {title}
        </h1>
        {subtitle && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 sm:text-sm">{subtitle}</p>}
      </div>

      {actionBtn && <div className="flex shrink-0 items-center gap-2">{actionBtn}</div>}
    </div>
  );
};

