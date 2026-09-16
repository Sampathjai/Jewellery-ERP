import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { getLocalDb } from '@/lib/supabase';
import { formatCurrency, formatWeight, formatDate } from '@/lib/utils';
import { MetalBadge } from '@/components/common/MetalBadge';
import { PurityBadge } from '@/components/common/PurityBadge';
import { ArrowLeft, Printer, Hammer, CheckCircle } from 'lucide-react';

export const JobCardDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const db = getLocalDb();

  const job = db.manufacturingJobs.find((j) => j.id === id) || db.manufacturingJobs[0];

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Job Card: ${job.job_card_number}`}
        subtitle={`Goldsmith Batch Production • ${job.assigned_goldsmith}`}
        breadcrumb={['Home', 'Manufacturing', job.job_card_number]}
        actionBtn={
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/manufacturing')}
              className="flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-charcoal-800 dark:text-slate-300"
            >
              <ArrowLeft className="h-4 w-4" /> Back
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-1 rounded-xl bg-gold-500 px-4 py-2 text-xs font-bold text-charcoal-950 shadow-gold hover:bg-gold-600"
            >
              <Printer className="h-4 w-4" /> Print Job Voucher
            </button>
          </div>
        }
      />

      <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-charcoal-800 dark:bg-charcoal-900 shadow-sm space-y-6 max-w-3xl">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-charcoal-800">
          <div className="flex items-center gap-2">
            <MetalBadge metal={job.metal_type} />
            <PurityBadge purity={job.purity} />
            <span className="font-bold text-charcoal-900 dark:text-slate-100 text-sm">{job.product_category}</span>
          </div>
          <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800 uppercase">
            {job.status}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
          <div>
            <span className="text-slate-400 block">Assigned Goldsmith:</span>
            <strong className="text-charcoal-900 dark:text-slate-100 text-sm">{job.assigned_goldsmith}</strong>
          </div>
          <div>
            <span className="text-slate-400 block">Issue Date:</span>
            <strong className="text-charcoal-900 dark:text-slate-100">{formatDate(job.start_date)}</strong>
          </div>
          <div>
            <span className="text-slate-400 block">Labour Wages:</span>
            <strong className="text-amber-900 dark:text-gold-300 text-sm">{formatCurrency(job.labour_charge)}</strong>
          </div>
        </div>

        <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 dark:border-charcoal-800 dark:bg-charcoal-800/40 space-y-3">
          <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
            Metal & Wastage Balance
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <span className="text-slate-400 block text-[10px]">Raw Issued:</span>
              <strong className="font-mono text-sm">{formatWeight(job.raw_metal_weight_g)}</strong>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">Expected Finished:</span>
              <strong className="font-mono text-sm">{formatWeight(job.expected_finished_weight_g)}</strong>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">Actual Finished:</span>
              <strong className="font-mono text-sm text-emerald-600">{formatWeight(job.actual_finished_weight_g || job.expected_finished_weight_g)}</strong>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">Wastage Allowance:</span>
              <strong className="font-mono text-sm text-amber-900 dark:text-gold-300">{formatWeight(job.wastage_allowance_g)}</strong>
            </div>
          </div>
        </div>

        {job.notes && (
          <div className="border-t border-slate-100 pt-3 dark:border-charcoal-800">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Production Notes:</span>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{job.notes}</p>
          </div>
        )}
      </div>
    </div>
  );
};

