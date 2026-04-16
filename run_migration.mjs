import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envFile = fs.readFileSync('.env', 'utf-8');
const env = {};
envFile.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) env[parts[0].trim()] = parts.slice(1).join('=').trim();
});

// Since the JS SDK lacks direct SQL DDL execution, we create an HTTP request to the REST API if pgbouncer is off,
// But the Safest and quickest way is actually using a temporary RPC function.

const supabase = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const sql = `
-- Drop existing constraints
ALTER TABLE kardex DROP CONSTRAINT IF EXISTS kardex_pkey CASCADE;
-- Add UUID column
ALTER TABLE kardex ADD COLUMN IF NOT EXISTS uuid_id UUID DEFAULT gen_random_uuid();
-- Swap columns
UPDATE kardex SET uuid_id = gen_random_uuid() WHERE uuid_id IS NULL;
ALTER TABLE kardex DROP COLUMN id CASCADE;
ALTER TABLE kardex RENAME COLUMN uuid_id TO id;
ALTER TABLE kardex ADD PRIMARY KEY (id);
`;

async function run() {
    // If there is no execute_sql RPC, this will fail. Let's gracefully catch and then we might need to ask the user.
    console.log("Attempting migration via RPC...");
    const { data, error } = await supabase.rpc('execute_sql', { sql_query: sql });
    console.log(error ? "RPC Error: " + error.message : "Success via RPC!");
    if (error && error.message.includes('Could not find')) {
        console.log("Note: The 'execute_sql' RPC does not exist. We need the user to run the migration script in their Supabase SQL Editor.");
        fs.writeFileSync('kardex_migracion_uuid.sql', sql);
    }
}
run();
