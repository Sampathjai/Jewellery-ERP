import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { getLocalDb, saveLocalDb } from '@/lib/supabase';
import { formatCurrency, formatDate } from '@/lib/utils';
import { openWhatsAppClickToChat, buildWhatsAppPaymentReminder } from '@/lib/whatsapp';
import { CameraModal } from '@/components/common/CameraModal';
import {
  ArrowLeft,
  MessageSquare,
  Printer,
  Building,
  Phone,
  MapPin,
  HandCoins,
  FileText,
  CheckCircle,
  Camera,
  Upload,
  Trash2,
  Edit,
} from 'lucide-react';

export const CustomerDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [db, setDb] = useState(getLocalDb());
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isEditingPhoto, setIsEditingPhoto] = useState(false);
  const [isEditingTouch, setIsEditingTouch] = useState(false);
  const [touchInput, setTouchInput] = useState<number>(40);

  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  const customerIndex = db.customers.findIndex((c) => c.id === id);
  const customer = customerIndex !== -1 ? db.customers[customerIndex] : db.customers[0];

  const handleSaveTouch = () => {
    if (!customer) return;
    const updatedDb = getLocalDb();
    const idx = updatedDb.customers.findIndex((c) => c.id === customer.id);
    if (idx !== -1) {
      updatedDb.customers[idx].agreed_customer_touch = touchInput;
      updatedDb.customers[idx].agreed_profit_percent = touchInput;
      saveLocalDb(updatedDb);
      setDb(updatedDb);
    }
    setIsEditingTouch(false);
  };

  if (!customer) {
    return (
      <div className="p-6 text-center text-slate-500">
        Customer profile not found.
      </div>
    );
  }

  const invoices = db.retailInvoices.filter((i) => i.customer_id === customer.id);
  const wholesaleIssues = db.wholesaleIssues.filter((w) => w.customer_id === customer.id);
  const settlements = db.wholesaleSettlements.filter((s) => s.customer_id === customer.id);

  const totalOutstanding = settlements.reduce((sum, s) => sum + s.balance_due, 0);

  const handleUpdatePhoto = (newPhotoUrl: string) => {
    const updatedDb = getLocalDb();
    const idx = updatedDb.customers.findIndex((c) => c.id === customer.id);
    if (idx !== -1) {
      updatedDb.customers[idx].photo_url = newPhotoUrl;
      saveLocalDb(updatedDb);
      setDb(updatedDb);
    }
  };

  const handleRemovePhoto = () => {
    handleUpdatePhoto('');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('File size exceeds maximum limit of 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      handleUpdatePhoto(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handlePrintLedger = () => {
    window.print();
  };

  const handleSendWhatsApp = () => {
    const msg = buildWhatsAppPaymentReminder(customer.full_name, totalOutstanding || 24550, db.settings);
    openWhatsAppClickToChat(customer.whatsapp_number || customer.phone, msg);
  };

  return (
    <div className="space-y-6">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/jpg,image/webp"
        onChange={handleFileUpload}
        className="hidden"
      />

      <CameraModal
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onCapture={(dataUrl) => handleUpdatePhoto(dataUrl)}
        title={`Take Photo for ${customer.full_name}`}
      />

      <PageHeader
        title={customer.full_name}
        subtitle={`${customer.customer_code} • ${customer.shop_name || 'Retail Buyer'}`}
        breadcrumb={['Home', 'Customers', customer.full_name]}
        actionBtn={
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/customers')}
              className="flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-charcoal-800 dark:text-slate-300"
            >
              <ArrowLeft className="h-4 w-4" /> Back
            </button>
            <button
              onClick={handlePrintLedger}
              className="flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-charcoal-800 dark:text-slate-300"
            >
              <Printer className="h-4 w-4" /> Print Ledger
            </button>
            <button
              onClick={handleSendWhatsApp}
              className="flex items-center gap-1 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700"
            >
              <MessageSquare className="h-4 w-4" /> WhatsApp Statement
            </button>
          </div>
        }
      />

      {/* Profile Overview Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2 rounded-2xl border border-slate-200 bg-white p-6 dark:border-charcoal-800 dark:bg-charcoal-900 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
            <div className="flex flex-col sm:flex-row items-start gap-4">
              {/* Photo Viewport & Controls */}
              <div className="relative group shrink-0">
                {customer.photo_url ? (
                  <img
                    src={customer.photo_url}
                    alt={customer.full_name}
                    className="h-24 w-24 rounded-2xl object-cover border-2 border-gold-400 shadow-md"
                  />
                ) : (
                  <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-gold-500/20 text-gold-600 font-serif font-bold text-3xl border-2 border-gold-300">
                    {customer.full_name.charAt(0)}
                  </div>
                )}
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-[10px] font-bold text-slate-700 dark:bg-charcoal-800 dark:text-slate-300">
                    {customer.customer_code}
                  </span>
                  <span className="rounded-full bg-gold-500/20 px-2.5 py-0.5 text-[10px] font-bold text-amber-900 dark:text-gold-300 uppercase tracking-wider">
                    {customer.customer_type} Account
                  </span>
                </div>

                <h2 className="mt-1 font-serif text-2xl font-bold text-charcoal-900 dark:text-slate-100">
                  {customer.full_name}
                </h2>

                {customer.shop_name && (
                  <p className="text-xs font-bold text-amber-800 dark:text-gold-400 flex items-center gap-1.5 mt-0.5">
                    <Building className="h-3.5 w-3.5" /> {customer.shop_name}
                  </p>
                )}

                {/* Photo Management Buttons */}
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsCameraOpen(true)}
                    className="flex items-center gap-1.5 rounded-xl bg-gold-500 px-3 py-1.5 text-xs font-bold text-charcoal-950 shadow-gold hover:bg-gold-600"
                  >
                    <Camera className="h-3.5 w-3.5" /> Take New Photo
                  </button>

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-charcoal-700 dark:bg-charcoal-800 dark:text-slate-200"
                  >
                    <Upload className="h-3.5 w-3.5" /> Upload Photo
                  </button>

                  {customer.photo_url && (
                    <button
                      type="button"
                      onClick={handleRemovePhoto}
                      className="flex items-center gap-1 rounded-xl border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Remove
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Details Table */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 border-t border-slate-100 pt-4 text-xs dark:border-charcoal-800">
            <div>
              <span className="text-slate-400">Mobile Phone:</span>
              <p className="font-semibold text-charcoal-900 dark:text-slate-100">{customer.phone}</p>
            </div>
            <div>
              <span className="text-slate-400">WhatsApp Number:</span>
              <p className="font-semibold text-charcoal-900 dark:text-slate-100">{customer.whatsapp_number || customer.phone}</p>
            </div>
            <div>
              <span className="text-slate-400">City / Location:</span>
              <p className="font-semibold text-charcoal-900 dark:text-slate-100">{customer.city || 'N/A'}</p>
            </div>
            <div>
              <span className="text-slate-400">Address:</span>
              <p className="font-semibold text-charcoal-900 dark:text-slate-100">{customer.address || 'N/A'}</p>
            </div>
            {customer.customer_type === 'wholesale' && (
              <div>
                <span className="text-slate-400">Agreed Customer Touch (%):</span>
                <div className="flex items-center gap-2 mt-0.5">
                  <p className="font-bold text-amber-900 dark:text-gold-300">
                    {customer.agreed_customer_touch ?? customer.agreed_profit_percent ?? 40}% Touch
                  </p>
                  <button
                    onClick={() => setIsEditingTouch(true)}
                    className="rounded bg-gold-100 p-1 text-[10px] font-bold text-amber-950 hover:bg-gold-200 dark:bg-gold-950/40 dark:text-gold-300"
                    title="Edit Agreed Customer Touch"
                  >
                    <Edit className="h-3 w-3" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Ledger Balance Card */}
        <div className="rounded-2xl border border-gold-400/40 bg-gradient-to-br from-gold-50/70 via-white to-amber-50/40 p-6 dark:border-gold-800/60 dark:from-gold-950/40 dark:via-charcoal-900 dark:to-gold-900/20 shadow-sm flex flex-col justify-between">
          <div>
            <span className="text-xs font-bold text-amber-900 dark:text-gold-300 uppercase tracking-wider">
              Account Ledger Balance
            </span>
            <h3 className="mt-3 font-serif text-3xl font-bold text-charcoal-900 dark:text-slate-100">
              {formatCurrency(totalOutstanding || 24550)}
            </h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Current Net Receivables Due</p>
          </div>

          <div className="mt-6 border-t border-gold-200 pt-4 dark:border-gold-800/40 space-y-2">
            <button
              onClick={() => navigate('/wholesale-settlements')}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gold-500 py-2.5 text-xs font-bold text-charcoal-950 shadow-gold hover:bg-gold-600"
            >
              <HandCoins className="h-4 w-4" /> Create Settlement Statement
            </button>
          </div>
        </div>
      </div>

      {/* Customer Ledger Transaction Table */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-charcoal-800 dark:bg-charcoal-900 shadow-sm">
        <h3 className="font-serif text-lg font-bold text-charcoal-900 dark:text-slate-100 mb-4">
          Customer Transaction Ledger
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
            <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-500 uppercase dark:border-charcoal-800 dark:bg-charcoal-800 dark:text-slate-400">
              <tr>
                <th className="p-3">Date</th>
                <th className="p-3">Reference / Voucher</th>
                <th className="p-3">Type</th>
                <th className="p-3 text-right">Debit (INR)</th>
                <th className="p-3 text-right">Credit (INR)</th>
                <th className="p-3 text-right">Running Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-charcoal-800">
              <tr className="hover:bg-slate-50 dark:hover:bg-charcoal-800/50">
                <td className="p-3 font-mono">{formatDate(new Date(Date.now() - 15 * 86400000))}</td>
                <td className="p-3 font-semibold text-charcoal-900 dark:text-slate-100">WI-2026-001</td>
                <td className="p-3"><span className="rounded bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-900">Wholesale Issue</span></td>
                <td className="p-3 text-right font-semibold">₹1,96,500.00</td>
                <td className="p-3 text-right">-</td>
                <td className="p-3 text-right font-bold text-amber-900 dark:text-gold-300">₹1,96,500.00</td>
              </tr>
              <tr className="hover:bg-slate-50 dark:hover:bg-charcoal-800/50">
                <td className="p-3 font-mono">{formatDate(new Date(Date.now() - 2 * 86400000))}</td>
                <td className="p-3 font-semibold text-charcoal-900 dark:text-slate-100">WR-2026-001</td>
                <td className="p-3"><span className="rounded bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-900">Stock Return</span></td>
                <td className="p-3 text-right">-</td>
                <td className="p-3 text-right font-semibold text-emerald-600">₹1,17,750.00</td>
                <td className="p-3 text-right font-bold text-amber-900 dark:text-gold-300">₹78,750.00</td>
              </tr>
              <tr className="hover:bg-slate-50 dark:hover:bg-charcoal-800/50">
                <td className="p-3 font-mono">{formatDate(new Date(Date.now() - 1 * 86400000))}</td>
                <td className="p-3 font-semibold text-charcoal-900 dark:text-slate-100">NEFT/SBI/89127394</td>
                <td className="p-3"><span className="rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-900">Payment Received</span></td>
                <td className="p-3 text-right">-</td>
                <td className="p-3 text-right font-semibold text-emerald-600">₹50,000.00</td>
                <td className="p-3 text-right font-bold text-amber-900 dark:text-gold-300">₹24,550.00</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Agreed Customer Touch Modal */}
      {isEditingTouch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-charcoal-900 border border-slate-200 dark:border-charcoal-800">
            <h3 className="font-serif text-lg font-bold text-charcoal-900 dark:text-slate-100 mb-2">
              Edit Wholesale Customer Terms
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Update the agreed touch percentage for <strong className="text-charcoal-900 dark:text-slate-100">{customer.full_name}</strong>.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Agreed Customer Touch (%) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={touchInput}
                  onChange={(e) => setTouchInput(Number(e.target.value))}
                  placeholder="Enter agreed touch (e.g. 40%)"
                  className="w-full rounded-xl border border-slate-200 p-2.5 text-sm font-bold text-amber-950 focus:border-gold-500 focus:outline-none dark:border-charcoal-800 dark:bg-charcoal-800 dark:text-gold-300"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-100 dark:border-charcoal-800 pt-4 mt-6">
              <button
                onClick={() => setIsEditingTouch(false)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:border-charcoal-800 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveTouch}
                className="rounded-xl bg-gold-500 px-5 py-2 text-xs font-bold text-charcoal-950 shadow-gold hover:bg-gold-600"
              >
                Save Agreed Touch
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
