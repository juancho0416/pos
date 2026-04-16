-- Final Comprehensive Patch for Ventas Table for B2B Operations
-- Fixes PGRST204 errors regarding missing columns when checking out

ALTER TABLE ventas
ADD COLUMN IF NOT EXISTS tipo_venta VARCHAR(20) DEFAULT 'MENUDEO',
ADD COLUMN IF NOT EXISTS metodo_pago VARCHAR(20) DEFAULT 'EFECTIVO',
ADD COLUMN IF NOT EXISTS estado_entrega VARCHAR(20) DEFAULT 'ENTREGADO',
ADD COLUMN IF NOT EXISTS metodo_entrega VARCHAR(20) DEFAULT 'SUCURSAL',
ADD COLUMN IF NOT EXISTS direccion_entrega TEXT,
ADD COLUMN IF NOT EXISTS nombre_receptor VARCHAR(255),
ADD COLUMN IF NOT EXISTS items JSONB DEFAULT '[]'::jsonb;
