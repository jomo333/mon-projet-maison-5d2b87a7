-- Add cookie consent columns to user_consents table
ALTER TABLE public.user_consents
ADD COLUMN IF NOT EXISTS cookie_analytics boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS cookie_marketing boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS cookie_functional boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS cookie_accepted_at timestamp with time zone;