-- Renommer le forfait "Pro" en "Gestion complète" (autoconstruction maîtrisée de A à Z)
-- Pas de forfait "Pro pour les professionnels"
UPDATE public.plans
SET
  name = 'Gestion complète',
  description = 'Pour une autoconstruction maîtrisée de A à Z'
WHERE name = 'Pro';
