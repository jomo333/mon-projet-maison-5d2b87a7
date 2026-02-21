-- Aligner le quota d'analyses IA sur la période de facturation (renouvellement du forfait)
-- au lieu du mois calendaire

-- 1. Table pour enregistrer chaque utilisation avec timestamp
CREATE TABLE IF NOT EXISTS public.ai_usage_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  used_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_usage_events_user_period 
  ON public.ai_usage_events (user_id, used_at);

ALTER TABLE public.ai_usage_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own AI usage events"
  ON public.ai_usage_events FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own AI usage events"
  ON public.ai_usage_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 2. Modifier increment_ai_usage pour enregistrer chaque événement
CREATE OR REPLACE FUNCTION public.increment_ai_usage(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_month TEXT;
  new_count INTEGER;
BEGIN
  current_month := to_char(now(), 'YYYY-MM');
  
  -- Conserver ai_usage pour rétrocompatibilité
  INSERT INTO public.ai_usage (user_id, month, count)
  VALUES (p_user_id, current_month, 1)
  ON CONFLICT (user_id, month)
  DO UPDATE SET count = ai_usage.count + 1, updated_at = now()
  RETURNING count INTO new_count;
  
  -- Enregistrer l'événement pour le calcul par période de facturation
  INSERT INTO public.ai_usage_events (user_id, used_at)
  VALUES (p_user_id, now());
  
  RETURN new_count;
END;
$$;

-- 3. Fonction pour obtenir l'usage sur une période (début inclus, fin exclue)
CREATE OR REPLACE FUNCTION public.get_ai_usage_for_period(
  p_user_id UUID,
  p_period_start TIMESTAMPTZ,
  p_period_end TIMESTAMPTZ
)
RETURNS INTEGER
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  usage_count INTEGER;
BEGIN
  SELECT COUNT(*)::INTEGER INTO usage_count
  FROM public.ai_usage_events
  WHERE user_id = p_user_id
    AND used_at >= p_period_start
    AND used_at < p_period_end;
  
  RETURN COALESCE(usage_count, 0);
END;
$$;

-- 4. Fonction pour obtenir l'usage de la période courante (abonnement ou mois calendaire)
CREATE OR REPLACE FUNCTION public.get_ai_usage_current(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_period_start TIMESTAMPTZ;
  v_period_end TIMESTAMPTZ;
  v_usage INTEGER;
BEGIN
  -- Essayer d'obtenir la période de l'abonnement actif
  SELECT s.current_period_start, s.current_period_end
  INTO v_period_start, v_period_end
  FROM subscriptions s
  WHERE s.user_id = p_user_id
    AND s.status IN ('active', 'trial', 'paused', 'past_due')
    AND s.current_period_start IS NOT NULL
    AND s.current_period_end IS NOT NULL
  ORDER BY s.current_period_end DESC NULLS LAST
  LIMIT 1;
  
  IF v_period_start IS NOT NULL AND v_period_end IS NOT NULL AND now() < v_period_end THEN
    -- Utiliser la période de facturation
    RETURN public.get_ai_usage_for_period(p_user_id, v_period_start, v_period_end);
  END IF;
  
  -- Fallback : mois calendaire (Gratuit, Découverte, ou pas d'abonnement)
  RETURN public.get_ai_usage(p_user_id);
END;
$$;

-- 5. Modifier consume_ai_analysis pour utiliser la période de facturation
CREATE OR REPLACE FUNCTION public.consume_ai_analysis(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_usage INTEGER;
  v_monthly_limit INTEGER;
  v_bonus INTEGER;
  v_is_admin BOOLEAN;
BEGIN
  v_is_admin := public.is_admin(p_user_id);
  IF v_is_admin THEN
    PERFORM public.increment_ai_usage(p_user_id);
    RETURN jsonb_build_object('success', true, 'source', 'admin');
  END IF;

  -- Utiliser la période de facturation quand disponible (sinon mois calendaire)
  v_usage := public.get_ai_usage_current(p_user_id);
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
  ) INTO v_monthly_limit;

  v_monthly_limit := COALESCE(v_monthly_limit, 1);

  IF v_monthly_limit = -1 THEN
    PERFORM public.increment_ai_usage(p_user_id);
    RETURN jsonb_build_object('success', true, 'source', 'unlimited');
  END IF;

  IF v_usage < v_monthly_limit THEN
    PERFORM public.increment_ai_usage(p_user_id);
    RETURN jsonb_build_object('success', true, 'source', 'monthly');
  END IF;

  IF v_bonus > 0 THEN
    UPDATE public.user_ai_credits
    SET bonus_credits = bonus_credits - 1, updated_at = now()
    WHERE user_id = p_user_id AND bonus_credits > 0;
    IF FOUND THEN
      RETURN jsonb_build_object('success', true, 'source', 'bonus');
    END IF;
  END IF;

  RETURN jsonb_build_object('success', false, 'error', 'No credits remaining');
END;
$$;

-- 6. Remplir ai_usage_events à partir des données existantes (rétrocompatibilité)
-- Une ligne par utilisation historique, avec timestamp approximatif au milieu du mois
INSERT INTO public.ai_usage_events (user_id, used_at)
SELECT u.user_id, ((u.month || '-15')::date + (gs.n || ' hours')::interval)::timestamptz
FROM public.ai_usage u,
     generate_series(0, GREATEST(0, u.count - 1)) gs(n);
