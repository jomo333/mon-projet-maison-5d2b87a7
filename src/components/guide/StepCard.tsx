import { Step, phases } from "@/data/constructionSteps";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Clock, ChevronRight, ClipboardList, DollarSign, FileText, Home, Umbrella, DoorOpen, Zap, Droplets, Wind, Thermometer, PaintBucket, Square, ChefHat, Sparkles, Building, ClipboardCheck, Circle, CalendarClock, CheckCircle2, Lock } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { format, parseISO, differenceInDays } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";

const iconMap: Record<string, LucideIcon> = {
  ClipboardList,
  DollarSign,
  FileText,
  Home,
  Umbrella,
  DoorOpen,
  Zap,
  Droplets,
  Wind,
  Thermometer,
  PaintBucket,
  Square,
  ChefHat,
  Sparkles,
  Building,
  ClipboardCheck,
  Circle,
};

interface StepCardProps {
  step: Step;
  stepNumber: number;
  onClick: () => void;
  scheduleStartDate?: string | null;
  scheduleEndDate?: string | null;
  isCompleted?: boolean;
  isManualDate?: boolean;
  onToggleComplete?: (stepId: string, completed: boolean) => void;
}

export function StepCard({ 
  step, 
  stepNumber, 
  onClick, 
  scheduleStartDate, 
  scheduleEndDate,
  isCompleted = false,
  isManualDate = false,
  onToggleComplete
}: StepCardProps) {
  const phase = phases.find(p => p.id === step.phase);
  const IconComponent = iconMap[step.icon] || Circle;

  // Calculate days until deadline
  const getDaysUntilStart = () => {
    if (!scheduleStartDate) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startDate = parseISO(scheduleStartDate);
    return differenceInDays(startDate, today);
  };

  const daysUntilStart = getDaysUntilStart();

  const getDeadlineStatus = () => {
    if (isCompleted) return { label: "Terminé", color: "text-green-600", bg: "bg-green-50 dark:bg-green-950/30" };
    if (daysUntilStart === null) return null;
    if (daysUntilStart < 0) return { label: "En retard", color: "text-destructive", bg: "bg-destructive/10" };
    if (daysUntilStart === 0) return { label: "Aujourd'hui", color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-950/30" };
    if (daysUntilStart <= 7) return { label: `${daysUntilStart}j`, color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-950/30" };
    if (daysUntilStart <= 30) return { label: `${daysUntilStart}j`, color: "text-primary", bg: "bg-primary/10" };
    return { label: `${daysUntilStart}j`, color: "text-muted-foreground", bg: "bg-muted" };
  };

  const deadlineStatus = getDeadlineStatus();

  const handleCheckboxChange = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onToggleComplete) {
      onToggleComplete(step.id, !isCompleted);
    }
  };

  return (
    <Card 
      className={cn(
        "cursor-pointer transition-all hover:shadow-lg hover:border-primary/50 group",
        isCompleted && "bg-muted/30 border-green-200 dark:border-green-800"
      )}
      onClick={onClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className={cn(
            "p-2 rounded-lg text-white",
            isCompleted ? "bg-green-500" : phase?.color
          )}>
            {isCompleted ? (
              <CheckCircle2 className="h-5 w-5" />
            ) : (
              <IconComponent className="h-5 w-5" />
            )}
          </div>
          <div className="flex items-center gap-2">
            {onToggleComplete && (
              <div 
                onClick={handleCheckboxChange}
                className="flex items-center gap-2 cursor-pointer"
              >
                <Checkbox 
                  checked={isCompleted}
                  className={cn(
                    "h-5 w-5",
                    isCompleted && "bg-green-500 border-green-500 data-[state=checked]:bg-green-500"
                  )}
                />
              </div>
            )}
            <Badge variant="secondary" className="text-xs">
              {phase?.label}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2 mb-2">
          <span className={cn(
            "text-sm font-medium",
            isCompleted ? "text-green-600 line-through" : "text-muted-foreground"
          )}>
            Étape {stepNumber}
          </span>
        </div>
        <h3 className={cn(
          "font-semibold text-lg mb-2 group-hover:text-primary transition-colors",
          isCompleted && "line-through text-muted-foreground"
        )}>
          {step.title}
        </h3>
        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
          {step.description}
        </p>
        
        {/* Schedule dates */}
        {scheduleStartDate && (
          <div className={cn(
            "flex items-center gap-2 mb-3 p-2 rounded-md text-sm",
            deadlineStatus?.bg || "bg-muted"
          )}>
            <CalendarClock className={cn("h-4 w-4", deadlineStatus?.color)} />
            {isManualDate && (
              <Lock className="h-3 w-3 text-amber-500" />
            )}
            <div className="flex-1">
              <span className={cn("font-medium", deadlineStatus?.color)}>
                {format(parseISO(scheduleStartDate), "d MMM", { locale: fr })}
              </span>
              {scheduleEndDate && (
                <span className="text-muted-foreground">
                  {" → "}{format(parseISO(scheduleEndDate), "d MMM", { locale: fr })}
                </span>
              )}
            </div>
            {deadlineStatus && (
              <Badge variant="outline" className={cn("text-xs", deadlineStatus.color)}>
                {deadlineStatus.label}
              </Badge>
            )}
          </div>
        )}

        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-1 text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>{step.duration}</span>
          </div>
          <div className="flex items-center gap-1 text-primary opacity-0 group-hover:opacity-100 transition-opacity">
            <span>Voir détails</span>
            <ChevronRight className="h-4 w-4" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
