-- Add address and phone to profiles for PDF exports (e.g. budget bilan for lenders)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS phone text;

COMMENT ON COLUMN public.profiles.address IS 'Adresse postale de l''utilisateur (pour documents PDF institution)';
COMMENT ON COLUMN public.profiles.phone IS 'Numéro de téléphone (pour documents PDF institution)';
