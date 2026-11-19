-- Añade un nombre o número editable para identificar cada palo en las matrices.
-- Es aditiva: conserva todas las lecturas existentes.

ALTER TABLE public.dotaudit_measurements
    ADD COLUMN IF NOT EXISTS club_label VARCHAR(40);

COMMENT ON COLUMN public.dotaudit_measurements.club_label IS
    'Nombre o número personalizado del palo (p. ej., GC 1, Driver o 7-iron)';
