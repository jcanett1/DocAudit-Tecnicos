-- Migración para marcar órdenes GOLF TOWN en public.dotaudit
-- Ejecutar en Supabase SQL Editor.

ALTER TABLE public.dotaudit
ADD COLUMN IF NOT EXISTS golftow BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN public.dotaudit.golftow IS
'Indica si la orden corresponde a GOLF TOWN';

-- Backfill opcional para registros históricos cuyo número de orden ya contiene
-- el texto GOLF TOWN. Ejecútalo solamente si deseas marcar esos registros existentes.
-- UPDATE public.dotaudit
-- SET golftow = TRUE
-- WHERE UPPER(COALESCE(order_number, '')) LIKE '%GOLF TOWN%';
