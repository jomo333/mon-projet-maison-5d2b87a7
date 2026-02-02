import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { usePlanLimits } from "@/hooks/usePlanLimits";
import { Skeleton } from "@/components/ui/skeleton";
import { FolderOpen, Sparkles, HardDrive, ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { getTranslatedPlanName } from "@/lib/planTiersI18n";

export function PlanUsageCard() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { planName, limits, usage, loading } = usePlanLimits();

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
              {formatLimit(usage.ai_analyses, limits.ai_analyses)}
            </span>
          </div>
          {limits.ai_analyses !== -1 && (
            <Progress
              value={getProgressValue(usage.ai_analyses, limits.ai_analyses)}
              className="h-2"
            />
          )}
        </div>

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
