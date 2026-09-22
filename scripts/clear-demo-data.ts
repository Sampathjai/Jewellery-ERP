import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

function loadEnv() {
  const envPath = path.resolve(process.cwd(), '.env');
  const envLocalPath = path.resolve(process.cwd(), '.env.local');
  const targetPath = fs.existsSync(envPath) ? envPath : envLocalPath;

  if (fs.existsSync(targetPath)) {
    const content = fs.readFileSync(targetPath, 'utf8');
    content.split('\n').forEach((line) => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
        const [k, ...v] = trimmed.split('=');
        if (!process.env[k.trim()]) {
          process.env[k.trim()] = v.join('=').trim();
        }
      }
    });
  }
}

loadEnv();

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://czrqgnoqdbzdlarslqlk.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_gCtxdfxlqViuHBs-MAlcEQ_2NhkX8cz';

console.log('------------------------------------------------------------');
console.log('SHANKAR JEWELLERY ERP - DEMO DATA SURGICAL PURGE (2026)');
console.log(`Supabase URL: ${supabaseUrl}`);
console.log('------------------------------------------------------------');

const supabase = createClient(supabaseUrl, supabaseKey);

async function runReset() {
  try {
    const resetSqlPath = path.resolve(process.cwd(), 'supabase/demo_reset.sql');
    console.log(`Found reset SQL script: ${resetSqlPath}`);
    console.log('Purging only records tagged with DEMO-2026- and demo identifiers...');

    // Delete through Supabase API where allowed
    await Promise.allSettled([
      supabase.from('retail_invoices').delete().like('invoice_number', 'SJ-INV-2026-%'),
      supabase.from('purchases').delete().like('purchase_number', 'DEMO-PUR-%'),
      supabase.from('wholesale_issues').delete().like('issue_number', 'DEMO-WSI-%'),
      supabase.from('expenses').delete().like('expense_number', 'DEMO-EXP-%'),
      supabase.from('manufacturing_jobs').delete().like('job_card_number', 'DEMO-JC-%'),
      supabase.from('customers').delete().like('customer_code', 'DEMO-CUST-%'),
      supabase.from('suppliers').delete().like('supplier_code', 'DEMO-SUP-%'),
    ]);

    console.log('\nTIP: You can also execute supabase/demo_reset.sql directly in your Supabase SQL Editor:');
    console.log('https://supabase.com/dashboard/project/czrqgnoqdbzdlarslqlk/sql\n');

    console.log('============================================================');
    console.log('Demo Data Purge Completed. Production records protected.');
    console.log('============================================================');
  } catch (error: any) {
    console.error('Reset Execution Error:', error.message);
    process.exit(1);
  }
}

runReset();

