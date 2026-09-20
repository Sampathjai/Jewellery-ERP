import React, { createContext, useContext, useState } from 'react';

export type Language = 'en' | 'ta';

export interface Translations {
  // Common & Header
  shop_title: string;
  gold_and_silver: string;
  today_rates: string;
  gold_24k: string;
  gold_22k: string;
  silver: string;
  silver_925: string;
  search: string;
  sign_out: string;
  switch_role: string;

  // Sidebar Groups & Nav
  main: string;
  dashboard: string;
  retail_pos_catalog: string;
  pos_billing: string;
  retail_invoices: string;
  product_catalog: string;
  stock_inventory: string;
  metal_rates: string;
  goldsmith_jobs: string;
  wholesale_consignment: string;
  wholesale_partners: string;
  wholesale_issues: string;
  wholesale_returns: string;
  wholesale_sold: string;
  wholesale_holdings: string;
  profit_settlements: string;
  wholesale_ledger: string;
  crm_financials: string;
  customers_crm: string;
  payment_receipts: string;
  suppliers: string;
  purchases: string;
  expenses_costs: string;
  reports_analytics: string;
  administration: string;
  whatsapp_log: string;
  notifications: string;
  user_management: string;
  user_login_settings: string;
  roles_permissions: string;
  shop_settings: string;
  storage_database: string;
  audit_logs: string;

  // Dashboard & POS Terms
  today_retail_sales: string;
  monthly_retail_sales: string;
  gold_stock_weight: string;
  silver_stock_weight: string;
  stock_valuation: string;
  active_wholesale_partners: string;
  wholesale_issued_items: string;
  pending_returns: string;
  wholesale_receivables: string;
  total_expenses: string;
  net_profit: string;
  pending_payments: string;
  pending_retail_payments: string;
  pending_wholesale_payments: string;
  quick_actions: string;
  new_retail_bill: string;
  add_product: string;
  add_customer: string;
  new_wholesale_issue: string;
  receive_return: string;
  create_settlement: string;
  record_payment: string;
  add_expense: string;

  // Jewellery & Touch Specifics
  gross_weight: string;
  deduction_weight: string;
  net_weight: string;
  actual_touch: string;
  profit_touch: string;
  final_billing_touch: string;
  fine_gold: string;
  making_charge: string;
  labour_charge: string;
  wastage_percent: string;
  purity: string;
  gold: string;
  nose_rings: string;
  ear_rings: string;
  chains: string;
  bangles: string;
  rings: string;
  necklaces: string;
  silver_items: string;
  custom_orders: string;

  // Wholesale & Touch Settlement Calculations
  profit_share: string;
  customer_share: string;
  shop_share: string;
  valuation_cost: string;
  settlement_statement: string;
  outstanding_balance: string;
  add_wholesale_customer: string;
  default_actual_touch: string;
  default_profit_touch: string;
  default_billing_touch: string;
  cash_payment: string;
  gold_916_payment: string;
  split_payment: string;
  pcs: string;
  grams: string;
  save: string;
  cancel: string;
  print: string;
  download_pdf: string;
  whatsapp_share: string;
}

