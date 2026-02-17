-- Référence marché pour l'analyse de plans : agrégats anonymes des budgets enregistrés
-- (soumissions appliquées + budgets plan). Utilisé par analyze-plan pour affiner les estimations.

CREATE OR REPLACE FUNCTION public.get_budget_market_reference()
RETURNS TABLE (
  category_name text,
  avg_budget numeric,
  sample_count bigint
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT
    pb.category_name::text,
    ROUND(AVG(pb.budget)::numeric, 0) AS avg_budget,
    COUNT(*)::bigint AS sample_count
  FROM project_budgets pb
  WHERE pb.budget IS NOT NULL AND pb.budget > 0
  GROUP BY pb.category_name
  HAVING COUNT(*) >= 2
  ORDER BY pb.category_name;
$$;

COMMENT ON FUNCTION public.get_budget_market_reference() IS
  'Agrégats anonymes par catégorie de budget (moyenne, nombre) pour enrichir l''analyse de plans. Données issues des budgets enregistrés (soumissions + plans).';

-- Permettre l'appel par le service role (Edge Functions) et par les utilisateurs authentifiés en lecture seule
GRANT EXECUTE ON FUNCTION public.get_budget_market_reference() TO service_role;
GRANT EXECUTE ON FUNCTION public.get_budget_market_reference() TO authenticated;
