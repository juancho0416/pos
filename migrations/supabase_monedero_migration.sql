-- 1. Añadir columna saldo_monedero a la tabla clientes
ALTER TABLE public.clientes 
ADD COLUMN IF NOT EXISTS saldo_monedero NUMERIC(10, 2) DEFAULT 0.00;

-- 2. Crear tabla de configuraciones globales del sistema (si no existe)
CREATE TABLE IF NOT EXISTS public.configuraciones_sistema (
    llave TEXT PRIMARY KEY,
    valor TEXT NOT NULL,
    descripcion TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Habilitar RLS en configuraciones_sistema
ALTER TABLE public.configuraciones_sistema ENABLE ROW LEVEL SECURITY;

-- 4. Políticas para configuraciones_sistema (Todos pueden leer, solo autenticados/admins pueden modificar)
-- Lectura pública o para usuarios autenticados
CREATE POLICY "Permitir lectura de configuraciones a usuarios autenticados" 
ON public.configuraciones_sistema FOR SELECT 
TO authenticated 
USING (true);

-- Modificación (asumiendo que confían en authenticated para simplificar, o ajustar a roles admin si existe)
CREATE POLICY "Permitir actualizacion a usuarios autenticados" 
ON public.configuraciones_sistema FOR UPDATE 
TO authenticated 
USING (true)
WITH CHECK (true);

CREATE POLICY "Permitir insercion a usuarios autenticados" 
ON public.configuraciones_sistema FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- 5. Insertar el valor inicial del porcentaje del monedero (Por defecto 2% = 0.02)
INSERT INTO public.configuraciones_sistema (llave, valor, descripcion)
VALUES ('porcentaje_monedero', '0.02', 'Porcentaje de dinero electrónico otorgado en ventas de contado (ej. 0.02 = 2%)')
ON CONFLICT (llave) DO NOTHING;
