import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { 
  Sparkles, 
  FileText, 
  Loader2, 
  CheckCircle2, 
  AlertTriangle,
  DollarSign,
  ArrowRight,
  Download,
  Car
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface BudgetCategory {
  name: string;
  budget: number;
  description: string;
  items: { name: string; cost: number; quantity: string; unit: string }[];
}

interface BudgetAnalysis {
  projectSummary: string;
  estimatedTotal: number;
  categories: BudgetCategory[];
  recommendations: string[];
  warnings: string[];
}

interface PlanAnalyzerProps {
  onBudgetGenerated: (categories: BudgetCategory[]) => void;
}

export function PlanAnalyzer({ onBudgetGenerated }: PlanAnalyzerProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<BudgetAnalysis | null>(null);
  const [projectType, setProjectType] = useState("maison-unifamiliale");
  const [squareFootage, setSquareFootage] = useState("1500");
  const [selectedPlanUrl, setSelectedPlanUrl] = useState<string | null>(null);
  const [numberOfFloors, setNumberOfFloors] = useState("1");
  const [hasGarage, setHasGarage] = useState(false);
  const [foundationSqft, setFoundationSqft] = useState("");
  const [floorSqftDetails, setFloorSqftDetails] = useState<string[]>([""]);

  // Fetch uploaded plans from all tasks
  const { data: plans = [] } = useQuery({
    queryKey: ["all-plans"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("task_attachments")
        .select("*")
        .eq("category", "plan")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    setAnalysis(null);

    try {
      const { data, error } = await supabase.functions.invoke('analyze-plan', {
        body: {
          imageUrl: selectedPlanUrl,
          projectType: projectType === "maison-unifamiliale" ? "Maison unifamiliale" :
                       projectType === "jumelee" ? "Maison jumelée" :
                       projectType === "cottage" ? "Cottage" :
                       projectType === "bungalow" ? "Bungalow" : "Maison",
          squareFootage: parseInt(squareFootage) || 1500,
          numberOfFloors: parseInt(numberOfFloors) || 1,
          hasGarage,
          foundationSqft: parseInt(foundationSqft) || null,
          floorSqftDetails: floorSqftDetails.filter(s => s).map(s => parseInt(s)),
        },
      });

      if (error) throw error;

      if (data.success && data.data) {
        setAnalysis(data.data);
        toast.success("Analyse terminée avec succès!");
      } else {
        throw new Error(data.error || "Échec de l'analyse");
      }
    } catch (error) {
      console.error("Analysis error:", error);
      toast.error("Erreur lors de l'analyse du plan");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleApplyBudget = () => {
    if (analysis?.categories) {
      onBudgetGenerated(analysis.categories);
      toast.success("Budget appliqué avec succès!");
    }
  };

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <CardTitle className="font-display">Analyse IA du projet</CardTitle>
        </div>
        <CardDescription>
          Générez automatiquement un budget basé sur votre type de projet et vos plans
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Configuration */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-2">
            <Label>Type de projet</Label>
            <Select value={projectType} onValueChange={setProjectType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="maison-unifamiliale">Maison unifamiliale</SelectItem>
                <SelectItem value="bungalow">Bungalow</SelectItem>
                <SelectItem value="cottage">Cottage (2 étages)</SelectItem>
                <SelectItem value="jumelee">Maison jumelée</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="sqft">Superficie totale (pi²)</Label>
            <Input
              id="sqft"
              type="number"
              value={squareFootage}
              onChange={(e) => setSquareFootage(e.target.value)}
              placeholder="1500"
            />
          </div>

          <div className="space-y-2">
            <Label>Nombre d'étages</Label>
            <Select 
              value={numberOfFloors} 
              onValueChange={(v) => {
                setNumberOfFloors(v);
                const floors = parseInt(v) || 1;
                setFloorSqftDetails(Array(floors).fill(""));
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 étage (plain-pied)</SelectItem>
                <SelectItem value="2">2 étages</SelectItem>
                <SelectItem value="3">3 étages</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="foundation">Superficie fondation (pi²)</Label>
            <Input
              id="foundation"
              type="number"
              value={foundationSqft}
              onChange={(e) => setFoundationSqft(e.target.value)}
              placeholder="Ex: 1200"
            />
          </div>

          {parseInt(numberOfFloors) > 1 && floorSqftDetails.map((_, index) => (
            <div key={index} className="space-y-2">
              <Label>Superficie étage {index + 1} (pi²)</Label>
              <Input
                type="number"
                value={floorSqftDetails[index]}
                onChange={(e) => {
                  const newDetails = [...floorSqftDetails];
                  newDetails[index] = e.target.value;
                  setFloorSqftDetails(newDetails);
                }}
                placeholder={`Superficie étage ${index + 1}`}
              />
            </div>
          ))}

          <div className="space-y-2">
            <Label>Garage</Label>
            <div className="flex items-center space-x-2 h-10">
              <Checkbox
                id="garage"
                checked={hasGarage}
                onCheckedChange={(checked) => setHasGarage(checked === true)}
              />
              <label
                htmlFor="garage"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-2"
              >
                <Car className="h-4 w-4" />
                Inclure un garage
              </label>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Plan téléversé (optionnel)</Label>
            <div className="flex gap-2">
              <Select 
                value={selectedPlanUrl || "none"} 
                onValueChange={(v) => setSelectedPlanUrl(v === "none" ? null : v)}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Sélectionner un plan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Aucun plan (estimation standard)</SelectItem>
                  {plans.map((plan) => (
                    <SelectItem key={plan.id} value={plan.file_url}>
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        {plan.file_name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedPlanUrl && (
                <Button
                  variant="outline"
                  size="icon"
                  asChild
                  title="Télécharger le plan"
                >
                  <a href={selectedPlanUrl} download target="_blank" rel="noopener noreferrer">
                    <Download className="h-4 w-4" />
                  </a>
                </Button>
              )}
            </div>
          </div>
        </div>

        <Button 
          onClick={handleAnalyze} 
          disabled={isAnalyzing}
          className="w-full sm:w-auto gap-2"
          variant="accent"
        >
          {isAnalyzing ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Analyse en cours...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              Analyser et générer le budget
            </>
          )}
        </Button>

        {/* Results */}
        {analysis && (
          <div className="space-y-4 pt-4 border-t">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                Résultat de l'analyse
              </h3>
              <Badge variant="secondary" className="text-lg px-4 py-1">
                <DollarSign className="h-4 w-4 mr-1" />
                {analysis.estimatedTotal.toLocaleString()} $
              </Badge>
            </div>

            <p className="text-muted-foreground">{analysis.projectSummary}</p>

            {/* Categories preview */}
            <div className="grid gap-2">
              {analysis.categories.slice(0, 5).map((cat, index) => (
                <div 
                  key={index}
                  className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                >
                  <span className="font-medium">{cat.name}</span>
                  <span className="text-muted-foreground">
                    {cat.budget.toLocaleString()} $
                  </span>
                </div>
              ))}
              {analysis.categories.length > 5 && (
                <p className="text-sm text-muted-foreground text-center">
                  + {analysis.categories.length - 5} autres catégories
                </p>
              )}
            </div>

            {/* Warnings */}
            {analysis.warnings && analysis.warnings.length > 0 && (
              <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-medium mb-1">
                  <AlertTriangle className="h-4 w-4" />
                  Avertissements
                </div>
                <ul className="text-sm text-amber-800 dark:text-amber-300 space-y-1">
                  {analysis.warnings.map((warning, i) => (
                    <li key={i}>• {warning}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Recommendations */}
            {analysis.recommendations && analysis.recommendations.length > 0 && (
              <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
                <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400 font-medium mb-1">
                  <Sparkles className="h-4 w-4" />
                  Recommandations
                </div>
                <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-1">
                  {analysis.recommendations.map((rec, i) => (
                    <li key={i}>• {rec}</li>
                  ))}
                </ul>
              </div>
            )}

            <Button 
              onClick={handleApplyBudget}
              className="w-full gap-2"
            >
              Appliquer ce budget
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}