-- Consommer 1 analyse IA : utilise d'abord le quota mensuel, puis les crédits bonus
-- Les crédits bonus sont conservés jusqu'à épuisement (décrémentés à chaque utilisation)
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
    -- Admin : on incrémente quand même pour les stats, mais pas de limite
    PERFORM public.increment_ai_usage(p_user_id);
    RETURN jsonb_build_object('success', true, 'source', 'admin');
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
  ) INTO v_monthly_limit;

  v_monthly_limit := COALESCE(v_monthly_limit, 1);

  -- Illimité
  IF v_monthly_limit = -1 THEN
    PERFORM public.increment_ai_usage(p_user_id);
    RETURN jsonb_build_object('success', true, 'source', 'unlimited');
  END IF;

  -- D'abord utiliser le quota mensuel
  IF v_usage < v_monthly_limit THEN
    PERFORM public.increment_ai_usage(p_user_id);
    RETURN jsonb_build_object('success', true, 'source', 'monthly');
  END IF;

  -- Sinon consommer 1 crédit bonus
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
