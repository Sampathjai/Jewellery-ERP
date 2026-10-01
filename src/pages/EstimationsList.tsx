import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { dataService } from '@/lib/dataService';
import { syncEngine } from '@/lib/syncEngine';
import { Estimation, EstimationStatus, EstimationType, BusinessSettings } from '@/types';
import { formatCurrency, formatDate } from '@/lib/utils';
import { downloadEstimationPDF, shareEstimationPDF } from '@/lib/estimationPdfGenerator';
import { buildWhatsAppEstimationMessage, openWhatsAppClickToChat } from '@/lib/whatsapp';
import {
  Plus,
  Search,
  Filter,
  FileText,
  Download,
  Share2,
  Eye,
  CheckCircle2,
  Clock,
  ArrowRight,
  Sparkles,
  MessageCircle,
  Copy,
  AlertCircle,
  MoreVertical,
  Layers,
  Image as ImageIcon,
} from 'lucide-react';

export const EstimationsList: React.FC = () => {
  const navigate = useNavigate();
  const [estimations, setEstimations] = useState<Estimation[]>([]);
  const [settings, setSettings] = useState<BusinessSettings | null>(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | EstimationType>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | EstimationStatus>('all');

  const loadEstimations = useCallback(async () => {
    try {
      setLoading(true);
      const [list, sData] = await Promise.all([
        dataService.getEstimations(),
        dataService.getBusinessSettings(),
      ]);
      setEstimations(list);
      setSettings(sData);
    } catch (err) {
      console.error('Error loading estimations:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEstimations();
    const unsub = syncEngine.subscribeDataChange((tableName) => {
      if (tableName === 'estimations' || tableName === 'general') {
        loadEstimations();
      }
    });
    return () => unsub();
  }, [loadEstimations]);

  // Metrics
  const totalCount = estimations.length;
  const referenceDesignCount = estimations.filter((e) => e.estimation_type === 'reference_design').length;
  const approvedCount = estimations.filter((e) => e.status === 'approved' || e.status === 'converted_to_order').length;
  const pendingCount = estimations.filter((e) => e.status === 'sent' || e.status === 'draft').length;

  // Filtered List
  const filtered = estimations.filter((est) => {
    // Type Filter
    if (typeFilter !== 'all' && est.estimation_type !== typeFilter) return false;
    // Status Filter
    if (statusFilter !== 'all' && est.status !== statusFilter) return false;
    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchNum = est.estimation_number.toLowerCase().includes(q);
      const matchCust = (est.customer_name || '').toLowerCase().includes(q);
      const matchPhone = (est.customer_phone || '').includes(q);
      const matchItem = (est.items || []).some((it) => it.item_name.toLowerCase().includes(q));
      if (!matchNum && !matchCust && !matchPhone && !matchItem) return false;
    }
    return true;
  });

  const getStatusBadge = (status: EstimationStatus, validUntil: string) => {
    const isExpired = new Date(validUntil) < new Date() && status !== 'converted_to_order' && status !== 'approved';

    if (isExpired) {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-400">
          Expired
        </span>
      );
    }

    switch (status) {
      case 'draft':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
            Draft
          </span>
        );
      case 'sent':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400">
            Sent / Quoted
          </span>
        );
      case 'approved':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400">
            Approved
          </span>
        );
      case 'converted_to_order':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-100 dark:bg-purple-950/50 text-purple-700 dark:text-purple-400">
            Converted to Order
          </span>
        );
      case 'expired':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-400">
            Expired
          </span>
        );
      case 'cancelled':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-100 dark:bg-rose-950/50 text-rose-700 dark:text-rose-400">
            Cancelled
          </span>
        );
      default:
        return null;
    }
  };

  const handleWhatsApp = (est: Estimation) => {
    if (!est.customer_phone) {
      alert('No phone number on record for this customer.');
      return;
    }
    const msg = buildWhatsAppEstimationMessage(est, settings || undefined);
    openWhatsAppClickToChat(est.customer_phone, msg);
  };

  const handleDownload = async (est: Estimation) => {
    await downloadEstimationPDF(est, settings || undefined);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      <PageHeader
        title="Jewellery Estimations & Quotations"
        subtitle="Manage customer reference photo estimations, bespoke pricing, and revisions without modifying product stock."
        actionBtn={
          <button
            type="button"
            onClick={() => navigate('/estimations/new')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Estimation
          </button>
        }
      />

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex items-center justify-between text-gray-500 dark:text-gray-400 text-xs">
            <span>Total Estimations</span>
            <FileText className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-xl font-bold text-gray-900 dark:text-gray-100 mt-1">{totalCount}</p>
          <span className="text-[10px] text-gray-400">All customer quotations</span>
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex items-center justify-between text-amber-600 dark:text-amber-400 text-xs">
            <span>Reference Photo Designs</span>
            <ImageIcon className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-xl font-bold text-amber-600 dark:text-amber-400 mt-1">
            {referenceDesignCount}
          </p>
          <span className="text-[10px] text-gray-400">Customer image references</span>
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 text-xs">
            <span>Approved / Converted</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
            {approvedCount}
          </p>
          <span className="text-[10px] text-gray-400">Proceeded to bespoke orders</span>
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex items-center justify-between text-blue-600 dark:text-blue-400 text-xs">
            <span>Pending / Quoted</span>
            <Clock className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-xl font-bold text-blue-600 dark:text-blue-400 mt-1">{pendingCount}</p>
          <span className="text-[10px] text-gray-400">Awaiting customer response</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-gray-100 dark:bg-gray-900 rounded-lg overflow-x-auto w-full sm:w-auto">
            {[
              { id: 'all', label: 'All Estimations' },
              { id: 'reference_design', label: 'Reference Designs' },
              { id: 'custom_jewellery', label: 'Custom Workshop' },
              { id: 'inventory_product', label: 'Catalogue' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setTypeFilter(tab.id as any)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors ${
                  typeFilter === tab.id
                    ? 'bg-white dark:bg-gray-800 text-amber-600 dark:text-amber-400 shadow-sm font-semibold'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search Input */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by est no, customer, item..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
        </div>

        {/* Status Pills */}
        <div className="flex items-center gap-2 pt-2 border-t border-gray-100 dark:border-gray-700/60 overflow-x-auto">
          <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
            Status:
          </span>
          {[
            { id: 'all', label: 'All' },
            { id: 'sent', label: 'Sent' },
            { id: 'draft', label: 'Draft' },
            { id: 'approved', label: 'Approved' },
            { id: 'converted_to_order', label: 'Converted' },
            { id: 'expired', label: 'Expired' },
          ].map((st) => (
            <button
              key={st.id}
              type="button"
              onClick={() => setStatusFilter(st.id as any)}
              className={`px-2.5 py-1 text-xs rounded-full transition-colors ${
                statusFilter === st.id
                  ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-semibold'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200'
              }`}
            >
              {st.label}
            </button>
          ))}
        </div>
      </div>

      {/* Estimations Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-gray-500">Loading estimations...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <FileText className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto" />
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
              No estimations found matching criteria.
            </p>
            <button
              type="button"
              onClick={() => navigate('/estimations/new')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-amber-600 text-white font-medium hover:bg-amber-700 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Create New Estimation
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 dark:bg-gray-900/60 border-b border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 font-semibold">
                <tr>
                  <th className="py-3 px-4">Est. Number</th>
                  <th className="py-3 px-4">Design Ref</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Items / Est. Wt</th>
                  <th className="py-3 px-4 text-right">Est. Total</th>
                  <th className="py-3 px-4">Validity</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {filtered.map((est) => {
                  const firstImg = est.reference_images?.[0];
                  const totalEstNetWt = (est.items || []).reduce(
                    (acc, it) => acc + (it.estimated_net_weight_g || 0),
                    0
                  );

                  return (
                    <tr
                      key={est.id}
                      className="hover:bg-amber-50/30 dark:hover:bg-amber-950/10 transition-colors"
                    >
                      {/* Est Number & Version */}
                      <td className="py-3 px-4">
                        <div
                          className="font-bold text-gray-900 dark:text-gray-100 hover:text-amber-600 cursor-pointer flex items-center gap-1.5"
                          onClick={() => navigate(`/estimations/${est.id}`)}
                        >
                          {est.estimation_number}
                          {est.version > 1 && (
                            <span className="px-1.5 py-0.2 rounded text-[10px] bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-300 font-semibold">
                              v{est.version}
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-gray-400">
                          {formatDate(est.estimation_date)}
                        </span>
                      </td>

                      {/* Reference Thumbnail */}
                      <td className="py-3 px-4">
                        {firstImg ? (
                          <div
                            onClick={() => navigate(`/estimations/${est.id}`)}
                            className="w-10 h-10 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-900 relative group cursor-pointer"
                          >
                            <img
                              src={firstImg.image_url}
                              alt="Reference"
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                            />
                            {est.reference_images.length > 1 && (
                              <span className="absolute bottom-0 right-0 bg-black/75 text-amber-300 text-[8px] font-bold px-1 rounded-tl">
                                +{est.reference_images.length - 1}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-[11px] text-gray-400 italic">No image</span>
                        )}
                      </td>

                      {/* Customer Info */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-gray-800 dark:text-gray-200">
                          {est.customer_name}
                        </div>
                        {est.customer_phone && (
                          <div className="text-[11px] text-gray-500">{est.customer_phone}</div>
                        )}
                      </td>

                      {/* Type Badge */}
                      <td className="py-3 px-4">
                        {est.estimation_type === 'reference_design' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300">
                            <Sparkles className="w-3 h-3" /> Reference Photo
                          </span>
                        ) : est.estimation_type === 'custom_jewellery' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300">
                            Bespoke Custom
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                            Catalogue
                          </span>
                        )}
                      </td>

                      {/* Items */}
                      <td className="py-3 px-4">
                        <div className="text-gray-800 dark:text-gray-200 font-medium">
                          {(est.items || []).map((it) => it.item_name).join(', ') || '1 Item'}
                        </div>
                        <span className="text-[10px] text-gray-500">
                          Est. Net Wt: <strong>{totalEstNetWt.toFixed(2)}g</strong>
                        </span>
                      </td>

                      {/* Est Total */}
                      <td className="py-3 px-4 text-right">
                        <span className="font-bold text-gray-900 dark:text-gray-100">
                          {formatCurrency(est.total_estimated_amount)}
                        </span>
                        <span className="block text-[10px] text-gray-400">Estimate</span>
                      </td>

                      {/* Validity */}
                      <td className="py-3 px-4">
                        <span className="text-[11px] text-gray-700 dark:text-gray-300">
                          {formatDate(est.valid_until)}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4">{getStatusBadge(est.status, est.valid_until)}</td>

                      {/* Quick Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => navigate(`/estimations/${est.id}`)}
                            className="p-1.5 rounded-lg text-gray-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors"
                            title="View Estimation"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDownload(est)}
                            className="p-1.5 rounded-lg text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors"
                            title="Download PDF"
                          >
                            <Download className="w-4 h-4" />
                          </button>

                          {est.customer_phone && (
                            <button
                              type="button"
                              onClick={() => handleWhatsApp(est)}
                              className="p-1.5 rounded-lg text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors"
                              title="Send WhatsApp Quote"
                            >
                              <MessageCircle className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
