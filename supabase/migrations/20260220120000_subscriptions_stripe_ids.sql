-- Ajoute stripe_customer_id et stripe_subscription_id pour le portail de facturation
-- et la synchronisation avec Stripe (annulation, remboursement)
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;
