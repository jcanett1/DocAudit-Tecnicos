-- Migración para TOLERANCIA / ALLOWANCE y lecturas por palo.
-- Ejecutar en Supabase SQL Editor ANTES de desplegar la versión nueva del frontend.
-- No se realiza backfill: las auditorías históricas quedan con allowance_found = FALSE
-- porque no se puede inferir retrospectivamente si fueron revisadas bajo allowance.

ALTER TABLE public.dotaudit
    ADD COLUMN IF NOT EXISTS allowance_found BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS allowance_loft_lie BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS allowance_swing_weight BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN public.dotaudit.allowance_found IS
    'Indica si la auditoría fue revisada bajo TOLERANCIA / ALLOWANCE';
COMMENT ON COLUMN public.dotaudit.allowance_loft_lie IS
    'Indica que Loft & Lie fue revisado bajo TOLERANCIA / ALLOWANCE';
COMMENT ON COLUMN public.dotaudit.allowance_swing_weight IS
    'Indica que Swing Weight fue revisado bajo TOLERANCIA / ALLOWANCE';

CREATE TABLE IF NOT EXISTS public.dotaudit_measurements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dotaudit_id UUID NOT NULL REFERENCES public.dotaudit(id) ON DELETE CASCADE,
    club_slot SMALLINT NOT NULL CHECK (club_slot BETWEEN 1 AND 9),
    required_loft NUMERIC(6, 2),
    actual_loft NUMERIC(6, 2),
    required_lie NUMERIC(6, 2),
    actual_lie NUMERIC(6, 2),
    required_swing_weight VARCHAR(12),
    actual_swing_weight VARCHAR(12),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_dotaudit_measurements_audit_slot UNIQUE (dotaudit_id, club_slot)
);

CREATE INDEX IF NOT EXISTS idx_dotaudit_measurements_audit_id
    ON public.dotaudit_measurements (dotaudit_id);

ALTER TABLE public.dotaudit_measurements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir lectura de mediciones" ON public.dotaudit_measurements;
CREATE POLICY "Permitir lectura de mediciones"
    ON public.dotaudit_measurements FOR SELECT USING (true);

DROP POLICY IF EXISTS "Permitir inserción de mediciones" ON public.dotaudit_measurements;
CREATE POLICY "Permitir inserción de mediciones"
    ON public.dotaudit_measurements FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir actualización de mediciones" ON public.dotaudit_measurements;
CREATE POLICY "Permitir actualización de mediciones"
    ON public.dotaudit_measurements FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir eliminación de mediciones" ON public.dotaudit_measurements;
CREATE POLICY "Permitir eliminación de mediciones"
    ON public.dotaudit_measurements FOR DELETE USING (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.dotaudit_measurements TO anon, authenticated;

COMMENT ON TABLE public.dotaudit_measurements IS
    'Mediciones por palo capturadas para errores o TOLERANCIA / ALLOWANCE';
COMMENT ON COLUMN public.dotaudit_measurements.club_slot IS
    'Posición del palo en la matriz (1 a 9)';
COMMENT ON COLUMN public.dotaudit_measurements.required_loft IS
    'Loft requerido para el palo';
COMMENT ON COLUMN public.dotaudit_measurements.actual_loft IS
    'Loft actual medido para el palo';
COMMENT ON COLUMN public.dotaudit_measurements.required_lie IS
    'Lie requerido para el palo';
COMMENT ON COLUMN public.dotaudit_measurements.actual_lie IS
    'Lie actual medido para el palo';
COMMENT ON COLUMN public.dotaudit_measurements.required_swing_weight IS
    'Swing weight requerido para el palo (por ejemplo, D2)';
COMMENT ON COLUMN public.dotaudit_measurements.actual_swing_weight IS
    'Swing weight actual medido para el palo (por ejemplo, D2)';