const translations: Record<Language, Translations> = {
  en: {
    shop_title: 'Shankar Jewellery',
    gold_and_silver: 'Gold & Silver Jewellery ERP',
    today_rates: "Today's Rates",
    gold_24k: 'Gold 24K',
    gold_22k: 'Gold 22K',
    silver: 'Silver',
    silver_925: 'Silver 925',
    search: 'Search...',
    sign_out: 'Sign Out',
    switch_role: 'Switch Active Role',

    main: 'MAIN',
    dashboard: 'Dashboard',
    retail_pos_catalog: 'RETAIL POS & CATALOG',
    pos_billing: 'Retail POS Billing',
    retail_invoices: 'Retail Invoices',
    product_catalog: 'Product Catalog',
    stock_inventory: 'Stock & Inventory',
    metal_rates: 'Metal Rates',
    goldsmith_jobs: 'Goldsmith Jobs',
    wholesale_consignment: 'WHOLESALE CONSIGNMENT',
    wholesale_partners: 'Wholesale Partners',
    wholesale_issues: 'Wholesale Billing / Issues',
    wholesale_returns: 'Wholesale Returns',
    wholesale_sold: 'Wholesale Sold Items',
    wholesale_holdings: 'Holdings / Live Stock',
    profit_settlements: 'Profit Settlements',
    wholesale_ledger: 'Wholesale Ledger',
    crm_financials: 'CRM & FINANCIALS',
    customers_crm: 'Customers CRM',
    payment_receipts: 'Payment Receipts',
    suppliers: 'Suppliers',
    purchases: 'Purchases',
    expenses_costs: 'Expenses & Costs',
    reports_analytics: 'Reports & Analytics',
    administration: 'ADMINISTRATION',
    whatsapp_log: 'WhatsApp Log',
    notifications: 'Notifications',
    user_management: 'User Management',
    user_login_settings: 'User Login Settings',
    roles_permissions: 'Roles & Permissions',
    shop_settings: 'Shop Settings',
    storage_database: 'Storage & Database',
    audit_logs: 'Audit Logs',

    today_retail_sales: "Today's Retail Sales",
    monthly_retail_sales: 'Monthly Retail Sales',
    gold_stock_weight: 'Gold Stock Weight',
    silver_stock_weight: 'Silver Stock Weight',
    stock_valuation: 'Available Inventory Value',
    active_wholesale_partners: 'Active Wholesale Partners',
    wholesale_issued_items: 'Wholesale Issued Items',
    pending_returns: 'Pending Wholesale Returns',
    wholesale_receivables: 'Wholesale Receivables',
    total_expenses: 'Total Monthly Expenses',
    net_profit: 'Estimated Net Profit',
    pending_payments: 'Pending Payments',
    pending_retail_payments: 'Pending Retail Payments',
    pending_wholesale_payments: 'Pending Wholesale Payments',
    quick_actions: 'Quick Business Actions',
    new_retail_bill: 'Retail Bill (POS)',
    add_product: 'Add Product',
    add_customer: 'Add Customer',
    new_wholesale_issue: 'Wholesale Bill',
    receive_return: 'Receive Return',
    create_settlement: 'Settlement',
    record_payment: 'Record Payment',
    add_expense: 'Add Expense',

    gross_weight: 'Gross Weight',
    deduction_weight: 'Less Cardboard (Deduction)',
    net_weight: 'Net Weight',
    actual_touch: 'Actual Melting Touch',
    profit_touch: 'Profit Touch',
    final_billing_touch: 'Final Billing Touch',
    fine_gold: 'Fine Gold Equivalent',
    making_charge: 'Making Charge',
    labour_charge: 'Labour Charge',
    wastage_percent: 'Wastage %',
    purity: 'Purity',
    gold: 'Gold',
    nose_rings: 'Nose Rings',
    ear_rings: 'Ear Rings',
    chains: 'Chains',
    bangles: 'Bangles',
    rings: 'Rings',
    necklaces: 'Necklaces',
    silver_items: 'Silver Items',
    custom_orders: 'Custom Orders',

    profit_share: 'Profit Share',
    customer_share: 'Partner Profit Share',
    shop_share: 'Shop Net Profit Share',
    valuation_cost: 'Cost / Valuation',
    settlement_statement: 'Profit Settlement Statement',
    outstanding_balance: 'Outstanding Balance Due',
    add_wholesale_customer: 'Add Wholesale Customer',
    default_actual_touch: 'Default Actual Touch',
    default_profit_touch: 'Default Profit Touch',
    default_billing_touch: 'Default Billing Touch',
    cash_payment: 'Cash Payment',
    gold_916_payment: 'Pure 916 Gold Payment',
    split_payment: 'Cash + Pure 916 Gold Payment',
    pcs: 'Pcs',
    grams: 'g',
    save: 'Save Record',
    cancel: 'Cancel',
    print: 'Print Document',
    download_pdf: 'Download PDF',
    whatsapp_share: 'WhatsApp Share',
  },
  ta: {
    shop_title: 'சங்கர் ஜுவல்லரி',
    gold_and_silver: 'தங்கம் & வெள்ளி நகை மேலாண்மை',
    today_rates: 'இன்றைய விலை',
    gold_24k: 'தங்கம் 24K',
    gold_22k: 'தங்கம் 22K',
    silver: 'வெள்ளி',
    silver_925: 'வெள்ளி 925',
    search: 'தேடுக...',
    sign_out: 'வெளியேறு',
    switch_role: 'பயனர் நிலையை மாற்று',

    main: 'முக்கியமானவை',
    dashboard: 'முகப்புப் பலகை',
    retail_pos_catalog: 'சில்லறை விற்பனை & நகைகள்',
    pos_billing: 'சில்லறை பில்லிங் (POS)',
    retail_invoices: 'சில்லறை பில்கள்',
    product_catalog: 'நகை விபரம் (Catalog)',
    stock_inventory: 'நகை இருப்பு (Stock)',
    metal_rates: 'தினசரி தங்க விலை',
    goldsmith_jobs: 'தட்டான் தயாரிப்புப் பணிகள்',
    wholesale_consignment: 'மொத்த விற்பனை (Wholesale)',
    wholesale_partners: 'மொத்த வியாபாரிகள்',
    wholesale_issues: 'மொத்த பில்லிங் (Billing / Issues)',
    wholesale_returns: 'திரும்பப் பெற்றவை (Returns)',
    wholesale_sold: 'விற்கப்பட்ட நகைகள்',
    wholesale_holdings: 'வியாபாரி வசம் உள்ள இருப்பு (Holdings)',
    profit_settlements: 'லாபக் கணக்கு முடித்தல்',
    wholesale_ledger: 'மொத்த வியாபாரப் பேரேடு',
    crm_financials: 'வாடிக்கையாளர் & நிதி',
    customers_crm: 'வாடிக்கையாளர்கள்',
    payment_receipts: 'பணப் ரசீதுகள்',
    suppliers: 'பொருள் வழங்குனர்கள்',
    purchases: 'தங்கக் கொள்முதல்',
    expenses_costs: 'கடைச் செலவுகள்',
    reports_analytics: 'அறிக்கைகள் (Reports)',
    administration: 'நிர்வாகம்',
    whatsapp_log: 'வாட்ஸ்அப் பதிவுகள்',
    notifications: 'அறிவிப்புகள்',
    user_management: 'பயனாளர் நிர்வாகம்',
    user_login_settings: 'உள்நுழைவு அமைப்புகள்',
    roles_permissions: 'அனுமதி வரம்புகள்',
    shop_settings: 'கடை அமைப்புகள்',
    storage_database: 'தரவுத்தளம் & சேமிப்பு',
    audit_logs: 'பாதுகாப்புப் பதிவுகள்',

    today_retail_sales: 'இன்றைய சில்லறை விற்பனை',
    monthly_retail_sales: 'இந்த மாத விற்பனை',
    gold_stock_weight: 'தங்க இருப்பு எடை',
    silver_stock_weight: 'வெள்ளி இருப்பு எடை',
    stock_valuation: 'மொத்த நகைகளின் மதிப்பு',
    active_wholesale_partners: 'மொத்த வியாபாரிகள் எண்ணிக்கை',
    wholesale_issued_items: 'வழங்கப்பட்ட மொத்த நகைகள்',
    pending_returns: 'வரவேண்டிய நகைகள் (Returns)',
    wholesale_receivables: 'வரவேண்டிய நிலுவைத் தொகை',
    total_expenses: 'மாதாந்திர கடைச் செலவுகள்',
    net_profit: 'நிகர லாபம்',
    pending_payments: 'பெறவேண்டிய பாக்கித் தொகை',
    pending_retail_payments: 'சில்லறை பில் பாக்கிகள்',
    pending_wholesale_payments: 'மொத்த வியாபார பாக்கிகள்',
    quick_actions: 'வேகமான செயல்பாடுகள்',
    new_retail_bill: 'புதிய பில் போட',
    add_product: 'நகை சேர்க்க',
    add_customer: 'வாடிக்கையாளர் சேர்க்க',
    new_wholesale_issue: 'மொத்த நகை பில் போட',
    receive_return: 'நகை திரும்பப் பெற',
    create_settlement: 'கணக்கு முடிக்க',
    record_payment: 'பணம் வரவு வைக்க',
    add_expense: 'செலவு எழுத',

    gross_weight: 'மொத்த எடை (Gross Wt)',
    deduction_weight: 'அட்டை கழிவு (Cardboard)',
    net_weight: 'நிகர எடை (Net Wt)',
    actual_touch: 'உருக்கு டச் (Actual Touch)',
    profit_touch: 'லாப டச் (Profit Touch)',
    final_billing_touch: 'மொத்த டச் (Billing Touch)',
    fine_gold: 'சொக்கத் தங்கம் (Fine Gold)',
    making_charge: 'செய்கூலி',
    labour_charge: 'கூலி',
    wastage_percent: 'சேதாரம் %',
    purity: 'மாற்று / தரம்',
    gold: 'தங்கம்',
    nose_rings: 'மூக்குத்தி',
    ear_rings: 'காதணி / தோடு',
    chains: 'சங்கிலி / செயின்',
    bangles: 'வளையல்',
    rings: 'மோதிரம்',
    necklaces: 'ஆரம் / நெக்லஸ்',
    silver_items: 'வெள்ளிப் பொருட்கள்',
    custom_orders: 'ஆர்டர் நகைகள்',

    profit_share: 'லாபப் பங்கு',
    customer_share: 'வியாபாரி லாபப் பங்கு',
    shop_share: 'கடையின் நிகர லாபம்',
    valuation_cost: 'அடக்க விலை மதிப்பு',
    settlement_statement: 'லாபக் கணக்கு அறிக்கை',
    outstanding_balance: 'நிலுவையில் உள்ள பாக்கி',
    add_wholesale_customer: 'புதிய மொத்த வியாபாரி சேர்க்க',
    default_actual_touch: 'இயல்பு உருக்கு டச்',
    default_profit_touch: 'இயல்பு லாப டச்',
    default_billing_touch: 'இயல்பு மொத்த டச்',
    cash_payment: 'ரொக்கப் பணம் (Cash)',
    gold_916_payment: '916 தங்கம் வரவு (Pure 916 Gold)',
    split_payment: 'ரொக்கம் + 916 தங்கம் சேர்ப்பு',
    pcs: 'எண்ணிக்கை',
    grams: 'கிராம்',
    save: 'சேமிக்க',
    cancel: 'ரத்து செய்',
    print: 'அச்சிடுக (Print)',
    download_pdf: 'PDF தரவிறக்கம்',
    whatsapp_share: 'வாட்ஸ்அப் அனுப்புக',
  },
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  t: (key: keyof Translations) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('sampath_language');
    return (saved as Language) || 'en';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('sampath_language', lang);
  };

  const toggleLanguage = () => {
    const newLang = language === 'en' ? 'ta' : 'en';
    setLanguage(newLang);
  };

  const t = (key: keyof Translations): string => {
    return translations[language][key] || translations['en'][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

export const useTranslation = useLanguage;
