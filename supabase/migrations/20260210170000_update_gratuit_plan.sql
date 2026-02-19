-- Mise à jour du forfait Gratuit : 1 projet, 1 analyse IA, 2 documents, 1 Go
UPDATE public.plans
SET
  name = 'Gratuit',
  description = 'Accès de base pour démarrer',
  price_monthly = 0,
  price_yearly = 0,
  features = '["1 projet", "Guide de construction (consultation seulement)", "Échéancier (lecture seule)", "Budget (lecture seule)", "Téléversement de 2 documents", "Accès au code du bâtiment (1 recherche)", "1 analyse IA par mois", "Stockage : 1 Go"]'::jsonb,
  limits = '{"projects": 1, "ai_analyses": 1, "uploads_gb": 1, "documents": 2}'::jsonb,
  updated_at = now()
WHERE name IN ('Gratuit', 'Découverte');
