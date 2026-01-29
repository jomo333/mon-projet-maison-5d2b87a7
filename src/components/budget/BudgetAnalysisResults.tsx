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
import { groupItemsByTask, getTasksForCategory } from "@/lib/budgetTaskMapping";
import { translateBudgetTaskTitle } from "@/lib/budgetTaskTitleI18n";
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
    const key = `budget.categories.${name}`;
    const translated = t(key);
    return translated === key ? name : translated;
  };

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
                  Alertes et Avertissements
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {analysis.warnings.map((warning, i) => (
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
                  Recommandations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {analysis.recommendations.map((rec, i) => (
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
                    <span className="text-muted-foreground text-lg">à</span>
                    <span className="text-primary">{formatCurrency(Math.round(calculatedGrandTotal * 1.10))}</span>
                    <TooltipProvider>
                      <RadixTooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-[280px]">
                          <p className="font-medium mb-1">Ce total inclut:</p>
                          <ul className="text-xs space-y-1">
                            <li>• Tous les travaux de construction</li>
                            <li>• Contingence (5% pour imprévus)</li>
                            <li>• TPS (5%) + TVQ (9,975%)</li>
                          </ul>
                        </TooltipContent>
                      </RadixTooltip>
                    </TooltipProvider>
                  </CardTitle>
                  <CardDescription className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-xs">±10%</Badge>
                    Estimation préliminaire • Inclut taxes et contingence • {analysis.projectSummary}
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
                          <p className="font-medium mb-1">Ce total inclut:</p>
                          <ul className="text-xs space-y-1">
                            <li>• Tous les travaux de construction</li>
                            <li>• Contingence (5% pour imprévus)</li>
                            <li>• TPS (5%) + TVQ (9,975%)</li>
                          </ul>
                        </TooltipContent>
                      </RadixTooltip>
                    </TooltipProvider>
                  </CardTitle>
                  <CardDescription className="flex items-center gap-1">
                    <Badge variant="outline" className="text-xs mr-1">TTC</Badge>
                    Inclut taxes et contingence • {analysis.projectSummary}
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
                  {analysis.finishQuality === "economique" ? "🏷️ Économique" :
                   analysis.finishQuality === "haut-de-gamme" ? "💎 Haut de gamme" : "⭐ Standard"}
                </Badge>
              )}
              {analysis.newSquareFootage && (
                <Badge variant="outline">{analysis.newSquareFootage} pi²</Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Totaux détaillés */}
          {analysis.totauxDetails && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-lg bg-muted/50 mb-4">
              <div>
                <p className="text-xs text-muted-foreground">Matériaux</p>
                <p className="font-semibold">{formatCurrency(analysis.totauxDetails.total_materiaux || 0)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Main-d'œuvre</p>
                <p className="font-semibold">{formatCurrency(analysis.totauxDetails.total_main_oeuvre || 0)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Contingence (5%)</p>
                <p className="font-semibold">{formatCurrency(analysis.totauxDetails.contingence_5_pourcent || 0)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Taxes (TPS+TVQ)</p>
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
                Surfaces {analysis.validation.surfacesCompletes ? "complètes" : "incomplètes"}
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
                  Ratio M.O./Mat.: {(analysis.validation.ratioMainOeuvre * 100).toFixed(0)}%
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
            Vue d'ensemble
          </TabsTrigger>
          <TabsTrigger value="details" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Détails
          </TabsTrigger>
          <TabsTrigger value="table" className="gap-2">
            <FileSpreadsheet className="h-4 w-4" />
            Tableau
          </TabsTrigger>
          <TabsTrigger value="export" className="gap-2">
            <Download className="h-4 w-4" />
            Export
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Pie Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Répartition du budget</CardTitle>
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
                <CardTitle className="text-lg">Budget par catégorie</CardTitle>
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
                        <p className="text-xs text-muted-foreground mt-1">Avant taxes</p>
                        <Progress value={percentage} className="h-1 mt-2" />
                      </Card>
                    );
                  })}
                </div>

                {/* Budget breakdown summary */}
                <Card className="mt-4">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      Récapitulatif du budget
                      <TooltipProvider>
                        <RadixTooltip>
                          <TooltipTrigger asChild>
                            <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-[300px]">
                            <p className="text-xs">
                              Ce récapitulatif montre la ventilation complète: travaux, contingence (5% pour imprévus) et taxes applicables au Québec (TPS + TVQ).
                            </p>
                          </TooltipContent>
                        </RadixTooltip>
                      </TooltipProvider>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between py-2 border-b">
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">Sous-total travaux</span>
                        <Badge variant="outline" className="text-xs">Avant taxes</Badge>
                      </div>
                      <span className="font-semibold">{formatCurrency(subTotalBeforeTaxes)}</span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-400 text-xs flex items-center justify-center font-medium">%</span>
                        <span className="text-amber-700 dark:text-amber-400">Budget imprévu (5%)</span>
                        <TooltipProvider>
                          <RadixTooltip>
                            <TooltipTrigger asChild>
                              <HelpCircle className="h-3 w-3 text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-[250px]">
                              <p className="text-xs">Réserve recommandée pour couvrir les imprévus et modifications pendant la construction.</p>
                            </TooltipContent>
                          </RadixTooltip>
                        </TooltipProvider>
                      </div>
                      <span className="font-semibold text-amber-700 dark:text-amber-400">{formatCurrency(contingence)}</span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-700 dark:text-blue-400 text-xs flex items-center justify-center font-medium">$</span>
                        <span className="text-blue-700 dark:text-blue-400">TPS (5%)</span>
                        <TooltipProvider>
                          <RadixTooltip>
                            <TooltipTrigger asChild>
                              <HelpCircle className="h-3 w-3 text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-[200px]">
                              <p className="text-xs">Taxe sur les produits et services (fédérale)</p>
                            </TooltipContent>
                          </RadixTooltip>
                        </TooltipProvider>
                      </div>
                      <span className="font-semibold text-blue-700 dark:text-blue-400">{formatCurrency(tps)}</span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-700 dark:text-blue-400 text-xs flex items-center justify-center font-medium">$</span>
                        <span className="text-blue-700 dark:text-blue-400">TVQ (9,975%)</span>
                        <TooltipProvider>
                          <RadixTooltip>
                            <TooltipTrigger asChild>
                              <HelpCircle className="h-3 w-3 text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-[200px]">
                              <p className="text-xs">Taxe de vente du Québec (provinciale)</p>
                            </TooltipContent>
                          </RadixTooltip>
                        </TooltipProvider>
                      </div>
                      <span className="font-semibold text-blue-700 dark:text-blue-400">{formatCurrency(tvq)}</span>
                    </div>
                    <div className="flex items-center justify-between py-3 bg-primary/5 rounded-lg px-3 -mx-3">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-lg">TOTAL ESTIMÉ</span>
                        <Badge variant="default" className="text-xs">TTC</Badge>
                      </div>
                      <span className="font-bold text-lg text-primary">{formatCurrency(subTotalBeforeTaxes + contingence + taxes)}</span>
                    </div>
                    <p className="text-xs text-muted-foreground text-center pt-2">
                      Total incluant: travaux + contingence (5%) + taxes (TPS 5% + TVQ 9,975%)
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
                placeholder="Rechercher un item..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-sm"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[200px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filtrer par catégorie" />
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
                        <p className="text-xs text-muted-foreground">Avant taxes • {percentage.toFixed(1)}%</p>
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

                        const hasOther = groupedByTask.has("Autres éléments");
                        const tasksToRender = [
                          ...baseTasks.filter((t) => t !== "Autres éléments"),
                          ...(hasOther ? ["Autres éléments"] : []),
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
                          const displayTaskTitle = translateBudgetTaskTitle(t, cat.name, taskTitle);

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
                                        <div className="col-span-5 truncate" title={item.name}>
                                          {item.name}
                                        </div>
                                        <div className="col-span-3 text-center text-muted-foreground">
                                          {item.quantity} {item.unit}
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
                    <TableHead>Catégorie</TableHead>
                    <TableHead className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        Budget
                        <TooltipProvider>
                          <RadixTooltip>
                            <TooltipTrigger asChild>
                              <HelpCircle className="h-3 w-3 text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-xs">Montant avant taxes et contingence</p>
                            </TooltipContent>
                          </RadixTooltip>
                        </TooltipProvider>
                      </div>
                    </TableHead>
                    <TableHead className="text-right">% du total</TableHead>
                    <TableHead>Description</TableHead>
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
                              Sous-total travaux
                              <Badge variant="outline" className="text-xs">Avant taxes</Badge>
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-mono font-semibold">{formatCurrency(subTotalBeforeTaxes)}</TableCell>
                          <TableCell className="text-right">—</TableCell>
                          <TableCell className="text-muted-foreground text-sm">Montant hors taxes et contingence</TableCell>
                        </TableRow>
                        <TableRow className="bg-amber-50 dark:bg-amber-950/30">
                          <TableCell className="font-medium text-amber-700 dark:text-amber-400">Budget imprévu (5%)</TableCell>
                          <TableCell className="text-right font-mono text-amber-700 dark:text-amber-400">{formatCurrency(contingence)}</TableCell>
                          <TableCell className="text-right">—</TableCell>
                          <TableCell className="text-muted-foreground text-sm">Réserve pour imprévus et modifications</TableCell>
                        </TableRow>
                        <TableRow className="bg-blue-50 dark:bg-blue-950/30">
                          <TableCell className="font-medium text-blue-700 dark:text-blue-400">TPS (5%)</TableCell>
                          <TableCell className="text-right font-mono text-blue-700 dark:text-blue-400">{formatCurrency(tps)}</TableCell>
                          <TableCell className="text-right">—</TableCell>
                          <TableCell className="text-muted-foreground text-sm">Taxe fédérale sur produits et services</TableCell>
                        </TableRow>
                        <TableRow className="bg-blue-50 dark:bg-blue-950/30">
                          <TableCell className="font-medium text-blue-700 dark:text-blue-400">TVQ (9,975%)</TableCell>
                          <TableCell className="text-right font-mono text-blue-700 dark:text-blue-400">{formatCurrency(tvq)}</TableCell>
                          <TableCell className="text-right">—</TableCell>
                          <TableCell className="text-muted-foreground text-sm">Taxe de vente du Québec</TableCell>
                        </TableRow>
                        <TableRow className="bg-primary/10 font-bold">
                          <TableCell className="text-primary">
                            <div className="flex items-center gap-2">
                              TOTAL ESTIMÉ
                              <Badge variant="default" className="text-xs">TTC</Badge>
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-mono text-primary">{formatCurrency(grandTotal)}</TableCell>
                          <TableCell className="text-right">100%</TableCell>
                          <TableCell className="text-muted-foreground text-sm">Travaux + contingence + taxes</TableCell>
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
              <CardTitle>Exporter l'analyse</CardTitle>
              <CardDescription>
                Téléchargez votre analyse budgétaire dans différents formats
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Button variant="outline" className="h-auto py-4" disabled>
                  <div className="flex flex-col items-center gap-2">
                    <FileText className="h-8 w-8" />
                    <span>Export PDF professionnel</span>
                    <span className="text-xs text-muted-foreground">Bientôt disponible</span>
                  </div>
                </Button>
                <Button variant="outline" className="h-auto py-4" disabled>
                  <div className="flex flex-col items-center gap-2">
                    <FileSpreadsheet className="h-8 w-8" />
                    <span>Export Excel</span>
                    <span className="text-xs text-muted-foreground">Bientôt disponible</span>
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
          Appliquer ce budget au projet
        </Button>
      </div>
    </div>
  );
}
