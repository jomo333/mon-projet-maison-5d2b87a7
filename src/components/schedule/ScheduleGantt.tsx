import { useMemo, useRef, useState, useCallback } from "react";
import {
  format,
  parseISO,
  differenceInDays,
  addDays,
  min,
  max,
  eachWeekOfInterval,
  startOfWeek,
} from "date-fns";
import { fr } from "date-fns/locale";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { ScheduleItem } from "@/hooks/useProjectSchedule";
import { getTradeName, getTradeColor } from "@/data/tradeTypes";
import { sortSchedulesByExecutionOrder } from "@/lib/scheduleOrder";

interface ScheduleGanttProps {
  schedules: ScheduleItem[];
  conflicts: { date: string; trades: string[] }[];
}

export const ScheduleGantt = ({ schedules, conflicts }: ScheduleGanttProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const scrollContainer = containerRef.current.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement;
    if (!scrollContainer) return;
    
    setIsDragging(true);
    setStartX(e.pageX - scrollContainer.offsetLeft);
    setScrollLeft(scrollContainer.scrollLeft);
    scrollContainer.style.cursor = 'grabbing';
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging || !containerRef.current) return;
    const scrollContainer = containerRef.current.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement;
    if (!scrollContainer) return;
    
    e.preventDefault();
    const x = e.pageX - scrollContainer.offsetLeft;
    const walk = (x - startX) * 1.5; // Vitesse du scroll
    scrollContainer.scrollLeft = scrollLeft - walk;
  }, [isDragging, startX, scrollLeft]);

  const handleMouseUp = useCallback(() => {
    if (!containerRef.current) return;
    const scrollContainer = containerRef.current.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement;
    if (scrollContainer) {
      scrollContainer.style.cursor = 'grab';
    }
    setIsDragging(false);
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (isDragging) {
      handleMouseUp();
    }
  }, [isDragging, handleMouseUp]);

  // Sort schedules by execution order and filter those with dates
  const schedulesWithDates = useMemo(() => 
    sortSchedulesByExecutionOrder(schedules).filter((s) => s.start_date && s.end_date),
    [schedules]
  );

  const { minDate, maxDate, totalDays, weeks } = useMemo(() => {
    if (schedulesWithDates.length === 0) {
      const today = new Date();
      return {
        minDate: today,
        maxDate: addDays(today, 90),
        totalDays: 90,
        weeks: [],
      };
    }

    const dates = schedulesWithDates.flatMap((s) => [
      parseISO(s.start_date!),
      parseISO(s.end_date!),
    ]);

    const minD = min(dates);
    const maxD = max(dates);
    
    // Aligner minDate sur le début de la semaine (lundi) pour synchroniser l'en-tête avec les barres
    const alignedMinDate = startOfWeek(minD, { weekStartsOn: 1 });
    const total = differenceInDays(maxD, alignedMinDate) + 1;

    const weeksInterval = eachWeekOfInterval(
      { start: alignedMinDate, end: maxD },
      { weekStartsOn: 1 }
    );

    return {
      minDate: alignedMinDate,
      maxDate: maxD,
      totalDays: total,
      weeks: weeksInterval,
    };
  }, [schedulesWithDates]);

  const dayWidth = 30;
  const rowHeight = 40;
  const headerHeight = 60;

  const getBarPosition = (schedule: ScheduleItem) => {
    if (!schedule.start_date || !schedule.end_date) return null;

    const start = parseISO(schedule.start_date);
    const end = parseISO(schedule.end_date);
    const left = differenceInDays(start, minDate) * dayWidth;
    const width = (differenceInDays(end, start) + 1) * dayWidth;

    return { left, width };
  };

  const hasConflict = (schedule: ScheduleItem) => {
    return conflicts.some((c) => c.trades.includes(schedule.trade_type));
  };

  if (schedulesWithDates.length === 0) {
    return (
      <div className="bg-card rounded-lg border p-8 text-center text-muted-foreground">
        <p>Aucune étape planifiée avec des dates.</p>
        <p className="text-sm">
          Ajoutez des dates de début aux étapes pour voir le diagramme de Gantt.
        </p>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className="bg-card rounded-lg border"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
    >
      <ScrollArea className="w-full">
        <div
          style={{
            minWidth: totalDays * dayWidth + 250,
            height: schedulesWithDates.length * rowHeight + headerHeight + 20,
          }}
        >
          {/* Header avec les semaines */}
          <div
            className="sticky top-0 z-10 bg-background border-b"
            style={{ height: headerHeight }}
          >
            <div className="flex" style={{ marginLeft: 250 }}>
              {weeks.map((week, index) => (
                <div
                  key={week.toISOString()}
                  className="border-r px-1 py-1"
                  style={{ width: 7 * dayWidth }}
                >
                  <div className="text-xs font-medium">
                    {format(week, "d MMM", { locale: fr })}
                  </div>
                  <div className="flex mt-1">
                    {[...Array(7)].map((_, dayIndex) => {
                      const day = addDays(week, dayIndex);
                      const isWeekend = dayIndex >= 5;
                      return (
                        <div
                          key={dayIndex}
                          className={cn(
                            "text-center text-xs",
                            isWeekend && "text-muted-foreground"
                          )}
                          style={{ width: dayWidth }}
                        >
                          {format(day, "EEE", { locale: fr }).charAt(0)}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Lignes du Gantt */}
          <div className="relative" style={{ paddingTop: 10 }}>
            {schedulesWithDates.map((schedule, index) => {
              const position = getBarPosition(schedule);
              if (!position) return null;

              return (
                <div
                  key={schedule.id}
                  className="flex items-center border-b"
                  style={{ height: rowHeight }}
                >
                  {/* Nom de l'étape */}
                  <div
                    className="sticky left-0 z-10 bg-background px-2 flex items-center gap-2 border-r"
                    style={{ width: 250, minWidth: 250 }}
                  >
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: getTradeColor(schedule.trade_type) }}
                    />
                    <span className="truncate text-sm">
                      {schedule.step_name}
                    </span>
                    {hasConflict(schedule) && (
                      <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0" />
                    )}
                  </div>

                  {/* Zone du graphique */}
                  <div
                    className="relative h-full"
                    style={{ width: totalDays * dayWidth }}
                  >
                    {/* Grille de fond */}
                    <div className="absolute inset-0 flex">
                      {[...Array(totalDays)].map((_, i) => {
                        const day = addDays(minDate, i);
                        const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                        return (
                          <div
                            key={i}
                            className={cn(
                              "border-r h-full",
                              isWeekend && "bg-muted/30"
                            )}
                            style={{ width: dayWidth }}
                          />
                        );
                      })}
                    </div>

                    {/* Barre de la tâche */}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div
                          className={cn(
                            "absolute top-2 h-6 rounded cursor-pointer transition-opacity hover:opacity-80",
                            hasConflict(schedule) && "ring-2 ring-destructive"
                          )}
                          style={{
                            left: position.left,
                            width: Math.max(position.width, dayWidth),
                            backgroundColor: getTradeColor(schedule.trade_type),
                          }}
                        >
                          <span className="text-xs text-white px-1 truncate block leading-6">
                            {schedule.actual_days || schedule.estimated_days}j
                          </span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <div className="space-y-1">
                          <p className="font-medium">{schedule.step_name}</p>
                          <p className="text-sm">
                            {getTradeName(schedule.trade_type)}
                          </p>
                          <p className="text-sm">
                            {format(parseISO(schedule.start_date!), "d MMM", {
                              locale: fr,
                            })}{" "}
                            -{" "}
                            {format(parseISO(schedule.end_date!), "d MMM yyyy", {
                              locale: fr,
                            })}
                          </p>
                          <p className="text-sm">
                            Durée: {schedule.actual_days || schedule.estimated_days}{" "}
                            jours
                          </p>
                          {schedule.supplier_name && (
                            <p className="text-sm">
                              Fournisseur: {schedule.supplier_name}
                            </p>
                          )}
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      {/* Légende */}
      <div className="border-t p-4">
        <div className="flex flex-wrap gap-2">
          {schedulesWithDates
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
      </div>
    </div>
  );
};
