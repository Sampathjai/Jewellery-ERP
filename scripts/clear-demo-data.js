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
console.log('SHANKAR JEWELLERY ERP - DEMO DATA SURGICAL PURGE (2026)');
console.log(`Supabase Project: ${supabaseUrl}`);
console.log('============================================================');

async function runReset() {
  const resetSqlPath = path.resolve(projectRoot, 'supabase/demo_reset.sql');
  console.log(`[✓] Reset SQL File: ${resetSqlPath}`);
  console.log('\n[!] HOW TO PURGE DEMO DATA IN SUPABASE:');
  console.log('    1. Open your Supabase SQL Editor:');
  console.log('       https://supabase.com/dashboard/project/czrqgnoqdbzdlarslqlk/sql');
  console.log('    2. Copy & paste the contents of:');
  console.log(`       ${resetSqlPath}`);
  console.log('    3. Click "Run" to safely remove ONLY demo records.');
  console.log('       (Real customer data and production settings are protected.)');
  console.log('\n[!] IN-APP ALTERNATIVE:');
  console.log('    You can also open the live web app, go to Settings -> Database Maintenance,');
  console.log('    and click "Reset to Clean Production Data" to purge demo records.\n');
}

runReset();

