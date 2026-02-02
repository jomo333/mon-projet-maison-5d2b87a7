import { useTranslation } from "react-i18next";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  FileText,
  Sparkles,
  CheckCircle2,
  Phone,
  DollarSign,
  Clock,
} from "lucide-react";
import { categoryTaskMappings, type TaskKeywordMapping } from "@/lib/budgetTaskMapping";

interface TaskSubmission {
  taskTitle: string;
  supplierName?: string;
  supplierPhone?: string;
  contactPerson?: string;
  contactPersonPhone?: string;
  amount?: number;
  leadDays?: number;
  documents: Array<{
    id: string;
    file_name: string;
    file_url: string;
  }>;
  hasAnalysis?: boolean;
}

interface TaskSubmissionsTabsProps {
  categoryName: string;
  tasks: TaskKeywordMapping[];
  taskSubmissions: Record<string, TaskSubmission>;
  activeTaskTitle: string | null;
  onSelectTask: (taskTitle: string) => void;
  onAddTask?: (taskTitle: string) => void;
}

// Normalize a string for matching (remove accents, lowercase, trim)
const normalizeForMatch = (s: string): string =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s*\([^)]*\)\s*/g, '') // Remove parenthetical suffixes like (HVAC)
    .replace(/\s+/g, ' ')
    .trim();

// Get tasks for a given category from the mapping
export function getTasksForCategory(categoryName: string): TaskKeywordMapping[] {
  // First try direct match
  if (categoryTaskMappings[categoryName]) {
    return categoryTaskMappings[categoryName];
  }
  
  // Normalize category name for matching
  const normalizedInput = normalizeForMatch(categoryName);
  
  // Try normalized match against all keys
  for (const key of Object.keys(categoryTaskMappings)) {
    // Skip internal exclusion keys
    if (key.startsWith('_')) continue;
    
    const normalizedKey = normalizeForMatch(key);
    
    // Exact normalized match
    if (normalizedKey === normalizedInput) {
      return categoryTaskMappings[key];
    }
    
    // Partial match (one contains the other)
    if (normalizedKey.includes(normalizedInput) || normalizedInput.includes(normalizedKey)) {
      return categoryTaskMappings[key];
    }
  }
  
  return [];
}

