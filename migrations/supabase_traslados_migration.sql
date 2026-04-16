-- ========================================================
-- FLUJO PRO DE TRASPASOS: Petición → Despacho → Recepción
-- Ejecutar en Supabase SQL Editor
-- ★ CORREGIDO: sucursales.id es UUID, productos.id es INTEGER
-- ========================================================

-- 1. Tabla de Traslados (Cabecera)
CREATE TABLE IF NOT EXISTS traslados (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    folio SERIAL,
    origen_id UUID NOT NULL REFERENCES sucursales(id),
    destino_id UUID NOT NULL REFERENCES sucursales(id),
    estado TEXT NOT NULL DEFAULT 'SOLICITADO' CHECK (estado IN ('SOLICITADO', 'EN_TRANSITO', 'RECIBIDO', 'CANCELADO')),
    solicitado_por UUID REFERENCES auth.users(id),
    despachado_por UUID REFERENCES auth.users(id),
    recibido_por UUID REFERENCES auth.users(id),
    notas TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    despachado_at TIMESTAMPTZ,
    recibido_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabla de Items del Traslado
CREATE TABLE IF NOT EXISTS traslado_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    traslado_id UUID NOT NULL REFERENCES traslados(id) ON DELETE CASCADE,
    producto_id INTEGER NOT NULL REFERENCES productos(id),
    cantidad INTEGER NOT NULL CHECK (cantidad > 0)
);

-- 3. Índices para consultas frecuentes
CREATE INDEX IF NOT EXISTS idx_traslados_estado ON traslados(estado);
CREATE INDEX IF NOT EXISTS idx_traslados_origen ON traslados(origen_id);
CREATE INDEX IF NOT EXISTS idx_traslados_destino ON traslados(destino_id);
CREATE INDEX IF NOT EXISTS idx_traslado_items_traslado ON traslado_items(traslado_id);

-- 4. RPC: Despachar Traslado (Sucursal Origen aprueba y resta stock)
CREATE OR REPLACE FUNCTION despachar_traslado(_traslado_id UUID, _usuario_id UUID)
RETURNS VOID AS $$
DECLARE
    _item RECORD;
    _traslado RECORD;
    _stock_actual INTEGER;
BEGIN
    -- Obtener el traslado
    SELECT * INTO _traslado FROM traslados WHERE id = _traslado_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Traslado no encontrado';
    END IF;
    
    IF _traslado.estado != 'SOLICITADO' THEN
        RAISE EXCEPTION 'Solo se pueden despachar traslados en estado SOLICITADO (actual: %)', _traslado.estado;
    END IF;
    
    -- Validar y restar stock de cada item
    FOR _item IN SELECT ti.*, p.nombre FROM traslado_items ti JOIN productos p ON p.id = ti.producto_id WHERE ti.traslado_id = _traslado_id
    LOOP
        -- Obtener stock actual en origen
        SELECT stock_actual INTO _stock_actual
        FROM inventario
        WHERE producto_id = _item.producto_id AND sucursal_id = _traslado.origen_id;
        
        IF _stock_actual IS NULL OR _stock_actual < _item.cantidad THEN
            RAISE EXCEPTION 'Stock insuficiente de "%" (disponible: %, requerido: %)', _item.nombre, COALESCE(_stock_actual, 0), _item.cantidad;
        END IF;
        
        -- Restar stock de origen
        UPDATE inventario
        SET stock_actual = stock_actual - _item.cantidad
        WHERE producto_id = _item.producto_id AND sucursal_id = _traslado.origen_id;
        
        -- Kardex de salida en origen
        INSERT INTO kardex (producto_id, sucursal_id, tipo_movimiento, cantidad, saldo_previo, saldo_nuevo, referencia_id, usuario_id)
        VALUES (_item.producto_id, _traslado.origen_id, 'TRASPASO_SALIDA', _item.cantidad, _stock_actual, _stock_actual - _item.cantidad, _traslado_id::text, _usuario_id);
    END LOOP;
    
    -- Actualizar estado
    UPDATE traslados
    SET estado = 'EN_TRANSITO',
        despachado_por = _usuario_id,
        despachado_at = NOW(),
        updated_at = NOW()
    WHERE id = _traslado_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. RPC: Recibir Traslado (Sucursal Destino confirma y suma stock)
CREATE OR REPLACE FUNCTION recibir_traslado(_traslado_id UUID, _usuario_id UUID)
RETURNS VOID AS $$
DECLARE
    _item RECORD;
    _traslado RECORD;
    _stock_actual INTEGER;
    _inv_exists BOOLEAN;
BEGIN
    -- Obtener el traslado
    SELECT * INTO _traslado FROM traslados WHERE id = _traslado_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Traslado no encontrado';
    END IF;
    
    IF _traslado.estado != 'EN_TRANSITO' THEN
        RAISE EXCEPTION 'Solo se pueden recibir traslados EN_TRANSITO (actual: %)', _traslado.estado;
    END IF;
    
    -- Sumar stock a destino para cada item
    FOR _item IN SELECT ti.*, p.nombre FROM traslado_items ti JOIN productos p ON p.id = ti.producto_id WHERE ti.traslado_id = _traslado_id
    LOOP
        -- Verificar si existe inventario en destino
        SELECT EXISTS(
            SELECT 1 FROM inventario WHERE producto_id = _item.producto_id AND sucursal_id = _traslado.destino_id
        ) INTO _inv_exists;
        
        -- Obtener stock actual (puede ser NULL si no existe)
        SELECT COALESCE(stock_actual, 0) INTO _stock_actual
        FROM inventario
        WHERE producto_id = _item.producto_id AND sucursal_id = _traslado.destino_id;
        
        IF NOT _inv_exists THEN
            -- No existe registro de inventario en destino → crear
            INSERT INTO inventario (producto_id, sucursal_id, stock_actual, stock_minimo)
            VALUES (_item.producto_id, _traslado.destino_id, _item.cantidad, 0);
            _stock_actual := 0;
        ELSE
            -- Sumar stock en destino
            UPDATE inventario
            SET stock_actual = stock_actual + _item.cantidad
            WHERE producto_id = _item.producto_id AND sucursal_id = _traslado.destino_id;
        END IF;
        
        -- Kardex de entrada en destino
        INSERT INTO kardex (producto_id, sucursal_id, tipo_movimiento, cantidad, saldo_previo, saldo_nuevo, referencia_id, usuario_id)
        VALUES (_item.producto_id, _traslado.destino_id, 'TRASPASO_ENTRADA', _item.cantidad, _stock_actual, _stock_actual + _item.cantidad, _traslado_id::text, _usuario_id);
    END LOOP;
    
    -- Actualizar estado
    UPDATE traslados
    SET estado = 'RECIBIDO',
        recibido_por = _usuario_id,
        recibido_at = NOW(),
        updated_at = NOW()
    WHERE id = _traslado_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. RLS (Row Level Security)
ALTER TABLE traslados ENABLE ROW LEVEL SECURITY;
ALTER TABLE traslado_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Todos pueden ver traslados" ON traslados FOR SELECT USING (true);
CREATE POLICY "Usuarios autenticados crean traslados" ON traslados FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Usuarios autenticados actualizan traslados" ON traslados FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Todos pueden ver items de traslado" ON traslado_items FOR SELECT USING (true);
CREATE POLICY "Usuarios autenticados crean items" ON traslado_items FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
