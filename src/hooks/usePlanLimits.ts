import { useSubscription, PlanLimits, Usage } from "./useSubscription";
import { useCallback, useMemo } from "react";
import { useAdmin } from "./useAdmin";

export type LimitType = "projects" | "ai_analyses" | "storage";

export interface LimitCheckResult {
  allowed: boolean;
  current: number;
  limit: number;
  isUnlimited: boolean;
  message: string;
}

export interface PlanLimitsHook {
  limits: PlanLimits;
  usage: Usage;
  planName: string;
  loading: boolean;
  checkLimit: (type: LimitType, additionalAmount?: number) => LimitCheckResult;
  canCreateProject: () => LimitCheckResult;
  canUseAI: () => LimitCheckResult;
  canUpload: (fileSizeBytes: number) => LimitCheckResult;
  hasFullManagement: boolean; // Premium features (alerts, quote analysis, RBQ verification)
  refetch: () => Promise<void>;
}

export function usePlanLimits(): PlanLimitsHook {
  const { plan, limits, usage, loading, refetch } = useSubscription();
  const { isAdmin } = useAdmin();

  const checkLimit = useCallback(
    (type: LimitType, additionalAmount: number = 0): LimitCheckResult => {
      // Admins have unlimited projects
      if (type === "projects" && isAdmin) {
        return {
          allowed: true,
          current: usage.projects,
          limit: -1,
          isUnlimited: true,
          message: "",
        };
      }

      let current: number;
      let limit: number;
      let unitLabel: string;

      switch (type) {
        case "projects":
          current = usage.projects;
          limit = limits.projects;
          unitLabel = "projet(s)";
          break;
        case "ai_analyses":
          current = usage.ai_analyses;
          limit = limits.ai_analyses;
          unitLabel = "analyse(s) IA ce mois-ci";
          break;
        case "storage":
          current = usage.storage_gb + additionalAmount;
          limit = limits.uploads_gb;
          unitLabel = "Go de stockage";
          break;
        default:
          return {
            allowed: false,
            current: 0,
            limit: 0,
            isUnlimited: false,
            message: "Type de limite inconnu",
          };
      }

      const isUnlimited = limit === -1;
      const allowed = isUnlimited || current + (type === "storage" ? 0 : 1) <= limit;

      let message = "";
      if (!allowed) {
        message = `Limite atteinte : ${current}/${limit} ${unitLabel}. Passez à un forfait supérieur pour continuer.`;
      }

      return {
        allowed,
        current,
        limit,
        isUnlimited,
        message,
      };
    },
    [limits, usage, isAdmin]
  );

  const canCreateProject = useCallback((): LimitCheckResult => {
    return checkLimit("projects");
  }, [checkLimit]);

  const canUseAI = useCallback((): LimitCheckResult => {
    return checkLimit("ai_analyses");
  }, [checkLimit]);

  const canUpload = useCallback(
    (fileSizeBytes: number): LimitCheckResult => {
      const fileSizeGb = fileSizeBytes / (1024 * 1024 * 1024);
      const newTotal = usage.storage_gb + fileSizeGb;
      const limit = limits.uploads_gb;
      const isUnlimited = limit === -1;
      const allowed = isUnlimited || newTotal <= limit;

      return {
        allowed,
        current: usage.storage_gb,
        limit,
        isUnlimited,
        message: allowed
          ? ""
          : `Espace de stockage insuffisant. Vous utilisez ${usage.storage_gb.toFixed(2)} Go sur ${limit} Go. Ce fichier nécessite ${fileSizeGb.toFixed(2)} Go supplémentaires.`,
      };
    },
    [limits, usage]
  );

  // Check if user has "Gestion complète" plan (premium features)
  const hasFullManagement = useMemo(() => {
    if (isAdmin) return true; // Admins always have full access
    const currentPlan = plan?.name || "";
    return currentPlan === "Gestion complète";
  }, [plan?.name, isAdmin]);

  return {
    limits,
    usage,
    planName: plan?.name || "Découverte",
    loading,
    checkLimit,
    canCreateProject,
    canUseAI,
    canUpload,
    hasFullManagement,
    refetch,
  };
}
