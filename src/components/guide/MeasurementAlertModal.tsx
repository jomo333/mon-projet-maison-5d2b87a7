import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { format, parseISO, isPast, isToday, addHours, addDays, addWeeks } from "date-fns";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Bell, Phone, Factory, Ruler, PhoneCall, AlertTriangle, Clock, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { ScheduleAlert } from "@/hooks/useProjectSchedule";
import { getDateLocale } from "@/lib/i18n";
import { translateAlertMessage } from "@/lib/alertMessagesI18n";
import { usePlanLimits } from "@/hooks/usePlanLimits";

interface MeasurementAlertModalProps {
  alerts: ScheduleAlert[];
  projectId: string | undefined;
}

const alertTypeConfig: Record<
  string,
  { icon: React.ElementType; labelKey: string; color: string }
> = {
  supplier_call: {
    icon: Phone,
    labelKey: "supplierCall",
    color: "text-blue-600",
  },
  fabrication_start: {
    icon: Factory,
    labelKey: "fabricationStart",
    color: "text-orange-600",
  },
  measurement: {
    icon: Ruler,
    labelKey: "measurement",
    color: "text-purple-600",
  },
  contact_subcontractor: {
    icon: PhoneCall,
    labelKey: "contactSubcontractor",
    color: "text-amber-600",
  },
};

type ReminderOption = {
  labelKey: string;
  getValue: () => number; // Returns timestamp
};

const reminderOptions: ReminderOption[] = [
  { labelKey: "1hour", getValue: () => addHours(new Date(), 1).getTime() },
  { labelKey: "3hours", getValue: () => addHours(new Date(), 3).getTime() },
  { labelKey: "tomorrow", getValue: () => addDays(new Date(), 1).getTime() },
  { labelKey: "2days", getValue: () => addDays(new Date(), 2).getTime() },
  { labelKey: "1week", getValue: () => addWeeks(new Date(), 1).getTime() },
  { labelKey: "2weeks", getValue: () => addWeeks(new Date(), 2).getTime() },
];

const getAlertFingerprint = (alert: ScheduleAlert) =>
  `${alert.alert_type}|${alert.schedule_id}|${alert.alert_date}`;

// Helper to load acknowledged alerts from localStorage synchronously
// NOTE: We store both alert.id and a stable fingerprint so regenerated alerts don't reappear.
const getStoredAcknowledgedAlerts = (projectId: string | undefined): Set<string> => {
  if (!projectId) return new Set();
  const acknowledgedKey = `acknowledged_alerts_${projectId}`;
  const stored = localStorage.getItem(acknowledgedKey);
  if (stored) {
    try {
      return new Set(JSON.parse(stored));
    } catch {
      localStorage.removeItem(acknowledgedKey);
    }
  }
  return new Set();
};

