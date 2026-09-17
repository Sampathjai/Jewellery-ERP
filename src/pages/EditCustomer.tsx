import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { PhotoUploader } from '@/components/common/PhotoUploader';
import { dataService } from '@/lib/dataService';
import { Customer, CustomerType, WholesaleProfitModel } from '@/types';
import { ArrowLeft, Save, Loader2, CheckCircle2 } from 'lucide-react';

export const EditCustomer: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [formData, setFormData] = useState<Partial<Customer>>({
    customer_code: '',
    full_name: '',
    shop_name: '',
    customer_type: 'retail',
    phone: '',
    whatsapp_number: '',
    email: '',
    address: '',
    city: '',
    state: 'Tamil Nadu',
    pin_code: '',
    gstin: '',
    pan: '',
    agreed_customer_touch: 40,
    credit_limit: 0,
    agreed_profit_percent: 40,
    profit_sharing_model: 'model_a_profit_percent',
    payment_terms: '30 Days',
    photo_url: '',
    notes: '',
    is_active: true,
  });

  useEffect(() => {
    let isMounted = true;
    const fetchCustomer = async () => {
      if (!id) return;
      setIsLoading(true);
      setErrorMsg('');
      try {
        const customers = await dataService.getCustomers();
        const found = customers.find((c) => c.id === id);
        if (found && isMounted) {
          setFormData({
            ...found,
            agreed_customer_touch: found.agreed_customer_touch ?? found.default_actual_touch ?? 40,
          });
        } else if (!found && isMounted) {
          setErrorMsg('Customer profile not found in Supabase database.');
        }
      } catch (err: any) {
        if (isMounted) {
          setErrorMsg(err?.message || 'Failed to load customer profile from Supabase.');
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchCustomer();
    return () => {
      isMounted = false;
    };
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    if (!formData.full_name?.trim() || !formData.phone?.trim()) {
      setErrorMsg('Full Name and Phone Number are required fields.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const updated = await dataService.updateCustomer(id, {
        full_name: formData.full_name,
        shop_name: formData.shop_name,
        customer_type: formData.customer_type,
        phone: formData.phone,
        whatsapp_number: formData.whatsapp_number || formData.phone,
        email: formData.email,
        address: formData.address,
        city: formData.city,
        state: formData.state,
        pin_code: formData.pin_code,
        gstin: formData.gstin,
        pan: formData.pan,
        agreed_customer_touch: Number(formData.agreed_customer_touch || 40),
        credit_limit: Number(formData.credit_limit || 0),
        agreed_profit_percent: Number(formData.agreed_profit_percent || 40),
        profit_sharing_model: formData.profit_sharing_model,
        payment_terms: formData.payment_terms,
        photo_url: formData.photo_url || '',
        notes: formData.notes,
        is_active: formData.is_active ?? true,
      });

      setSuccessMsg(`Customer "${updated.full_name}" updated successfully in Supabase!`);
      setTimeout(() => {
        navigate('/customers');
      }, 1200);
    } catch (err: any) {
      console.error('Customer Update Error:', err);
      setErrorMsg(err?.message || 'Failed to update customer record in Supabase PostgreSQL.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-gold-500" />
        <p className="text-xs font-semibold text-slate-500">Loading customer profile from Supabase...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <PageHeader
        title={`Edit Customer: ${formData.full_name || formData.customer_code}`}
        subtitle="Update customer profile details in central Supabase PostgreSQL"
        breadcrumb={['Home', 'Customers', 'Edit Customer']}
        actionBtn={
          <button
            onClick={() => navigate('/customers')}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-charcoal-800 dark:bg-charcoal-900 dark:text-slate-300"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Customers
          </button>
        }
      />

      {errorMsg && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-semibold text-red-900 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
          <p className="font-bold text-sm mb-1">⚠️ Error Updating Customer</p>
          <p>{errorMsg}</p>
        </div>
      )}

      {successMsg && (
        <div className="flex items-center gap-2.5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-bold text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-300">
          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Details Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-charcoal-800 dark:bg-charcoal-900 shadow-sm space-y-4">
          <h3 className="font-serif text-base font-bold text-charcoal-900 dark:text-slate-100">
            Basic Identification
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                Customer Code (Read-Only)
              </label>
              <input
                type="text"
                value={formData.customer_code || ''}
                readOnly
                disabled
                className="w-full rounded-xl border border-slate-200 bg-slate-100 py-2 px-3 text-xs font-mono font-bold text-slate-500 dark:border-charcoal-800 dark:bg-charcoal-800 dark:text-slate-400 cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                Customer Type <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.customer_type || 'retail'}
                onChange={(e) => setFormData({ ...formData, customer_type: e.target.value as CustomerType })}
                className="w-full rounded-xl border border-slate-200 py-2 px-3 text-xs font-semibold text-charcoal-900 focus:border-gold-500 focus:outline-none dark:border-charcoal-800 dark:bg-charcoal-800 dark:text-slate-100"
              >
                <option value="retail">Retail Buyer</option>
                <option value="wholesale">Wholesale Partner</option>
                <option value="supplier">Supplier / Refinery</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                Account Status
              </label>
              <select
                value={formData.is_active ? 'active' : 'inactive'}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.value === 'active' })}
                className="w-full rounded-xl border border-slate-200 py-2 px-3 text-xs font-semibold text-charcoal-900 focus:border-gold-500 focus:outline-none dark:border-charcoal-800 dark:bg-charcoal-800 dark:text-slate-100"
              >
                <option value="active">Active Account</option>
                <option value="inactive">Inactive / Suspended</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Enter customer full name"
                value={formData.full_name || ''}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                className="w-full rounded-xl border border-slate-200 py-2 px-3 text-xs text-charcoal-900 focus:border-gold-500 focus:outline-none dark:border-charcoal-800 dark:bg-charcoal-800 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                Shop / Firm Name (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Sri Lakshmi Jewellery"
                value={formData.shop_name || ''}
                onChange={(e) => setFormData({ ...formData, shop_name: e.target.value })}
                className="w-full rounded-xl border border-slate-200 py-2 px-3 text-xs text-charcoal-900 focus:border-gold-500 focus:outline-none dark:border-charcoal-800 dark:bg-charcoal-800 dark:text-slate-100"
              />
            </div>
          </div>
        </div>

        {/* Contact Information Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-charcoal-800 dark:bg-charcoal-900 shadow-sm space-y-4">
          <h3 className="font-serif text-base font-bold text-charcoal-900 dark:text-slate-100">
            Contact & Location Details
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                Mobile Phone <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                required
                placeholder="+91 98765 43210"
                value={formData.phone || ''}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full rounded-xl border border-slate-200 py-2 px-3 text-xs text-charcoal-900 focus:border-gold-500 focus:outline-none dark:border-charcoal-800 dark:bg-charcoal-800 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                WhatsApp Number
              </label>
              <input
                type="tel"
                placeholder="+91 98765 43210"
                value={formData.whatsapp_number || ''}
                onChange={(e) => setFormData({ ...formData, whatsapp_number: e.target.value })}
                className="w-full rounded-xl border border-slate-200 py-2 px-3 text-xs text-charcoal-900 focus:border-gold-500 focus:outline-none dark:border-charcoal-800 dark:bg-charcoal-800 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                Email Address
              </label>
              <input
                type="email"
                placeholder="customer@example.com"
                value={formData.email || ''}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full rounded-xl border border-slate-200 py-2 px-3 text-xs text-charcoal-900 focus:border-gold-500 focus:outline-none dark:border-charcoal-800 dark:bg-charcoal-800 dark:text-slate-100"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                Street Address
              </label>
              <input
                type="text"
                placeholder="No. 45 Bazzar Street"
                value={formData.address || ''}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full rounded-xl border border-slate-200 py-2 px-3 text-xs text-charcoal-900 focus:border-gold-500 focus:outline-none dark:border-charcoal-800 dark:bg-charcoal-800 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                City / Town
              </label>
              <input
                type="text"
                placeholder="Trichy / Madurai"
                value={formData.city || ''}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="w-full rounded-xl border border-slate-200 py-2 px-3 text-xs text-charcoal-900 focus:border-gold-500 focus:outline-none dark:border-charcoal-800 dark:bg-charcoal-800 dark:text-slate-100"
              />
            </div>
          </div>
        </div>

        {/* Wholesale & Financial Terms (if wholesale) */}
        {formData.customer_type === 'wholesale' && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-6 dark:border-gold-900/40 dark:bg-gold-950/20 shadow-sm space-y-4">
            <h3 className="font-serif text-base font-bold text-amber-950 dark:text-gold-300">
              Wholesale Terms & Profit Sharing Touch
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-amber-900 dark:text-gold-300 mb-1">
                  Agreed Customer Touch (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={formData.agreed_customer_touch ?? 40}
                  onChange={(e) => setFormData({ ...formData, agreed_customer_touch: Number(e.target.value) })}
                  className="w-full rounded-xl border border-amber-300 py-2 px-3 text-xs font-bold text-amber-950 focus:border-gold-500 focus:outline-none dark:border-gold-800 dark:bg-charcoal-800 dark:text-gold-300"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-amber-900 dark:text-gold-300 mb-1">
                  Credit Limit (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.credit_limit || 0}
                  onChange={(e) => setFormData({ ...formData, credit_limit: Number(e.target.value) })}
                  className="w-full rounded-xl border border-amber-300 py-2 px-3 text-xs font-bold text-amber-950 focus:border-gold-500 focus:outline-none dark:border-gold-800 dark:bg-charcoal-800 dark:text-gold-300"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-amber-900 dark:text-gold-300 mb-1">
                  Payment Terms
                </label>
                <input
                  type="text"
                  placeholder="30 Days"
                  value={formData.payment_terms || '30 Days'}
                  onChange={(e) => setFormData({ ...formData, payment_terms: e.target.value })}
                  className="w-full rounded-xl border border-amber-300 py-2 px-3 text-xs text-amber-950 focus:border-gold-500 focus:outline-none dark:border-gold-800 dark:bg-charcoal-800 dark:text-gold-300"
                />
              </div>
            </div>
          </div>
        )}

        {/* Photo Uploader */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-charcoal-800 dark:bg-charcoal-900 shadow-sm space-y-4">
          <PhotoUploader
            label="Customer Photo / Shop Photo (Mobile Camera or Upload)"
            value={formData.photo_url || ''}
            onChange={(url) => setFormData({ ...formData, photo_url: url })}
          />
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-4">
          <button
            type="button"
            onClick={() => navigate('/customers')}
            className="w-full sm:w-auto rounded-xl border border-slate-200 bg-white px-6 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-charcoal-800 dark:bg-charcoal-900 dark:text-slate-300"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl bg-gold-500 px-8 py-2.5 text-xs font-bold text-charcoal-950 shadow-gold hover:bg-gold-600 disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Saving Changes...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" /> Save Customer Profile
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
