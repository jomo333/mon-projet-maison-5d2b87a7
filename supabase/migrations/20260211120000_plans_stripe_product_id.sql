ALTER TABLE public.plans
  ADD COLUMN IF NOT EXISTS stripe_product_id TEXT;

COMMENT ON COLUMN public.plans.stripe_product_id IS 'ID du Product Stripe (prod_xxx) pour synchronisation Supabase → Stripe';
