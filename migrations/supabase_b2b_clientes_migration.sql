-- Migration: Add B2B Financial Columns to Clientes Table
-- Purpose: To support the B2B CRM and Fulfillment Center logic directly on the DB

ALTER TABLE clientes
ADD COLUMN IF NOT EXISTS limite_credito NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS saldo_deudor NUMERIC DEFAULT 0;

-- Optionally, add role enumeration handling if it's strict, but for now 
-- 'MAYORISTA' is treated as a standard text/varchar field in the front-end logic.
-- If 'rol' doesn't exist either:
ALTER TABLE clientes
ADD COLUMN IF NOT EXISTS rol VARCHAR(50) DEFAULT 'MENUDEO';

-- Also ensure 'nombre_empresa' exists (often missing in retail-first setups)
ALTER TABLE clientes
ADD COLUMN IF NOT EXISTS nombre_empresa VARCHAR(255);
