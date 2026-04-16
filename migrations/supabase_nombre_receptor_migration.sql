-- Migración para agregar la columna faltante nombre_receptor a la tabla ventas
-- Este campo es usado por el módulo de logística Ferre-FedEx para saber quién recibe el paquete.

ALTER TABLE ventas ADD COLUMN IF NOT EXISTS nombre_receptor TEXT;
