-- ═══════════════════════════════════════════════════
-- Migración: Tabla de Gastos Operativos
-- Ejecutar en Supabase SQL Editor
-- ═══════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS gastos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sucursal_id UUID REFERENCES sucursales(id),
    usuario_id UUID REFERENCES auth.users(id),
    categoria TEXT NOT NULL DEFAULT 'OTROS',
    concepto TEXT NOT NULL,
    monto NUMERIC(12,2) NOT NULL DEFAULT 0,
    metodo_pago TEXT NOT NULL DEFAULT 'EFECTIVO',
    es_recurrente INTEGER NOT NULL DEFAULT 0,
    proveedor TEXT,
    comprobante_ref TEXT,
    fecha_gasto TEXT NOT NULL DEFAULT (to_char(now(), 'YYYY-MM-DD')),
    notas TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para consultas rápidas
CREATE INDEX IF NOT EXISTS idx_gastos_sucursal ON gastos(sucursal_id);
CREATE INDEX IF NOT EXISTS idx_gastos_fecha ON gastos(fecha_gasto);
CREATE INDEX IF NOT EXISTS idx_gastos_categoria ON gastos(categoria);

-- RLS (Row Level Security)
ALTER TABLE gastos ENABLE ROW LEVEL SECURITY;

-- Política: Usuarios autenticados pueden leer/insertar/actualizar
CREATE POLICY "gastos_select" ON gastos FOR SELECT TO authenticated USING (true);
CREATE POLICY "gastos_insert" ON gastos FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "gastos_update" ON gastos FOR UPDATE TO authenticated USING (true);
CREATE POLICY "gastos_delete" ON gastos FOR DELETE TO authenticated USING (true);

-- ═══════════════════════════════════════════════════
-- IMPORTANTE: Agregar a tus Sync Rules de PowerSync:
--   bucket_definitions:
--     gastos:
--       queries:
--         - SELECT * FROM gastos
-- ═══════════════════════════════════════════════════
