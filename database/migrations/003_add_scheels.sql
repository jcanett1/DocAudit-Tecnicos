-- Agregar la marca SCHEELS a una tabla dotaudit existente.
-- Ejecutar una sola vez en el SQL Editor de Supabase.

ALTER TABLE public.dotaudit
ADD COLUMN IF NOT EXISTS scheels BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN public.dotaudit.scheels IS
'Indica si la orden corresponde a SCHEELS';

-- No se realiza backfill porque la marca no debe inferirse para registros históricos.
