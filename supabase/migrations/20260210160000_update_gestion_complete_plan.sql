-- Mise à jour du forfait Gestion complète : 1 projet, 25 analyses IA, 125$/mois, 1250$/an
UPDATE public.plans
SET
  name = 'Gestion complète',
  description = 'Pour une autoconstruction maîtrisée de A à Z',
  price_monthly = 125.00,
  price_yearly = 1250.00,
  features = '["1 projet actif", "25 analyses IA par mois", "Analyse des soumissions par étape", "Vérification des licences RBQ et numéros de taxes", "Alertes de conflits et rappels de contact sous-traitants", "Détection des incohérences et oublis critiques", "Centralisation complète des documents", "Accès étendu au code du bâtiment", "Stockage : 10 Go"]'::jsonb,
  limits = '{"projects": 1, "ai_analyses": 25, "uploads_gb": 10}'::jsonb,
  updated_at = now()
WHERE name = 'Gestion complète';
