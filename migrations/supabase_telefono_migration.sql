-- ========================================================
-- INTELIGENCIA DE TRASPASOS: Teléfono de encargado
-- Ejecutar en Supabase SQL Editor
-- ========================================================

ALTER TABLE sucursales ADD COLUMN IF NOT EXISTS telefono_encargado TEXT;

-- Ejemplo de uso:
-- UPDATE sucursales SET telefono_encargado = '5215512345678' WHERE nombre = 'Sucursal Centro';
-- Formato: código de país + número (sin +), ej: 5215512345678 para México
