import { format, parseISO, isPast, isToday, addDays, isBefore } from "date-fns";
import { fr } from "date-fns/locale";
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

interface AlertsPanelProps {
  alerts: ScheduleAlert[];
  onDismiss: (alertId: string) => void;
}

const alertTypeConfig: Record<
  string,
  { icon: React.ElementType; label: string; color: string; urgent?: boolean }
> = {
  supplier_call: {
    icon: Phone,
    label: "Appeler fournisseur",
    color: "text-blue-500 bg-blue-500/10",
  },
  fabrication_start: {
    icon: Factory,
    label: "Lancer fabrication",
    color: "text-orange-500 bg-orange-500/10",
  },
  measurement: {
    icon: Ruler,
    label: "Prise de mesures",
    color: "text-purple-500 bg-purple-500/10",
  },
  contact_subcontractor: {
    icon: PhoneCall,
    label: "Contacter sous-traitant",
    color: "text-amber-500 bg-amber-500/20",
    urgent: true,
  },
};

export const AlertsPanel = ({ alerts, onDismiss }: AlertsPanelProps) => {
  const sortedAlerts = [...alerts].sort((a, b) => {
    const dateA = parseISO(a.alert_date);
    const dateB = parseISO(b.alert_date);
    return dateA.getTime() - dateB.getTime();
  });

  const getAlertUrgency = (alertDate: string) => {
    const date = parseISO(alertDate);
    const today = new Date();

    if (isPast(date) && !isToday(date)) {
      return { level: "overdue", label: "En retard", variant: "destructive" as const };
    }
    if (isToday(date)) {
      return { level: "today", label: "Aujourd'hui", variant: "destructive" as const };
    }
    if (isBefore(date, addDays(today, 3))) {
      return { level: "soon", label: "Bientôt", variant: "default" as const };
    }
    return { level: "upcoming", label: "À venir", variant: "secondary" as const };
  };

  if (alerts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Alertes et rappels
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-4">
            Aucune alerte active
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
            Alertes et rappels
            <Badge variant="secondary">{alerts.length}</Badge>
          </div>
          {overdueCount > 0 && (
            <Badge variant="destructive" className="flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              {overdueCount} en retard
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
                        {urgency.label}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {format(parseISO(alert.alert_date), "EEEE d MMMM", {
                          locale: fr,
                        })}
                      </span>
                    </div>
                    <p className="text-sm font-medium">{alert.message}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {config?.label}
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