export const MeasurementAlertModal = ({ alerts, projectId }: MeasurementAlertModalProps) => {
  const { t, i18n } = useTranslation();
  const dateLocale = getDateLocale();
  const [isOpen, setIsOpen] = useState(false);
  
  // Check if user has premium plan for alerts
  const { hasFullManagement, loading: planLoading } = usePlanLimits();
  
  // Initialize acknowledged alerts synchronously from localStorage
  const [acknowledgedAlerts, setAcknowledgedAlerts] = useState<Set<string>>(
    () => getStoredAcknowledgedAlerts(projectId)
  );

  // Update acknowledged alerts if projectId changes
  useEffect(() => {
    setAcknowledgedAlerts(getStoredAcknowledgedAlerts(projectId));
  }, [projectId]);

  const isAcknowledged = (alert: ScheduleAlert) => {
    const fingerprint = getAlertFingerprint(alert);
    return acknowledgedAlerts.has(alert.id) || acknowledgedAlerts.has(fingerprint);
  };

  // Filter alerts: not dismissed in DB, and not already acknowledged by user
  const activeAlerts = alerts.filter(
    (alert) => !alert.is_dismissed && !isAcknowledged(alert)
  );

  // Deduplicate alerts (some sync paths can create duplicates).
  const visibleAlerts: ScheduleAlert[] = [];
  const seenFingerprints = new Set<string>();
  for (const alert of activeAlerts) {
    const fingerprint = getAlertFingerprint(alert);
    if (seenFingerprints.has(fingerprint)) continue;
    seenFingerprints.add(fingerprint);
    visibleAlerts.push(alert);
  }

  // Check if we should show the modal - only for premium users
  useEffect(() => {
    if (planLoading) return;
    if (!hasFullManagement) return; // Don't show modal for non-premium users
    
    if (visibleAlerts.length > 0 && projectId) {
      // Check localStorage to see if we've snoozed
      const snoozeKey = `alert_modal_snooze_${projectId}`;
      const snoozeUntil = localStorage.getItem(snoozeKey);
      const now = Date.now();
      
      // If snoozed and snooze time hasn't passed, don't show
      if (snoozeUntil && now < parseInt(snoozeUntil)) {
        return;
      }
      
      // Show modal immediately if there are new alerts
      setIsOpen(true);
    }
  }, [visibleAlerts.length, projectId, hasFullManagement, planLoading]);

  const getAlertUrgency = (alertDate: string) => {
    const date = parseISO(alertDate);
    if (isPast(date) && !isToday(date)) {
      return { level: "overdue", labelKey: "overdue", variant: "destructive" as const };
    }
    if (isToday(date)) {
      return { level: "today", labelKey: "today", variant: "destructive" as const };
    }
    return { level: "upcoming", labelKey: "upcoming", variant: "secondary" as const };
  };

  // Don't render anything for non-premium users or if no alerts
  if (!hasFullManagement || visibleAlerts.length === 0) {
    return null;
  }

  const handleClose = () => {
    // Permanently acknowledge all currently shown alerts
    if (projectId) {
      const newAcknowledged = new Set(acknowledgedAlerts);
      visibleAlerts.forEach((alert) => {
        newAcknowledged.add(alert.id);
        newAcknowledged.add(getAlertFingerprint(alert));
      });
      setAcknowledgedAlerts(newAcknowledged);
      
      // Persist to localStorage
      const acknowledgedKey = `acknowledged_alerts_${projectId}`;
      localStorage.setItem(acknowledgedKey, JSON.stringify(Array.from(newAcknowledged)));
    }
    setIsOpen(false);
  };

  const handleRemindLater = (reminderTimestamp: number) => {
    if (projectId) {
      const snoozeKey = `alert_modal_snooze_${projectId}`;
      localStorage.setItem(snoozeKey, reminderTimestamp.toString());
    }
    setIsOpen(false);
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogContent className="max-w-lg border-2 border-amber-500 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/50 dark:to-orange-950/50">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-3 text-xl">
            <div className="p-2 rounded-full bg-amber-500 text-white animate-pulse">
              <Bell className="h-6 w-6" />
            </div>
            <span className="text-amber-800 dark:text-amber-300">
              {t("schedule.alertsTitle")} ({visibleAlerts.length})
            </span>
          </AlertDialogTitle>
          <AlertDialogDescription className="text-amber-700 dark:text-amber-400 text-base">
            {t("schedule.alertsModalDescription")}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-3 my-4 max-h-[50vh] overflow-y-auto">
          {visibleAlerts.map((alert) => {
            const config = alertTypeConfig[alert.alert_type];
            const urgency = getAlertUrgency(alert.alert_date);
            const Icon = config?.icon || Bell;
            const isUrgent = urgency.level === "overdue" || urgency.level === "today";

            return (
              <div
                key={alert.id}
                className={cn(
                  "p-4 rounded-lg border-2 bg-white dark:bg-slate-900",
                  isUrgent
                    ? "border-destructive/50 animate-pulse"
                    : "border-amber-300 dark:border-amber-700"
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
                    <p className="font-medium text-foreground">{translateAlertMessage(alert.message, i18n.language)}</p>
                    {config?.labelKey && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {t(`schedule.alertTypes.${config.labelKey}`)}
                      </p>
                    )}
                  </div>

                  {isUrgent && (
                    <AlertTriangle className="h-5 w-5 text-destructive shrink-0 animate-pulse" />
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          {/* Remind me later dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="w-full sm:w-auto gap-2 border-amber-400 text-amber-700 hover:bg-amber-100 dark:border-amber-600 dark:text-amber-400 dark:hover:bg-amber-900/50">
                <Clock className="h-4 w-4" />
                {t("schedule.remindLater")}
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>{t("schedule.remindMeIn")}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {reminderOptions.map((option) => (
                <DropdownMenuItem
                  key={option.labelKey}
                  onClick={() => handleRemindLater(option.getValue())}
                  className="cursor-pointer"
                >
                  <Clock className="h-4 w-4 mr-2" />
                  {t(`schedule.reminderOptions.${option.labelKey}`)}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Got it button */}
          <Button
            onClick={handleClose}
            className="w-full sm:w-auto bg-amber-600 hover:bg-amber-700 text-white"
          >
            {t("common.understood")}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
