-- Table pour tracer chaque utilisation IA avec timestamp (alignement avec période de facturation)
CREATE TABLE IF NOT EXISTS public.ai_usage_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  used_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_usage_events_user_used ON public.ai_usage_events (user_id, used_at);

ALTER TABLE public.ai_usage_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own ai_usage_events"
  ON public.ai_usage_events FOR SELECT
  USING (auth.uid() = user_id);

-- Pas de policy INSERT : seul increment_ai_usage (SECURITY DEFINER) peut insérer

-- Modifier increment_ai_usage pour loguer chaque usage (garde ai_usage pour compatibilité)
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
  
  -- Log chaque utilisation avec timestamp (pour alignement période facturation)
  INSERT INTO public.ai_usage_events (user_id, used_at)
  VALUES (p_user_id, now());
  
  -- Garde ai_usage pour consume_ai_analysis / get_ai_usage (mois civil)
  INSERT INTO public.ai_usage (user_id, month, count)
  VALUES (p_user_id, current_month, 1)
  ON CONFLICT (user_id, month)
  DO UPDATE SET count = ai_usage.count + 1, updated_at = now()
  RETURNING count INTO new_count;
  
  RETURN new_count;
END;
$$;

-- Usage pour la période de facturation en cours
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
BEGIN
  RETURN (
    SELECT COALESCE(COUNT(*)::INTEGER, 0)
    FROM public.ai_usage_events
    WHERE user_id = p_user_id
      AND used_at >= p_period_start
      AND used_at < p_period_end
  );
END;
$$;

-- Fonction pour obtenir l'usage IA de la période en cours (abonnement ou mois civil)
CREATE OR REPLACE FUNCTION public.get_ai_usage_current_period(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_period_start TIMESTAMPTZ;
  v_period_end TIMESTAMPTZ;
  v_current_month TEXT;
BEGIN
  -- Essayer la période d'abonnement active
  SELECT s.current_period_start, s.current_period_end
  INTO v_period_start, v_period_end
  FROM subscriptions s
  WHERE s.user_id = p_user_id
    AND s.status IN ('active', 'trial', 'paused', 'past_due')
    AND s.current_period_start IS NOT NULL
    AND s.current_period_end IS NOT NULL
  ORDER BY s.current_period_end DESC NULLS LAST
  LIMIT 1;

  IF v_period_start IS NOT NULL AND v_period_end IS NOT NULL THEN
    RETURN public.get_ai_usage_for_period(p_user_id, v_period_start, v_period_end);
  END IF;

  -- Sinon : mois civil (utilisateurs sans abonnement)
  v_current_month := to_char(now(), 'YYYY-MM');
  RETURN COALESCE(
    (SELECT count FROM ai_usage WHERE user_id = p_user_id AND month = v_current_month),
    0
  );
END;
$$;

-- Mettre à jour consume_ai_analysis pour utiliser la période de facturation
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

  v_usage := public.get_ai_usage_current_period(p_user_id);
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

-- Backfill: migrer les données ai_usage existantes vers ai_usage_events
INSERT INTO public.ai_usage_events (user_id, used_at)
SELECT u.user_id, ((u.month || '-01')::date + (s.i || ' days')::interval)::timestamptz
FROM public.ai_usage u
CROSS JOIN LATERAL generate_series(0, GREATEST(0, u.count - 1)) AS s(i)
;
