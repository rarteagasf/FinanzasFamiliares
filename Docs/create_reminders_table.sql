-- Script para crear la tabla de recordatorios en Supabase
-- Ejecuta este script en el editor SQL de tu panel de Supabase.

CREATE TABLE IF NOT EXISTS reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  texto TEXT NOT NULL,
  completado BOOLEAN DEFAULT false,
  fecha_limite DATE
);

-- Habilitar Row Level Security (RLS)
ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;

-- Crear política para permitir acceso total a todos los usuarios (o según la lógica del token de familia)
CREATE POLICY "Permitir todo a usuarios con token familiar" 
ON reminders FOR ALL 
USING (true) 
WITH CHECK (true);
