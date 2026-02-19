-- Vérifier la limite d'analyses IA avant d'exécuter (appelé par les Edge Functions)
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
  v_plan_limits JSONB;
  v_is_admin BOOLEAN;
BEGIN
  -- Admins ont accès illimité
  v_is_admin := public.is_admin(p_user_id);
  IF v_is_admin THEN
    RETURN jsonb_build_object('allowed', true, 'current', 0, 'limit', -1);
  END IF;

  v_usage := public.get_ai_usage(p_user_id);

  -- Obtenir la limite du plan (subscription active ou Gratuit par défaut)
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

  -- -1 = illimité
  IF v_limit = -1 THEN
    RETURN jsonb_build_object('allowed', true, 'current', v_usage, 'limit', -1);
  END IF;

  -- Vérifier si usage < limit (on autorise si après incrément on reste <= limit)
  RETURN jsonb_build_object(
    'allowed', (v_usage < v_limit),
    'current', v_usage,
    'limit', v_limit
  );
END;
$$;
