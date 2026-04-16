-- Final Addendum: Add missing RFC column to Clientes
-- Fix for PGRST204: Could not find the 'rfc' column

ALTER TABLE clientes
ADD COLUMN IF NOT EXISTS rfc VARCHAR(20);
