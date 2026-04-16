-- ========================================================
-- MIGRACIÓN PAPERLESS: Firmas digitales en traslados
-- Ejecutar en Supabase SQL Editor
-- ========================================================

-- 1. Agregar columnas de firma Base64
ALTER TABLE traslados ADD COLUMN IF NOT EXISTS firma_despacho TEXT;
ALTER TABLE traslados ADD COLUMN IF NOT EXISTS firma_recepcion TEXT;

-- 2. Actualizar RPC: despachar_traslado (ahora acepta firma)
CREATE OR REPLACE FUNCTION despachar_traslado(_traslado_id UUID, _usuario_id UUID, _firma TEXT DEFAULT NULL)
RETURNS VOID AS $$
DECLARE
    _item RECORD;
    _traslado RECORD;
    _stock_actual INTEGER;
BEGIN
    SELECT * INTO _traslado FROM traslados WHERE id = _traslado_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Traslado no encontrado';
    END IF;
    
    IF _traslado.estado != 'SOLICITADO' THEN
        RAISE EXCEPTION 'Solo se pueden despachar traslados en estado SOLICITADO (actual: %)', _traslado.estado;
    END IF;
    
    FOR _item IN SELECT ti.*, p.nombre FROM traslado_items ti JOIN productos p ON p.id = ti.producto_id WHERE ti.traslado_id = _traslado_id
    LOOP
        SELECT stock_actual INTO _stock_actual
        FROM inventario
        WHERE producto_id = _item.producto_id AND sucursal_id = _traslado.origen_id;
        
        IF _stock_actual IS NULL OR _stock_actual < _item.cantidad THEN
            RAISE EXCEPTION 'Stock insuficiente de "%" (disponible: %, requerido: %)', _item.nombre, COALESCE(_stock_actual, 0), _item.cantidad;
        END IF;
        
        UPDATE inventario
        SET stock_actual = stock_actual - _item.cantidad
        WHERE producto_id = _item.producto_id AND sucursal_id = _traslado.origen_id;
        
        INSERT INTO kardex (producto_id, sucursal_id, tipo_movimiento, cantidad, saldo_previo, saldo_nuevo, referencia_id, usuario_id)
        VALUES (_item.producto_id, _traslado.origen_id, 'TRASPASO_SALIDA', _item.cantidad, _stock_actual, _stock_actual - _item.cantidad, _traslado_id::text, _usuario_id);
    END LOOP;
    
    UPDATE traslados
    SET estado = 'EN_TRANSITO',
        despachado_por = _usuario_id,
        despachado_at = NOW(),
        firma_despacho = _firma,
        updated_at = NOW()
    WHERE id = _traslado_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Actualizar RPC: recibir_traslado (ahora acepta firma)
CREATE OR REPLACE FUNCTION recibir_traslado(_traslado_id UUID, _usuario_id UUID, _firma TEXT DEFAULT NULL)
RETURNS VOID AS $$
DECLARE
    _item RECORD;
    _traslado RECORD;
    _stock_actual INTEGER;
    _inv_exists BOOLEAN;
BEGIN
    SELECT * INTO _traslado FROM traslados WHERE id = _traslado_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Traslado no encontrado';
    END IF;
    
    IF _traslado.estado != 'EN_TRANSITO' THEN
        RAISE EXCEPTION 'Solo se pueden recibir traslados EN_TRANSITO (actual: %)', _traslado.estado;
    END IF;
    
    FOR _item IN SELECT ti.*, p.nombre FROM traslado_items ti JOIN productos p ON p.id = ti.producto_id WHERE ti.traslado_id = _traslado_id
    LOOP
        SELECT EXISTS(
            SELECT 1 FROM inventario WHERE producto_id = _item.producto_id AND sucursal_id = _traslado.destino_id
        ) INTO _inv_exists;
        
        SELECT COALESCE(stock_actual, 0) INTO _stock_actual
        FROM inventario
        WHERE producto_id = _item.producto_id AND sucursal_id = _traslado.destino_id;
        
        IF NOT _inv_exists THEN
            INSERT INTO inventario (producto_id, sucursal_id, stock_actual, stock_minimo)
            VALUES (_item.producto_id, _traslado.destino_id, _item.cantidad, 0);
            _stock_actual := 0;
        ELSE
            UPDATE inventario
            SET stock_actual = stock_actual + _item.cantidad
            WHERE producto_id = _item.producto_id AND sucursal_id = _traslado.destino_id;
        END IF;
        
        INSERT INTO kardex (producto_id, sucursal_id, tipo_movimiento, cantidad, saldo_previo, saldo_nuevo, referencia_id, usuario_id)
        VALUES (_item.producto_id, _traslado.destino_id, 'TRASPASO_ENTRADA', _item.cantidad, _stock_actual, _stock_actual + _item.cantidad, _traslado_id::text, _usuario_id);
    END LOOP;
    
    UPDATE traslados
    SET estado = 'RECIBIDO',
        recibido_por = _usuario_id,
        recibido_at = NOW(),
        firma_recepcion = _firma,
        updated_at = NOW()
    WHERE id = _traslado_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
