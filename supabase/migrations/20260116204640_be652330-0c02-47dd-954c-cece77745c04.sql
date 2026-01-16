-- Table pour stocker les durées de référence par étape avec superficie de base
CREATE TABLE public.schedule_reference_durations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  step_id TEXT NOT NULL UNIQUE,
  step_name TEXT NOT NULL,
  base_duration_days INTEGER NOT NULL,
  base_square_footage INTEGER NOT NULL DEFAULT 2000, -- Superficie de référence en pi²
  min_duration_days INTEGER, -- Durée minimum même pour petits projets
  max_duration_days INTEGER, -- Durée maximum même pour grands projets
  scaling_factor DECIMAL(4,2) DEFAULT 1.0, -- Facteur d'ajustement (1.0 = linéaire)
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Désactiver RLS pour cette table de référence (données communes)
ALTER TABLE public.schedule_reference_durations ENABLE ROW LEVEL SECURITY;

-- Politique de lecture pour tous les utilisateurs authentifiés
CREATE POLICY "Authenticated users can view reference durations"
ON public.schedule_reference_durations
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Politique pour les admins (ou tous les utilisateurs pour l'instant)
CREATE POLICY "Authenticated users can manage reference durations"
ON public.schedule_reference_durations
FOR ALL
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- Trigger pour updated_at
CREATE TRIGGER update_schedule_reference_durations_updated_at
BEFORE UPDATE ON public.schedule_reference_durations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();