export function TaskSubmissionsTabs({
  categoryName,
  tasks,
  taskSubmissions,
  activeTaskTitle,
  onSelectTask,
  onAddTask,
}: TaskSubmissionsTabsProps) {
  const { t } = useTranslation();
  
  if (tasks.length === 0) {
    return null;
  }

  // Calculate totals per task
  const getTaskTotal = (taskTitle: string): number => {
    const submission = taskSubmissions[taskTitle];
    return submission?.amount || 0;
  };

  const grandTotal = Object.values(taskSubmissions).reduce(
    (sum, sub) => sum + (sub?.amount || 0),
    0
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-medium flex items-center gap-2 text-sm">
          <FileText className="h-4 w-4" />
          {t("budget.taskSubmissions.title", "Soumissions par tâche")}
        </h4>
        {grandTotal > 0 && (
          <Badge variant="secondary" className="bg-primary/10 text-primary">
            <DollarSign className="h-3 w-3 mr-1" />
            {grandTotal.toLocaleString("fr-CA")} $
          </Badge>
        )}
      </div>

      <Tabs value={activeTaskTitle || tasks[0]?.taskTitle} onValueChange={onSelectTask}>
        <ScrollArea className="w-full">
          <TabsList className="inline-flex h-auto p-1 w-auto min-w-full flex-wrap gap-1">
            {tasks.map((task) => {
              const submission = taskSubmissions[task.taskTitle];
              const hasSupplier = !!submission?.supplierName;
              const hasDocuments = (submission?.documents?.length || 0) > 0;
              const taskTotal = getTaskTotal(task.taskTitle);
              
              return (
                <TabsTrigger
                  key={task.taskTitle}
                  value={task.taskTitle}
                  className="relative flex items-center gap-2 px-3 py-2 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground whitespace-nowrap"
                >
                  <span className="max-w-[150px] truncate">{task.taskTitle}</span>
                  {hasSupplier && (
                    <CheckCircle2 className="h-3 w-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  )}
                  {!hasSupplier && hasDocuments && (
                    <FileText className="h-3 w-3 text-amber-500 shrink-0" />
                  )}
                  {taskTotal > 0 && (
                    <Badge 
                      variant="outline" 
                      className="text-[10px] px-1 py-0 h-4 shrink-0"
                    >
                      {(taskTotal / 1000).toFixed(0)}k$
                    </Badge>
                  )}
                </TabsTrigger>
              );
            })}
          </TabsList>
        </ScrollArea>

        {/* Tab content - summary of current selection */}
        {tasks.map((task) => {
          const submission = taskSubmissions[task.taskTitle];
          
          return (
            <TabsContent
              key={task.taskTitle}
              value={task.taskTitle}
              className="mt-3 p-3 border rounded-lg bg-muted/20"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h5 className="font-medium text-sm">{task.taskTitle}</h5>
                {submission?.supplierName && (
                    <Badge className="bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-700">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Confirmé
                    </Badge>
                  )}
                </div>

                {submission?.supplierName ? (
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Fournisseur:</span>
                      <span className="ml-2 font-medium">{submission.supplierName}</span>
                    </div>
                    {submission.amount && submission.amount > 0 && (
                      <div className="text-right">
                        <span className="text-muted-foreground">Montant:</span>
                        <span className="ml-2 font-bold text-primary">
                          {submission.amount.toLocaleString("fr-CA")} $
                        </span>
                      </div>
                    )}
                    {submission.supplierPhone && (
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Phone className="h-3 w-3" />
                        {submission.supplierPhone}
                      </div>
                    )}
                    {submission.leadDays && submission.leadDays > 0 && (
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        Préavis: {submission.leadDays} jours
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-4 text-muted-foreground">
                    <p className="text-sm">Aucun fournisseur assigné pour cette tâche</p>
                    <p className="text-xs mt-1">
                      Téléchargez des soumissions et analysez-les ou ajoutez manuellement un fournisseur
                    </p>
                  </div>
                )}

                {/* Document count */}
                {(submission?.documents?.length || 0) > 0 && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t">
                    <FileText className="h-3 w-3" />
                    {submission?.documents?.length} document(s) téléchargé(s)
                    {submission?.hasAnalysis && (
                      <Badge variant="outline" className="text-xs text-primary border-primary/30">
                        <Sparkles className="h-3 w-3 mr-1" />
                        Analysé
                      </Badge>
                    )}
                  </div>
                )}
              </div>
            </TabsContent>
          );
        })}
      </Tabs>

      {/* Summary of all tasks with suppliers */}
      {Object.values(taskSubmissions).filter(s => s?.supplierName).length > 1 && (
        <div className="mt-4 p-3 bg-primary/5 border border-primary/20 rounded-lg">
          <h5 className="font-medium text-sm mb-2 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            Résumé des fournisseurs
          </h5>
          <div className="space-y-1">
            {Object.entries(taskSubmissions)
              .filter(([_, sub]) => sub?.supplierName)
              .map(([taskTitle, sub]) => (
                <div key={taskTitle} className="flex justify-between text-sm">
                  <span className="text-muted-foreground truncate max-w-[200px]">{taskTitle}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{sub?.supplierName}</span>
                    {sub?.amount && sub.amount > 0 && (
                      <span className="text-primary font-bold">
                        {sub.amount.toLocaleString("fr-CA")} $
                      </span>
                    )}
                  </div>
                </div>
              ))}
          </div>
          <div className="flex justify-between font-bold text-sm pt-2 mt-2 border-t border-primary/20">
            <span>Total</span>
            <span className="text-primary">{grandTotal.toLocaleString("fr-CA")} $</span>
          </div>
        </div>
      )}
    </div>
  );
}
