import { useState, useMemo } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  isWeekend,
  parseISO,
  isWithinInterval,
} from "date-fns";
import { fr } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ChevronLeft, ChevronRight, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { ScheduleItem } from "@/hooks/useProjectSchedule";
import { getTradeName, getTradeColor } from "@/data/tradeTypes";
import { sortSchedulesByExecutionOrder } from "@/lib/scheduleOrder";

interface ScheduleCalendarProps {
  schedules: ScheduleItem[];
  conflicts: { date: string; trades: string[] }[];
}

export const ScheduleCalendar = ({
  schedules,
  conflicts,
}: ScheduleCalendarProps) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());

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

  const weekDays = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

  // Calculer le premier jour du mois (0 = dimanche, 1 = lundi, etc.)
  const firstDayOfMonth = startOfMonth(currentMonth).getDay();
  // Ajuster pour commencer à lundi (0 = lundi au lieu de dimanche)
  const startOffset = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;

  return (
    <div className="bg-card rounded-lg border p-4">
      {/* Header avec navigation */}
      <div className="flex items-center justify-between mb-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h3 className="font-semibold text-lg">
          {format(currentMonth, "MMMM yyyy", { locale: fr })}
        </h3>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Légende des métiers */}
      <div className="flex flex-wrap gap-2 mb-4 pb-4 border-b">
        {schedules
          .reduce<ScheduleItem[]>((acc, s) => {
            if (!acc.find((a) => a.trade_type === s.trade_type)) {
              acc.push(s);
            }
            return acc;
          }, [])
          .map((schedule) => (
            <Badge
              key={schedule.trade_type}
              variant="outline"
              className="flex items-center gap-1"
            >
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: getTradeColor(schedule.trade_type) }}
              />
              {getTradeName(schedule.trade_type)}
            </Badge>
          ))}
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

          return (
            <div
              key={day.toISOString()}
              className={cn(
                "h-24 border rounded-md p-1 overflow-hidden",
                isWeekendDay && "bg-muted/50",
                isConflict && "border-destructive border-2",
                isToday && "ring-2 ring-primary"
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
                      <p className="font-medium">Conflit de métiers!</p>
                      <ul className="text-sm">
                        {conflictTrades.map((trade) => (
                          <li key={trade}>{getTradeName(trade)}</li>
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
                        style={{ backgroundColor: getTradeColor(schedule.trade_type) }}
                      >
                        {schedule.step_name}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="font-medium">{schedule.step_name}</p>
                      <p className="text-sm">{getTradeName(schedule.trade_type)}</p>
                      {schedule.supplier_name && (
                        <p className="text-sm">
                          Fournisseur: {schedule.supplier_name}
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
          );
        })}
      </div>
    </div>
  );
};
