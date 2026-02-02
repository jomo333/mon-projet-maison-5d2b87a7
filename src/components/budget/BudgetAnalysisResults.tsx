import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  Tooltip as RadixTooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  Filter,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Pencil,
  X,
  ChevronDown,
  ChevronRight,
  FileSpreadsheet,
  FileText,
  PieChart,
  BarChart3,
  AlertCircle,
  Info,
  Wrench,
  HelpCircle
} from "lucide-react";
import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";
import { cn } from "@/lib/utils";
import { groupItemsByTask, getTasksForCategory, OTHER_ITEMS_KEY } from "@/lib/budgetTaskMapping";
import { translateBudgetTaskTitle } from "@/lib/budgetTaskTitleI18n";
import { translateBudgetItemName, translateNoItemsMessage } from "@/lib/budgetItemI18n";
import { translateWarnings, translateRecommendations } from "@/lib/budgetWarningsI18n";
import { getCategoryLabel } from "@/lib/budgetCategoryI18n";
import { 
  mapAnalysisToStepCategories, 
  defaultCategories,
  categoryColors,
  stepTasksByCategory,
  type BudgetCategory as MappedBudgetCategory,
  type ProjectConfig
} from "@/lib/budgetCategories";

interface BudgetItem {
  name: string;
  cost: number;
  quantity: string;
  unit: string;
}

interface BudgetCategory {
  name: string;
  budget: number;
  description: string;
  items: BudgetItem[];
}

interface ValidationData {
  surfacesCompletes?: boolean;
  ratioMainOeuvre?: number;
  ratioAcceptable?: boolean;
}

interface TotauxDetails {
  total_materiaux?: number;
  total_main_oeuvre?: number;
  sous_total_avant_taxes?: number;
  contingence_5_pourcent?: number;
  sous_total_avec_contingence?: number;
  tps_5_pourcent?: number;
  tvq_9_975_pourcent?: number;
  total_ttc?: number;
}

interface BudgetAnalysis {
  projectType?: string;
  projectSummary: string;
  estimatedTotal: number;
  newSquareFootage?: number;
  plansAnalyzed?: number;
  finishQuality?: string;
  categories: BudgetCategory[];
  recommendations: string[];
  warnings: string[];
  validation?: ValidationData;
  totauxDetails?: TotauxDetails;
}

interface BudgetAnalysisResultsProps {
  analysis: BudgetAnalysis;
  onApplyBudget: () => void;
  onAdjustPrice?: (categoryIndex: number, itemIndex: number, newPrice: number) => void;
  /** Optional project configuration for filtering categories (e.g., garage with monolithic slab) */
  projectConfig?: ProjectConfig;
}

