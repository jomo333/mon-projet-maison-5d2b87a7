import { useTranslation } from "react-i18next";
import { format, parseISO, isPast, isToday, addDays, isBefore } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Phone,
  Factory,
  Ruler,
  X,
  Bell,
  AlertTriangle,
  PhoneCall,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ScheduleAlert, ScheduleItem } from "@/hooks/useProjectSchedule";
import { getDateLocale } from "@/lib/i18n";
import { translateAlertMessage } from "@/lib/alertMessagesI18n";

export interface SupplierInfo {
  supplierName?: string;
  supplierPhone?: string;
  contactPerson?: string;
  contactPersonPhone?: string;
  amount?: string;
}

interface StepAlertsProps {
  alerts: ScheduleAlert[];
  scheduleId: string | undefined;
  schedules?: ScheduleItem[];
  supplierInfoMap?: Record<string, SupplierInfo>;
  onDismiss: (alertId: string) => void;
}

const alertTypeConfig: Record<
  string,
  { icon: React.ElementType; labelKey: string; color: string; bgColor: string; urgent?: boolean }
> = {
  supplier_call: {
    icon: Phone,
    labelKey: "supplierCall",
    color: "text-blue-600",
    bgColor: "bg-blue-500/10 border-blue-500/50",
  },
  fabrication_start: {
    icon: Factory,
    labelKey: "fabricationStart",
    color: "text-orange-600",
    bgColor: "bg-orange-500/10 border-orange-500/50",
  },
  measurement: {
    icon: Ruler,
    labelKey: "measurement",
    color: "text-purple-600",
    bgColor: "bg-purple-500/10 border-purple-500/50",
  },
  contact_subcontractor: {
    icon: PhoneCall,
    labelKey: "contactSubcontractor",
    color: "text-amber-600",
    bgColor: "bg-amber-500/20 border-amber-500",
    urgent: true,
  },
};

// Mapping step_id to soumission trade ID
const stepIdToTradeId: Record<string, string> = {
  "hvac": "chauffage-et-ventilation",
  "plomberie-roughin": "plomberie",
  "plomberie-finition": "plomberie",
  "electricite-roughin": "electricite",
  "electricite-finition": "electricite",
  "toiture": "toiture",
  "fenetre": "fenetres-et-portes",
  "structure": "charpente",
  "fondation": "excavation",
  "isolation": "isolation-et-pare-vapeur",
  "exterieur": "revetement-exterieur",
  "gypse": "gypse-et-peinture",
  "plancher": "revetements-de-sol",
  "cuisine-sdb": "travaux-ebenisterie-(cuisine/sdb)",
  "finitions": "finitions-interieures",
};

