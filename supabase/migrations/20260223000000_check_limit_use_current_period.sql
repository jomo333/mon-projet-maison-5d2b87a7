-- Aligner check_ai_analysis_limit sur get_ai_usage_current (période de facturation)
-- pour éviter le décalage : menu affiche X restantes mais "analyse dépassée"

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

  -- Utiliser la même source que le menu compte (période facturation ou mois civil)
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
