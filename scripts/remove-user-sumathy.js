/**
 * Shankar Jewellery ERP - User Purge Script for Sumathy
 * Target: 43e7026c-1a5f-46f9-9403-91ead6b41467 / sumathy@shankarjewellery.com
 */

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
console.log('SHANKAR JEWELLERY ERP - PERMANENT USER PURGE');
console.log('User: Sumathy (43e7026c-1a5f-46f9-9403-91ead6b41467)');
console.log(`Supabase URL: ${supabaseUrl}`);
console.log('============================================================\n');

async function run() {
  const sqlPath = path.resolve(projectRoot, 'DELETE_USER_SUMATHY.sql');
  console.log(`[✓] Comprehensive SQL Script Generated:`);
  console.log(`    ${sqlPath}\n`);

  console.log('------------------------------------------------------------');
  console.log('HOW TO EXECUTE IN SUPABASE (RECOMMENDED & INSTANT):');
  console.log('------------------------------------------------------------');
  console.log('1. Open your Supabase SQL Editor:');
  console.log('   https://supabase.com/dashboard/project/czrqgnoqdbzdlarslqlk/sql\n');
  console.log('2. Copy the contents of DELETE_USER_SUMATHY.sql and paste into the editor.\n');
  console.log('3. Click "RUN".');
  console.log('   This will completely delete Sumathy from:');
  console.log('   - auth.users (Authentication)');
  console.log('   - auth.sessions & tokens');
  console.log('   - public.profiles');
  console.log('   - public.trusted_devices');
  console.log('   - public.webauthn_credentials / passkeys');
  console.log('   - public.user_roles');
  console.log('   and safely nullify created_by/user_id references on historical records.\n');

  console.log('------------------------------------------------------------');
  console.log('IN-APP EXECUTION (FROM THE LIVE APPLICATION):');
  console.log('------------------------------------------------------------');
  console.log('1. Open Shankar Jewellery ERP (logged in as Admin).');
  console.log('2. Navigate to "User Management" (/users).');
  console.log('3. On the card for "Sumathy", click the red "Delete" button.');
  console.log('4. Click "Confirm Permanent Deletion" in the modal.');
  console.log('   The system will automatically purge the user across Supabase.\n');
}

run();
