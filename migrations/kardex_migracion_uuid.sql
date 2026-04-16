
-- Drop existing constraints
ALTER TABLE kardex DROP CONSTRAINT IF EXISTS kardex_pkey CASCADE;
-- Add UUID column
ALTER TABLE kardex ADD COLUMN IF NOT EXISTS uuid_id UUID DEFAULT gen_random_uuid();
-- Swap columns
UPDATE kardex SET uuid_id = gen_random_uuid() WHERE uuid_id IS NULL;
ALTER TABLE kardex DROP COLUMN id CASCADE;
ALTER TABLE kardex RENAME COLUMN uuid_id TO id;
ALTER TABLE kardex ADD PRIMARY KEY (id);
