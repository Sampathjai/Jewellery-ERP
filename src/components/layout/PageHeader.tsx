import React from 'react';
import { ChevronRight } from 'lucide-react';
import { motion } from 'motion/react';
import { useMotionSafe } from '@/animations/motionConfig';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  breadcrumb?: string[];
  actionBtn?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ title, subtitle, breadcrumb, actionBtn }) => {
  const { prefersReduced } = useMotionSafe();

  if (prefersReduced) {
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
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
    >
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

      {actionBtn && (
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.24, delay: 0.06, ease: [0.22, 1, 0.36, 1] }}
          className="flex shrink-0 items-center gap-2"
        >
          {actionBtn}
        </motion.div>
      )}
    </motion.div>
  );
};

