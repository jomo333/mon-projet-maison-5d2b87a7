import { Step, phases } from "@/data/constructionSteps";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, ChevronRight, ClipboardList, DollarSign, FileText, Home, Umbrella, DoorOpen, Zap, Droplets, Wind, Thermometer, PaintBucket, Square, ChefHat, Sparkles, Building, ClipboardCheck, Circle } from "lucide-react";
import type { LucideIcon } from "lucide-react";

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
}

export function StepCard({ step, stepNumber, onClick }: StepCardProps) {
  const phase = phases.find(p => p.id === step.phase);
  const IconComponent = iconMap[step.icon] || Circle;

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
