-- Table pour enregistrer des résumés d'analyses IA (métadonnées uniquement)
-- Permet d'améliorer la précision : revue des sorties, stats, évolution des prompts
CREATE TABLE public.ai_analysis_samples (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  analysis_type TEXT NOT NULL,
  project_id UUID,
  result_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.ai_analysis_samples IS 'Résumés anonymisés des analyses IA (nb catégories, totaux) pour améliorer la précision des modèles';
COMMENT ON COLUMN public.ai_analysis_samples.result_metadata IS 'Ex: { "nb_categories": 12, "category_names": ["Fondation", ...], "total_budget": 350000, "nb_items": 85 } - pas de données personnelles';

CREATE INDEX idx_ai_analysis_samples_analysis_type ON public.ai_analysis_samples(analysis_type);
CREATE INDEX idx_ai_analysis_samples_created_at ON public.ai_analysis_samples(created_at);
CREATE INDEX idx_ai_analysis_samples_user_id ON public.ai_analysis_samples(user_id);

ALTER TABLE public.ai_analysis_samples ENABLE ROW LEVEL SECURITY;

-- Seul l'utilisateur peut insérer ses propres enregistrements (via le service role dans les Edge Functions)
CREATE POLICY "Users can insert their own analysis samples"
ON public.ai_analysis_samples
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Seuls les admins peuvent consulter (pour améliorer les prompts / analytics)
CREATE POLICY "Admins can view all analysis samples"
ON public.ai_analysis_samples
FOR SELECT
USING (public.is_admin(auth.uid()));
