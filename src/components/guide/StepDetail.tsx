import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Step, phases } from "@/data/constructionSteps";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
import { Clock, ChevronLeft, ChevronRight, Lightbulb, FileText, CheckCircle2, ClipboardList, DollarSign, Home, Umbrella, DoorOpen, Zap, Droplets, Wind, Thermometer, PaintBucket, Square, ChefHat, Sparkles, Building, ClipboardCheck, Circle, Loader2, AlertTriangle, X, Lock, Unlock, RotateCcw, Calculator, Save, Waves } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { TaskAttachments } from "./TaskAttachments";
import { SoumissionsManager } from "./SoumissionsManager";
import { StepPhotoUpload } from "@/components/project/StepPhotoUpload";
import { StylePhotosUpload } from "./StylePhotosUpload";
import { TaskDatePicker } from "./TaskDatePicker";
import { useProjectSchedule } from "@/hooks/useProjectSchedule";
import { useTaskDates } from "@/hooks/useTaskDates";
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
  FileCheck: ClipboardCheck, // Pour l'étape Soumissions
};

interface StepDetailProps {
  step: Step;
  projectId?: string;
  projectType?: string | null;
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
  projectType,
  onNext, 
  onPrevious, 
  hasNext, 
  hasPrevious,
  isTaskCompleted,
  onToggleTask 
}: StepDetailProps) {
  const navigate = useNavigate();
  const phase = phases.find(p => p.id === step.phase);
  const IconComponent = iconMap[step.icon] || Circle;
  
  // Filtrer les tâches selon le type de projet
  // Pour les projets de type garage ou agrandissement, on enlève la tâche "terrain"
  const filteredTasks = step.tasks.filter(task => {
    const projectTypeLower = projectType?.toLowerCase() || '';
    const isGarageOrExtension = projectTypeLower.includes('garage') || 
                                 projectTypeLower.includes('agrandissement') ||
                                 projectTypeLower.includes('extension');
    
    // Exclure la tâche "terrain" pour les garages et agrandissements
    if (task.id === 'terrain' && isGarageOrExtension) {
      return false;
    }
    return true;
  });
  
  // Utiliser directement useProjectSchedule pour synchroniser avec l'échéancier
  const { schedules, updateScheduleAndRecalculate, isUpdating } = useProjectSchedule(projectId || null);
  
  // Hook pour les notes des tâches
  const { getTaskDate, upsertTaskDateAsync } = useTaskDates(projectId || null);
  
  // State pour la note de la tâche "besoins"
  const [besoinsNote, setBesoinsNote] = useState("");
  const [isSavingNote, setIsSavingNote] = useState(false);
  
  // State pour les services publics
  const [servicesType, setServicesType] = useState<"public" | "prive" | null>(null);
  const [isSavingServices, setIsSavingServices] = useState(false);
  
  // Charger la note existante pour la tâche "besoins"
  useEffect(() => {
    if (projectId && step.id === "planification") {
      const taskData = getTaskDate("planification", "besoins");
      if (taskData?.notes) {
        setBesoinsNote(taskData.notes);
      }
    }
  }, [projectId, step.id, getTaskDate]);
  
  // Charger le choix des services publics
  useEffect(() => {
    if (projectId && step.id === "plans-permis") {
      const taskData = getTaskDate("plans-permis", "services-publics");
      if (taskData?.notes) {
        setServicesType(taskData.notes as "public" | "prive");
      }
    }
  }, [projectId, step.id, getTaskDate]);
  
  // State pour afficher les avertissements de manière très visible
  const [scheduleWarnings, setScheduleWarnings] = useState<string[]>([]);
  
  // Trouver l'étape correspondante dans l'échéancier
  const currentSchedule = schedules.find(s => s.step_id === step.id);

  const completedCount = filteredTasks.filter(task => 
    isTaskCompleted?.(step.id, task.id)
  ).length;
  
  // Sauvegarder la note des besoins
  const handleSaveBesoinsNote = async () => {
    if (!projectId) return;
    setIsSavingNote(true);
    try {
      await upsertTaskDateAsync({
        stepId: "planification",
        taskId: "besoins",
        notes: besoinsNote,
      });
      toast({
        title: "Note sauvegardée",
        description: "Vos besoins ont été enregistrés.",
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder la note",
        variant: "destructive",
      });
    } finally {
      setIsSavingNote(false);
    }
  };
  
  // Sauvegarder le choix des services
  const handleSaveServicesType = async (type: "public" | "prive") => {
    if (!projectId) return;
    setServicesType(type);
    setIsSavingServices(true);
    try {
      await upsertTaskDateAsync({
        stepId: "plans-permis",
        taskId: "services-publics",
        notes: type,
      });
      toast({
        title: "Choix enregistré",
        description: type === "public" 
          ? "Services municipaux sélectionnés (aqueduc, égouts)" 
          : "Installation privée sélectionnée (puits, fosse septique)",
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder le choix",
        variant: "destructive",
      });
    } finally {
      setIsSavingServices(false);
    }
  };

  const handleTaskToggle = (taskId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (onToggleTask) {
      const isCompleted = isTaskCompleted?.(step.id, taskId) || false;
      onToggleTask(step.id, taskId, isCompleted);
    }
  };

  // Mettre à jour directement l'échéancier quand les dates changent (verrouille automatiquement)
  const handleStepDateChange = async (field: 'start_date' | 'end_date', value: string | null) => {
    if (!currentSchedule) return;
    
    // Effacer les warnings précédents
    setScheduleWarnings([]);
    
    try {
      const result = await updateScheduleAndRecalculate(currentSchedule.id, {
        [field]: value,
        // Verrouiller automatiquement la date quand l'utilisateur la modifie manuellement
        is_manual_date: true,
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
          title: "🔒 Date verrouillée",
          description: `La ${field === 'start_date' ? 'date de début' : 'date de fin'} a été enregistrée et verrouillée.`,
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

  // Verrouiller/déverrouiller la date comme entrée manuelle (engagement sous-traitant)
  const handleToggleManualDate = async () => {
    if (!currentSchedule) return;
    
    try {
      const newValue = !currentSchedule.is_manual_date;
      await updateScheduleAndRecalculate(currentSchedule.id, {
        is_manual_date: newValue,
      });
      
      toast({
        title: newValue ? "🔒 Date verrouillée" : "🔓 Date déverrouillée",
        description: newValue 
          ? "Cette date représente maintenant un engagement et ne sera pas modifiée automatiquement." 
          : "Cette date peut maintenant être ajustée automatiquement lors des recalculs.",
      });
    } catch (error) {
      console.error("Erreur lors du verrouillage:", error);
      toast({
        title: "Erreur",
        description: "Impossible de modifier le verrouillage",
        variant: "destructive",
      });
    }
  };

  // Réinitialiser les dates selon l'échéancier initial (recalcul automatique)
  const handleResetToCalculated = async () => {
    if (!currentSchedule) return;
    
    try {
      // Déverrouiller et effacer les dates pour forcer un recalcul
      await updateScheduleAndRecalculate(currentSchedule.id, {
        is_manual_date: false,
        start_date: null,
        end_date: null,
      });
      
      toast({
        title: "🔄 Dates réinitialisées",
        description: "Les dates ont été recalculées automatiquement selon l'échéancier.",
      });
    } catch (error) {
      console.error("Erreur lors de la réinitialisation:", error);
      toast({
        title: "Erreur",
        description: "Impossible de réinitialiser les dates",
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
                  <Badge variant={completedCount === filteredTasks.length ? "default" : "outline"} className="ml-auto">
                    {completedCount}/{filteredTasks.length} tâches
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
                <div className="space-y-3">
                  <div className="flex flex-wrap items-end gap-4">
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
                    
                    {/* Boutons de gestion des dates */}
                    <div className="flex items-center gap-2">
                      {/* Bouton de réinitialisation */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleResetToCalculated}
                        disabled={isUpdating || !currentSchedule.start_date}
                        className="flex items-center gap-2"
                        title="Réinitialiser les dates selon l'échéancier calculé"
                      >
                        <RotateCcw className="h-4 w-4" />
                        <span className="hidden sm:inline">Réinitialiser</span>
                      </Button>
                      
                      {/* Bouton de verrouillage de date */}
                      <Button
                        variant={currentSchedule.is_manual_date ? "default" : "outline"}
                        size="sm"
                        onClick={handleToggleManualDate}
                        disabled={isUpdating || !currentSchedule.start_date}
                        className="flex items-center gap-2"
                        title={currentSchedule.is_manual_date 
                          ? "Date verrouillée (engagement sous-traitant)" 
                          : "Cliquez pour verrouiller cette date"
                        }
                      >
                        {currentSchedule.is_manual_date ? (
                          <>
                            <Lock className="h-4 w-4 text-amber-500" />
                            <span className="hidden sm:inline">Verrouillée</span>
                          </>
                        ) : (
                          <>
                            <Unlock className="h-4 w-4" />
                            <span className="hidden sm:inline">Verrouiller</span>
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                  
                  {/* Indicateur de date verrouillée */}
                  {currentSchedule.is_manual_date && (
                    <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 dark:text-amber-400 dark:bg-amber-950/30 px-3 py-2 rounded-md">
                      <Lock className="h-4 w-4 text-amber-500" />
                      <span>
                        Cette date est verrouillée (engagement sous-traitant). 
                        Elle ne sera pas modifiée automatiquement lors des recalculs.
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Cette étape n'est pas encore dans l'échéancier. Générez l'échéancier depuis la page Échéancier.
                </p>
              )}
              
              {/* Avertissements de conflit très visibles */}
              {scheduleWarnings.length > 0 && (
                <Alert variant="destructive" className="mt-4 border-2 border-destructive bg-destructive/10">
                  <AlertTriangle className="h-5 w-5" />
                  <AlertTitle className="flex items-center justify-between">
                    <span className="text-lg font-bold">🚨 CONFLIT DE PLANIFICATION</span>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setScheduleWarnings([])}
                      className="h-6 w-6 p-0 hover:bg-destructive/20"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </AlertTitle>
                  <AlertDescription className="mt-3 space-y-3">
                    {scheduleWarnings.map((warning, index) => (
                      <div key={index} className="p-3 bg-background/50 rounded-md border border-destructive/30">
                        <p className="text-sm font-medium leading-relaxed">
                          {warning}
                        </p>
                      </div>
                    ))}
                    <p className="text-xs text-muted-foreground mt-2 italic">
                      💡 La date entrée manuellement a été conservée. Si ce conflit est intentionnel, vous pouvez fermer cet avertissement.
                    </p>
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
            {filteredTasks.map((task, index) => {
              const taskCompleted = isTaskCompleted?.(step.id, task.id) || false;
              
              return (
                <AccordionItem key={task.id} value={task.id}>
                  <div className="flex items-center gap-2">
                    <AccordionTrigger className="text-left hover:no-underline flex-1">
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
                    
                    {/* Bouton Analyse de budget visible à côté du titre */}
                    {task.id === 'budget-initial' && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          // Parse la note des besoins pour extraire les informations
                          const params = new URLSearchParams();
                          if (projectId) params.set('project', projectId);
                          params.set('mode', 'manual'); // Toujours aller en mode manuel
                          params.set('autoAnalyze', '1');
                          
                          if (besoinsNote) {
                            // URLSearchParams gère déjà l'encodage
                            params.set('besoinsNote', besoinsNote);
                            
                            // Parser les informations du texte
                            const noteLower = besoinsNote.toLowerCase();
                            
                            // Détection du type de projet
                            if (noteLower.includes('garage') && (noteLower.includes('étage') || noteLower.includes('chambre') || noteLower.includes('aménagé'))) {
                              params.set('projectType', 'garage-etage');
                            } else if (noteLower.includes('garage')) {
                              params.set('projectType', 'garage');
                            } else if (noteLower.includes('agrandissement') || noteLower.includes('extension')) {
                              params.set('projectType', 'agrandissement');
                            } else if (noteLower.includes('rénovation') || noteLower.includes('renovation')) {
                              params.set('projectType', 'renovation');
                            } else if (noteLower.includes('bungalow')) {
                              params.set('projectType', 'bungalow');
                            } else if (noteLower.includes('cottage')) {
                              params.set('projectType', 'cottage');
                            } else if (noteLower.includes('jumelé') || noteLower.includes('jumele') || noteLower.includes('jumelée') || noteLower.includes('jumelee')) {
                              params.set('projectType', 'jumelee');
                            }
                            
                            // Détection du nombre d'étages - seulement sur mentions explicites
                            // Ne pas inférer à partir de "2 chambre" car cela ne dit pas si c'est sur 1 ou 2 étages
                            if (noteLower.includes('3 étage') || noteLower.includes('trois étage') || noteLower.includes('3 étages') || noteLower.includes('trois étages')) {
                              params.set('floors', '3');
                            } else if (noteLower.includes('2 étage') || noteLower.includes('deux étage') || noteLower.includes('2 étages') || noteLower.includes('deux étages') || noteLower.includes('au dessus') || noteLower.includes('au-dessus')) {
                              params.set('floors', '2');
                            }
                            // Note: si "garage-etage" est détecté mais pas d'étages explicites, laisser l'utilisateur choisir
                            
                            // Détection des dimensions (ex: 18x25, 20 x 30, etc.)
                            const dimensionMatch = besoinsNote.match(/(\d+)\s*[xX×]\s*(\d+)/);
                            if (dimensionMatch) {
                              const width = parseInt(dimensionMatch[1]);
                              const length = parseInt(dimensionMatch[2]);
                              const sqft = width * length;
                              params.set('sqft', sqft.toString());
                            }
                          }
                          
                          navigate(`/budget?${params.toString()}`);
                        }}
                      >
                        <Calculator className="h-4 w-4 mr-1" />
                        <span className="hidden sm:inline">Analyse de budget</span>
                        <span className="sm:hidden">Analyse</span>
                      </Button>
                    )}
                  </div>
                  <AccordionContent>
                    <div className="pl-9 space-y-4">
                      <p className="text-muted-foreground">
                        {task.description}
                      </p>
                      
                      {/* Zone de notes pour la tâche "besoins" */}
                      {task.id === 'besoins' && projectId && (
                        <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                          <div className="flex items-center gap-2 font-medium">
                            <FileText className="h-4 w-4 text-primary" />
                            <span>Notes sur vos besoins</span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Décrivez vos besoins ici. Ces informations seront utilisées pour pré-remplir l'analyse de budget.
                          </p>
                          <Textarea
                            placeholder="Ex: Maison 2 étages, 3 chambres, 2 salles de bain, garage double, sous-sol fini, cuisine ouverte..."
                            value={besoinsNote}
                            onChange={(e) => setBesoinsNote(e.target.value)}
                            className="min-h-[100px]"
                          />
                          <Button
                            size="sm"
                            onClick={handleSaveBesoinsNote}
                            disabled={isSavingNote}
                          >
                            {isSavingNote ? (
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                              <Save className="h-4 w-4 mr-2" />
                            )}
                            Sauvegarder
                          </Button>
                          
                          {/* Photos de style pour l'analyse */}
                          <StylePhotosUpload projectId={projectId} />
                        </div>
                      )}
                      
                      {/* Choix services publics ou privés */}
                      {task.id === 'services-publics' && projectId && (
                        <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                          <div className="flex items-center gap-2 font-medium">
                            <Waves className="h-4 w-4 text-primary" />
                            <span>Type d'installation</span>
                            {isSavingServices && <Loader2 className="h-4 w-4 animate-spin" />}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Sélectionnez le type de services pour votre projet.
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {/* Option Services publics */}
                            <div 
                              className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                                servicesType === "public" 
                                  ? "border-primary bg-primary/10" 
                                  : "border-border hover:border-primary/50"
                              }`}
                              onClick={() => handleSaveServicesType("public")}
                            >
                              <div className="flex items-start gap-3">
                                <Checkbox 
                                  checked={servicesType === "public"}
                                  className="mt-1"
                                />
                                <div>
                                  <p className="font-medium">Services municipaux</p>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    Aqueduc et égouts municipaux
                                  </p>
                                </div>
                              </div>
                            </div>
                            
                            {/* Option Installation privée */}
                            <div 
                              className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                                servicesType === "prive" 
                                  ? "border-primary bg-primary/10" 
                                  : "border-border hover:border-primary/50"
                              }`}
                              onClick={() => handleSaveServicesType("prive")}
                            >
                              <div className="flex items-start gap-3">
                                <Checkbox 
                                  checked={servicesType === "prive"}
                                  className="mt-1"
                                />
                                <div>
                                  <p className="font-medium">Installation privée</p>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    Puits artésien + Fosse septique + Champ d'épuration
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          {servicesType && (
                            <div className={`p-3 rounded-md text-sm ${
                              servicesType === "public" 
                                ? "bg-blue-50 text-blue-800 dark:bg-blue-950/30 dark:text-blue-300"
                                : "bg-green-50 text-green-800 dark:bg-green-950/30 dark:text-green-300"
                            }`}>
                              {servicesType === "public" ? (
                                <>✓ Prévoir les frais de branchement à l'aqueduc et aux égouts municipaux</>
                              ) : (
                                <>✓ Prévoir: étude de sol pour installation septique, forage de puits, installation du champ d'épuration</>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                      
                      {/* Gestionnaire de soumissions par corps de métier */}
                      {(task.id === 'obtenir-soumissions' || task.id === 'obtenir-soumissions-plans') && projectId && (
                        <SoumissionsManager projectId={projectId} />
                      )}
                      
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

                      {/* Task Attachments - sauf pour soumissions qui a son propre gestionnaire */}
                      {task.id !== 'obtenir-soumissions' && (
                        <TaskAttachments stepId={step.id} taskId={task.id} projectId={projectId} />
                      )}
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
