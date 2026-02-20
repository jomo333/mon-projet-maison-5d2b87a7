import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  addMonths,
  subMonths,
  isWeekend,
  parseISO,
  isWithinInterval,
} from "date-fns";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ChevronLeft, ChevronRight, AlertTriangle, CalendarPlus, Edit, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { ScheduleItem } from "@/hooks/useProjectSchedule";
import { getTradeColor, getDisplayColor } from "@/data/tradeTypes";
import { getTranslatedTradeName } from "@/lib/tradeTypesI18n";
import { sortSchedulesByExecutionOrder } from "@/lib/scheduleOrder";
import { getDateLocale } from "@/lib/i18n";

interface ScheduleCalendarProps {
  schedules: ScheduleItem[];
  conflicts: { date: string; trades: string[] }[];
  /** Appelé quand l'utilisateur clique "Ajouter une tâche" pour une date donnée */
  onAddTaskForDay?: (date: Date) => void;
  /** Appelé pour modifier une tâche (ex: basculer vers la vue tableau) */
  onEditTask?: (schedule: ScheduleItem) => void;
  /** Appelé pour supprimer une tâche (avec confirmation côté parent) */
  onDeleteTask?: (schedule: ScheduleItem) => void;
}

export const ScheduleCalendar = ({
  schedules,
  conflicts,
  onAddTaskForDay,
  onEditTask,
  onDeleteTask,
}: ScheduleCalendarProps) => {
  const { t, i18n } = useTranslation();
  const dateLocale = getDateLocale();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [popoverOpen, setPopoverOpen] = useState(false);

  const days = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const getSchedulesForDay = (date: Date): ScheduleItem[] => {
    // Filter schedules that include this day and sort by execution order
    const daySchedules = schedules.filter((schedule) => {
      if (!schedule.start_date || !schedule.end_date) return false;
      const start = parseISO(schedule.start_date);
      const end = parseISO(schedule.end_date);
      return isWithinInterval(date, { start, end });
    });
    return sortSchedulesByExecutionOrder(daySchedules);
  };

  const hasConflict = (date: Date): boolean => {
    const dateStr = format(date, "yyyy-MM-dd");
    return conflicts.some((c) => c.date === dateStr);
  };

  const getConflictTrades = (date: Date): string[] => {
    const dateStr = format(date, "yyyy-MM-dd");
    const conflict = conflicts.find((c) => c.date === dateStr);
    return conflict?.trades || [];
  };

  // Week days - use short format from locale
  const weekDays = useMemo(() => {
    if (i18n.language?.startsWith("en")) {
      return ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    }
    return ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
  }, [i18n.language]);

  // Calculer le premier jour du mois (0 = dimanche, 1 = lundi, etc.)
  const firstDayOfMonth = startOfMonth(currentMonth).getDay();
  // Ajuster pour commencer à lundi (0 = lundi au lieu de dimanche)
  const startOffset = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;

  return (
    <div className="bg-card rounded-lg border p-4">
      {/* Header avec navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
        {onAddTaskForDay && (
          <p className="text-xs text-muted-foreground">
            {t("schedule.clickDayToAddTask", "Cliquez sur un jour pour voir les tâches et ajouter une tâche manuelle")}
          </p>
        )}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h3 className="font-semibold text-lg">
            {format(currentMonth, "MMMM yyyy", { locale: dateLocale })}
          </h3>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Grille du calendrier */}
      <div className="grid grid-cols-7 gap-1">
        {/* En-têtes des jours */}
        {weekDays.map((day) => (
          <div
            key={day}
            className="text-center text-sm font-medium text-muted-foreground py-2"
          >
            {day}
          </div>
        ))}

        {/* Cases vides pour aligner le premier jour */}
        {Array.from({ length: startOffset }).map((_, index) => (
          <div key={`empty-${index}`} className="h-24" />
        ))}

        {/* Jours du mois */}
        {days.map((day) => {
          const daySchedules = getSchedulesForDay(day);
          const isWeekendDay = isWeekend(day);
          const isConflict = hasConflict(day);
          const conflictTrades = getConflictTrades(day);
          const isToday = isSameDay(day, new Date());
          const isSelected = selectedDay && isSameDay(day, selectedDay);

          return (
            <Popover
              key={day.toISOString()}
              open={isSelected && popoverOpen}
              onOpenChange={(open) => {
                setPopoverOpen(open);
                if (!open) setSelectedDay(null);
              }}
            >
              <PopoverTrigger asChild>
                <div
                  onClick={() => {
                    setSelectedDay(day);
                    setPopoverOpen(true);
                  }}
                  className={cn(
                    "h-24 border rounded-md p-1 overflow-hidden",
                    isWeekendDay && "bg-muted/50",
                    isConflict && "border-destructive border-2",
                    isToday && "ring-2 ring-primary",
                    onAddTaskForDay && "cursor-pointer hover:bg-muted/80 transition-colors"
                  )}
                >
              <div className="flex justify-between items-start">
                <span
                  className={cn(
                    "text-sm font-medium",
                    isWeekendDay && "text-muted-foreground"
                  )}
                >
                  {format(day, "d")}
                </span>
                {isConflict && (
                  <Tooltip>
                    <TooltipTrigger>
                      <AlertTriangle className="h-4 w-4 text-destructive" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="font-medium">{t("schedule.conflicts")}!</p>
                      <ul className="text-sm">
                        {conflictTrades.map((trade) => (
                          <li key={trade}>{getTranslatedTradeName(t, trade)}</li>
                        ))}
                      </ul>
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>

              <div className="space-y-0.5 mt-1">
                {daySchedules.slice(0, 3).map((schedule) => (
                  <Tooltip key={schedule.id}>
                    <TooltipTrigger className="w-full">
                      <div
                        className="text-xs px-1 py-0.5 rounded truncate text-white"
                        style={{ backgroundColor: getDisplayColor(schedule.step_id, schedule.trade_type, schedule.trade_color) }}
                      >
                        {schedule.step_name}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="font-medium">{schedule.step_name}</p>
                      <p className="text-sm">{getTranslatedTradeName(t, schedule.trade_type)}</p>
                      {schedule.supplier_name && (
                        <p className="text-sm">
                          {t("schedule.supplier")}: {schedule.supplier_name}
                        </p>
                      )}
                    </TooltipContent>
                  </Tooltip>
                ))}
                {daySchedules.length > 3 && (
                  <div className="text-xs text-muted-foreground">
                    +{daySchedules.length - 3} autres
                  </div>
                )}
              </div>
            </div>
              </PopoverTrigger>
              <PopoverContent className="w-80" align="start">
                <div className="space-y-3">
                  <div className="font-semibold">
                    {selectedDay && format(selectedDay, "EEEE d MMMM yyyy", { locale: dateLocale })}
                  </div>
                  {selectedDay && (
                    <>
                      {getSchedulesForDay(selectedDay).length > 0 ? (
                        <div className="space-y-2">
                          <p className="text-sm font-medium text-muted-foreground">
                            {t("schedule.tasksForDay", "Tâches ce jour-là")}:
                          </p>
                          {getSchedulesForDay(selectedDay).map((s) => (
                            <div
                              key={s.id}
                              className="flex items-center gap-2 py-2 px-2 rounded-md bg-muted/50"
                            >
                              <div
                                className="w-2 h-2 rounded-full shrink-0"
                                style={{ backgroundColor: getDisplayColor(s.step_id, s.trade_type, s.trade_color) }}
                              />
                              <div className="flex-1 min-w-0">
                                <p className="font-medium truncate">{s.step_name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {getTranslatedTradeName(t, s.trade_type)}
                                  {s.start_date && s.end_date && (
                                    <> · {s.start_date} → {s.end_date}</>
                                  )}
                                </p>
                              </div>
                              {(onEditTask || onDeleteTask) && (
                                <div className="flex items-center gap-1 shrink-0">
                                  {onEditTask && (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onEditTask(s);
                                        setPopoverOpen(false);
                                        setSelectedDay(null);
                                      }}
                                      title={t("common.edit", "Modifier")}
                                    >
                                      <Edit className="h-3.5 w-3.5" />
                                    </Button>
                                  )}
                                  {onDeleteTask && (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7 text-destructive hover:text-destructive"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onDeleteTask(s);
                                      }}
                                      title={t("common.delete", "Supprimer")}
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                  )}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          {t("schedule.noTasksForDay", "Aucune tâche ce jour-là")}
                        </p>
                      )}
                      {onAddTaskForDay && (
                        <Button
                          size="sm"
                          className="w-full gap-2"
                          onClick={() => {
                            onAddTaskForDay(selectedDay);
                            setPopoverOpen(false);
                            setSelectedDay(null);
                          }}
                        >
                          <CalendarPlus className="h-4 w-4" />
                          {t("schedule.addManualTask", "Ajouter une tâche manuelle")}
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          );
        })}
      </div>
    </div>
  );
};
