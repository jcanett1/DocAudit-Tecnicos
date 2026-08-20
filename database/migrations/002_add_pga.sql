-- Agregar la marca PGA a una tabla dotaudit existente.
-- Ejecutar en Supabase SQL Editor.

ALTER TABLE public.dotaudit
ADD COLUMN IF NOT EXISTS pga BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN public.dotaudit.pga IS
'Indica si la orden corresponde a PGA';

-- Las filas existentes quedan en FALSE automáticamente por el DEFAULT.
-- No se ejecuta backfill porque no se debe inferir PGA desde otros campos.
