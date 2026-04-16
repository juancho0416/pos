-- Final Addendum for Ventas Table: Add missing items column
-- Fix for PGRST204: Could not find the 'items' column of 'ventas'

ALTER TABLE ventas
ADD COLUMN IF NOT EXISTS items JSONB DEFAULT '[]'::jsonb;
