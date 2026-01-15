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
import { DollarSign, TrendingUp, TrendingDown, AlertTriangle, Plus, Edit2 } from "lucide-react";

const budgetCategories = [
  { name: "Fondations", budget: 35000, spent: 33500, color: "hsl(217, 33%, 17%)" },
  { name: "Structure", budget: 45000, spent: 28000, color: "hsl(25, 95%, 53%)" },
  { name: "Toiture", budget: 18000, spent: 0, color: "hsl(142, 71%, 45%)" },
  { name: "Fenêtres/Portes", budget: 22000, spent: 0, color: "hsl(38, 92%, 50%)" },
  { name: "Électricité", budget: 15000, spent: 0, color: "hsl(215, 16%, 47%)" },
  { name: "Plomberie", budget: 12000, spent: 0, color: "hsl(222, 47%, 11%)" },
  { name: "Isolation", budget: 8000, spent: 0, color: "hsl(210, 40%, 96%)" },
  { name: "Finitions", budget: 45000, spent: 0, color: "hsl(0, 84%, 60%)" },
];

const totalBudget = budgetCategories.reduce((acc, cat) => acc + cat.budget, 0);
const totalSpent = budgetCategories.reduce((acc, cat) => acc + cat.spent, 0);
const percentUsed = (totalSpent / totalBudget) * 100;

const pieData = budgetCategories.map((cat) => ({
  name: cat.name,
  value: cat.budget,
  color: cat.color,
}));

const Budget = () => {
  const [showAddExpense, setShowAddExpense] = useState(false);

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
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: number) => [`${value.toLocaleString()} $`, '']}
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                        }}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
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
                <div className="space-y-4">
                  {budgetCategories.map((category) => {
                    const percent = (category.spent / category.budget) * 100;
                    const isOverBudget = category.spent > category.budget;
                    const isNearLimit = percent > 80 && !isOverBudget;

                    return (
                      <div
                        key={category.name}
                        className="flex items-center gap-4 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                      >
                        <div
                          className="w-3 h-3 rounded-full shrink-0"
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
                        <Button variant="ghost" size="icon" className="shrink-0">
                          <Edit2 className="h-4 w-4" />
                        </Button>
                      </div>
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
