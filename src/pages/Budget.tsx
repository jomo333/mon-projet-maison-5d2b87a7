import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/landing/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { DollarSign, TrendingUp, TrendingDown, AlertTriangle, Plus, Edit2, ChevronDown, ChevronUp } from "lucide-react";
import { PlanAnalyzer } from "@/components/budget/PlanAnalyzer";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

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

const defaultCategories: BudgetCategory[] = [
  { name: "Fondations", budget: 35000, spent: 0, color: "#3B82F6" },
  { name: "Structure", budget: 45000, spent: 0, color: "#F97316" },
  { name: "Toiture", budget: 18000, spent: 0, color: "#22C55E" },
  { name: "Fenêtres/Portes", budget: 22000, spent: 0, color: "#EAB308" },
  { name: "Électricité", budget: 15000, spent: 0, color: "#EC4899" },
  { name: "Plomberie", budget: 12000, spent: 0, color: "#06B6D4" },
  { name: "Isolation", budget: 8000, spent: 0, color: "#8B5CF6" },
  { name: "Finitions", budget: 45000, spent: 0, color: "#EF4444" },
];

// Couleurs vives et distinctes pour une meilleure lisibilité
const categoryColors = [
  "#3B82F6", // Bleu vif
  "#F97316", // Orange
  "#22C55E", // Vert
  "#EAB308", // Jaune doré
  "#EC4899", // Rose
  "#06B6D4", // Cyan
  "#8B5CF6", // Violet
  "#EF4444", // Rouge
  "#14B8A6", // Teal
  "#A855F7", // Pourpre
  "#F59E0B", // Ambre
  "#10B981", // Émeraude
];

const Budget = () => {
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [budgetCategories, setBudgetCategories] = useState<BudgetCategory[]>(defaultCategories);

  const totalBudget = budgetCategories.reduce((acc, cat) => acc + cat.budget, 0);
  const totalSpent = budgetCategories.reduce((acc, cat) => acc + cat.spent, 0);
  const percentUsed = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

  const pieData = budgetCategories.map((cat) => ({
    name: cat.name,
    value: cat.budget,
    color: cat.color,
  }));

  const handleBudgetGenerated = (categories: { name: string; budget: number; description: string; items?: BudgetItem[] }[]) => {
    const newCategories: BudgetCategory[] = categories.map((cat, index) => ({
      name: cat.name,
      budget: cat.budget,
      spent: 0,
      color: categoryColors[index % categoryColors.length],
      description: cat.description,
      items: cat.items || [],
    }));
    setBudgetCategories(newCategories);
  };

  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);

  const toggleCategory = (categoryName: string) => {
    setExpandedCategories(prev => 
      prev.includes(categoryName) 
        ? prev.filter(name => name !== categoryName)
        : [...prev, categoryName]
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 py-8">
        <div className="container space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="font-display text-3xl font-bold tracking-tight">
                Budget du projet
              </h1>
              <p className="text-muted-foreground mt-1">
                Gérez et suivez vos dépenses de construction
              </p>
            </div>
            <Button variant="accent" onClick={() => setShowAddExpense(!showAddExpense)}>
              <Plus className="h-4 w-4" />
              Ajouter une dépense
            </Button>
          </div>

          {/* AI Plan Analyzer */}
          <PlanAnalyzer onBudgetGenerated={handleBudgetGenerated} />

          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="animate-fade-in">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Budget total
                </CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold font-display">
                  {totalBudget.toLocaleString()} $
                </div>
              </CardContent>
            </Card>

            <Card className="animate-fade-in" style={{ animationDelay: "100ms" }}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Dépensé
                </CardTitle>
                <TrendingDown className="h-4 w-4 text-accent" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold font-display text-accent">
                  {totalSpent.toLocaleString()} $
                </div>
                <Progress value={percentUsed} className="mt-2 h-2" />
                <p className="text-xs text-muted-foreground mt-1">
                  {percentUsed.toFixed(1)}% du budget utilisé
                </p>
              </CardContent>
            </Card>

            <Card className="animate-fade-in" style={{ animationDelay: "200ms" }}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Restant
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-success" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold font-display text-success">
                  {(totalBudget - totalSpent).toLocaleString()} $
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Add Expense Form */}
          {showAddExpense && (
            <Card className="animate-scale-in border-accent/50">
              <CardHeader>
                <CardTitle className="font-display">Nouvelle dépense</CardTitle>
                <CardDescription>Enregistrez une nouvelle dépense pour votre projet</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="space-y-2">
                    <Label htmlFor="category">Catégorie</Label>
                    <select
                      id="category"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      {budgetCategories.map((cat) => (
                        <option key={cat.name} value={cat.name}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Input id="description" placeholder="Ex: Béton pour fondation" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="amount">Montant ($)</Label>
                    <Input id="amount" type="number" placeholder="0.00" />
                  </div>
                  <div className="flex items-end">
                    <Button variant="accent" className="w-full">
                      Ajouter
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
                <CardTitle className="font-display">Répartition du budget</CardTitle>
                <CardDescription>Vue d'ensemble par catégorie</CardDescription>
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
                <CardTitle className="font-display">Détail par catégorie</CardTitle>
                <CardDescription>Budget et dépenses par poste</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-[500px] overflow-y-auto">
                  {budgetCategories.map((category) => {
                    const percent = category.budget > 0 ? (category.spent / category.budget) * 100 : 0;
                    const isOverBudget = category.spent > category.budget;
                    const isNearLimit = percent > 80 && !isOverBudget;
                    const isExpanded = expandedCategories.includes(category.name);
                    const hasItems = category.items && category.items.length > 0;

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
                                  <span className="font-medium truncate">{category.name}</span>
                                  {isOverBudget && (
                                    <Badge variant="destructive" className="text-xs">
                                      <AlertTriangle className="h-3 w-3 mr-1" />
                                      Dépassement
                                    </Badge>
                                  )}
                                  {isNearLimit && (
                                    <Badge variant="secondary" className="text-xs bg-warning/10 text-warning">
                                      Attention
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
                                  / {category.budget.toLocaleString()} $
                                </div>
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                <Button variant="ghost" size="icon" onClick={(e) => e.stopPropagation()}>
                                  <Edit2 className="h-4 w-4" />
                                </Button>
                                {hasItems && (
                                  isExpanded ? (
                                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                                  ) : (
                                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                  )
                                )}
                              </div>
                            </div>
                          </CollapsibleTrigger>
                          
                          <CollapsibleContent>
                            {hasItems && (
                              <div className="px-4 pb-3 pt-1 border-t bg-muted/30">
                                {category.description && (
                                  <p className="text-sm text-muted-foreground mb-3 italic">
                                    {category.description}
                                  </p>
                                )}
                                <div className="space-y-2">
                                  <div className="grid grid-cols-12 gap-2 text-xs font-medium text-muted-foreground pb-1 border-b">
                                    <div className="col-span-5">Élément</div>
                                    <div className="col-span-3 text-center">Quantité</div>
                                    <div className="col-span-4 text-right">Coût</div>
                                  </div>
                                  {category.items!.map((item, idx) => (
                                    <div key={idx} className="grid grid-cols-12 gap-2 text-sm py-1">
                                      <div className="col-span-5 truncate">{item.name}</div>
                                      <div className="col-span-3 text-center text-muted-foreground">
                                        {item.quantity} {item.unit}
                                      </div>
                                      <div className="col-span-4 text-right font-medium">
                                        {item.cost.toLocaleString()} $
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </CollapsibleContent>
                        </div>
                      </Collapsible>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Budget;