-- Migración final B2B: Módulo de Logística (Despacho de Camionetas)
-- Añade rastreabilidad directa del conductor a la venta corporativa

ALTER TABLE ventas
ADD COLUMN IF NOT EXISTS chofer_id UUID REFERENCES auth.users(id);

-- En caso de no tener auth.users conectado a choferes todavía, 
-- permitimos texto libre temporal para el ID o nombre, o ignoramos el constrain:
-- ALTER TABLE ventas DROP CONSTRAINT IF EXISTS ventas_chofer_id_fkey;