export const StepAlerts = ({ alerts, scheduleId, schedules = [], supplierInfoMap = {}, onDismiss }: StepAlertsProps) => {
  const { t, i18n } = useTranslation();
  const dateLocale = getDateLocale();
  
  // Filtrer les alertes pour cette étape spécifique
  const stepAlerts = alerts.filter(alert => alert.schedule_id === scheduleId);
  
  // Helper function to get schedule info for an alert
  const getScheduleForAlert = (alert: ScheduleAlert): ScheduleItem | undefined => {
    return schedules.find(s => s.id === alert.schedule_id);
  };
  
  // Helper function to get supplier info from soumissions
  const getSupplierInfoForSchedule = (schedule: ScheduleItem | undefined): SupplierInfo | null => {
    if (!schedule) return null;
    
    // Try direct step_id mapping first
    const tradeId = stepIdToTradeId[schedule.step_id] || schedule.step_id;
    if (supplierInfoMap[tradeId]) {
      return supplierInfoMap[tradeId];
    }
    
    // Fallback: try schedule's supplier_name/phone (if stored in project_schedules)
    if (schedule.supplier_name || schedule.supplier_phone) {
      return {
        supplierName: schedule.supplier_name || undefined,
        supplierPhone: schedule.supplier_phone || undefined,
      };
    }
    
    return null;
  };
  
  if (stepAlerts.length === 0) {
    return null;
  }

  const getAlertUrgency = (alertDate: string) => {
    const date = parseISO(alertDate);
    const today = new Date();

    if (isPast(date) && !isToday(date)) {
      return { level: "overdue", labelKey: "overdue", variant: "destructive" as const };
    }
    if (isToday(date)) {
      return { level: "today", labelKey: "today", variant: "destructive" as const };
    }
    if (isBefore(date, addDays(today, 3))) {
      return { level: "soon", labelKey: "soon", variant: "default" as const };
    }
    return { level: "upcoming", labelKey: "upcoming", variant: "secondary" as const };
  };

  const overdueCount = stepAlerts.filter(
    (a) => isPast(parseISO(a.alert_date)) && !isToday(parseISO(a.alert_date))
  ).length;

  return (
    <Card className="border-2 border-amber-500/50 bg-amber-50/50 dark:bg-amber-950/20 animate-fade-in">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
          <Bell className="h-5 w-5" />
          <span>{t("stepDetail.alertsForStep")}</span>
          <Badge variant="secondary" className="bg-amber-200 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
            {stepAlerts.length}
          </Badge>
          {overdueCount > 0 && (
            <Badge variant="destructive" className="flex items-center gap-1 ml-2">
              <AlertTriangle className="h-3 w-3" />
              {overdueCount} {t("schedule.overdue")}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {stepAlerts.map((alert) => {
          const config = alertTypeConfig[alert.alert_type];
          const urgency = getAlertUrgency(alert.alert_date);
          const Icon = config?.icon || Bell;
          const isUrgent = config?.urgent === true || urgency.level === "overdue" || urgency.level === "today";
          const schedule = getScheduleForAlert(alert);
          const supplierInfo = getSupplierInfoForSchedule(schedule);
          const hasSupplierInfo = supplierInfo && (supplierInfo.supplierName || supplierInfo.supplierPhone);

          return (
            <Alert
              key={alert.id}
              className={cn(
                "border-2 transition-all",
                config?.bgColor || "bg-muted border-muted",
                isUrgent && "animate-pulse"
              )}
            >
              <div className="flex items-start gap-3">
                <div
                  className={cn(
                    "p-2 rounded-full shrink-0",
                    config?.color || "text-muted-foreground",
                    isUrgent && "animate-bounce"
                  )}
                >
                  <Icon className="h-5 w-5" />
                </div>

                <div className="flex-1 min-w-0">
                  <AlertTitle className="flex items-center gap-2 mb-1">
                    <Badge variant={urgency.variant} className="text-xs">
                      {t(`schedule.urgency.${urgency.labelKey}`)}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {format(parseISO(alert.alert_date), "EEEE d MMMM", {
                        locale: dateLocale,
                      })}
                    </span>
                  </AlertTitle>
                  <AlertDescription className="text-sm font-medium text-foreground">
                    {translateAlertMessage(alert.message, i18n.language)}
                  </AlertDescription>
                  
                  {/* Supplier contact info */}
                  {hasSupplierInfo && supplierInfo && (
                    <div className="mt-2 p-2 bg-background/50 rounded-md border border-border/50">
                      <div className="flex items-center gap-2 text-xs">
                        <User className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="font-medium">{t("budget.confirmedSupplier")}:</span>
                      </div>
                      <div className="ml-5 mt-1 space-y-0.5">
                        {supplierInfo.supplierName && (
                          <p className="text-sm font-medium">{supplierInfo.supplierName}</p>
                        )}
                        {supplierInfo.supplierPhone && (
                          <a 
                            href={`tel:${supplierInfo.supplierPhone.replace(/\s+/g, '')}`}
                            className="text-sm text-primary hover:underline flex items-center gap-1"
                          >
                            <Phone className="h-3 w-3" />
                            {supplierInfo.supplierPhone}
                          </a>
                        )}
                        {supplierInfo.contactPerson && (
                          <p className="text-xs text-muted-foreground">
                            {t("budget.contactPerson")}: {supplierInfo.contactPerson}
                            {supplierInfo.contactPersonPhone && ` - ${supplierInfo.contactPersonPhone}`}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {config?.labelKey && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {t(`schedule.alertTypes.${config.labelKey}`)}
                    </p>
                  )}
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDismiss(alert.id)}
                  className="flex-shrink-0 hover:bg-destructive/10"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </Alert>
          );
        })}
      </CardContent>
    </Card>
  );
};
