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
  hasFullManagement: boolean;
  /** true si l'utilisateur peut modifier le budget et l'échéancier (forfaits Essentiel et plus). */
  canUseBudgetAndSchedule: boolean;
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
          limit = limits.ai_analyses + (usage.bonus_credits ?? 0);
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

  const hasFullManagement = useMemo(() => {
    if (isAdmin) return true;
    const currentPlan = plan?.name || "";
    return currentPlan === "Gestion complète";
  }, [plan?.name, isAdmin]);

  // Budget, échéancier, analyse IA soumissions : Essentiel et Gestion complète uniquement (PAS Gratuit)
  const canUseBudgetAndSchedule = useMemo(() => {
    if (isAdmin) return true;
    // Plan gratuit (prix 0) = toujours verrouillé
    if (plan && plan.price_monthly === 0) return false;
    const rawName = (plan?.name || "Découverte").trim();
    const name = rawName.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
    // Gratuit/Découverte par nom = toujours verrouillé
    const freePlanNames = ["gratuit", "decouverte", "free"];
    if (freePlanNames.some((f) => name === f || name.includes(f))) return false;
    if (/gratuit|découverte|decouverte|free/i.test(rawName)) return false;
    // Pendant le chargement : verrouiller par défaut (évite accès indû)
    if (loading) return false;
    // Forfaits payants par nom
    const paidNames = ["essentiel", "essential", "gestion complete"];
    if (paidNames.some((paid) => name.includes(paid))) return true;
    if (/essentiel|essential|gestion\s*complète/i.test(rawName)) return true;
    // Secours par limites : uniquement si plan payant (évite faux positifs Gratuit)
    const isPaidPlan = plan && typeof plan.price_monthly === "number" && plan.price_monthly > 0;
    if (!isPaidPlan) return false;
    const hasEssentielLimits =
      (limits.ai_analyses >= 10 && limits.ai_analyses !== -1) ||
      limits.projects === -1;
    if (hasEssentielLimits) return true;
    const hasPaidLimits =
      limits.projects > 1 ||
      limits.projects === -1 ||
      (limits.ai_analyses > 1 && limits.ai_analyses !== -1) ||
      limits.ai_analyses === -1;
    return hasPaidLimits;
  }, [plan?.name, plan?.price_monthly, isAdmin, limits.projects, limits.ai_analyses, loading]);

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
    canUseBudgetAndSchedule,
    refetch,
  };
}
