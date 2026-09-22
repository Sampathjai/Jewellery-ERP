import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

function loadEnv() {
  const envPath = path.resolve(projectRoot, '.env');
  const envLocalPath = path.resolve(projectRoot, '.env.local');
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

console.log('============================================================');
console.log('SHANKAR JEWELLERY ERP - DEMO DATASET SEED ENGINE (2026)');
console.log(`Supabase Project: ${supabaseUrl}`);
console.log('============================================================');

const supabase = createClient(supabaseUrl, supabaseKey);

async function runSeed() {
  const sqlPath = path.resolve(projectRoot, 'supabase/demo_seed.sql');
  if (!fs.existsSync(sqlPath)) {
    console.error(`Error: Seed SQL file not found at ${sqlPath}`);
    process.exit(1);
  }

  const sqlContent = fs.readFileSync(sqlPath, 'utf8');
  const insertCount = (sqlContent.match(/INSERT INTO/g) || []).length;
  console.log(`[✓] SQL Seed File: ${sqlPath}`);
  console.log(`[✓] Modules Covered: ${insertCount} bulk INSERT / UPSERT blocks`);
  console.log('    - business_settings: Shankar Jewellers (Trichy, Tamil Nadu)');
  console.log('    - profiles: 5 Roles (Admin, Manager, Billing Staff, Accountant)');
  console.log('    - metal_rates: 16 Daily Market Rate milestones (June - Sept 2026)');
  console.log('    - product_categories: 20 Categories (Gold, Silver, Diamond, Coins)');
  console.log('    - suppliers: 10 Bullion & Goldsmith wholesale vendors');
  console.log('    - customers: 32 Retail and Wholesale accounts');
  console.log('    - products: 42 Hallmarked Jewellery Catalog products');
  console.log('    - purchases: 18 Raw metal & Bullion purchases (~₹30L+ total)');
  console.log('    - retail_invoices: 38 Retail Invoices (Including ~₹10.45L Hero bill)');
  console.log('    - retail_payments: Multi-mode split, UPI, Card, Old Gold Exchange');
  console.log('    - wholesale_issues: Consignment issues & settlement records');
  console.log('    - manufacturing_jobs: 6 Goldsmith production job cards');
  console.log('    - expenses: 14 Operational expenses (Rent, Electricity, Labour)');
  console.log('    - inventory_movements: Auditable stock movement transactions');

  console.log('\n[!] HOW TO APPLY TO SUPABASE DATABASE:');
  console.log('    1. Open your Supabase SQL Editor:');
  console.log('       https://supabase.com/dashboard/project/czrqgnoqdbzdlarslqlk/sql');
  console.log('    2. Copy & paste the contents of:');
  console.log(`       ${sqlPath}`);
  console.log('    3. Click "Run" to seed all records idempotently.');
  console.log('\n[!] IN-APP ALTERNATIVE:');
  console.log('    You can also open the live web app, go to Settings -> Database Maintenance,');
  console.log('    and click "Reload Demo Test Seed" to load the dataset directly.\n');
}

runSeed();

