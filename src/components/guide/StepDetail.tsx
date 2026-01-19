import { useState } from "react";
import { Step, phases } from "@/data/constructionSteps";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Clock, ChevronLeft, ChevronRight, Lightbulb, FileText, CheckCircle2, ClipboardList, DollarSign, Home, Umbrella, DoorOpen, Zap, Droplets, Wind, Thermometer, PaintBucket, Square, ChefHat, Sparkles, Building, ClipboardCheck, Circle, Loader2, AlertTriangle, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { TaskAttachments } from "./TaskAttachments";
import { StepPhotoUpload } from "@/components/project/StepPhotoUpload";
import { TaskDatePicker } from "./TaskDatePicker";
import { useProjectSchedule } from "@/hooks/useProjectSchedule";
import { toast } from "@/hooks/use-toast";

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
  projectId?: string;
  onNext: () => void;
  onPrevious: () => void;
  hasNext: boolean;
  hasPrevious: boolean;
  isTaskCompleted?: (stepId: string, taskId: string) => boolean;
  onToggleTask?: (stepId: string, taskId: string, isCompleted: boolean) => void;
}

export function StepDetail({ 
  step, 
  projectId, 
  onNext, 
  onPrevious, 
  hasNext, 
  hasPrevious,
  isTaskCompleted,
  onToggleTask 
}: StepDetailProps) {
  const phase = phases.find(p => p.id === step.phase);
  const IconComponent = iconMap[step.icon] || Circle;
  
  // Utiliser directement useProjectSchedule pour synchroniser avec l'échéancier
  const { schedules, updateScheduleAndRecalculate, isUpdating } = useProjectSchedule(projectId || null);
  
  // State pour afficher les avertissements de manière très visible
  const [scheduleWarnings, setScheduleWarnings] = useState<string[]>([]);
  
  // Trouver l'étape correspondante dans l'échéancier
  const currentSchedule = schedules.find(s => s.step_id === step.id);

  const completedCount = step.tasks.filter(task => 
    isTaskCompleted?.(step.id, task.id)
  ).length;

  const handleTaskToggle = (taskId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (onToggleTask) {
      const isCompleted = isTaskCompleted?.(step.id, taskId) || false;
      onToggleTask(step.id, taskId, isCompleted);
    }
  };

  // Mettre à jour directement l'échéancier quand les dates changent
  const handleStepDateChange = async (field: 'start_date' | 'end_date', value: string | null) => {
    if (!currentSchedule) return;
    
    // Effacer les warnings précédents
    setScheduleWarnings([]);
    
    try {
      const result = await updateScheduleAndRecalculate(currentSchedule.id, {
        [field]: value,
      });
      
      // Si des warnings ont été retournés, les afficher de manière très visible
      if (result?.warnings && result.warnings.length > 0) {
        setScheduleWarnings(result.warnings);
        
        // Aussi afficher un toast destructif pour attirer l'attention
        toast({
          title: "⚠️ ATTENTION - Conflit détecté",
          description: result.warnings[0],
          variant: "destructive",
          duration: 10000,
        });
      } else {
        toast({
          title: "Date mise à jour",
          description: `La ${field === 'start_date' ? 'date de début' : 'date de fin'} a été enregistrée et l'échéancier recalculé.`,
        });
      }
    } catch (error) {
      console.error("Erreur lors de la mise à jour:", error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour la date",
        variant: "destructive",
      });
    }
  };

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
                {projectId && (
                  <Badge variant={completedCount === step.tasks.length ? "default" : "outline"} className="ml-auto">
                    {completedCount}/{step.tasks.length} tâches
                  </Badge>
                )}
              </div>
              <CardTitle className="text-2xl">{step.title}</CardTitle>
              <CardDescription className="text-base mt-2">
                {step.description}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        
        {/* Dates de l'étape - synchronisées avec l'échéancier */}
        {projectId && (
          <CardContent className="pt-0">
            <div className="bg-muted/50 rounded-lg p-4">
              <div className="flex items-center gap-2 text-foreground font-medium mb-3">
                <Clock className="h-4 w-4" />
                <span>Planification de l'étape</span>
                {isUpdating && (
                  <span className="text-xs text-muted-foreground ml-2">(synchronisation...)</span>
                )}
              </div>
              {currentSchedule ? (
                <div className="flex flex-wrap gap-4">
                  <TaskDatePicker
                    label="Date de début"
                    value={currentSchedule.start_date || null}
                    onChange={(date) => handleStepDateChange('start_date', date)}
                    disabled={isUpdating}
                  />
                  <TaskDatePicker
                    label="Date de fin"
                    value={currentSchedule.end_date || null}
                    onChange={(date) => handleStepDateChange('end_date', date)}
                    disabled={isUpdating}
                  />
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Cette étape n'est pas encore dans l'échéancier. Générez l'échéancier depuis la page Échéancier.
                </p>
              )}
              
              {/* Avertissements de conflit très visibles */}
              {scheduleWarnings.length > 0 && (
                <Alert variant="destructive" className="mt-4 border-2 border-destructive animate-pulse">
                  <AlertTriangle className="h-5 w-5" />
                  <AlertTitle className="flex items-center justify-between">
                    <span className="text-lg font-bold">⚠️ CONFLIT D'ÉCHÉANCIER DÉTECTÉ</span>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setScheduleWarnings([])}
                      className="h-6 w-6 p-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </AlertTitle>
                  <AlertDescription className="mt-2 space-y-2">
                    {scheduleWarnings.map((warning, index) => (
                      <p key={index} className="text-sm font-medium">
                        {warning}
                      </p>
                    ))}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </CardContent>
        )}
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
            {step.tasks.map((task, index) => {
              const taskCompleted = isTaskCompleted?.(step.id, task.id) || false;
              
              return (
                <AccordionItem key={task.id} value={task.id}>
                  <AccordionTrigger className="text-left hover:no-underline">
                    <div className="flex items-center gap-3 flex-1">
                      {projectId && onToggleTask ? (
                        <div 
                          onClick={(e) => handleTaskToggle(task.id, e)}
                          className="cursor-pointer"
                        >
                          <Checkbox 
                            checked={taskCompleted}
                            className="h-5 w-5"
                          />
                        </div>
                      ) : (
                        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-sm font-medium">
                          {index + 1}
                        </span>
                      )}
                      <span className={taskCompleted ? "line-through text-muted-foreground" : ""}>
                        {task.title}
                      </span>
                      {taskCompleted && (
                        <CheckCircle2 className="h-4 w-4 text-green-500 ml-auto mr-2" />
                      )}
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

                      {/* Task Attachments */}
                      <TaskAttachments stepId={step.id} taskId={task.id} projectId={projectId} />
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        </CardContent>
      </Card>

      {/* Photo Upload for this step */}
      {projectId && (
        <StepPhotoUpload 
          projectId={projectId} 
          stepId={step.id} 
          stepTitle={step.title}
        />
      )}
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
