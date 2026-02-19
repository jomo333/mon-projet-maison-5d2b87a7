import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { usePlanLimits } from "@/hooks/usePlanLimits";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { FolderOpen, Sparkles, HardDrive, ArrowRight, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { getTranslatedPlanName } from "@/lib/planTiersI18n";

export function PlanUsageCard() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { planName, limits, usage, loading } = usePlanLimits();
  const [buyingCredits, setBuyingCredits] = useState<number | null>(null);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
        </CardContent>
      </Card>
    );
  }

  const getProgressValue = (current: number, limit: number) => {
    if (limit === -1) return 0; // Unlimited
    if (limit === 0) return 100;
    return Math.min((current / limit) * 100, 100);
  };

  const getProgressColor = (current: number, limit: number) => {
    if (limit === -1) return "bg-primary";
    const percentage = (current / limit) * 100;
    if (percentage >= 90) return "bg-destructive";
    if (percentage >= 70) return "bg-amber-500";
    return "bg-primary";
  };

  const storageUnit = t("planUsage.gb");

  const formatLimit = (current: number, limit: number, suffix: string = "") => {
    if (limit === -1) return `${current}${suffix} / ${t("planUsage.unlimited")}`;
    return `${current}${suffix} / ${limit}${suffix}`;
  };

  const translatedPlanName = getTranslatedPlanName(t, planName);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">{t("planUsage.title")}</CardTitle>
            <CardDescription>{t("planUsage.currentUsage")}</CardDescription>
          </div>
          <Badge variant="secondary" className="text-sm">
            {translatedPlanName}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Projects */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <FolderOpen className="h-4 w-4 text-muted-foreground" />
              <span>{t("planUsage.projects")}</span>
            </div>
            <span className="text-muted-foreground">
              {formatLimit(usage.projects, limits.projects)}
            </span>
          </div>
          {limits.projects !== -1 && (
            <Progress
              value={getProgressValue(usage.projects, limits.projects)}
              className="h-2"
            />
          )}
        </div>

        {/* AI Analyses */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-muted-foreground" />
              <span>{t("planUsage.aiAnalyses")}</span>
            </div>
            <span className="text-muted-foreground">
              {formatLimit(usage.ai_analyses, limits.ai_analyses + (usage.bonus_credits ?? 0))}
              {(usage.bonus_credits ?? 0) > 0 && (
                <span className="text-xs ml-1 text-primary">(+{usage.bonus_credits} bonus)</span>
              )}
            </span>
          </div>
          {limits.ai_analyses !== -1 && (
            <Progress
              value={getProgressValue(usage.ai_analyses, limits.ai_analyses + (usage.bonus_credits ?? 0))}
              className="h-2"
            />
          )}
        </div>

        {/* Acheter des analyses (Essentiel et Gestion complète uniquement) */}
        {planName !== "Gratuit" && planName !== "Découverte" && limits.ai_analyses !== -1 && (
          <div className="pt-2 border-t space-y-2">
            <p className="text-xs text-muted-foreground font-medium">
              {t("planUsage.buyCredits", "Acheter des analyses supplémentaires")}
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className="flex-1 text-xs"
                disabled={!!buyingCredits}
                onClick={async () => {
                  setBuyingCredits(10);
                  try {
                    const { data: { session: sess } } = await supabase.auth.getSession();
                    const { data: { session: refreshed } } = await supabase.auth.refreshSession();
                    const token = refreshed?.access_token ?? sess?.access_token;
                    if (!token) {
                      toast.error("Veuillez vous reconnecter pour acheter des analyses.");
                      return;
                    }
                    const { data, error } = await supabase.functions.invoke("create-checkout-credits", {
                      body: { credits_amount: 10 },
                      headers: { Authorization: `Bearer ${token}` },
                    });
                    if (error) throw new Error(error.message || "Erreur");
                    if (data?.url) window.location.href = data.url;
                    else throw new Error(data?.error || "Erreur");
                  } catch (e) {
                    const msg = e instanceof Error ? e.message : "Impossible de créer le checkout";
                    toast.error(msg);
                    console.error(e);
                  } finally {
                    setBuyingCredits(null);
                  }
                }}
              >
                {buyingCredits === 10 ? <Loader2 className="h-4 w-4 animate-spin" /> : "10 analyses — 10 $"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="flex-1 text-xs"
                disabled={!!buyingCredits}
                onClick={async () => {
                  setBuyingCredits(20);
                  try {
                    const { data: { session: sess } } = await supabase.auth.getSession();
                    const { data: { session: refreshed } } = await supabase.auth.refreshSession();
                    const token = refreshed?.access_token ?? sess?.access_token;
                    if (!token) {
                      toast.error("Veuillez vous reconnecter pour acheter des analyses.");
                      return;
                    }
                    const { data, error } = await supabase.functions.invoke("create-checkout-credits", {
                      body: { credits_amount: 20 },
                      headers: { Authorization: `Bearer ${token}` },
                    });
                    if (error) throw new Error(error.message || "Erreur");
                    if (data?.url) window.location.href = data.url;
                    else throw new Error(data?.error || "Erreur");
                  } catch (e) {
                    const msg = e instanceof Error ? e.message : "Impossible de créer le checkout";
                    toast.error(msg);
                    console.error(e);
                  } finally {
                    setBuyingCredits(null);
                  }
                }}
              >
                {buyingCredits === 20 ? <Loader2 className="h-4 w-4 animate-spin" /> : "20 analyses — 15 $"}
              </Button>
            </div>
          </div>
        )}

        {/* Storage */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <HardDrive className="h-4 w-4 text-muted-foreground" />
              <span>{t("planUsage.storage")}</span>
            </div>
            <span className="text-muted-foreground">
              {formatLimit(Number(usage.storage_gb.toFixed(2)), limits.uploads_gb, ` ${storageUnit}`)}
            </span>
          </div>
          {limits.uploads_gb !== -1 && (
            <Progress
              value={getProgressValue(usage.storage_gb, limits.uploads_gb)}
              className="h-2"
            />
          )}
        </div>

        {/* Upgrade button for non-premium plans */}
        {planName !== "Gestion complète" && (
          <Button
            variant="outline"
            className="w-full mt-4"
            onClick={() => navigate("/forfaits")}
          >
            {t("planUsage.upgrade")}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
