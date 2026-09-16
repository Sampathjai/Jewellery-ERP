import React, { useState } from 'react';
import { Modal } from './Modal';
import { PhotoUploader } from './PhotoUploader';
import { getLocalDb, saveLocalDb, saveCustomerRecord } from '@/lib/supabase';
import { Customer, WholesaleProfitModel } from '@/types';
import { useLanguage } from '@/lib/i18n';
import { Save, UserPlus, Sparkles } from 'lucide-react';

interface AddWholesaleCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCustomerAdded: (customer: Customer) => void;
}

export const AddWholesaleCustomerModal: React.FC<AddWholesaleCustomerModalProps> = ({
  isOpen,
  onClose,
  onCustomerAdded,
}) => {
  const { t, language } = useLanguage();

  const [formData, setFormData] = useState<Partial<Customer>>({
    customer_code: `CUST-${Math.floor(100 + Math.random() * 900)}`,
    full_name: '',
    shop_name: '',
    customer_type: 'wholesale',
    phone: '',
    whatsapp_number: '',
    email: '',
    address: '',
    city: 'Coimbatore',
    state: 'Tamil Nadu',
    pin_code: '641001',
    gstin: '',
    pan: '',
    photo_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500&auto=format&fit=crop&q=60',
    agreed_customer_touch: 40,
    credit_limit: 0,
    agreed_profit_percent: 40,
    profit_sharing_model: 'model_a_profit_percent',
    payment_terms: '30 Days',
    notes: '',
    is_active: true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.full_name || !formData.phone) return;

    const newCustomer: Customer = {
      id: `cust-${Date.now()}`,
      customer_code: formData.customer_code || `CUST-${Date.now()}`,
      full_name: formData.full_name,
      shop_name: formData.shop_name,
      customer_type: 'wholesale',
      phone: formData.phone,
      whatsapp_number: formData.whatsapp_number || formData.phone,
      email: formData.email,
      address: formData.address,
      city: formData.city,
      state: formData.state,
      pin_code: formData.pin_code,
      gstin: formData.gstin,
      pan: formData.pan,
      photo_url: formData.photo_url,
      agreed_customer_touch: formData.agreed_customer_touch ?? 40,
      credit_limit: formData.credit_limit || 0,
      agreed_profit_percent: formData.agreed_profit_percent || 40,
      profit_sharing_model: (formData.profit_sharing_model as WholesaleProfitModel) || 'model_a_profit_percent',
      payment_terms: formData.payment_terms || '30 Days',
      is_active: true,
      notes: formData.notes,
      created_at: new Date().toISOString(),
    };

    await saveCustomerRecord(newCustomer);
    onCustomerAdded(newCustomer);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('add_wholesale_customer')}
      subtitle={language === 'ta' ? 'உருக்கு டச் விவரங்களுடன் புதிய மொத்த வியாபாரியைச் சேர்க்கவும்' : 'Register wholesale customer with photo and default melting touch settings'}
      maxWidth="2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Customer Photo Top Upload */}
        <div className="flex justify-center border-b border-slate-100 pb-4 dark:border-charcoal-800">
          <PhotoUploader
            label={language === 'ta' ? 'வாடிக்கையாளர் / கடைப் படம் (Photo)' : 'Customer Photo / Shop Photo'}
            value={formData.photo_url}
            onChange={(url) => setFormData({ ...formData, photo_url: url })}
          />
        </div>

        {/* Basic Info */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Customer Code</label>
            <input
              type="text"
              readOnly
              value={formData.customer_code}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-100 p-2.5 text-xs font-mono dark:border-charcoal-800 dark:bg-charcoal-800 dark:text-slate-300"
            />
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

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Shop / Firm Name</label>
            <input
              type="text"
              value={formData.shop_name}
              onChange={(e) => setFormData({ ...formData, shop_name: e.target.value })}
              placeholder="e.g. Sri Lakshmi Jewellery"
              className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-xs text-charcoal-900 focus:border-gold-500 focus:outline-none dark:border-charcoal-800 dark:bg-charcoal-800 dark:text-slate-100"
            />
          </div>
        </div>

        {/* Phone & WhatsApp */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
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

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">City / Location</label>
            <input
              type="text"
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              placeholder="e.g. Madurai"
              className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-xs text-charcoal-900 focus:border-gold-500 focus:outline-none dark:border-charcoal-800 dark:bg-charcoal-800 dark:text-slate-100"
            />
          </div>
        </div>

        {/* Wholesale Customer Terms */}
        <div className="rounded-xl border border-gold-300 bg-gold-50/50 p-4 dark:border-gold-800 dark:bg-gold-950/20 space-y-3">
          <h4 className="text-xs font-bold text-amber-900 dark:text-gold-300 uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="h-4 w-4 text-gold-600" />
            WHOLESALE CUSTOMER TERMS
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Agreed Customer Touch (%) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="100"
                required
                value={formData.agreed_customer_touch ?? 40}
                onChange={(e) => setFormData({ ...formData, agreed_customer_touch: Number(e.target.value) })}
                placeholder="Enter agreed touch (e.g. 40%)"
                className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-xs text-amber-950 font-bold focus:border-gold-500 focus:outline-none dark:border-charcoal-800 dark:bg-charcoal-800 dark:text-gold-300"
              />
            </div>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            * Note: This agreed touch percentage (e.g. 40%) is saved for this wholesale partner and used when issuing jewellery items.
          </p>
        </div>

        <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-charcoal-800">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-charcoal-800 dark:text-slate-300"
          >
            {t('cancel')}
          </button>
          <button
            type="submit"
            className="flex items-center gap-2 rounded-xl bg-gold-500 px-6 py-2.5 text-xs font-bold text-charcoal-950 shadow-gold hover:bg-gold-600"
          >
            <Save className="h-4 w-4" /> Save & Select Wholesale Customer
          </button>
        </div>
      </form>
    </Modal>
  );
};

