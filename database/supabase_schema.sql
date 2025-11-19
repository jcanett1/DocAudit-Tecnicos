-- Esquema para la tabla de auditoría de equipos de golf
-- Para ejecutar en Supabase SQL Editor

-- Crear la tabla dotaudit
CREATE TABLE IF NOT EXISTS public.dotaudit (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    checked_by VARCHAR(50) NOT NULL CHECK (checked_by IN ('Karla', 'Adrián', 'Carmen')),
    audit_date DATE NOT NULL,
    build_cell VARCHAR(20) NOT NULL CHECK (build_cell IN ('5', '10', '11', '15', '16', 'kiteo', 'otras')),
    operadores VARCHAR(100),
    order_number VARCHAR(50),
    sh VARCHAR(20),
    qty_of_gc_in_order INTEGER,
    errors_found BOOLEAN NOT NULL,
    gc_with_errors INTEGER,
    -- Error types per GC (valores 0-4)
    components_error INTEGER DEFAULT 0 CHECK (components_error >= 0 AND components_error <= 4),
    tipping_error INTEGER DEFAULT 0 CHECK (tipping_error >= 0 AND tipping_error <= 4),
    hosel_setting_error INTEGER DEFAULT 0 CHECK (hosel_setting_error >= 0 AND hosel_setting_error <= 4),
    shaft_stepping_error INTEGER DEFAULT 0 CHECK (shaft_stepping_error >= 0 AND shaft_stepping_error <= 4),
    wood_putter_weights_error INTEGER DEFAULT 0 CHECK (wood_putter_weights_error >= 0 AND wood_putter_weights_error <= 4),
    club_length_error INTEGER DEFAULT 0 CHECK (club_length_error >= 0 AND club_length_error <= 4),
    shaft_alignment_error INTEGER DEFAULT 0 CHECK (shaft_alignment_error >= 0 AND shaft_alignment_error <= 4),
    ferrules_error INTEGER DEFAULT 0 CHECK (ferrules_error >= 0 AND ferrules_error <= 4),
    loft_error INTEGER DEFAULT 0 CHECK (loft_error >= 0 AND loft_error <= 4),
    lie_error INTEGER DEFAULT 0 CHECK (lie_error >= 0 AND lie_error <= 4),
    grip_alignment_error INTEGER DEFAULT 0 CHECK (grip_alignment_error >= 0 AND grip_alignment_error <= 4),
    grip_length_error INTEGER DEFAULT 0 CHECK (grip_length_error >= 0 AND grip_length_error <= 4),
    wraps_error INTEGER DEFAULT 0 CHECK (wraps_error >= 0 AND wraps_error <= 4),
    swing_weight_error INTEGER DEFAULT 0 CHECK (swing_weight_error >= 0 AND swing_weight_error <= 4),
    cleanliness_error INTEGER DEFAULT 0 CHECK (cleanliness_error >= 0 AND cleanliness_error <= 4),
    boxing_error INTEGER DEFAULT 0 CHECK (boxing_error >= 0 AND boxing_error <= 4),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_dotaudit_audit_date ON public.dotaudit(audit_date);
CREATE INDEX IF NOT EXISTS idx_dotaudit_checked_by ON public.dotaudit(checked_by);
CREATE INDEX IF NOT EXISTS idx_dotaudit_build_cell ON public.dotaudit(build_cell);
CREATE INDEX IF NOT EXISTS idx_dotaudit_order_number ON public.dotaudit(order_number);

-- Función para actualizar el campo updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para actualizar updated_at automáticamente
CREATE TRIGGER update_dotaudit_updated_at 
    BEFORE UPDATE ON public.dotaudit 
    FOR EACH ROW 
    EXECUTE FUNCTION public.update_updated_at_column();

-- Habilitar Row Level Security (RLS)
ALTER TABLE public.dotaudit ENABLE ROW LEVEL SECURITY;

-- Políticas de seguridad (ajustar según necesidades)
CREATE POLICY "Habilitar lectura para todos" ON public.dotaudit
    FOR SELECT USING (true);

CREATE POLICY "Habilitar inserción para todos" ON public.dotaudit
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Habilitar actualización para todos" ON public.dotaudit
    FOR UPDATE USING (true);

CREATE POLICY "Habilitar eliminación para todos" ON public.dotaudit
    FOR DELETE USING (true);

-- Comentarios para documentar la tabla
COMMENT ON TABLE public.dotaudit IS 'Tabla para auditoría de equipos de golf';
COMMENT ON COLUMN public.dotaudit.checked_by IS 'Auditor que revisó el equipo';
COMMENT ON COLUMN public.dotaudit.audit_date IS 'Fecha de la auditoría';
COMMENT ON COLUMN public.dotaudit.build_cell IS 'Número de celda donde se construyó el equipo';
COMMENT ON COLUMN public.dotaudit.errors_found IS 'Indica si se encontraron errores';
COMMENT ON COLUMN public.dotaudit.gc_with_errors IS 'Cantidad de palos de golf con errores';
COMMENT ON COLUMN public.dotaudit.notes IS 'Notas adicionales sobre la auditoría';