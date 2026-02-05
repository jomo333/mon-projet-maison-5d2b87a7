import { CheckCircle2, Circle, Clock, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/i18n";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

type StageStatus = "completed" | "in-progress" | "upcoming" | "warning";

interface Stage {
  id: string;
  name: string;
  status: StageStatus;
  progress: number;
  budget: number;
  spent: number;
  dueDate: string;
}

const stages: Stage[] = [
  { id: "1", name: "Permis et planification", status: "completed", progress: 100, budget: 5000, spent: 4800, dueDate: "15 jan 2025" },
  { id: "2", name: "Excavation et fondations", status: "completed", progress: 100, budget: 35000, spent: 33500, dueDate: "28 fév 2025" },
  { id: "3", name: "Structure et charpente", status: "in-progress", progress: 65, budget: 45000, spent: 28000, dueDate: "30 mars 2025" },
  { id: "4", name: "Toiture", status: "upcoming", progress: 0, budget: 18000, spent: 0, dueDate: "15 avr 2025" },
  { id: "5", name: "Portes et fenêtres", status: "upcoming", progress: 0, budget: 22000, spent: 0, dueDate: "25 avr 2025" },
  { id: "6", name: "Électricité", status: "warning", progress: 0, budget: 15000, spent: 0, dueDate: "10 mai 2025" },
  { id: "7", name: "Plomberie", status: "upcoming", progress: 0, budget: 12000, spent: 0, dueDate: "20 mai 2025" },
  { id: "8", name: "Isolation et pare-vapeur", status: "upcoming", progress: 0, budget: 8000, spent: 0, dueDate: "1 juin 2025" },
];

const statusConfig = {
  completed: {
    icon: CheckCircle2,
    color: "text-success",
    bgColor: "bg-success/10",
    badge: "Complété",
    badgeVariant: "default" as const,
  },
  "in-progress": {
    icon: Clock,
    color: "text-accent",
    bgColor: "bg-accent/10",
    badge: "En cours",
    badgeVariant: "secondary" as const,
  },
  upcoming: {
    icon: Circle,
    color: "text-muted-foreground",
    bgColor: "bg-muted",
    badge: "À venir",
    badgeVariant: "outline" as const,
  },
  warning: {
    icon: AlertTriangle,
    color: "text-warning",
    bgColor: "bg-warning/10",
    badge: "Attention",
    badgeVariant: "destructive" as const,
  },
};

export function ConstructionStages() {
  return (
    <Card className="animate-fade-in" style={{ animationDelay: "200ms" }}>
      <CardHeader>
        <CardTitle className="font-display">Étapes de construction</CardTitle>
        <CardDescription>Suivez l'avancement de votre projet</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {stages.map((stage) => {
            const config = statusConfig[stage.status];
            const Icon = config.icon;
            const budgetPercent = (stage.spent / stage.budget) * 100;

            return (
              <div
                key={stage.id}
                className={cn(
                  "flex items-center gap-4 p-4 rounded-xl border transition-all hover:shadow-md",
                  stage.status === "in-progress" && "border-accent/50 bg-accent/5",
                  stage.status === "warning" && "border-warning/50 bg-warning/5"
                )}
              >
                <div className={cn("p-2 rounded-lg shrink-0", config.bgColor)}>
                  <Icon className={cn("h-5 w-5", config.color)} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium truncate">{stage.name}</h4>
                    <Badge variant={config.badgeVariant} className="text-xs">
                      {config.badge}
                    </Badge>
                  </div>

                  {stage.status !== "upcoming" && stage.status !== "warning" && (
                    <div className="flex items-center gap-4">
                      <Progress value={stage.progress} className="flex-1 h-2" />
                      <span className="text-sm text-muted-foreground w-12">
                        {stage.progress}%
                      </span>
                    </div>
                  )}

                  {stage.status === "warning" && (
                    <p className="text-sm text-warning">
                      Électricien non confirmé - Contacter rapidement
                    </p>
                  )}
                </div>

                <div className="text-right shrink-0 hidden sm:block">
                  <div className="text-sm font-medium">
                    {formatCurrency(stage.spent)} / {formatCurrency(stage.budget)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Échéance: {stage.dueDate}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
