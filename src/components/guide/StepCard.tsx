import { Step, phases } from "@/data/constructionSteps";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, ChevronRight, ClipboardList, DollarSign, FileText, Home, Umbrella, DoorOpen, Zap, Droplets, Wind, Thermometer, PaintBucket, Square, ChefHat, Sparkles, Building, ClipboardCheck, Circle, CalendarClock } from "lucide-react";
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
}

export function StepCard({ step, stepNumber, onClick, scheduleStartDate, scheduleEndDate }: StepCardProps) {
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
    if (daysUntilStart === null) return null;
    if (daysUntilStart < 0) return { label: "En retard", color: "text-destructive", bg: "bg-destructive/10" };
    if (daysUntilStart === 0) return { label: "Aujourd'hui", color: "text-amber-600", bg: "bg-amber-50" };
    if (daysUntilStart <= 7) return { label: `${daysUntilStart}j`, color: "text-amber-600", bg: "bg-amber-50" };
    if (daysUntilStart <= 30) return { label: `${daysUntilStart}j`, color: "text-primary", bg: "bg-primary/10" };
    return { label: `${daysUntilStart}j`, color: "text-muted-foreground", bg: "bg-muted" };
  };

  const deadlineStatus = getDeadlineStatus();

  return (
    <Card 
      className="cursor-pointer transition-all hover:shadow-lg hover:border-primary/50 group"
      onClick={onClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className={`p-2 rounded-lg ${phase?.color} text-white`}>
            <IconComponent className="h-5 w-5" />
          </div>
          <Badge variant="secondary" className="text-xs">
            {phase?.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm font-medium text-muted-foreground">
            Étape {stepNumber}
          </span>
        </div>
        <h3 className="font-semibold text-lg mb-2 group-hover:text-primary transition-colors">
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
