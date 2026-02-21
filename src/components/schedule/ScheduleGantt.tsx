import { useMemo, useRef, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useIsMobile } from "@/hooks/use-mobile";
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
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Clock, Lock, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { ScheduleItem } from "@/hooks/useProjectSchedule";
import { getTradeColor, getDisplayColor } from "@/data/tradeTypes";
import { getTranslatedTradeName } from "@/lib/tradeTypesI18n";
import { getTranslatedStepName } from "@/lib/stepNameI18n";
import { sortSchedulesByExecutionOrder } from "@/lib/scheduleOrder";
import { useConstructionSteps } from "@/hooks/useConstructionSteps";
import { getDateLocale } from "@/lib/i18n";

// Délais obligatoires (cure du béton, etc.)
const minimumDelayConfig: Record<string, { afterStep: string; days: number; reasonKey: string }> = {
  structure: {
    afterStep: "fondation",
    days: 21,
    reasonKey: "concreteCuring",
  },
  exterieur: {
    afterStep: "electricite-roughin",
    days: 0,
    reasonKey: "exteriorAfterElectrical",
  },
};

interface ScheduleGanttProps {
  schedules: ScheduleItem[];
  conflicts: { date: string; trades: string[] }[];
  onRegenerateSchedule?: () => Promise<void>;
  isUpdating?: boolean;
}

