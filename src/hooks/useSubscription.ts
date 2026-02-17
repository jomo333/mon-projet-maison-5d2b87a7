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
  current_period_end: string | null;
  stripe_subscription_id?: string | null;
}

export interface Usage {
  projects: number;
  ai_analyses: number;
  storage_gb: number;
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

/** Normalise le JSON limits de la table plans vers PlanLimits (clés possibles: projects, ai_analyses ou ai_analyses_per_month, uploads_gb, etc.) */
function normalizeLimits(raw: unknown): PlanLimits {
  const o = typeof raw === "object" && raw !== null ? (raw as Record<string, unknown>) : null;
  if (!o) return DEFAULT_LIMITS;
  const num = (key: string, fallback: number): number => {
    const v = o[key];
    if (typeof v === "number" && !Number.isNaN(v)) return v;
    if (typeof v === "string") {
      const n = parseInt(v, 10);
      if (!Number.isNaN(n)) return n;
    }
    return fallback;
  };
  return {
    projects: num("projects", DEFAULT_LIMITS.projects),
    ai_analyses: num("ai_analyses", num("ai_analyses_per_month", DEFAULT_LIMITS.ai_analyses)),
    uploads_gb: num("uploads_gb", DEFAULT_LIMITS.uploads_gb),
    documents: num("documents", DEFAULT_LIMITS.documents),
    code_searches: num("code_searches", DEFAULT_LIMITS.code_searches),
  };
}

export function useSubscription(): SubscriptionData {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [usage, setUsage] = useState<Usage>({ projects: 0, ai_analyses: 0, storage_gb: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Fetch subscription (most recent active one if several exist)
      const { data: subList, error: subError } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", user.id)
        .in("status", ["active", "trial"])
        .order("created_at", { ascending: false })
        .limit(1);

      if (subError) throw subError;
      const subData = subList?.[0] ?? null;
      setSubscription(subData ?? null);

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
            limits: normalizeLimits(pData.limits),
            features: Array.isArray(pData.features) ? pData.features as string[] : [],
          };
        }
      }

      // If no plan found, fetch plan gratuit par défaut (Découverte ou Gratuit selon la config)
      if (!planData) {
        const { data: gratuitList } = await supabase
          .from("plans")
          .select("*")
          .or("name.eq.Découverte,name.eq.Gratuit")
          .eq("is_active", true)
          .order("display_order", { ascending: true })
          .limit(1);
        const gratuitPlan = gratuitList?.[0];
        if (gratuitPlan) {
          planData = {
            ...gratuitPlan,
            limits: normalizeLimits(gratuitPlan.limits),
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

      // 2. AI usage this month
      const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
      const { data: aiUsageData, error: aiError } = await supabase
        .from("ai_usage")
        .select("count")
        .eq("user_id", user.id)
        .eq("month", currentMonth)
        .maybeSingle();

      if (aiError) throw aiError;

      // 3. Storage usage
      const { data: storageData, error: storageError } = await supabase
        .from("user_storage_usage")
        .select("bytes_used")
        .eq("user_id", user.id)
        .maybeSingle();

      if (storageError) throw storageError;

      setUsage({
        projects: projectCount || 0,
        ai_analyses: aiUsageData?.count || 0,
        storage_gb: (storageData?.bytes_used || 0) / (1024 * 1024 * 1024),
      });

    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      console.error("Error fetching subscription data:", err);
      setError(err instanceof Error ? err.message : "Erreur lors du chargement");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Refetch une fois après 2s pour récupérer un abonnement venant d'être créé par le webhook Stripe (ex: paiement sans redirect)
    if (!user?.id) return;
    const t = setTimeout(() => fetchData().catch(() => {}), 2000);
    return () => clearTimeout(t);
  }, [user?.id]);

  // Recharger l'abonnement quand l'utilisateur revient sur l'onglet (ex. après paiement Stripe)
  useEffect(() => {
    const onFocus = () => {
      if (user?.id) fetchData();
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [user?.id]);

  const limits = plan?.limits || DEFAULT_LIMITS;

  return {
    subscription,
    plan,
    limits,
    usage,
    loading,
    error,
    refetch: fetchData,
  };
}
