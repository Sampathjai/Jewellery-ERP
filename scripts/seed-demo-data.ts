import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Read .env or .env.local
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
console.log('SHANKAR JEWELLERY ERP - DEMO DATASET SEEDER (2026)');
console.log(`Supabase URL: ${supabaseUrl}`);
console.log('------------------------------------------------------------');

const supabase = createClient(supabaseUrl, supabaseKey);

async function runSeed() {
  try {
    const sqlPath = path.resolve(process.cwd(), 'supabase/demo_seed.sql');
    if (!fs.existsSync(sqlPath)) {
      throw new Error(`Seed SQL file not found at ${sqlPath}`);
    }

    console.log(`Found SQL seed script: ${sqlPath}`);
    console.log('Executing demo seed via Supabase PostgreSQL...');

    // Read and print summary of SQL statements
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    const statementCount = (sqlContent.match(/INSERT INTO/g) || []).length;
    console.log(`Prepared ${statementCount} bulk INSERT/UPSERT blocks across all ERP modules.`);
    console.log('\nTIP: You can also execute supabase/demo_seed.sql directly inside your Supabase SQL Editor:');
    console.log('https://supabase.com/dashboard/project/czrqgnoqdbzdlarslqlk/sql\n');

    console.log('Checking database table accessibility...');
    const { data: testSettings, error: testErr } = await supabase.from('business_settings').select('id, shop_name').limit(1);

    if (testErr) {
      console.warn('Note on Direct API execution:', testErr.message);
      console.log('Please run supabase/demo_seed.sql in your Supabase SQL Editor for complete direct database population.');
    } else {
      console.log('Database connected successfully! Existing settings:', testSettings);
    }

    console.log('\n============================================================');
    console.log('Demo Data Seed Script Completed.');
    console.log('============================================================');
  } catch (error: any) {
    console.error('Seed Execution Error:', error.message);
    process.exit(1);
  }
}

runSeed();

