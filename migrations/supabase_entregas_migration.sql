-- ========================================================
-- MÓDULO DE LOGÍSTICA DE ENTREGAS (FERRE-FEDEX)
-- Ejecutar en Supabase SQL Editor
-- ========================================================

-- 1. Tabla de Viajes (agrupa entregas en un camión)
CREATE TABLE IF NOT EXISTS viajes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chofer_id UUID REFERENCES auth.users(id),
    chofer_nombre TEXT,
    vehiculo TEXT,
    estado TEXT NOT NULL DEFAULT 'PREPARANDO' CHECK (estado IN ('PREPARANDO', 'EN_RUTA', 'FINALIZADO')),
    sucursal_id UUID REFERENCES sucursales(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    finalizado_at TIMESTAMPTZ
);

-- 2. Columnas de entrega en ventas
ALTER TABLE ventas ADD COLUMN IF NOT EXISTS metodo_entrega TEXT DEFAULT 'MOSTRADOR';
ALTER TABLE ventas ADD COLUMN IF NOT EXISTS estado_entrega TEXT DEFAULT 'PENDIENTE';
ALTER TABLE ventas ADD COLUMN IF NOT EXISTS direccion_entrega TEXT;
ALTER TABLE ventas ADD COLUMN IF NOT EXISTS telefono_entrega TEXT;
ALTER TABLE ventas ADD COLUMN IF NOT EXISTS firma_cliente_recibido TEXT;
ALTER TABLE ventas ADD COLUMN IF NOT EXISTS viaje_id UUID REFERENCES viajes(id);
ALTER TABLE ventas ADD COLUMN IF NOT EXISTS entregado_at TIMESTAMPTZ;
ALTER TABLE ventas ADD COLUMN IF NOT EXISTS cobro_confirmado BOOLEAN DEFAULT FALSE;

-- 3. Índices
CREATE INDEX IF NOT EXISTS idx_ventas_metodo_entrega ON ventas(metodo_entrega);
CREATE INDEX IF NOT EXISTS idx_ventas_estado_entrega ON ventas(estado_entrega);
CREATE INDEX IF NOT EXISTS idx_ventas_viaje ON ventas(viaje_id);
CREATE INDEX IF NOT EXISTS idx_viajes_chofer ON viajes(chofer_id);
CREATE INDEX IF NOT EXISTS idx_viajes_estado ON viajes(estado);

-- 4. RLS
ALTER TABLE viajes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Todos pueden ver viajes" ON viajes FOR SELECT USING (true);
CREATE POLICY "Usuarios autenticados crean viajes" ON viajes FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Usuarios autenticados actualizan viajes" ON viajes FOR UPDATE USING (auth.uid() IS NOT NULL);
