import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/landing/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { DollarSign, TrendingUp, TrendingDown, AlertTriangle, Plus, Edit2, ChevronDown, ChevronUp, Save, FolderOpen, FileText, CheckCircle2, RotateCcw } from "lucide-react";
import { PlanAnalyzer, PlanAnalyzerHandle } from "@/components/budget/PlanAnalyzer";

import { CategorySubmissionsDialog } from "@/components/budget/CategorySubmissionsDialog";
import { GenerateScheduleDialog } from "@/components/schedule/GenerateScheduleDialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useProjectSchedule } from "@/hooks/useProjectSchedule";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/i18n";
import { groupItemsByTask } from "@/lib/budgetTaskMapping";
import { rerouteFoundationItems } from "@/lib/budgetItemReroute";
import {
  mapAnalysisToStepCategories,
  defaultCategories as libDefaultCategories,
  stepTasksByCategory,
  categoryColors,
  type BudgetCategory as LibBudgetCategory,
  type IncomingAnalysisCategory,
} from "@/lib/budgetCategories";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface BudgetItem {
  name: string;
  cost: number;
  quantity: string;
  unit: string;
}

interface BudgetCategory {
  name: string;
  budget: number;
  spent: number;
  color: string;
  description?: string;
  items?: BudgetItem[];
}


const normalizeBudgetItemName = (name: string) => {
  // Remove plan-page suffixes that create artificial duplicates in the UI
  // e.g. "Murs de fondation (Page 2)" -> "Murs de fondation"
  return name
    .replace(/\s*\(\s*page\s*\d+\s*\)\s*$/i, "")
    .replace(/\s+/g, " ")
    .trim();
};

const aggregateBudgetItemsForDisplay = (items: BudgetItem[] = []): BudgetItem[] => {
  const byKey = new Map<string, BudgetItem>();

  for (const item of items) {
    const normalizedName = normalizeBudgetItemName(item.name);
    const unit = (item.unit || "").trim();
    const key = `${normalizedName}__${unit.toLowerCase()}`;

    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, {
        ...item,
        name: normalizedName,
        unit,
      });
      continue;
    }

    // Sum costs
    existing.cost = (Number(existing.cost) || 0) + (Number(item.cost) || 0);

    // Sum quantities when numeric; otherwise keep the existing string to avoid weird merges
    const q1 = Number(String(existing.quantity).replace(",", "."));
    const q2 = Number(String(item.quantity).replace(",", "."));
    if (Number.isFinite(q1) && Number.isFinite(q2)) {
      const summed = q1 + q2;
      existing.quantity = Number.isInteger(summed) ? String(Math.trunc(summed)) : String(summed);
    }
  }

  // Keep a stable order based on first occurrence
  return Array.from(byKey.values());
};

// Use centralized budget categories from lib
const defaultCategories: BudgetCategory[] = libDefaultCategories.map(cat => ({
  ...cat,
  spent: 0,
}));

import type { Json } from "@/integrations/supabase/types";

