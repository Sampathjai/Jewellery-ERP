import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { getLocalDb, saveLocalDb } from '@/lib/supabase';
import { ManufacturingJob, MetalType, MetalPurity } from '@/types';
import { formatCurrency, formatWeight, formatDate } from '@/lib/utils';
import { MetalBadge } from '@/components/common/MetalBadge';
import { PurityBadge } from '@/components/common/PurityBadge';
import { Modal } from '@/components/common/Modal';
import { Hammer, Plus, Eye, Save } from 'lucide-react';

export const ManufacturingList: React.FC = () => {
  const navigate = useNavigate();
  const [db, setDb] = useState(getLocalDb());
  const [modalOpen, setModalOpen] = useState(false);

  const [formData, setFormData] = useState<Partial<ManufacturingJob>>({
    job_card_number: `JC-2026-${Math.floor(100 + Math.random() * 900)}`,
    product_category: 'Nose Rings',
    metal_type: 'gold',
    purity: '22k',
    raw_metal_weight_g: 10.0,
    expected_finished_weight_g: 9.2,
    stone_weight_g: 0.5,
    wastage_allowance_g: 0.3,
    labour_charge: 1500,
    making_charge: 2000,
    assigned_goldsmith: 'Muralidharan (Senior Goldsmith)',
    start_date: new Date().toISOString().split('T')[0],
    status: 'in_progress',
    notes: '',
  });

  const handleCreateJobCard = (e: React.FormEvent) => {
    e.preventDefault();
    const newJob: ManufacturingJob = {
      id: `job-${Date.now()}`,
      job_card_number: formData.job_card_number || `JC-${Date.now()}`,
      customer_name: 'Internal Shop Stock Batch',
      product_category: formData.product_category || 'Nose Rings',
      metal_type: (formData.metal_type as MetalType) || 'gold',
      purity: (formData.purity as MetalPurity) || '22k',
      raw_metal_weight_g: formData.raw_metal_weight_g || 0,
      expected_finished_weight_g: formData.expected_finished_weight_g || 0,
      stone_weight_g: formData.stone_weight_g || 0,
      wastage_allowance_g: formData.wastage_allowance_g || 0,
      labour_charge: formData.labour_charge || 0,
      making_charge: formData.making_charge || 0,
      assigned_goldsmith: formData.assigned_goldsmith || 'Goldsmith',
      start_date: formData.start_date || new Date().toISOString().split('T')[0],
      status: 'in_progress',
      notes: formData.notes,
      created_at: new Date().toISOString(),
    };

    db.manufacturingJobs.unshift(newJob);
    saveLocalDb(db);
    setDb({ ...db });
    setModalOpen(false);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Goldsmith Manufacturing & Job Cards"
        subtitle="Track raw gold/silver issues, wastage allowance, and finished item batch production"
        breadcrumb={['Home', 'Manufacturing']}
        actionBtn={
          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-gold-500 px-4 py-2.5 text-xs font-bold text-charcoal-950 shadow-gold hover:bg-gold-600"
          >
            <Plus className="h-4 w-4" />
            New Job Card
          </button>
        }
      />

      {/* Jobs List Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {db.manufacturingJobs.map((job) => (
          <div
            key={job.id}
            className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-charcoal-800 dark:bg-charcoal-900 shadow-sm space-y-4"
          >
            <div className="flex items-start justify-between border-b border-slate-100 pb-3 dark:border-charcoal-800">
              <div>
                <span className="font-mono text-xs font-bold text-slate-500">{job.job_card_number}</span>
                <h3 className="font-serif text-base font-bold text-charcoal-900 dark:text-slate-100 mt-0.5">
                  {job.product_category} Batch Production
                </h3>
                <p className="text-xs text-slate-500">Goldsmith: <strong>{job.assigned_goldsmith}</strong></p>
              </div>
              <span className="rounded-full bg-amber-500/20 px-2.5 py-0.5 text-[10px] font-bold text-amber-900 dark:text-gold-300 uppercase">
                {job.status.replace('_', ' ')}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="rounded-xl bg-slate-50 p-2.5 dark:bg-charcoal-800">
                <span className="text-[10px] text-slate-400 block">Raw Metal Issued</span>
                <strong className="font-mono text-charcoal-900 dark:text-slate-100">{formatWeight(job.raw_metal_weight_g)}</strong>
              </div>
              <div className="rounded-xl bg-slate-50 p-2.5 dark:bg-charcoal-800">
                <span className="text-[10px] text-slate-400 block">Expected Finished</span>
                <strong className="font-mono text-charcoal-900 dark:text-slate-100">{formatWeight(job.expected_finished_weight_g)}</strong>
              </div>
              <div className="rounded-xl bg-gold-50 p-2.5 dark:bg-gold-950/30">
                <span className="text-[10px] text-amber-900 font-bold block dark:text-gold-300">Labour Charge</span>
                <strong className="text-amber-900 dark:text-gold-300">{formatCurrency(job.labour_charge)}</strong>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-1.5">
                <MetalBadge metal={job.metal_type} />
                <PurityBadge purity={job.purity} />
              </div>

              <Link
                to={`/manufacturing/${job.id}`}
                className="flex items-center gap-1 text-xs font-bold text-slate-700 hover:text-gold-600 dark:text-slate-300"
              >
                <Eye className="h-4 w-4" /> View Job Card Details
              </Link>
            </div>
          </div>
        ))}
      </div>

      {/* Modal for New Job Card */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Create Goldsmith Job Card" maxWidth="lg">
        <form onSubmit={handleCreateJobCard} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Job Card No.</label>
              <input
                type="text"
                readOnly
                value={formData.job_card_number}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-100 p-2.5 text-xs font-mono dark:border-charcoal-800 dark:bg-charcoal-800 dark:text-slate-300"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Category</label>
              <input
                type="text"
                required
                value={formData.product_category}
                onChange={(e) => setFormData({ ...formData, product_category: e.target.value })}
                placeholder="e.g. Nose Rings / Ear Rings"
                className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-xs text-charcoal-900 dark:border-charcoal-800 dark:bg-charcoal-800 dark:text-slate-100"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Raw Metal Issued (g)</label>
              <input
                type="number"
                step="0.001"
                required
                value={formData.raw_metal_weight_g}
                onChange={(e) => setFormData({ ...formData, raw_metal_weight_g: Number(e.target.value) })}
                className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-xs text-charcoal-900 dark:border-charcoal-800 dark:bg-charcoal-800 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Expected Finished (g)</label>
              <input
                type="number"
                step="0.001"
                required
                value={formData.expected_finished_weight_g}
                onChange={(e) => setFormData({ ...formData, expected_finished_weight_g: Number(e.target.value) })}
                className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-xs text-charcoal-900 dark:border-charcoal-800 dark:bg-charcoal-800 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Assigned Goldsmith</label>
              <input
                type="text"
                required
                value={formData.assigned_goldsmith}
                onChange={(e) => setFormData({ ...formData, assigned_goldsmith: e.target.value })}
                className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-xs text-charcoal-900 dark:border-charcoal-800 dark:bg-charcoal-800 dark:text-slate-100"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-charcoal-800">
            <button
              type="submit"
              className="flex items-center gap-2 rounded-xl bg-gold-500 px-6 py-2.5 text-xs font-bold text-charcoal-950 shadow-gold hover:bg-gold-600"
            >
              <Save className="h-4 w-4" /> Issue Job Card
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