export function BudgetAnalysisResults({ 
  analysis, 
  onApplyBudget,
  onAdjustPrice,
  projectConfig
}: BudgetAnalysisResultsProps) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState("overview");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedCategories, setExpandedCategories] = useState<Set<number>>(new Set());
  const [editingItem, setEditingItem] = useState<{catIndex: number; itemIndex: number} | null>(null);
  const [editPrice, setEditPrice] = useState<string>("");

  // Map analysis categories to ordered step categories (same as Budget.tsx "Détail par catégorie")
  // Filters out categories that don't apply based on projectConfig (e.g., no "Coulée de dalle du sous-sol" for garage with monolithic slab)
  const orderedCategories = useMemo(() => {
    // Convert analysis categories to the format expected by mapAnalysisToStepCategories
    const analysisForMapping = analysis.categories.map(cat => ({
      name: cat.name,
      budget: cat.budget,
      description: cat.description,
      items: cat.items || [],
    }));
    
    return mapAnalysisToStepCategories(analysisForMapping, undefined, projectConfig);
  }, [analysis.categories, projectConfig]);

  // Helper function to translate budget category names
  const translateCategoryName = (name: string): string => {
    return getCategoryLabel(t, name);
  };

  // Parse and translate project summary dynamically
  const translateProjectSummary = (summary: string): string => {
    // Match patterns like "Analyse fusionnée de X plan(s)" or "Merged analysis from X plan(s)"
    const mergedMatch = summary.match(/(?:Analyse fusionnée de|Merged analysis from)\s*(\d+)\s*plan\(s\)/i);
    // Match patterns like "Construction neuve de X pi²/sq ft sur Y étage(s)/floor(s)"
    const constructionMatch = summary.match(/(?:Construction neuve de|New construction of)\s*([\d\s]+)\s*(?:pi²|sq ft)\s*(?:sur|on)\s*(\d+)\s*(?:étage\(s\)|floor\(s\))/i);
    
    let translatedSummary = "";
    
    if (mergedMatch) {
      const planCount = parseInt(mergedMatch[1]);
      translatedSummary += t("budgetAnalysis.mergedAnalysis", { count: planCount });
    }
    
    if (constructionMatch) {
      const sqft = constructionMatch[1].replace(/\s/g, '');
      const floors = parseInt(constructionMatch[2]);
      if (translatedSummary) translatedSummary += " - ";
      translatedSummary += t("budgetAnalysis.newConstruction", { sqft, floors });
    }
    
    // If no patterns matched, return original
    return translatedSummary || summary;
  };

  const translatedProjectSummary = translateProjectSummary(analysis.projectSummary);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("fr-CA", {
      style: "currency",
      currency: "CAD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const toggleCategory = (index: number) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedCategories(newExpanded);
  };

  const startEditing = (catIndex: number, itemIndex: number, currentPrice: number) => {
    setEditingItem({ catIndex, itemIndex });
    setEditPrice(String(currentPrice));
  };

  const saveEdit = () => {
    if (editingItem && onAdjustPrice) {
      const newPrice = parseFloat(editPrice) || 0;
      onAdjustPrice(editingItem.catIndex, editingItem.itemIndex, newPrice);
    }
    setEditingItem(null);
    setEditPrice("");
  };

  const cancelEdit = () => {
    setEditingItem(null);
    setEditPrice("");
  };

  // Filter ordered categories based on search and filter
  const filteredCategories = orderedCategories.filter(cat => {
    if (categoryFilter !== "all" && cat.name !== categoryFilter) return false;
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      return cat.name.toLowerCase().includes(searchLower) ||
        (cat.items || []).some(item => item.name.toLowerCase().includes(searchLower));
    }
    return true;
  });

  // Prepare pie chart data (only categories with budget > 0)
  const pieData = orderedCategories
    .filter(cat => cat.budget > 0)
    .map((cat, index) => ({
      name: translateCategoryName(cat.name),
      value: cat.budget,
      color: categoryColors[index % categoryColors.length],
    }));

  // Prepare bar chart data (only categories with budget > 0)
  const barData = orderedCategories
    .filter(cat => cat.budget > 0)
    .map(cat => {
      const translated = translateCategoryName(cat.name);
      return {
        name: translated.length > 12 ? translated.substring(0, 12) + "..." : translated,
        fullName: translated,
        budget: cat.budget,
      };
    });

  // Calculate totals - toujours basé sur les catégories ordonnées pour cohérence
  const categoriesSubTotal = orderedCategories.reduce((sum, cat) => sum + (Number(cat.budget) || 0), 0);
  const subTotalBeforeTaxes = categoriesSubTotal;
  
  // Calculer le total avec taxes et contingence pour affichage cohérent
  const calculatedContingence = subTotalBeforeTaxes * 0.05;
  const calculatedTps = (subTotalBeforeTaxes + calculatedContingence) * 0.05;
  const calculatedTvq = (subTotalBeforeTaxes + calculatedContingence) * 0.09975;
  const calculatedGrandTotal = subTotalBeforeTaxes + calculatedContingence + calculatedTps + calculatedTvq;

  const hasWarnings = analysis.warnings && analysis.warnings.length > 0;
  const hasRecommendations = analysis.recommendations && analysis.recommendations.length > 0;

  // Translate warnings and recommendations from French to user's language
  const translatedWarnings = useMemo(
    () => (hasWarnings ? translateWarnings(t, analysis.warnings) : []),
    [analysis.warnings, hasWarnings, t]
  );
  const translatedRecommendations = useMemo(
    () => (hasRecommendations ? translateRecommendations(t, analysis.recommendations) : []),
    [analysis.recommendations, hasRecommendations, t]
  );

  return (
    <div className="space-y-6">
      {/* Alerts and Recommendations Section - TOP */}
      {(hasWarnings || hasRecommendations) && (
        <div className="grid gap-4 md:grid-cols-2">
          {hasWarnings && (
            <Card className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                  <AlertTriangle className="h-5 w-5" />
                  {t("budgetAnalysis.alertsWarnings")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {translatedWarnings.map((warning, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-amber-800 dark:text-amber-300">
                      <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                      <span>{warning}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {hasRecommendations && (
            <Card className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/30">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-blue-700 dark:text-blue-400">
                  <Info className="h-5 w-5" />
                  {t("budgetAnalysis.recommendations")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {translatedRecommendations.map((rec, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-blue-800 dark:text-blue-300">
                      <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Summary Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              {/* Afficher fourchette ±10% pour estimation préliminaire */}
              {analysis.plansAnalyzed === 1 && !analysis.totauxDetails?.total_materiaux ? (
                <>
                  <CardTitle className="text-2xl flex items-baseline gap-2 flex-wrap">
                    <span className="text-primary">{formatCurrency(Math.round(calculatedGrandTotal * 0.90))}</span>
                    <span className="text-muted-foreground text-lg">{t("budgetAnalysis.to")}</span>
                    <span className="text-primary">{formatCurrency(Math.round(calculatedGrandTotal * 1.10))}</span>
                    <TooltipProvider>
                      <RadixTooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-[280px]">
                          <p className="font-medium mb-1">{t("budgetAnalysis.totalIncludes")}</p>
                          <ul className="text-xs space-y-1">
                            <li>• {t("budgetAnalysis.allConstructionWork")}</li>
                            <li>• {t("budgetAnalysis.contingencyForUnforeseen")}</li>
                            <li>• {t("budgetAnalysis.tpsTvq")}</li>
                          </ul>
                        </TooltipContent>
                      </RadixTooltip>
                    </TooltipProvider>
                  </CardTitle>
                  <CardDescription className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-xs">{t("budgetAnalysis.rangePlusMinus10")}</Badge>
                    {t("budgetAnalysis.preliminaryEstimate")} • {t("budgetAnalysis.includesTaxesContingency")} • {translatedProjectSummary}
                  </CardDescription>
                </>
              ) : (
                <>
                  <CardTitle className="text-2xl flex items-center gap-2">
                    {formatCurrency(calculatedGrandTotal)}
                    <TooltipProvider>
                      <RadixTooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-[280px]">
                          <p className="font-medium mb-1">{t("budgetAnalysis.totalIncludes")}</p>
                          <ul className="text-xs space-y-1">
                            <li>• {t("budgetAnalysis.allConstructionWork")}</li>
                            <li>• {t("budgetAnalysis.contingencyForUnforeseen")}</li>
                            <li>• {t("budgetAnalysis.tpsTvq")}</li>
                          </ul>
                        </TooltipContent>
                      </RadixTooltip>
                    </TooltipProvider>
                  </CardTitle>
                  <CardDescription className="flex items-center gap-1">
                    <Badge variant="outline" className="text-xs mr-1">{t("budgetAnalysis.ttc")}</Badge>
                    {t("budgetAnalysis.includesTaxesContingency")} • {translatedProjectSummary}
                  </CardDescription>
                </>
              )}
            </div>
            <div className="flex gap-2">
              {analysis.projectType && (
                <Badge variant="outline">{analysis.projectType}</Badge>
              )}
              {analysis.finishQuality && (
                <Badge variant="secondary">
                  {analysis.finishQuality === "economique" ? t("planAnalyzer.qualityLevels.economique") :
                   analysis.finishQuality === "haut-de-gamme" ? t("planAnalyzer.qualityLevels.hautDeGamme") : t("planAnalyzer.qualityLevels.standard")}
                </Badge>
              )}
              {analysis.newSquareFootage && (
                <Badge variant="outline">{analysis.newSquareFootage} {t("common.locale") === "en-CA" ? "sq ft" : "pi²"}</Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Totaux détaillés */}
          {analysis.totauxDetails && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-lg bg-muted/50 mb-4">
              <div>
                <p className="text-xs text-muted-foreground">{t("budgetAnalysis.materials")}</p>
                <p className="font-semibold">{formatCurrency(analysis.totauxDetails.total_materiaux || 0)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t("budgetAnalysis.labor")}</p>
                <p className="font-semibold">{formatCurrency(analysis.totauxDetails.total_main_oeuvre || 0)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t("budgetAnalysis.contingency5")}</p>
                <p className="font-semibold">{formatCurrency(analysis.totauxDetails.contingence_5_pourcent || 0)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t("budgetAnalysis.taxesTpsTvq")}</p>
                <p className="font-semibold">
                  {formatCurrency((analysis.totauxDetails.tps_5_pourcent || 0) + (analysis.totauxDetails.tvq_9_975_pourcent || 0))}
                </p>
              </div>
            </div>
          )}

          {/* Validation indicators */}
          {analysis.validation && (
            <div className="flex gap-4 flex-wrap">
              <div className={cn(
                "flex items-center gap-2 px-3 py-1 rounded-full text-sm",
                analysis.validation.surfacesCompletes 
                  ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                  : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
              )}>
                {analysis.validation.surfacesCompletes 
                  ? <CheckCircle2 className="h-4 w-4" /> 
                  : <AlertTriangle className="h-4 w-4" />}
                {analysis.validation.surfacesCompletes ? t("budgetAnalysis.surfacesComplete") : t("budgetAnalysis.surfacesIncomplete")}
              </div>
              
              {analysis.validation.ratioMainOeuvre !== undefined && (
                <div className={cn(
                  "flex items-center gap-2 px-3 py-1 rounded-full text-sm",
                  analysis.validation.ratioAcceptable 
                    ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                    : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                )}>
                  {analysis.validation.ratioAcceptable 
                    ? <CheckCircle2 className="h-4 w-4" /> 
                    : <AlertTriangle className="h-4 w-4" />}
                  {t("budgetAnalysis.laborMaterialRatio")}: {(analysis.validation.ratioMainOeuvre * 100).toFixed(0)}%
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabs for different views */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" className="gap-2">
            <PieChart className="h-4 w-4" />
            {t("budgetAnalysis.overview")}
          </TabsTrigger>
          <TabsTrigger value="details" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            {t("budgetAnalysis.details")}
          </TabsTrigger>
          <TabsTrigger value="table" className="gap-2">
            <FileSpreadsheet className="h-4 w-4" />
            {t("budgetAnalysis.table")}
          </TabsTrigger>
          <TabsTrigger value="export" className="gap-2">
            <Download className="h-4 w-4" />
            {t("budgetAnalysis.export")}
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Pie Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t("budgetAnalysis.budgetDistribution")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={2}
                        dataKey="value"
                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                        labelLine={false}
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Bar Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t("budgetAnalysis.budgetByCategory")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={barData} layout="vertical">
                      <XAxis type="number" tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`} />
                      <YAxis type="category" dataKey="name" width={100} fontSize={12} />
                      <Tooltip 
                        formatter={(value: number) => formatCurrency(value)}
                        labelFormatter={(label, payload) => payload?.[0]?.payload?.fullName || label}
                      />
                      <Bar dataKey="budget" fill="#4F46E5" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Category Summary Cards with Contingency and Taxes */}
          {(() => {
            const contingence = subTotalBeforeTaxes * 0.05;
            const tps = (subTotalBeforeTaxes + contingence) * 0.05;
            const tvq = (subTotalBeforeTaxes + contingence) * 0.09975;
            const taxes = tps + tvq;
            
            return (
              <>
                <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-4">
                  {orderedCategories.map((cat, index) => {
                    const percentage = (cat.budget / subTotalBeforeTaxes) * 100;
                    return (
                      <Card key={index} className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium truncate">{translateCategoryName(cat.name)}</span>
                          <span className="text-xs text-muted-foreground">{percentage.toFixed(1)}%</span>
                        </div>
                        <p className="text-lg font-bold">{formatCurrency(cat.budget)}</p>
                        <p className="text-xs text-muted-foreground mt-1">{t("budgetAnalysis.beforeTaxes")}</p>
                        <Progress value={percentage} className="h-1 mt-2" />
                      </Card>
                    );
                  })}
                </div>

                {/* Budget breakdown summary */}
                <Card className="mt-4">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      {t("budgetAnalysis.budgetSummary")}
                      <TooltipProvider>
                        <RadixTooltip>
                          <TooltipTrigger asChild>
                            <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                          </TooltipTrigger>
                        <TooltipContent className="max-w-[300px]">
                          <p className="text-xs">
                            {t("budgetAnalysis.budgetSummaryTooltip")}
                          </p>
                        </TooltipContent>
                        </RadixTooltip>
                      </TooltipProvider>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between py-2 border-b">
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">{t("budgetAnalysis.workSubtotal")}</span>
                        <Badge variant="outline" className="text-xs">{t("budgetAnalysis.beforeTaxes")}</Badge>
                      </div>
                      <span className="font-semibold">{formatCurrency(subTotalBeforeTaxes)}</span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-400 text-xs flex items-center justify-center font-medium">%</span>
                        <span className="text-amber-700 dark:text-amber-400">{t("budgetAnalysis.contingencyBudget")}</span>
                        <TooltipProvider>
                          <RadixTooltip>
                            <TooltipTrigger asChild>
                              <HelpCircle className="h-3 w-3 text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-[250px]">
                              <p className="text-xs">{t("budgetAnalysis.contingencyTooltip")}</p>
                            </TooltipContent>
                          </RadixTooltip>
                        </TooltipProvider>
                      </div>
                      <span className="font-semibold text-amber-700 dark:text-amber-400">{formatCurrency(contingence)}</span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-700 dark:text-blue-400 text-xs flex items-center justify-center font-medium">$</span>
                        <span className="text-blue-700 dark:text-blue-400">{t("budgetAnalysis.tps5")}</span>
                        <TooltipProvider>
                          <RadixTooltip>
                            <TooltipTrigger asChild>
                              <HelpCircle className="h-3 w-3 text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-[200px]">
                              <p className="text-xs">{t("budgetAnalysis.tpsTooltip")}</p>
                            </TooltipContent>
                          </RadixTooltip>
                        </TooltipProvider>
                      </div>
                      <span className="font-semibold text-blue-700 dark:text-blue-400">{formatCurrency(tps)}</span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-700 dark:text-blue-400 text-xs flex items-center justify-center font-medium">$</span>
                        <span className="text-blue-700 dark:text-blue-400">{t("budgetAnalysis.tvq")}</span>
                        <TooltipProvider>
                          <RadixTooltip>
                            <TooltipTrigger asChild>
                              <HelpCircle className="h-3 w-3 text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-[200px]">
                              <p className="text-xs">{t("budgetAnalysis.tvqTooltip")}</p>
                            </TooltipContent>
                          </RadixTooltip>
                        </TooltipProvider>
                      </div>
                      <span className="font-semibold text-blue-700 dark:text-blue-400">{formatCurrency(tvq)}</span>
                    </div>
                    <div className="flex items-center justify-between py-3 bg-primary/5 rounded-lg px-3 -mx-3">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-lg">{t("budgetAnalysis.totalEstimated")}</span>
                        <Badge variant="default" className="text-xs">{t("budgetAnalysis.ttc")}</Badge>
                      </div>
                      <span className="font-bold text-lg text-primary">{formatCurrency(subTotalBeforeTaxes + contingence + taxes)}</span>
                    </div>
                    <p className="text-xs text-muted-foreground text-center pt-2">
                      {t("budgetAnalysis.totalIncludesBreakdown")}
                    </p>
                  </CardContent>
                </Card>
              </>
            );
          })()}
        </TabsContent>

        {/* Details Tab */}
        <TabsContent value="details" className="space-y-4">
          {/* Filters */}
          <div className="flex gap-4 items-center">
            <div className="flex-1">
              <Input
                placeholder={t("budgetAnalysis.searchItem")}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-sm"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[200px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder={t("budgetAnalysis.filterByCategory")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("budgetAnalysis.allCategories")}</SelectItem>
                {orderedCategories.map((cat, i) => (
                  <SelectItem key={i} value={cat.name}>{translateCategoryName(cat.name)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Expandable Categories */}
          <div className="space-y-3">
            {filteredCategories.map((cat, catIndex) => {
              const isExpanded = expandedCategories.has(catIndex);
              const percentage = (cat.budget / analysis.estimatedTotal) * 100;
              
              return (
                <Card key={catIndex}>
                  <div 
                    className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => toggleCategory(catIndex)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {isExpanded ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                        <div>
                          <h3 className="font-semibold">{translateCategoryName(cat.name)}</h3>
                          <p className="text-sm text-muted-foreground">
                            {(stepTasksByCategory[cat.name]?.length
                              ? stepTasksByCategory[cat.name]
                                  .map((task) => translateBudgetTaskTitle(t, cat.name, task))
                                  .join(", ")
                              : cat.description) || ""}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-lg">{formatCurrency(cat.budget)}</p>
                        <p className="text-xs text-muted-foreground">{t("budgetAnalysis.beforeTaxes")} • {percentage.toFixed(1)}%</p>
                      </div>
                    </div>
                    <Progress value={percentage} className="h-2 mt-3" />
                  </div>
                  
                  {isExpanded && (
                    <div className="border-t p-4 space-y-4 bg-muted/30">
                      {(() => {
                        const items = cat.items || [];
                        const groupedByTask = groupItemsByTask(cat.name, items);

                        const tasksFromSteps = stepTasksByCategory[cat.name] ?? [];
                        const tasksFromKeywords = getTasksForCategory(cat.name) ?? [];
                        const orderedTasks = tasksFromSteps.length ? tasksFromSteps : tasksFromKeywords;

                        const fallbackTasks = Array.from(groupedByTask.keys());
                        const baseTasks = orderedTasks.length ? orderedTasks : fallbackTasks;

                        const hasOther = groupedByTask.has(OTHER_ITEMS_KEY);
                        const tasksToRender = [
                          ...baseTasks.filter((t) => t !== OTHER_ITEMS_KEY),
                          ...(hasOther ? [OTHER_ITEMS_KEY] : []),
                        ];

                        if (tasksToRender.length === 0) {
                          return (
                            <p className="text-sm text-muted-foreground italic">
                              {t("budget.noTasksDefined")}
                            </p>
                          );
                        }

                        return tasksToRender.map((taskTitle) => {
                          const taskItems = groupedByTask.get(taskTitle) ?? [];
                          const displayTaskTitle =
                            taskTitle === OTHER_ITEMS_KEY
                              ? t("categories.otherItems")
                              : translateBudgetTaskTitle(t, cat.name, taskTitle);

                          return (
                            <div key={taskTitle} className="space-y-2">
                              <div className="flex items-center gap-2">
                                <Wrench className="h-4 w-4 text-primary" />
                                <span className="font-medium text-sm">{displayTaskTitle}</span>
                                <Badge variant="outline" className="text-xs">
                                  {t("budget.itemCount", { count: taskItems.length })}
                                </Badge>
                              </div>

                              {taskItems.length === 0 ? (
                                <p className="text-sm text-muted-foreground italic">
                                  {t("budget.noItemsDetected")}
                                </p>
                              ) : (
                                <>
                                  <div className="grid grid-cols-12 gap-2 text-xs font-medium text-muted-foreground pb-1 border-b">
                                    <div className="col-span-5">{t("budget.element")}</div>
                                    <div className="col-span-3 text-center">{t("budget.quantity")}</div>
                                    <div className="col-span-4 text-right">{t("budget.cost")}</div>
                                  </div>

                                  {taskItems.map((item, itemIndex) => {
                                    const originalItemIndex = items.findIndex(
                                      (i) => i.name === item.name && i.cost === item.cost
                                    );
                                    const safeOriginalIndex = originalItemIndex >= 0 ? originalItemIndex : itemIndex;

                                    return (
                                      <div
                                        key={itemIndex}
                                        className="grid grid-cols-12 gap-2 text-sm py-1 items-center"
                                      >
                                        <div className="col-span-5 truncate" title={translateBudgetItemName(t, item.name)}>
                                          {translateBudgetItemName(t, item.name)}
                                        </div>
                                        <div className="col-span-3 text-center text-muted-foreground">
                                          {item.quantity} {translateBudgetItemName(t, item.unit)}
                                        </div>
                                        <div className="col-span-4 text-right flex items-center justify-end gap-1">
                                          {editingItem?.catIndex === catIndex &&
                                          editingItem?.itemIndex === safeOriginalIndex ? (
                                            <div className="flex items-center gap-1">
                                              <Input
                                                type="number"
                                                value={editPrice}
                                                onChange={(e) => setEditPrice(e.target.value)}
                                                className="w-20 h-7 text-xs"
                                                autoFocus
                                              />
                                              <Button
                                                size="sm"
                                                variant="ghost"
                                                className="h-7 w-7 p-0"
                                                onClick={saveEdit}
                                              >
                                                <CheckCircle2 className="h-3 w-3 text-green-600" />
                                              </Button>
                                              <Button
                                                size="sm"
                                                variant="ghost"
                                                className="h-7 w-7 p-0"
                                                onClick={cancelEdit}
                                              >
                                                <X className="h-3 w-3 text-red-600" />
                                              </Button>
                                            </div>
                                          ) : (
                                            <>
                                              <span className="font-medium">{formatCurrency(item.cost)}</span>
                                              {onAdjustPrice && (
                                                <Button
                                                  size="sm"
                                                  variant="ghost"
                                                  className="h-6 w-6 p-0"
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    startEditing(catIndex, safeOriginalIndex, item.cost);
                                                  }}
                                                >
                                                  <Pencil className="h-3 w-3" />
                                                </Button>
                                              )}
                                            </>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </>
                              )}
                            </div>
                          );
                        });
                      })()}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* Table Tab */}
        <TabsContent value="table">
          <Card>
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("budgetAnalysis.category")}</TableHead>
                    <TableHead className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {t("budgetAnalysis.budget")}
                        <TooltipProvider>
                          <RadixTooltip>
                            <TooltipTrigger asChild>
                              <HelpCircle className="h-3 w-3 text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-xs">{t("budgetAnalysis.budgetTooltip")}</p>
                            </TooltipContent>
                          </RadixTooltip>
                        </TooltipProvider>
                      </div>
                    </TableHead>
                    <TableHead className="text-right">{t("budgetAnalysis.percentOfTotal")}</TableHead>
                    <TableHead>{t("budgetAnalysis.description")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(() => {
                    const contingence = subTotalBeforeTaxes * 0.05;
                    const tps = (subTotalBeforeTaxes + contingence) * 0.05;
                    const tvq = (subTotalBeforeTaxes + contingence) * 0.09975;
                    const taxes = tps + tvq;
                    const grandTotal = subTotalBeforeTaxes + contingence + taxes;
                    
                    return (
                      <>
                        {orderedCategories.map((cat, index) => {
                          const percentage = (cat.budget / subTotalBeforeTaxes) * 100;
                          const taskDescr = stepTasksByCategory[cat.name]?.join(", ") || cat.description || "";
                          return (
                            <TableRow key={index}>
                              <TableCell className="font-medium break-words min-w-0">{translateCategoryName(cat.name)}</TableCell>
                              <TableCell className="text-right font-mono">{formatCurrency(cat.budget)}</TableCell>
                              <TableCell className="text-right">
                                <Badge variant={percentage > 20 ? "default" : "secondary"}>
                                  {percentage.toFixed(1)}%
                                </Badge>
                              </TableCell>
                              <TableCell className="text-muted-foreground max-w-[200px] sm:max-w-[300px] truncate break-words min-w-0">
                                {taskDescr}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                        <TableRow className="bg-muted/30">
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              {t("budgetAnalysis.workSubtotal")}
                              <Badge variant="outline" className="text-xs">{t("budgetAnalysis.beforeTaxes")}</Badge>
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-mono font-semibold">{formatCurrency(subTotalBeforeTaxes)}</TableCell>
                          <TableCell className="text-right">—</TableCell>
                          <TableCell className="text-muted-foreground text-sm">{t("budgetAnalysis.excludingTaxesContingency")}</TableCell>
                        </TableRow>
                        <TableRow className="bg-amber-50 dark:bg-amber-950/30">
                          <TableCell className="font-medium text-amber-700 dark:text-amber-400">{t("budgetAnalysis.contingencyBudget")}</TableCell>
                          <TableCell className="text-right font-mono text-amber-700 dark:text-amber-400">{formatCurrency(contingence)}</TableCell>
                          <TableCell className="text-right">—</TableCell>
                          <TableCell className="text-muted-foreground text-sm">{t("budgetAnalysis.reserveForUnforeseen")}</TableCell>
                        </TableRow>
                        <TableRow className="bg-blue-50 dark:bg-blue-950/30">
                          <TableCell className="font-medium text-blue-700 dark:text-blue-400">{t("budgetAnalysis.tps5")}</TableCell>
                          <TableCell className="text-right font-mono text-blue-700 dark:text-blue-400">{formatCurrency(tps)}</TableCell>
                          <TableCell className="text-right">—</TableCell>
                          <TableCell className="text-muted-foreground text-sm">{t("budgetAnalysis.federalTax")}</TableCell>
                        </TableRow>
                        <TableRow className="bg-blue-50 dark:bg-blue-950/30">
                          <TableCell className="font-medium text-blue-700 dark:text-blue-400">{t("budgetAnalysis.tvq")}</TableCell>
                          <TableCell className="text-right font-mono text-blue-700 dark:text-blue-400">{formatCurrency(tvq)}</TableCell>
                          <TableCell className="text-right">—</TableCell>
                          <TableCell className="text-muted-foreground text-sm">{t("budgetAnalysis.provincialTax")}</TableCell>
                        </TableRow>
                        <TableRow className="bg-primary/10 font-bold">
                          <TableCell className="text-primary">
                            <div className="flex items-center gap-2">
                              {t("budgetAnalysis.totalEstimated")}
                              <Badge variant="default" className="text-xs">{t("budgetAnalysis.ttc")}</Badge>
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-mono text-primary">{formatCurrency(grandTotal)}</TableCell>
                          <TableCell className="text-right">100%</TableCell>
                          <TableCell className="text-muted-foreground text-sm">{t("budgetAnalysis.workPlusContingencyTaxes")}</TableCell>
                        </TableRow>
                      </>
                    );
                  })()}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Export Tab */}
        <TabsContent value="export">
          <Card>
            <CardHeader>
              <CardTitle>{t("budgetAnalysis.exportAnalysis")}</CardTitle>
              <CardDescription>
                {t("budgetAnalysis.exportDescription")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Button variant="outline" className="h-auto py-4" disabled>
                  <div className="flex flex-col items-center gap-2">
                    <FileText className="h-8 w-8" />
                    <span>{t("budgetAnalysis.exportPdf")}</span>
                    <span className="text-xs text-muted-foreground">{t("budgetAnalysis.comingSoon")}</span>
                  </div>
                </Button>
                <Button variant="outline" className="h-auto py-4" disabled>
                  <div className="flex flex-col items-center gap-2">
                    <FileSpreadsheet className="h-8 w-8" />
                    <span>{t("budgetAnalysis.exportExcel")}</span>
                    <span className="text-xs text-muted-foreground">{t("budgetAnalysis.comingSoon")}</span>
                  </div>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Apply Budget Button */}
      <div className="flex justify-end">
        <Button size="lg" onClick={onApplyBudget} className="gap-2">
          <CheckCircle2 className="h-5 w-5" />
          {t("budgetAnalysis.applyBudget")}
        </Button>
      </div>
    </div>
  );
}
