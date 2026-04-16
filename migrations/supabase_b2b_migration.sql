-- Migración de Base de Datos para Ecosistema B2B (Mayoreo)
-- Objetivo: Añadir una columna de "tipo_venta" para discriminar las ventas del POS local vs las del Portal B2B.

-- 1. Agregar columna tipo_venta a la tabla ventas con valor por defecto 'MENUDEO'
ALTER TABLE ventas 
ADD COLUMN IF NOT EXISTS tipo_venta TEXT DEFAULT 'MENUDEO';

-- 2. Asegurar que las ventas existentes mantengan el valor 'MENUDEO' en caso de que su default no se aplique retroactivamente a filas viejas
UPDATE ventas
SET tipo_venta = 'MENUDEO'
WHERE tipo_venta IS NULL;

-- 3. (Opcional) Crear un índice para acelerar consultas analíticas cuando la administración quiera filtrar solo las ventas B2B
CREATE INDEX IF NOT EXISTS idx_ventas_tipo_venta ON ventas(tipo_venta);

-- Finalizado con éxito.
