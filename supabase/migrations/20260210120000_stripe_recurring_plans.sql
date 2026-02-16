-- Stripe abonnements récurrents: lookup keys sur les forfaits + lien subscription Stripe
ALTER TABLE public.plans
  ADD COLUMN IF NOT EXISTS stripe_price_lookup_monthly TEXT,
  ADD COLUMN IF NOT EXISTS stripe_price_lookup_yearly TEXT;

COMMENT ON COLUMN public.plans.stripe_price_lookup_monthly IS 'Lookup key du Price Stripe (ex: essentiel_monthly) pour le forfait mensuel récurrent';
COMMENT ON COLUMN public.plans.stripe_price_lookup_yearly IS 'Lookup key du Price Stripe (ex: essentiel_yearly) pour le forfait annuel récurrent';

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;

COMMENT ON COLUMN public.subscriptions.stripe_subscription_id IS 'ID de l''abonnement Stripe (sub_xxx) pour synchroniser renouvellements et annulations';

CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_subscription_id
  ON public.subscriptions (stripe_subscription_id) WHERE stripe_subscription_id IS NOT NULL;
