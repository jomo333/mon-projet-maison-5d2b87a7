import { useTranslation } from "react-i18next";
import { format, parseISO, isPast, isToday, addDays, isBefore } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Phone,
  Factory,
  Ruler,
  X,
  Bell,
  AlertTriangle,
  PhoneCall,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ScheduleAlert } from "@/hooks/useProjectSchedule";
import { getDateLocale } from "@/lib/i18n";
import { translateAlertMessage } from "@/lib/alertMessagesI18n";

interface AlertsPanelProps {
  alerts: ScheduleAlert[];
  onDismiss: (alertId: string) => void;
}

const alertTypeConfig: Record<
  string,
  { icon: React.ElementType; labelKey: string; color: string; urgent?: boolean }
> = {
  supplier_call: {
    icon: Phone,
    labelKey: "supplierCall",
    color: "text-blue-500 bg-blue-500/10",
  },
  fabrication_start: {
    icon: Factory,
    labelKey: "fabricationStart",
    color: "text-orange-500 bg-orange-500/10",
  },
  measurement: {
    icon: Ruler,
    labelKey: "measurement",
    color: "text-purple-500 bg-purple-500/10",
  },
  contact_subcontractor: {
    icon: PhoneCall,
    labelKey: "contactSubcontractor",
    color: "text-amber-500 bg-amber-500/20",
    urgent: true,
  },
};

export const AlertsPanel = ({ alerts, onDismiss }: AlertsPanelProps) => {
  const { t, i18n } = useTranslation();
  const dateLocale = getDateLocale();
  
  const sortedAlerts = [...alerts].sort((a, b) => {
    const dateA = parseISO(a.alert_date);
    const dateB = parseISO(b.alert_date);
    return dateA.getTime() - dateB.getTime();
  });

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

  if (alerts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            {t("schedule.alertsAndReminders")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-4">
            {t("schedule.noActiveAlerts")}
          </p>
        </CardContent>
      </Card>
    );
  }

  const overdueCount = sortedAlerts.filter(
    (a) => isPast(parseISO(a.alert_date)) && !isToday(parseISO(a.alert_date))
  ).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            {t("schedule.alertsAndReminders")}
            <Badge variant="secondary">{alerts.length}</Badge>
          </div>
          {overdueCount > 0 && (
            <Badge variant="destructive" className="flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              {overdueCount} {t("schedule.overdue")}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-3">
            {sortedAlerts.map((alert) => {
              const config = alertTypeConfig[alert.alert_type];
              const urgency = getAlertUrgency(alert.alert_date);
              const Icon = config?.icon || Bell;
              const isUrgentSubcontractor = config?.urgent === true;

              return (
                <div
                  key={alert.id}
                  className={cn(
                    "flex items-start gap-3 p-3 rounded-lg border transition-all",
                    urgency.level === "overdue" && "border-destructive bg-destructive/5",
                    urgency.level === "today" && "border-amber-500 bg-amber-500/5",
                    isUrgentSubcontractor && "border-amber-500 bg-amber-100 dark:bg-amber-950/50 animate-pulse"
                  )}
                >
                  <div
                    className={cn(
                      "p-2 rounded-full",
                      config?.color || "text-muted-foreground bg-muted",
                      isUrgentSubcontractor && "animate-bounce"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={urgency.variant} className="text-xs">
                        {t(`schedule.urgency.${urgency.labelKey}`)}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {format(parseISO(alert.alert_date), "EEEE d MMMM", {
                          locale: dateLocale,
                        })}
                      </span>
                    </div>
                    <p className="text-sm font-medium">{translateAlertMessage(alert.message, i18n.language)}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {config?.labelKey ? t(`schedule.alertTypes.${config.labelKey}`) : ""}
                    </p>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDismiss(alert.id)}
                    className="flex-shrink-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
