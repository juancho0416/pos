-- ========================================================
-- ACTUALIZACIÓN: MÓDULO DE LOGÍSTICA DE ENTREGAS
-- Agregar firma del chofer a nivel de venta/viaje
-- Ejecutar en Supabase SQL Editor
-- ========================================================

ALTER TABLE ventas ADD COLUMN IF NOT EXISTS firma_chofer_salida TEXT;
