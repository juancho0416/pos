-- Migration Addendum: Add missing contact columns to Clientes
-- Fix for PGRST204: Could not find the 'direccion' column

ALTER TABLE clientes
ADD COLUMN IF NOT EXISTS direccion TEXT,
ADD COLUMN IF NOT EXISTS telefono VARCHAR(50),
ADD COLUMN IF NOT EXISTS email VARCHAR(255);

-- Ensure previous columns exist just in case
ALTER TABLE clientes
ADD COLUMN IF NOT EXISTS limite_credito NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS saldo_deudor NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS rol VARCHAR(50) DEFAULT 'MENUDEO',
ADD COLUMN IF NOT EXISTS nombre_empresa VARCHAR(255);