export const ScheduleGantt = ({ schedules, conflicts, onRegenerateSchedule, isUpdating }: ScheduleGanttProps) => {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const dateLocale = getDateLocale();
  const localizedSteps = useConstructionSteps();
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLElement | null>(null);
  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const scrollLeftRef = useRef(0);
  const scrollTopRef = useRef(0);
  const [cursorStyle, setCursorStyle] = useState<'grab' | 'grabbing'>('grab');

  // Obtenir le container de scroll : sur mobile c'est containerRef, sur desktop c'est Radix viewport
  const getScrollContainer = useCallback(() => {
    if (isMobile && containerRef.current) return containerRef.current;
    if (!scrollContainerRef.current && containerRef.current) {
      scrollContainerRef.current = containerRef.current.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement;
    }
    return scrollContainerRef.current;
  }, [isMobile]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const scrollContainer = getScrollContainer();
    if (!scrollContainer) return;
    
    isDraggingRef.current = true;
    startXRef.current = e.pageX - scrollContainer.offsetLeft;
    scrollLeftRef.current = scrollContainer.scrollLeft;
    setCursorStyle('grabbing');
  }, [getScrollContainer]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDraggingRef.current) return;
    const scrollContainer = getScrollContainer();
    if (!scrollContainer) return;
    
    e.preventDefault();
    const x = e.pageX - scrollContainer.offsetLeft;
    const walk = (x - startXRef.current) * 2; // Vitesse du scroll augmentée
    
    // Utiliser requestAnimationFrame pour un scroll plus fluide
    requestAnimationFrame(() => {
      scrollContainer.scrollLeft = scrollLeftRef.current - walk;
    });
  }, [getScrollContainer]);

  const handleMouseUp = useCallback(() => {
    isDraggingRef.current = false;
    setCursorStyle('grab');
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (isDraggingRef.current) {
      handleMouseUp();
    }
  }, [handleMouseUp]);

  // Support tactile pour mobile : glisser pour faire défiler (horizontal + vertical)
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const scrollContainer = getScrollContainer();
    if (!scrollContainer) return;
    isDraggingRef.current = true;
    startXRef.current = e.touches[0].pageX;
    startYRef.current = e.touches[0].pageY;
    scrollLeftRef.current = scrollContainer.scrollLeft;
    scrollTopRef.current = scrollContainer.scrollTop;
  }, [getScrollContainer]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDraggingRef.current) return;
    const scrollContainer = getScrollContainer();
    if (!scrollContainer) return;
    e.preventDefault();
    const x = e.touches[0].pageX;
    const y = e.touches[0].pageY;
    const walkX = (x - startXRef.current) * 1.5;
    const walkY = y - startYRef.current;
    scrollContainer.scrollLeft = scrollLeftRef.current - walkX;
    scrollContainer.scrollTop = scrollTopRef.current - walkY;
    startXRef.current = x;
    startYRef.current = y;
    scrollLeftRef.current = scrollContainer.scrollLeft;
    scrollTopRef.current = scrollContainer.scrollTop;
  }, [getScrollContainer]);

  const handleTouchEnd = useCallback(() => {
    isDraggingRef.current = false;
  }, []);

  // Sur mobile : scroll natif (overflow-auto), pas de gestion manuelle du touch

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

  const dayWidth = isMobile ? 24 : 30;
  const rowHeight = isMobile ? 36 : 40;
  const headerHeight = isMobile ? 70 : 80;
  const labelWidth = isMobile ? 140 : 250;

  const getBarPosition = (schedule: ScheduleItem) => {
    if (!schedule.start_date || !schedule.end_date) return null;

    const start = parseISO(schedule.start_date);
    const left = differenceInDays(start, minDate) * dayWidth;
    
    // Pour les étapes complétées, utiliser actual_days pour la largeur
    // Sinon, utiliser la différence entre end_date et start_date
    let durationDays: number;
    if (schedule.status === 'completed' && schedule.actual_days) {
      durationDays = schedule.actual_days;
    } else {
      const end = parseISO(schedule.end_date);
      durationDays = differenceInDays(end, start) + 1;
    }
    
    const width = durationDays * dayWidth;

    return { left, width };
  };

  const hasConflict = (schedule: ScheduleItem) => {
    return conflicts.some((c) => c.trades.includes(schedule.trade_type));
  };

  // Calcule la période de cure du béton entre fondation et structure
  const getCuringPeriod = useMemo(() => {
    const fondation = schedulesWithDates.find(s => s.step_id === "fondation");
    const structure = schedulesWithDates.find(s => s.step_id === "structure");
    
    if (!fondation?.end_date || !structure?.start_date) return null;
    
    const fondationEnd = parseISO(fondation.end_date);
    const structureStart = parseISO(structure.start_date);
    const gapDays = differenceInDays(structureStart, fondationEnd);
    
    // S'il y a un écart >= 1 jour, on montre la période de cure
    if (gapDays >= 1) {
      const left = differenceInDays(addDays(fondationEnd, 1), minDate) * dayWidth;
      const width = (gapDays - 1) * dayWidth;
      return { left, width, days: gapDays - 1 };
    }
    return null;
  }, [schedulesWithDates, minDate, dayWidth]);

  // Vérifie si une étape a un délai obligatoire
  const getDelayInfo = (schedule: ScheduleItem) => {
    return minimumDelayConfig[schedule.step_id];
  };

  if (schedulesWithDates.length === 0) {
    return (
      <div className="bg-card rounded-lg border p-8 text-center text-muted-foreground">
        <p>{t("schedule.noScheduledSteps")}</p>
        <p className="text-sm">
          {t("schedule.addDatesToSeeGantt")}
        </p>
      </div>
    );
  }

  return (
    <div className={cn("bg-card rounded-lg border", isMobile && "min-w-0")}>
      {/* Header avec titre et bouton */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <h3 className="font-semibold text-lg">{t("schedule.projectPlanning")}</h3>
        {onRegenerateSchedule && (
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              await onRegenerateSchedule();
            }}
            disabled={isUpdating}
            className="gap-2"
          >
            <RotateCcw className={`h-4 w-4 ${isUpdating ? "animate-spin" : ""}`} />
            {t("schedule.updateSchedule")}
          </Button>
        )}
      </div>
      
      {isMobile && (
        <p className="text-xs text-muted-foreground px-4 py-1 text-center border-b bg-muted/30">
          {t("schedule.swipeToScroll")}
        </p>
      )}
      <div 
        ref={containerRef}
        onMouseDown={!isMobile ? handleMouseDown : undefined}
        onMouseMove={!isMobile ? handleMouseMove : undefined}
        onMouseUp={!isMobile ? handleMouseUp : undefined}
        onMouseLeave={!isMobile ? handleMouseLeave : undefined}
        onTouchStart={isMobile ? undefined : handleTouchStart}
        onTouchMove={isMobile ? undefined : handleTouchMove}
        onTouchEnd={isMobile ? undefined : handleTouchEnd}
        onTouchCancel={isMobile ? undefined : handleTouchEnd}
        className={cn(
          !isMobile && "select-none",
          isMobile && "min-w-0 w-full max-w-full overflow-x-scroll overflow-y-auto max-h-[70vh] [-webkit-overflow-scrolling:touch] overscroll-x-contain"
        )}
        style={{ cursor: isMobile ? "default" : cursorStyle, ...(isMobile && { touchAction: "pan-x pan-y" } as React.CSSProperties) }}
      >
        {/* Sur mobile : div scrollable natif. Sur desktop : ScrollArea */}
        {isMobile ? (
          <div
            className="will-change-transform min-h-full"
            style={{
              minWidth: totalDays * dayWidth + labelWidth,
              height: schedulesWithDates.length * rowHeight + headerHeight + 20,
            }}
          >
          {/* Header avec les semaines - z-50 pour rester au-dessus des barres */}
          <div
            className="sticky top-0 z-50 bg-background border-b shadow-sm"
            style={{ height: headerHeight }}
          >
            <div className="flex" style={{ marginLeft: labelWidth }}>
              {weeks.map((week, index) => (
                <div
                  key={week.toISOString()}
                  className="border-r px-1 py-1"
                  style={{ width: 7 * dayWidth }}
                >
                  <div className="text-xs font-medium">
                    {format(week, "d MMM", { locale: dateLocale })}
                  </div>
                  <div className="flex mt-1">
                    {[...Array(7)].map((_, dayIndex) => {
                      const day = addDays(week, dayIndex);
                      const isWeekend = dayIndex >= 5;
                      return (
                        <div
                          key={dayIndex}
                          className={cn(
                            "text-center",
                            isWeekend && "text-muted-foreground"
                          )}
                          style={{ width: dayWidth }}
                        >
                          <div className="text-xs font-medium">
                            {format(day, "EEE", { locale: dateLocale }).charAt(0)}
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            {format(day, "d", { locale: dateLocale })}
                          </div>
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
              
              const delayInfo = getDelayInfo(schedule);
              const isStructure = schedule.step_id === "structure";

              return (
                <div
                  key={schedule.id}
                  className="flex items-center border-b"
                  style={{ height: rowHeight }}
                >
                  {/* Nom de l'étape - z-30 pour passer au-dessus des barres (z-20) */}
                  <div
                    className="sticky left-0 z-30 bg-background px-2 flex items-center gap-2 border-r shadow-sm"
                    style={{ width: labelWidth, minWidth: labelWidth }}
                  >
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: getDisplayColor(schedule.step_id, schedule.trade_type, schedule.trade_color) }}
                    />
                    <span className="truncate text-sm">
                      {getTranslatedStepName(t, schedule.step_id, schedule.step_name)}
                    </span>
                    {delayInfo && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Clock className="h-4 w-4 text-primary flex-shrink-0" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-sm">{t(`schedule.delayReasons.${delayInfo.reasonKey}`)}</p>
                        </TooltipContent>
                      </Tooltip>
                    )}
                    {schedule.is_manual_date && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Lock className="h-4 w-4 text-amber-500 flex-shrink-0" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-sm">{t("schedule.dateLockedManually")}</p>
                        </TooltipContent>
                      </Tooltip>
                    )}
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

                    {/* Barre de cure du béton (affichée sur la ligne Structure) */}
                    {isStructure && getCuringPeriod && getCuringPeriod.width > 0 && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div
                            className="absolute top-2 h-6 rounded cursor-pointer opacity-60"
                            style={{
                              left: getCuringPeriod.left,
                              width: getCuringPeriod.width,
                              background:
                                "repeating-linear-gradient(45deg, hsl(var(--accent)), hsl(var(--accent)) 4px, hsl(var(--muted)) 4px, hsl(var(--muted)) 8px)",
                            }}
                          >
                            <span className="text-xs text-white px-1 truncate block leading-6 font-medium drop-shadow-sm">
                              ⏳ {t("schedule.curingPeriod")} {getCuringPeriod.days}{t("schedule.days").charAt(0)}
                            </span>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <div className="space-y-1">
                            <p className="font-medium flex items-center gap-1">
                              <Clock className="h-4 w-4" /> {t("schedule.concreteCuring")}
                            </p>
                            <p className="text-sm">
                              {t("schedule.curingDescription", { days: getCuringPeriod.days })}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {t("schedule.curingMinRecommended")}
                            </p>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    )}

                    {/* Barre de la tâche */}
                    <Tooltip delayDuration={100}>
                      <TooltipTrigger asChild>
                        <div
                          className={cn(
                            "absolute top-2 h-6 rounded cursor-pointer transition-opacity hover:opacity-80 z-20",
                            hasConflict(schedule) && "ring-2 ring-destructive"
                          )}
                          style={{
                            left: position.left,
                            width: Math.max(position.width, dayWidth),
                            backgroundColor: getDisplayColor(schedule.step_id, schedule.trade_type, schedule.trade_color),
                          }}
                        >
                          <span className="text-xs text-white px-1 truncate block leading-6 pointer-events-none">
                            {schedule.actual_days || schedule.estimated_days}j
                          </span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <div className="space-y-1">
                          <p className="font-medium">{getTranslatedStepName(t, schedule.step_id, schedule.step_name)}</p>
                          <p className="text-sm">
                            {getTranslatedTradeName(t, schedule.trade_type)}
                          </p>
                          <p className="text-sm">
                            {format(parseISO(schedule.start_date!), "d MMM", {
                              locale: dateLocale,
                            })}{" "}
                            -{" "}
                            {format(parseISO(schedule.end_date!), "d MMM yyyy", {
                              locale: dateLocale,
                            })}
                          </p>
                          <p className="text-sm">
                            {t("schedule.duration")}: {schedule.actual_days || schedule.estimated_days}{" "}
                            {t("schedule.days")}
                          </p>
                          {/* Afficher les tâches de l'étape */}
                          {(() => {
                            const step = localizedSteps.find(s => s.id === schedule.step_id);
                            if (step?.tasks && step.tasks.length > 0) {
                              return (
                                <div className="pt-1 border-t border-border/50 mt-1">
                                  <p className="text-xs text-muted-foreground mb-1">{t("schedule.includedTasks")}</p>
                                  <ul className="text-xs space-y-0.5">
                                    {step.tasks.slice(0, 5).map((task, i) => (
                                      <li key={task.id} className="flex items-start gap-1">
                                        <span className="text-muted-foreground">•</span>
                                        <span className="truncate">{task.title}</span>
                                      </li>
                                    ))}
                                    {step.tasks.length > 5 && (
                                      <li className="text-muted-foreground">
                                        {t("schedule.moreTasks", { count: step.tasks.length - 5 })}
                                      </li>
                                    )}
                                  </ul>
                                </div>
                              );
                            }
                            return null;
                          })()}
                          {delayInfo && (
                            <p className="text-sm text-primary flex items-center gap-1">
                              <Clock className="h-3 w-3" /> {t(`schedule.delayReasons.${delayInfo.reasonKey}`)}
                            </p>
                          )}
                          {schedule.supplier_name && (
                            <p className="text-sm">
                              {t("schedule.supplier")}: {schedule.supplier_name}
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
        ) : (
        <ScrollArea className="w-full">
        <div
          className="will-change-transform"
          style={{
            minWidth: totalDays * dayWidth + labelWidth,
            height: schedulesWithDates.length * rowHeight + headerHeight + 20,
          }}
        >
          {/* Duplicate header and rows for desktop ScrollArea - reuse same structure */}
          {/* Header avec les semaines */}
          <div
            className="sticky top-0 z-10 bg-background border-b"
            style={{ height: headerHeight }}
          >
            <div className="flex" style={{ marginLeft: labelWidth }}>
              {weeks.map((week) => (
                <div
                  key={week.toISOString()}
                  className="border-r px-1 py-1"
                  style={{ width: 7 * dayWidth }}
                >
                  <div className="text-xs font-medium">
                    {format(week, "d MMM", { locale: dateLocale })}
                  </div>
                  <div className="flex mt-1">
                    {[...Array(7)].map((_, dayIndex) => {
                      const day = addDays(week, dayIndex);
                      const isWeekend = dayIndex >= 5;
                      return (
                        <div
                          key={dayIndex}
                          className={cn(
                            "text-center",
                            isWeekend && "text-muted-foreground"
                          )}
                          style={{ width: dayWidth }}
                        >
                          <div className="text-xs font-medium">
                            {format(day, "EEE", { locale: dateLocale }).charAt(0)}
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            {format(day, "d", { locale: dateLocale })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
          {/* Lignes du Gantt - same as mobile */}
          <div className="relative" style={{ paddingTop: 10 }}>
            {schedulesWithDates.map((schedule) => {
              const position = getBarPosition(schedule);
              if (!position) return null;
              const delayInfo = getDelayInfo(schedule);
              const isStructure = schedule.step_id === "structure";
              return (
                <div
                  key={schedule.id}
                  className="flex items-center border-b"
                  style={{ height: rowHeight }}
                >
                  <div
                    className="sticky left-0 z-30 bg-background px-2 flex items-center gap-2 border-r shadow-sm"
                    style={{ width: labelWidth, minWidth: labelWidth }}
                  >
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: getDisplayColor(schedule.step_id, schedule.trade_type, schedule.trade_color) }}
                    />
                    <span className="truncate text-sm">
                      {getTranslatedStepName(t, schedule.step_id, schedule.step_name)}
                    </span>
                    {delayInfo && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Clock className="h-4 w-4 text-primary flex-shrink-0" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-sm">{t(`schedule.delayReasons.${delayInfo.reasonKey}`)}</p>
                        </TooltipContent>
                      </Tooltip>
                    )}
                    {schedule.is_manual_date && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Lock className="h-4 w-4 text-amber-500 flex-shrink-0" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-sm">{t("schedule.dateLockedManually")}</p>
                        </TooltipContent>
                      </Tooltip>
                    )}
                    {hasConflict(schedule) && (
                      <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0" />
                    )}
                  </div>
                  <div
                    className="relative h-full"
                    style={{ width: totalDays * dayWidth }}
                  >
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
                    {isStructure && getCuringPeriod && getCuringPeriod.width > 0 && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div
                            className="absolute top-2 h-6 rounded cursor-pointer opacity-60"
                            style={{
                              left: getCuringPeriod.left,
                              width: getCuringPeriod.width,
                              background:
                                "repeating-linear-gradient(45deg, hsl(var(--accent)), hsl(var(--accent)) 4px, hsl(var(--muted)) 4px, hsl(var(--muted)) 8px)",
                            }}
                          >
                            <span className="text-xs text-white px-1 truncate block leading-6 font-medium drop-shadow-sm">
                              ⏳ {t("schedule.curingPeriod")} {getCuringPeriod.days}{t("schedule.days").charAt(0)}
                            </span>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <div className="space-y-1">
                            <p className="font-medium flex items-center gap-1">
                              <Clock className="h-4 w-4" /> {t("schedule.concreteCuring")}
                            </p>
                            <p className="text-sm">
                              {t("schedule.curingDescription", { days: getCuringPeriod.days })}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {t("schedule.curingMinRecommended")}
                            </p>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    )}
                    <Tooltip delayDuration={100}>
                      <TooltipTrigger asChild>
                        <div
                          className={cn(
                            "absolute top-2 h-6 rounded cursor-pointer transition-opacity hover:opacity-80 z-20",
                            hasConflict(schedule) && "ring-2 ring-destructive"
                          )}
                          style={{
                            left: position.left,
                            width: Math.max(position.width, dayWidth),
                            backgroundColor: getDisplayColor(schedule.step_id, schedule.trade_type, schedule.trade_color),
                          }}
                        >
                          <span className="text-xs text-white px-1 truncate block leading-6 pointer-events-none">
                            {schedule.actual_days || schedule.estimated_days}j
                          </span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <div className="space-y-1">
                          <p className="font-medium">{getTranslatedStepName(t, schedule.step_id, schedule.step_name)}</p>
                          <p className="text-sm">
                            {format(parseISO(schedule.start_date!), "d MMM", { locale: dateLocale })}
                            {" - "}
                            {format(parseISO(schedule.end_date!), "d MMM yyyy", { locale: dateLocale })}
                          </p>
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
        )}

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
                    style={{ backgroundColor: getDisplayColor(schedule.step_id, schedule.trade_type, schedule.trade_color) }}
                  />
                  {getTranslatedTradeName(t, schedule.trade_type)}
                </Badge>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
};
