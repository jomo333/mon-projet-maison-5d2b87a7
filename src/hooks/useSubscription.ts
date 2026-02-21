import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface PlanLimits {
  projects: number;
  ai_analyses: number;
  uploads_gb: number;
  documents: number;
  code_searches: number;
}

export interface Plan {
  id: string;
  name: string;
  description: string | null;
  price_monthly: number;
  price_yearly: number | null;
  limits: PlanLimits;
  features: string[];
}

export interface Subscription {
  id: string;
  plan_id: string | null;
  status: string;
  billing_cycle: string;
  start_date: string;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at: string | null;
}

export interface Usage {
  projects: number;
  ai_analyses: number;
  storage_gb: number;
  bonus_credits: number;
}

export interface SubscriptionData {
  subscription: Subscription | null;
  plan: Plan | null;
  limits: PlanLimits;
  usage: Usage;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

// Default limits for users without subscription (Gratuit)
const DEFAULT_LIMITS: PlanLimits = {
  projects: 1,
  ai_analyses: 1,
  uploads_gb: 10,
  documents: 2,
  code_searches: 1,
};

export function useSubscription(): SubscriptionData {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [usage, setUsage] = useState<Usage>({ projects: 0, ai_analyses: 0, storage_gb: 0, bonus_credits: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async (silent = false) => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      if (!silent) {
        setLoading(true);
        setError(null);
      }

      // Fetch subscription (incl. paused/past_due pour garder le plan et les limites)
      const { data: subData, error: subError } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", user.id)
        .in("status", ["active", "trial", "paused", "past_due"])
        .order("current_period_end", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (subError) throw subError;
      setSubscription(subData);

      // Fetch plan (either from subscription or default Gratuit plan)
      let planData: Plan | null = null;
      
      if (subData?.plan_id) {
        const { data: pData, error: pError } = await supabase
          .from("plans")
          .select("*")
          .eq("id", subData.plan_id)
          .maybeSingle();

        if (pError) throw pError;
        if (pData) {
          planData = {
            ...pData,
            limits: (pData.limits as unknown as PlanLimits) || DEFAULT_LIMITS,
            features: Array.isArray(pData.features) ? pData.features as string[] : [],
          };
        }
      }

      // If no plan found, try Découverte then Gratuit (noms possibles en base)
      if (!planData) {
        const { data: gratuitPlan, error: gratuitError } = await supabase
          .from("plans")
          .select("*")
          .in("name", ["Découverte", "Gratuit"])
          .limit(1)
          .maybeSingle();

        if (!gratuitError && gratuitPlan) {
          planData = {
            ...gratuitPlan,
            limits: (gratuitPlan.limits as unknown as PlanLimits) || DEFAULT_LIMITS,
            features: Array.isArray(gratuitPlan.features) ? gratuitPlan.features as string[] : [],
          };
        }
      }

      setPlan(planData);

      // Fetch usage
      // 1. Project count
      const { count: projectCount, error: projectError } = await supabase
        .from("projects")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id);

      if (projectError) throw projectError;

      // 2. AI usage : par période de facturation (abonnement) ou mois civil (Gratuit/Découverte)
      const { data: aiCountData, error: aiError } = await supabase.rpc("get_ai_usage_current", {
        p_user_id: user.id,
      });
      if (aiError) throw aiError;
      const aiCount = aiCountData ?? 0;

      // 3. Storage usage
      const { data: storageData, error: storageError } = await supabase
        .from("user_storage_usage")
        .select("bytes_used")
        .eq("user_id", user.id)
        .maybeSingle();

      if (storageError) throw storageError;

      // 4. Bonus AI credits (achats supplémentaires)
      const { data: creditsData } = await supabase
        .from("user_ai_credits")
        .select("bonus_credits")
        .eq("user_id", user.id)
        .maybeSingle();

      setUsage({
        projects: projectCount || 0,
        ai_analyses: aiCount,
        storage_gb: (storageData?.bytes_used || 0) / (1024 * 1024 * 1024),
        bonus_credits: creditsData?.bonus_credits || 0,
      });

    } catch (err) {
      console.error("Error fetching subscription data:", err);
      setError(err instanceof Error ? err.message : "Erreur lors du chargement");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user?.id]);

  // Re-refetch 2s après le premier chargement (admin peut d’assigner un forfait juste après le login)
  useEffect(() => {
    if (!user) return;
    const t = setTimeout(() => fetchData(true), 2000);
    return () => clearTimeout(t);
  }, [user?.id]);

  // Recharger au retour sur l’onglet et toutes les 30s
  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible" && user) fetchData(true);
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    const interval = user
      ? setInterval(() => {
          if (document.visibilityState === "visible") fetchData(true);
        }, 30_000)
      : undefined;
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      if (interval) clearInterval(interval);
    };
  }, [user?.id]);

  // Écouter l'événement global pour rafraîchir le compteur d'analyses IA (Header, PlanUsageCard)
  useEffect(() => {
    const onRefetch = () => { if (user) fetchData(true); };
    window.addEventListener("subscription-refetch", onRefetch);
    return () => window.removeEventListener("subscription-refetch", onRefetch);
  }, [user?.id]);

  const limits = plan?.limits || DEFAULT_LIMITS;

  const refetch = async () => {
    await fetchData();
    window.dispatchEvent(new CustomEvent("subscription-refetch"));
  };

  return {
    subscription,
    plan,
    limits,
    usage,
    loading,
    error,
    refetch,
  };
}
