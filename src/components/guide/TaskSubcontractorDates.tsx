import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { format, parseISO } from "date-fns";
import { Calendar, User, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TaskDatePicker } from "./TaskDatePicker";
import { useTaskDates } from "@/hooks/useTaskDates";
import { getDateLocale } from "@/lib/i18n";

interface TaskSubcontractorDatesProps {
  stepId: string;
  taskId: string;
  projectId: string | undefined;
}

export function TaskSubcontractorDates({ 
  stepId, 
  taskId, 
  projectId 
}: TaskSubcontractorDatesProps) {
  const { t } = useTranslation();
  const dateLocale = getDateLocale();
  const [isExpanded, setIsExpanded] = useState(false);
  
  const { getTaskDate, upsertTaskDate } = useTaskDates(projectId || null);
  
  const taskDate = getTaskDate(stepId, taskId);
  const hasAnyDate = taskDate?.start_date || taskDate?.end_date;
  
  // Auto-expand if dates are already set
  useEffect(() => {
    if (hasAnyDate && !isExpanded) {
      setIsExpanded(true);
    }
  }, [hasAnyDate]);
  
  const handleDateChange = (field: 'start_date' | 'end_date', value: string | null) => {
    upsertTaskDate({
      stepId,
      taskId,
      startDate: field === 'start_date' ? value : taskDate?.start_date,
      endDate: field === 'end_date' ? value : taskDate?.end_date,
    });
  };

  if (!projectId) return null;

  // Don't show for soumissions step (already has its own date management)
  if (stepId === 'soumissions' || stepId === 'planification' || stepId === 'plans-permis' || stepId === 'financement') {
    return null;
  }

  return (
    <div className="mt-3 border-t pt-3">
      <Button
        variant="ghost"
        size="sm"
        className="w-full justify-between text-xs text-muted-foreground hover:text-foreground"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <span className="flex items-center gap-2">
          <User className="h-3.5 w-3.5" />
          {t("taskDates.subcontractorDates")}
          {hasAnyDate && (
            <Badge variant="outline" className="text-xs py-0 px-1.5">
              {taskDate?.start_date && taskDate?.end_date 
                ? `${format(parseISO(taskDate.start_date), "d MMM", { locale: dateLocale })} - ${format(parseISO(taskDate.end_date), "d MMM", { locale: dateLocale })}`
                : taskDate?.start_date 
                  ? format(parseISO(taskDate.start_date), "d MMM", { locale: dateLocale })
                  : format(parseISO(taskDate.end_date!), "d MMM", { locale: dateLocale })
              }
            </Badge>
          )}
        </span>
        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </Button>
      
      {isExpanded && (
        <div className="mt-3 p-3 bg-muted/30 rounded-lg space-y-3">
          <p className="text-xs text-muted-foreground">
            {t("taskDates.subcontractorDatesDescription")}
          </p>
          
          <div className="flex flex-wrap items-end gap-4">
            <TaskDatePicker
              label={t("taskDates.startDate")}
              value={taskDate?.start_date || null}
              onChange={(date) => handleDateChange('start_date', date)}
            />
            <TaskDatePicker
              label={t("taskDates.endDate")}
              value={taskDate?.end_date || null}
              onChange={(date) => handleDateChange('end_date', date)}
            />
          </div>
          
          {hasAnyDate && (
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Calendar className="h-3 w-3" />
              {t("taskDates.datesWillSync")}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
