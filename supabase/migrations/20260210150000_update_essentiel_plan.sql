-- Mise à jour du forfait Essentiel : 1 projet, 10 analyses IA, 50$/mois, 500$/an
UPDATE public.plans
SET
  name = 'Essentiel',
  description = 'Pour gérer activement son autoconstruction',
  price_monthly = 50.00,
  price_yearly = 500.00,
  features = '["1 projet", "10 analyses IA par mois", "Échéancier modifiable", "Budget modifiable", "Téléversement et gestion des documents", "Accès complet au guide de construction", "Accès au code du bâtiment (recherches raisonnables)", "Stockage : 5 Go"]'::jsonb,
  limits = '{"projects": 1, "ai_analyses": 10, "uploads_gb": 5}'::jsonb,
  updated_at = now()
WHERE name = 'Essentiel';
