-- Table pour les crédits d'analyses IA achetés en supplément (Essentiel / Gestion complète)
CREATE TABLE IF NOT EXISTS public.user_ai_credits (
  user_id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  bonus_credits INTEGER NOT NULL DEFAULT 0 CHECK (bonus_credits >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_ai_credits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own credits"
  ON public.user_ai_credits FOR SELECT
  USING (auth.uid() = user_id);

-- Admins et service role peuvent tout faire
CREATE POLICY "Service role full access user_ai_credits"
  ON public.user_ai_credits FOR ALL
  USING (auth.role() = 'service_role');

-- Trigger updated_at
CREATE TRIGGER update_user_ai_credits_updated_at
  BEFORE UPDATE ON public.user_ai_credits
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Fonction pour récupérer les crédits bonus
CREATE OR REPLACE FUNCTION public.get_bonus_ai_credits(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN COALESCE(
    (SELECT bonus_credits FROM public.user_ai_credits WHERE user_id = p_user_id),
    0
  );
END;
$$;

-- Fonction pour ajouter des crédits (webhook Stripe ou admin)
CREATE OR REPLACE FUNCTION public.add_bonus_ai_credits(p_user_id UUID, p_amount INTEGER)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_total INTEGER;
BEGIN
  INSERT INTO public.user_ai_credits (user_id, bonus_credits)
  VALUES (p_user_id, GREATEST(0, p_amount))
  ON CONFLICT (user_id)
  DO UPDATE SET
    bonus_credits = GREATEST(0, public.user_ai_credits.bonus_credits + p_amount),
    updated_at = now()
  RETURNING bonus_credits INTO new_total;
  RETURN new_total;
END;
$$;

-- Mise à jour de check_ai_analysis_limit pour inclure les crédits bonus
CREATE OR REPLACE FUNCTION public.check_ai_analysis_limit(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_usage INTEGER;
  v_limit INTEGER := 1;
  v_bonus INTEGER;
  v_is_admin BOOLEAN;
BEGIN
  v_is_admin := public.is_admin(p_user_id);
  IF v_is_admin THEN
    RETURN jsonb_build_object('allowed', true, 'current', 0, 'limit', -1);
  END IF;

  v_usage := public.get_ai_usage(p_user_id);
  v_bonus := public.get_bonus_ai_credits(p_user_id);

  SELECT COALESCE(
    (SELECT (p.limits->>'ai_analyses')::INTEGER
     FROM subscriptions s
     JOIN plans p ON p.id = s.plan_id
     WHERE s.user_id = p_user_id
       AND s.status IN ('active', 'trial', 'paused', 'past_due')
     ORDER BY s.current_period_end DESC NULLS LAST
     LIMIT 1),
    (SELECT COALESCE((limits->>'ai_analyses')::INTEGER, 1)
     FROM plans
     WHERE name IN ('Gratuit', 'Découverte')
     LIMIT 1),
    1
  ) INTO v_limit;

  v_limit := COALESCE(v_limit, 1);

  IF v_limit = -1 THEN
    RETURN jsonb_build_object('allowed', true, 'current', v_usage, 'limit', -1);
  END IF;

  -- Limite effective = limite du plan + crédits bonus achetés
  v_limit := v_limit + v_bonus;

  RETURN jsonb_build_object(
    'allowed', (v_usage < v_limit),
    'current', v_usage,
    'limit', v_limit
  );
END;
$$;

-- Admin: ajouter des crédits manuellement (vérifie que l'appelant est admin)
CREATE OR REPLACE FUNCTION public.admin_add_bonus_ai_credits(p_target_user_id UUID, p_amount INTEGER)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id UUID;
  v_is_admin BOOLEAN;
  v_new_total INTEGER;
BEGIN
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Non authentifié');
  END IF;
  v_is_admin := public.is_admin(v_caller_id);
  IF NOT v_is_admin THEN
    RETURN jsonb_build_object('success', false, 'error', 'Accès refusé: admin requis');
  END IF;
  IF p_amount <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Le montant doit être strictement positif');
  END IF;
  v_new_total := public.add_bonus_ai_credits(p_target_user_id, p_amount);
  RETURN jsonb_build_object('success', true, 'bonus_credits', v_new_total);
END;
$$;