const Budget = () => {
  const { t } = useTranslation();
  
  // Helper function to translate budget category names
  const translateCategoryName = (name: string): string => {
    const key = `budget.categories.${name}`;
    const translated = t(key);
    // If no translation found (returns the key), use original name
    return translated === key ? name : translated;
  };
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const projectFromUrl = searchParams.get("project");
  const autoAnalyze = searchParams.get("autoAnalyze") === "1";
  const autoManual = searchParams.get("mode") === "manual";
  const besoinsNoteFromUrl = searchParams.get("besoinsNote") 
    ? decodeURIComponent(searchParams.get("besoinsNote") || "") 
    : undefined;
  // Prefill params from URL (parsed from besoins note)
  const prefillProjectType = searchParams.get("projectType") || undefined;
  const prefillFloors = searchParams.get("floors") || undefined;
  const prefillSquareFootage = searchParams.get("sqft") || undefined;

  const [showAddExpense, setShowAddExpense] = useState(false);
  const [budgetCategories, setBudgetCategories] = useState<BudgetCategory[]>(defaultCategories);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(projectFromUrl);
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [editingCategory, setEditingCategory] = useState<BudgetCategory | null>(null);
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);
  
  // Ref for the PlanAnalyzer section to scroll into view
  const planAnalyzerRef = useRef<HTMLDivElement>(null);
  const planAnalyzerComponentRef = useRef<PlanAnalyzerHandle>(null);
  const didScrollRef = useRef(false);

  // Schedule hook for generating schedule after budget analysis
  const {
    createScheduleAsync,
    calculateEndDate,
    generateAlerts,
  } = useProjectSchedule(selectedProjectId);

  // Fetch user's projects
  const { data: projects = [] } = useQuery({
    queryKey: ["user-projects", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("projects")
        .select("id, name, project_type, total_budget")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch budget categories for selected project
  const { data: savedBudget = [] } = useQuery({
    queryKey: ["project-budget", selectedProjectId],
    queryFn: async () => {
      if (!selectedProjectId) return [];
      const { data, error } = await supabase
        .from("project_budgets")
        .select("*")
        .eq("project_id", selectedProjectId);
      
      if (error) throw error;
      return data;
    },
    enabled: !!selectedProjectId,
  });

  // Load saved budget when project changes
  useEffect(() => {
    if (savedBudget && savedBudget.length > 0) {
      // IMPORTANT: Always display categories in the construction-step order.
      // For legacy projects, this also allows new steps (e.g. "Excavation")
      // to appear automatically before "Fondation" without deleting existing data.
      const savedByName = new Map(
        savedBudget.map((row) => [row.category_name, row])
      );

      const defaultNames = new Set(defaultCategories.map((c) => c.name));

      const ordered: BudgetCategory[] = defaultCategories.map((defCat) => {
        const saved = savedByName.get(defCat.name);
        if (!saved) {
          return {
            ...defCat,
            budget: 0,
            spent: 0,
            items: [],
          };
        }

        return {
          name: defCat.name, // Always use the step name for consistency with stepTasksByCategory
          budget: Number(saved.budget) || 0,
          spent: Number(saved.spent) || 0,
          color: saved.color || defCat.color,
          description: saved.description || defCat.description,
          items: (saved.items as unknown as BudgetItem[]) || [],
        };
      });

      // Exclude legacy categories that no longer match the 18-step structure
      // These will be ignored (not displayed) - only current step categories are shown
      setBudgetCategories(rerouteFoundationItems(ordered));
    } else if (selectedProjectId) {
      // Reset to default if no budget saved
      setBudgetCategories(defaultCategories);
    }
  }, [savedBudget, selectedProjectId]);

  // Auto-select first project if available (and sync URL)
  useEffect(() => {
    if (projectFromUrl && projectFromUrl !== selectedProjectId) {
      setSelectedProjectId(projectFromUrl);
      return;
    }

    if (projects.length > 0 && !selectedProjectId) {
      const firstId = projects[0].id;
      setSelectedProjectId(firstId);
      const next = new URLSearchParams(searchParams);
      next.set("project", firstId);
      setSearchParams(next, { replace: true });
    }
  }, [projects, selectedProjectId, projectFromUrl, searchParams, setSearchParams]);

  // Auto-scroll to PlanAnalyzer when autoAnalyze is set
  useEffect(() => {
    if (autoAnalyze && planAnalyzerRef.current && !didScrollRef.current) {
      didScrollRef.current = true;
      // Small delay to let the component mount properly
      const timer = setTimeout(() => {
        planAnalyzerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [autoAnalyze]);

  // Save budget mutation
  const saveBudgetMutation = useMutation({
    mutationFn: async (categoriesToSave: BudgetCategory[]) => {
      if (!selectedProjectId || !user?.id) {
        throw new Error("Aucun projet sélectionné");
      }

      // Delete existing budget categories for this project
      await supabase
        .from("project_budgets")
        .delete()
        .eq("project_id", selectedProjectId);

      // Insert new budget categories
      const budgetData = categoriesToSave.map(cat => ({
        project_id: selectedProjectId,
        category_name: cat.name,
        budget: cat.budget,
        spent: cat.spent,
        color: cat.color,
        description: cat.description || null,
        items: JSON.parse(JSON.stringify(cat.items || [])) as Json,
      }));

      const { error: insertError } = await supabase
        .from("project_budgets")
        .insert(budgetData);

      if (insertError) throw insertError;

      // Update project total budget
      const totalBudget = categoriesToSave.reduce((acc, cat) => acc + cat.budget, 0);
      const { error: updateError } = await supabase
        .from("projects")
        .update({ total_budget: totalBudget, updated_at: new Date().toISOString() })
        .eq("id", selectedProjectId);

      if (updateError) throw updateError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-budget", selectedProjectId] });
      queryClient.invalidateQueries({ queryKey: ["user-projects"] });
      toast.success(t("toasts.budgetSaved"));
    },
    onError: (error) => {
      console.error("Save error:", error);
      toast.error(t("toasts.budgetSaveError"));
    },
  });

  // Reset budget mutation
  const resetBudgetMutation = useMutation({
    mutationFn: async (options: { deletePlans?: boolean } = {}) => {
      if (!selectedProjectId || !user?.id) {
        throw new Error("Aucun projet sélectionné");
      }

      // Delete all budget categories for this project
      const { error: deleteError } = await supabase
        .from("project_budgets")
        .delete()
        .eq("project_id", selectedProjectId);

      if (deleteError) throw deleteError;

      // Reset project total budget to 0
      const { error: updateError } = await supabase
        .from("projects")
        .update({ total_budget: 0, updated_at: new Date().toISOString() })
        .eq("id", selectedProjectId);

      if (updateError) throw updateError;

      // If user wants to delete plans as well
      if (options.deletePlans) {
        // Get all plan attachments for this project
        const { data: planAttachments } = await supabase
          .from("task_attachments")
          .select("id, file_url")
          .eq("project_id", selectedProjectId)
          .eq("category", "plan");

        // Get plan photos from project_photos
        const { data: planPhotos } = await supabase
          .from("project_photos")
          .select("id, file_url")
          .eq("project_id", selectedProjectId)
          .eq("step_id", "plans-permis");

        // Delete files from storage
        const allFiles = [...(planAttachments || []), ...(planPhotos || [])];
        for (const file of allFiles) {
          const path = file.file_url?.split("/task-attachments/")[1];
          if (path) {
            await supabase.storage.from("task-attachments").remove([path.split("?")[0]]);
          }
        }

        // Delete from task_attachments table
        if (planAttachments && planAttachments.length > 0) {
          await supabase
            .from("task_attachments")
            .delete()
            .eq("project_id", selectedProjectId)
            .eq("category", "plan");
        }

        // Delete from project_photos table (plan step)
        if (planPhotos && planPhotos.length > 0) {
          await supabase
            .from("project_photos")
            .delete()
            .eq("project_id", selectedProjectId)
            .eq("step_id", "plans-permis");
        }
      }
    },
    onSuccess: (_data, variables) => {
      setBudgetCategories(defaultCategories);
      queryClient.invalidateQueries({ queryKey: ["project-budget", selectedProjectId] });
      queryClient.invalidateQueries({ queryKey: ["user-projects"] });
      if (variables?.deletePlans) {
        queryClient.invalidateQueries({ queryKey: ["project-plans", selectedProjectId] });
      }
      toast.success(t("toasts.budgetReset"));
    },
    onError: (error) => {
      console.error("Reset error:", error);
      toast.error(t("toasts.budgetResetError"));
    },
  });

  const handleResetBudget = () => {
    if (!selectedProjectId) {
      toast.error(t("toasts.noProjectSelected"));
      return;
    }
    
    const deletePlans = window.confirm(
      "Voulez-vous aussi supprimer les fichiers de plans téléversés ?\n\n" +
      "• OK = Supprimer le budget ET les plans\n" +
      "• Annuler = Supprimer seulement le budget (les plans restent)"
    );
    
    if (window.confirm("Êtes-vous sûr de vouloir réinitialiser le budget ? Cette action est irréversible.")) {
      // Reset the PlanAnalyzer analysis state
      planAnalyzerComponentRef.current?.resetAnalysis();
      resetBudgetMutation.mutate({ deletePlans });
    }
  };

  // Check if budget has been analyzed (not just default categories)
  const hasAnalyzedBudget = savedBudget && savedBudget.length > 0;
  
  const totalBudget = budgetCategories.reduce((acc, cat) => acc + cat.budget, 0);
  const totalSpent = budgetCategories.reduce((acc, cat) => acc + cat.spent, 0);
  const percentUsed = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;
  
  // Display values - show 0 if no analysis done
  const displayBudget = hasAnalyzedBudget ? totalBudget : 0;
  const displayRemaining = hasAnalyzedBudget ? (totalBudget - totalSpent) : 0;

  const pieData = budgetCategories.map((cat) => ({
    name: translateCategoryName(cat.name),
    value: cat.budget,
    color: cat.color,
  }));

  const handleBudgetGenerated = async (categories: IncomingAnalysisCategory[]) => {
    // Convert analysis (12 categories) -> step categories (our table)
    // Uses mapAnalysisToStepCategories which now keeps taxes/contingency separate (not distributed)
    const mapped = mapAnalysisToStepCategories(categories, libDefaultCategories).map(cat => ({
      ...cat,
      spent: cat.spent ?? 0,
    }));
    setBudgetCategories(mapped);

    // Auto-save if a project is selected
    if (selectedProjectId) {
      saveBudgetMutation.mutate(mapped);
    }
  };

  const toggleCategory = (categoryName: string) => {
    setExpandedCategories(prev => 
      prev.includes(categoryName) 
        ? prev.filter(name => name !== categoryName)
        : [...prev, categoryName]
    );
  };

  const handleEditCategory = (category: BudgetCategory, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingCategory(category);
    setShowCategoryDialog(true);
  };

  const handleSaveCategoryFromDialog = async (
    budget: number,
    spent: number,
    _supplierInfo?: unknown,
    options?: { closeDialog?: boolean }
  ) => {
    if (!editingCategory || !selectedProjectId) return;
    
    // Update local state
    setBudgetCategories(prev => 
      prev.map(cat => 
        cat.name === editingCategory.name 
          ? { ...cat, budget, spent }
          : cat
      )
    );
    
    // Immediately save to database
    const updatedCategories = budgetCategories.map(cat => 
      cat.name === editingCategory.name 
        ? { ...cat, budget, spent }
        : cat
    );
    
    // Delete existing and insert updated
    await supabase
      .from("project_budgets")
      .delete()
      .eq("project_id", selectedProjectId);

    const budgetData = updatedCategories.map(cat => ({
      project_id: selectedProjectId,
      category_name: cat.name,
      budget: cat.name === editingCategory.name ? budget : cat.budget,
      spent: cat.name === editingCategory.name ? spent : cat.spent,
      color: cat.color,
      description: cat.description || null,
      items: JSON.parse(JSON.stringify(cat.items || [])) as Json,
    }));

    await supabase
      .from("project_budgets")
      .insert(budgetData);

    // Update project total budget
    const totalBudget = updatedCategories.reduce((acc, cat) => 
      acc + (cat.name === editingCategory.name ? budget : cat.budget), 0
    );
    await supabase
      .from("projects")
      .update({ total_budget: totalBudget, updated_at: new Date().toISOString() })
      .eq("id", selectedProjectId);

    queryClient.invalidateQueries({ queryKey: ["project-budget", selectedProjectId] });

    const shouldClose = options?.closeDialog !== false;
    if (shouldClose) {
      setEditingCategory(null);
      setShowCategoryDialog(false);
    } else {
      // Keep dialog open (e.g. after "Supprimer fournisseur" or after confirming from full analysis)
      setEditingCategory((prev) => (prev ? { ...prev, budget, spent } : prev));
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 py-8">
        <div className="container space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="font-display text-3xl font-bold tracking-tight">
                {t("budget.pageTitle")}
              </h1>
              <p className="text-muted-foreground mt-1">
                {t("budget.pageSubtitle")}
              </p>
            </div>
            <div className="flex gap-2 flex-wrap">
              {selectedProjectId && hasAnalyzedBudget && (
                <Button 
                  variant="outline" 
                  onClick={handleResetBudget}
                  disabled={resetBudgetMutation.isPending}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  {resetBudgetMutation.isPending ? t("budget.resetting") : t("budget.resetBudget")}
                </Button>
              )}
              {selectedProjectId && (
                <Button 
                  variant="default" 
                  onClick={() => saveBudgetMutation.mutate(budgetCategories)}
                  disabled={saveBudgetMutation.isPending}
                >
                  <Save className="h-4 w-4 mr-2" />
                  {saveBudgetMutation.isPending ? t("budget.saving") : t("budget.saveBudget")}
                </Button>
              )}
              <Button variant="accent" onClick={() => setShowAddExpense(!showAddExpense)}>
                <Plus className="h-4 w-4" />
                {t("budget.addExpense")}
              </Button>
            </div>
          </div>

          {/* Project Selection */}
          {user && (
            <Card className="border-primary/20">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <FolderOpen className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg">{t("budget.associatedProject")}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                {projects.length > 0 ? (
                  <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                    <div className="flex-1 w-full sm:max-w-xs">
                      <Select 
                        value={selectedProjectId || ""} 
                        onValueChange={(v) => {
                          setSelectedProjectId(v);
                          const next = new URLSearchParams(searchParams);
                          next.set("project", v);
                          setSearchParams(next, { replace: true });
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={t("budget.selectProject")} />
                        </SelectTrigger>
                        <SelectContent>
                          {projects.map((project) => (
                            <SelectItem key={project.id} value={project.id}>
                              {project.name} {project.project_type && `(${project.project_type})`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {selectedProjectId && (
                      <p className="text-sm text-muted-foreground">
                        {t("budget.autoSaveNote")}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-muted-foreground">
                    {t("budget.noProjectsYet")} <a href="/demarrer" className="text-primary underline">{t("budget.createProjectLink")}</a> {t("budget.toSaveBudget")}
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {!user && (
            <Card className="border-warning/50 bg-warning/5">
              <CardContent className="py-4">
                <p className="text-sm text-warning-foreground flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  <a href="/auth" className="text-primary underline">{t("nav.login")}</a> {t("budget.loginToSave")}
                </p>
              </CardContent>
            </Card>
          )}

          {/* AI Plan Analyzer */}
          <div ref={planAnalyzerRef}>
            <PlanAnalyzer 
              ref={planAnalyzerComponentRef}
              onBudgetGenerated={handleBudgetGenerated} 
              projectId={selectedProjectId}
              autoSelectPlanTab={autoAnalyze && !autoManual}
              autoSelectManualTab={autoManual}
              onGenerateSchedule={() => setShowScheduleDialog(true)}
              besoinsNote={besoinsNoteFromUrl}
              prefillProjectType={prefillProjectType}
              prefillFloors={prefillFloors}
              prefillSquareFootage={prefillSquareFootage}
            />
          </div>

          {/* Schedule Generation Dialog */}
          {selectedProjectId && (
            <GenerateScheduleDialog
              open={showScheduleDialog}
              onOpenChange={setShowScheduleDialog}
              projectId={selectedProjectId}
              createSchedule={(data) => createScheduleAsync(data as any)}
              calculateEndDate={calculateEndDate}
              generateAlerts={generateAlerts}
            />
          )}

          {/* Summary Cards - Fourchettes de prix ±15% */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="animate-fade-in">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {t("budget.estimatedBudget")}
                </CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {hasAnalyzedBudget ? (
                  <>
                    <div className="text-xl font-bold font-display">
                      {formatCurrency(Math.round(displayBudget * 0.90))} à {formatCurrency(Math.round(displayBudget * 1.10))}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{t("budget.budgetRange")}</p>
                  </>
                ) : (
                  <>
                    <div className="text-2xl font-bold font-display text-muted-foreground">{formatCurrency(0)}</div>
                    <p className="text-xs text-muted-foreground mt-1">{t("budget.noAnalysis")}</p>
                  </>
                )}
              </CardContent>
            </Card>

            <Card className="animate-fade-in" style={{ animationDelay: "100ms" }}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {t("budget.spent")}
                </CardTitle>
                <TrendingDown className="h-4 w-4 text-accent" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold font-display text-accent">
                  {formatCurrency(totalSpent)}
                </div>
                <Progress value={percentUsed} className="mt-2 h-2" />
                <p className="text-xs text-muted-foreground mt-1">
                  {percentUsed.toFixed(1)}% {t("budget.percentUsed")}
                </p>
              </CardContent>
            </Card>

            <Card className="animate-fade-in" style={{ animationDelay: "200ms" }}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {t("budget.estimatedRemaining")}
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-success" />
              </CardHeader>
              <CardContent>
                {hasAnalyzedBudget ? (
                  <div className="text-xl font-bold font-display text-success">
                    {formatCurrency(Math.round(displayRemaining * 0.90))} à {formatCurrency(Math.round(displayRemaining * 1.10))}
                  </div>
                ) : (
                  <div className="text-2xl font-bold font-display text-muted-foreground">{formatCurrency(0)}</div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Add Expense Form */}
          {showAddExpense && (
            <Card className="animate-scale-in border-accent/50">
              <CardHeader>
                <CardTitle className="font-display">{t("budget.newExpense")}</CardTitle>
                <CardDescription>{t("budget.newExpenseDesc")}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="space-y-2">
                    <Label htmlFor="category">{t("budget.category")}</Label>
                    <select
                      id="category"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      {budgetCategories.map((cat) => (
                        <option key={cat.name} value={cat.name}>
                          {translateCategoryName(cat.name)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">{t("budget.description")}</Label>
                    <Input id="description" placeholder={t("budget.descriptionPlaceholder")} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="amount">{t("budget.amount")}</Label>
                    <Input id="amount" type="number" placeholder={t("budget.amountPlaceholder")} />
                  </div>
                  <div className="flex items-end">
                    <Button variant="accent" className="w-full">
                      {t("common.add")}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Pie Chart */}
            <Card className="animate-fade-in" style={{ animationDelay: "300ms" }}>
              <CardHeader>
                <CardTitle className="font-display">{t("budget.distribution")}</CardTitle>
                <CardDescription>{t("budget.distributionDesc")}</CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex flex-col items-center gap-6">
                  {/* Pie Chart Container */}
                  <div className="h-[200px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={45}
                          outerRadius={80}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value: number, name: string) => [`${value.toLocaleString()} $`, name]}
                          labelFormatter={() => ''}
                          contentStyle={{
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                            padding: '8px 12px',
                          }}
                          itemStyle={{
                            color: 'hsl(var(--foreground))',
                            fontWeight: 500,
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  
                  {/* Légende claire avec montants */}
                  <div className="w-full space-y-2 max-h-[200px] overflow-y-auto">
                    {pieData.map((entry, index) => {
                      const percentage = totalBudget > 0 ? ((entry.value / totalBudget) * 100).toFixed(1) : 0;
                      return (
                        <div key={index} className="flex items-center justify-between gap-3 py-1.5 px-2 rounded-md hover:bg-muted/50">
                          <div className="flex items-center gap-3 min-w-0">
                            <div 
                              className="w-4 h-4 rounded shrink-0" 
                              style={{ backgroundColor: entry.color }}
                            />
                            <span className="font-medium truncate">{entry.name}</span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0 text-sm">
                            <span className="text-muted-foreground">{percentage}%</span>
                            <span className="font-medium">{entry.value.toLocaleString()} $</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Category List */}
            <Card className="animate-fade-in" style={{ animationDelay: "400ms" }}>
              <CardHeader>
                <CardTitle className="font-display">{t("budget.detailedBudget")}</CardTitle>
                <CardDescription>
                  {t("budget.detailedBudgetDesc")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {(() => {
                  const subTotal = budgetCategories.reduce((s, c) => s + (Number(c.budget) || 0), 0);
                  const contingence = subTotal * 0.05;
                  const tps = (subTotal + contingence) * 0.05;
                  const tvq = (subTotal + contingence) * 0.09975;
                  const taxes = tps + tvq;

                  return (
                    <div className="space-y-3 max-h-[500px] overflow-y-auto">
                      {budgetCategories.map((category) => {
                    const percent = category.budget > 0 ? (category.spent / category.budget) * 100 : 0;
                    const isOverBudget = category.spent > category.budget;
                    const isNearLimit = percent > 80 && !isOverBudget;
                    const isExpanded = expandedCategories.includes(category.name);
                    const stepTasks = Array.from(new Set(stepTasksByCategory[category.name] ?? []));
                    const stepTasksText = stepTasks.join(", ");
                    const showAnalysisSummary =
                      !!category.description &&
                      category.description.trim().length > 0 &&
                      category.description.trim() !== stepTasksText.trim();

                    const displayItems = aggregateBudgetItemsForDisplay(category.items || []);

                    return (
                      <Collapsible 
                        key={category.name} 
                        open={isExpanded} 
                        onOpenChange={() => toggleCategory(category.name)}
                      >
                        <div className="rounded-lg border hover:bg-muted/50 transition-colors">
                          <CollapsibleTrigger asChild>
                            <div className="flex items-center gap-4 p-3 cursor-pointer">
                              <div
                                className="w-4 h-4 rounded shrink-0"
                                style={{ backgroundColor: category.color }}
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium truncate">{translateCategoryName(category.name)}</span>
                                  {isOverBudget && (
                                    <Badge variant="destructive" className="text-xs">
                                      <AlertTriangle className="h-3 w-3 mr-1" />
                                      {t("budget.exceeded")}
                                    </Badge>
                                  )}
                                  {isNearLimit && (
                                    <Badge variant="secondary" className="text-xs bg-warning/10 text-warning">
                                      {t("common.warning")}
                                    </Badge>
                                  )}
                                </div>
                                <Progress
                                  value={Math.min(percent, 100)}
                                  className="mt-2 h-1.5"
                                />
                              </div>
                              <div className="text-right shrink-0">
                                <div className="text-sm font-medium">
                                  {category.spent.toLocaleString()} $
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  / {Math.round(category.budget * 0.90).toLocaleString()} - {Math.round(category.budget * 1.10).toLocaleString()} $
                                </div>
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  onClick={(e) => handleEditCategory(category, e)}
                                  title={t("budget.manageBudgetSubmissions")}
                                >
                                  <Edit2 className="h-4 w-4" />
                                </Button>
                                {isExpanded ? (
                                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                                ) : (
                                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                )}
                              </div>
                            </div>
                          </CollapsibleTrigger>
                          
                          <CollapsibleContent>
                            <div className="px-4 pb-3 pt-3 border-t bg-muted/30 space-y-4">
                              {/* Group items by task */}
                              {(() => {
                                const groupedByTask = groupItemsByTask(category.name, displayItems);
                                 const taskEntries = Array.from(groupedByTask.entries());
                                 const otherItems = groupedByTask.get("Autres éléments") ?? [];
                                 const guideTaskTitles = stepTasks;
                                 const hasAnyItems = displayItems.length > 0;

                                 // If no items at all, show tasks from the guide without items
                                 if (!hasAnyItems) {
                                  return (
                                    <>
                                      {stepTasks.length > 0 && (
                                        <div>
                                          <div className="text-xs font-medium text-muted-foreground mb-2">
                                            {t("budget.includedTasks")}
                                          </div>
                                          <ul className="list-disc pl-5 space-y-1 text-sm">
                                            {stepTasks.map((task) => (
                                              <li key={task} className="text-muted-foreground">
                                                {task}
                                              </li>
                                            ))}
                                          </ul>
                                        </div>
                                      )}
                                      <div className="text-sm text-muted-foreground italic">
                                        {t("budget.noItemsAnalyzed")}
                                      </div>
                                    </>
                                  );
                                }

                                 // Prefer rendering the official guide task titles as headings
                                 // so the UI is always identical to the step tasks.
                                 if (guideTaskTitles.length > 0) {
                                   return (
                                     <div className="space-y-4">
                                       {guideTaskTitles.map((taskTitle) => {
                                         const items = groupedByTask.get(taskTitle) ?? [];
                                         const hasItems = items.length > 0;

                                         return (
                                           <div key={taskTitle}>
                                             <div
                                               className={
                                                 "text-sm font-medium mb-2 flex items-center gap-2 " +
                                                 (hasItems ? "text-foreground" : "text-muted-foreground")
                                               }
                                             >
                                               <CheckCircle2
                                                 className={
                                                   "h-4 w-4 " +
                                                   (hasItems ? "text-primary" : "text-muted-foreground")
                                                 }
                                               />
                                               {taskTitle}
                                             </div>

                                             {hasItems ? (
                                               <ul className="ml-6 list-disc pl-4 space-y-1">
                                                 {items.map((item, idx) => (
                                                   <li key={idx} className="text-sm text-muted-foreground">
                                                     {item.name}
                                                   </li>
                                                 ))}
                                               </ul>
                                              ) : (
                                                <div className="ml-6 text-sm text-muted-foreground italic">
                                                  {t("budget.noItemsAssociated")}
                                                </div>
                                              )}
                                           </div>
                                         );
                                       })}

                                        {otherItems.length > 0 && (
                                          <div>
                                            <div className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
                                              <CheckCircle2 className="h-4 w-4 text-primary" />
                                              {t("budget.otherItems")}
                                            </div>
                                           <ul className="ml-6 list-disc pl-4 space-y-1">
                                             {otherItems.map((item, idx) => (
                                               <li key={idx} className="text-sm text-muted-foreground">
                                                 {item.name}
                                               </li>
                                             ))}
                                           </ul>
                                         </div>
                                       )}
                                     </div>
                                   );
                                 }

                                 // Fallback: Display items grouped under their mapping task headings
                                 return (
                                   <div className="space-y-4">
                                     {taskEntries.map(([taskTitle, items]) => (
                                       <div key={taskTitle}>
                                         <div className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
                                           <CheckCircle2 className="h-4 w-4 text-primary" />
                                           {taskTitle}
                                         </div>
                                         <ul className="ml-6 list-disc pl-4 space-y-1">
                                           {items.map((item, idx) => (
                                             <li key={idx} className="text-sm text-muted-foreground">
                                               {item.name}
                                             </li>
                                           ))}
                                         </ul>
                                       </div>
                                     ))}
                                   </div>
                                 );
                              })()}

                              {/* Analysis summary (if present) */}
                              {showAnalysisSummary && (
                                <div className="text-sm text-muted-foreground">
                                  <span className="font-medium">Analyse:</span> {category.description}
                                </div>
                              )}
                            </div>
                          </CollapsibleContent>
                        </div>
                      </Collapsible>
                    );
                      })}

                      {/* Budget imprévu 5% */}
                      <div className="rounded-lg border bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded shrink-0 bg-amber-500" />
                            <span className="font-medium text-amber-700 dark:text-amber-400">{t("budget.contingencyBudget")}</span>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="text-sm font-medium text-amber-700 dark:text-amber-400">
                              {Math.round(contingence * 0.90).toLocaleString()} $ - {Math.round(contingence * 1.10).toLocaleString()} $
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Taxes (TPS + TVQ) */}
                      <div className="rounded-lg border bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800 p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded shrink-0 bg-blue-500" />
                            <span className="font-medium text-blue-700 dark:text-blue-400">{t("budget.taxesTpsQst")}</span>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="text-sm font-medium text-blue-700 dark:text-blue-400">
                              {Math.round(taxes * 0.90).toLocaleString()} $ - {Math.round(taxes * 1.10).toLocaleString()} $
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          </div>

          {/* Category Submissions Dialog */}
          {editingCategory && selectedProjectId && (
            <CategorySubmissionsDialog
              open={showCategoryDialog}
              onOpenChange={(open) => {
                setShowCategoryDialog(open);
                if (!open) setEditingCategory(null);
              }}
              projectId={selectedProjectId}
              categoryName={editingCategory.name}
              categoryColor={editingCategory.color}
              currentBudget={editingCategory.budget}
              currentSpent={editingCategory.spent}
              onSave={handleSaveCategoryFromDialog}
            />
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Budget;
