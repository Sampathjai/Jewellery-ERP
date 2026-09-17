import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { PhotoUploader } from '@/components/common/PhotoUploader';
import { dataService, ensureValidUUID } from '@/lib/dataService';
import { Customer, CustomerType, Supplier, WholesaleProfitModel } from '@/types';
import { ArrowLeft, Save } from 'lucide-react';

export const AddCustomer: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const initialType = (searchParams.get('type') as CustomerType) || 'retail';

  const [formData, setFormData] = useState<Partial<Customer>>({
    customer_code: `CUST-${Math.floor(100 + Math.random() * 900)}`,
    full_name: '',
    shop_name: '',
    customer_type: initialType,
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
    notes: '',
    is_active: true,
  });

  useEffect(() => {
    if (initialType === 'supplier') {
      setFormData((prev) => ({ ...prev, customer_type: 'supplier' }));
    }
  }, [initialType]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.full_name || !formData.phone) return;

    const savedCustomer = await dataService.createCustomer({
      ...formData,
      id: ensureValidUUID(),
    });

    // If type is supplier, also sync a Supplier record in db.suppliers
    if (savedCustomer.customer_type === 'supplier') {
      const displayName = savedCustomer.shop_name || savedCustomer.full_name;
      await dataService.createSupplier({
        id: ensureValidUUID(),
        supplier_code: `SUP-${Math.floor(100 + Math.random() * 900)}`,
        supplier_name: displayName,
        contact_person: savedCustomer.full_name,
        phone: savedCustomer.phone,
        email: savedCustomer.email,
        address: `${savedCustomer.address || ''} ${savedCustomer.city || ''}`.trim(),
        gstin: savedCustomer.gstin,
        notes: savedCustomer.notes,
        primary_metal: 'gold',
      });
    }

    if (savedCustomer.customer_type === 'supplier') {
      navigate('/purchases');
    } else {
      navigate('/customers');
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Add Customer Profile"
        subtitle="Register new retail customer or wholesale credit partner"
        breadcrumb={['Home', 'Customers', 'New Customer']}
        actionBtn={
          <button
            onClick={() => navigate('/customers')}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-charcoal-800 dark:text-slate-300"
          >
            <ArrowLeft className="h-4 w-4" /> Cancel
          </button>
        }
      />

      <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-charcoal-800 dark:bg-charcoal-900 shadow-sm space-y-6 max-w-4xl">
        {/* Customer Category & Basic Info */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Customer Code</label>
            <input
              type="text"
              readOnly
              value={formData.customer_code}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-100 p-2.5 text-xs font-mono text-slate-600 dark:border-charcoal-800 dark:bg-charcoal-800 dark:text-slate-400"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Customer Type *</label>
            <select
              value={formData.customer_type}
              onChange={(e) => setFormData({ ...formData, customer_type: e.target.value as CustomerType })}
              className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-xs text-charcoal-900 focus:border-gold-500 focus:outline-none dark:border-charcoal-800 dark:bg-charcoal-800 dark:text-slate-100"
            >
              <option value="retail">Retail Customer</option>
              <option value="wholesale">Wholesale Credit Partner</option>
              <option value="supplier">Supplier / Manufacturer</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Full Name *</label>
            <input
              type="text"
              required
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              placeholder="e.g. Anand Ramakrishnan"
              className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-xs text-charcoal-900 focus:border-gold-500 focus:outline-none dark:border-charcoal-800 dark:bg-charcoal-800 dark:text-slate-100"
            />
          </div>
        </div>

        {/* Shop Name & Contact Details */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Shop / Firm Name (Optional)</label>
            <input
              type="text"
              value={formData.shop_name}
              onChange={(e) => setFormData({ ...formData, shop_name: e.target.value })}
              placeholder="e.g. Sri Lakshmi Jewellery"
              className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-xs text-charcoal-900 focus:border-gold-500 focus:outline-none dark:border-charcoal-800 dark:bg-charcoal-800 dark:text-slate-100"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Mobile Phone *</label>
            <input
              type="text"
              required
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="+91 98765 43210"
              className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-xs text-charcoal-900 focus:border-gold-500 focus:outline-none dark:border-charcoal-800 dark:bg-charcoal-800 dark:text-slate-100"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">WhatsApp Number</label>
            <input
              type="text"
              value={formData.whatsapp_number}
              onChange={(e) => setFormData({ ...formData, whatsapp_number: e.target.value })}
              placeholder="+91 98765 43210"
              className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-xs text-charcoal-900 focus:border-gold-500 focus:outline-none dark:border-charcoal-800 dark:bg-charcoal-800 dark:text-slate-100"
            />
          </div>
        </div>

        {/* Wholesale Specific Parameters */}
        {formData.customer_type === 'wholesale' && (
          <div className="rounded-xl border border-gold-300 bg-gold-50/40 p-4 dark:border-gold-800 dark:bg-gold-950/20 space-y-3">
            <h4 className="text-xs font-bold text-amber-900 dark:text-gold-300 uppercase tracking-wider">
              WHOLESALE CUSTOMER TERMS
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Agreed Customer Touch (%) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  required={formData.customer_type === 'wholesale'}
                  value={formData.agreed_customer_touch ?? 40}
                  onChange={(e) =>
                    setFormData({ ...formData, agreed_customer_touch: Number(e.target.value) })
                  }
                  placeholder="Enter agreed touch (e.g. 40%)"
                  className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-xs font-bold text-amber-950 focus:border-gold-500 focus:outline-none dark:border-charcoal-800 dark:bg-charcoal-800 dark:text-gold-300"
                />
                <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                  Manually configured touch percentage for issuing jewellery to this wholesale customer (e.g., 40%).
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Address Details */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Street Address</label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="e.g. 45 Cross Cut Road"
              className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-xs text-charcoal-900 focus:border-gold-500 focus:outline-none dark:border-charcoal-800 dark:bg-charcoal-800 dark:text-slate-100"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">City</label>
            <input
              type="text"
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              placeholder="e.g. Coimbatore"
              className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-xs text-charcoal-900 focus:border-gold-500 focus:outline-none dark:border-charcoal-800 dark:bg-charcoal-800 dark:text-slate-100"
            />
          </div>
        </div>

        <PhotoUploader
          label="Customer Photo / Shop Photo"
          value={formData.photo_url}
          onChange={(url) => setFormData({ ...formData, photo_url: url })}
        />

        <div className="flex justify-end gap-3 border-t border-slate-100 pt-4 dark:border-charcoal-800">
          <button
            type="submit"
            className="flex items-center gap-2 rounded-xl bg-gold-500 px-6 py-2.5 text-xs font-bold text-charcoal-950 shadow-gold hover:bg-gold-600"
          >
            <Save className="h-4 w-4" /> Save Customer Record
          </button>
        </div>
      </form>
    </div>
  );
};

