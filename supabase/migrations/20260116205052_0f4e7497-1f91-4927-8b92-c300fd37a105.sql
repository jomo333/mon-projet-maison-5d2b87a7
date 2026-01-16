-- Supprimer la politique trop permissive
DROP POLICY IF EXISTS "Authenticated users can manage reference durations" ON public.schedule_reference_durations;

-- Créer une politique de lecture seule pour les utilisateurs réguliers
-- (les modifications se feront via l'admin ou les outils internes)
CREATE POLICY "Reference durations are read-only for users"
ON public.schedule_reference_durations
FOR SELECT
USING (auth.uid() IS NOT NULL);