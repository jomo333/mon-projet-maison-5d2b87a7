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

      // Fetch subscription
      const { data: subData, error: subError } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", user.id)
        .in("status", ["active", "trial"])
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

      // If no plan found, fetch Gratuit plan
      if (!planData) {
        const { data: gratuitPlan, error: gratuitError } = await supabase
          .from("plans")
          .select("*")
          .eq("name", "Découverte")
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
      console.error("Error fetching subscription data:", err);
      setError(err instanceof Error ? err.message : "Erreur lors du chargement");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
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
