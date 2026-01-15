import { Step, phases } from "@/data/constructionSteps";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Clock, ChevronLeft, ChevronRight, Lightbulb, FileText, CheckCircle2, ClipboardList, DollarSign, Home, Umbrella, DoorOpen, Zap, Droplets, Wind, Thermometer, PaintBucket, Square, ChefHat, Sparkles, Building, ClipboardCheck, Circle } from "lucide-react";
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

interface StepDetailProps {
  step: Step;
  onNext: () => void;
  onPrevious: () => void;
  hasNext: boolean;
  hasPrevious: boolean;
}

export function StepDetail({ step, onNext, onPrevious, hasNext, hasPrevious }: StepDetailProps) {
  const phase = phases.find(p => p.id === step.phase);
  const IconComponent = iconMap[step.icon] || Circle;

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-xl ${phase?.color} text-white`}>
              <IconComponent className="h-8 w-8" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="secondary">{phase?.label}</Badge>
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>{step.duration}</span>
                </div>
              </div>
              <CardTitle className="text-2xl">{step.title}</CardTitle>
              <CardDescription className="text-base mt-2">
                {step.description}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Tasks */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-primary" />
            Tâches à réaliser
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            {step.tasks.map((task, index) => (
              <AccordionItem key={task.id} value={task.id}>
                <AccordionTrigger className="text-left">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-sm font-medium">
                      {index + 1}
                    </span>
                    <span>{task.title}</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="pl-9 space-y-4">
                    <p className="text-muted-foreground">
                      {task.description}
                    </p>
                    
                    {task.tips && task.tips.length > 0 && (
                      <div className="bg-amber-50 dark:bg-amber-950/30 rounded-lg p-4">
                        <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-medium mb-2">
                          <Lightbulb className="h-4 w-4" />
                          <span>Conseils</span>
                        </div>
                        <ul className="space-y-1">
                          {task.tips.map((tip, i) => (
                            <li key={i} className="text-sm text-amber-800 dark:text-amber-300 flex items-start gap-2">
                              <span className="text-amber-500">•</span>
                              {tip}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {task.documents && task.documents.length > 0 && (
                      <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-4">
                        <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400 font-medium mb-2">
                          <FileText className="h-4 w-4" />
                          <span>Documents requis</span>
                        </div>
                        <ul className="space-y-1">
                          {task.documents.map((doc, i) => (
                            <li key={i} className="text-sm text-blue-800 dark:text-blue-300 flex items-center gap-2">
                              <span className="text-blue-500">•</span>
                              {doc}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-4">
        <Button 
          variant="outline" 
          onClick={onPrevious}
          disabled={!hasPrevious}
          className="gap-2"
        >
          <ChevronLeft className="h-4 w-4" />
          Étape précédente
        </Button>
        <Button 
          onClick={onNext}
          disabled={!hasNext}
          className="gap-2"
        >
          Étape suivante
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
