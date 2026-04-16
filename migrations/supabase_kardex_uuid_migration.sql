-- 1. Añadir nueva columna UUID
ALTER TABLE public.kardex ADD COLUMN new_id uuid DEFAULT gen_random_uuid();

-- 2. Actualizar las referencias y asegurar compatibilidad
ALTER TABLE public.kardex DROP CONSTRAINT kardex_pkey;
ALTER TABLE public.kardex ADD PRIMARY KEY (new_id);

-- 3. Eliminar la columna vieja y renombrar
ALTER TABLE public.kardex DROP COLUMN id;
ALTER TABLE public.kardex RENAME COLUMN new_id TO id;
