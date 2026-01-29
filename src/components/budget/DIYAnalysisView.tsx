import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sparkles,
  X,
  Hammer,
  ArrowLeft,
  DollarSign,
  ShoppingCart,
  Lightbulb,
  AlertTriangle,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface DIYAnalysisViewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categoryName: string;
  subCategoryName: string;
  analysisResult: string;
  onApplyEstimate?: (amount: number) => void;
}

// Parse amount from analysis result - handles French formatting (1 234,56 $)
const extractEstimatedTotal = (analysisResult: string): number | null => {
  // Multiple patterns to match total
  const patterns = [
    /\*\*TOTAL ESTIMÉ\*\*[^$]*?([0-9\s,\.]+)\s*\$/i,
    /TOTAL ESTIMÉ[^$]*?([0-9\s,\.]+)\s*\$/i,
    /\|\s*\*?\*?TOTAL[^|]*\*?\*?\s*\|\s*\*?\*?([0-9\s,\.]+)\s*\$\*?\*?\s*\|/i,
  ];
  
  for (const pattern of patterns) {
    const match = analysisResult.match(pattern);
    if (match) {
      // French format: spaces as thousands separator, comma as decimal
      // e.g., "4 565,60" or "4565,60"
      let rawValue = match[1].trim();
      
      // Remove spaces (thousands separator)
      rawValue = rawValue.replace(/\s/g, '');
      
      // If there's a comma, it's likely the decimal separator (French format)
      // Convert comma to period for parseFloat
      if (rawValue.includes(',')) {
        rawValue = rawValue.replace(',', '.');
      }
      
      const amount = parseFloat(rawValue);
      if (amount > 0 && !isNaN(amount)) return Math.round(amount * 100) / 100;
    }
  }
  return null;
};

export function DIYAnalysisView({
  open,
  onOpenChange,
  categoryName,
  subCategoryName,
  analysisResult,
  onApplyEstimate,
}: DIYAnalysisViewProps) {
  const { t } = useTranslation();
  const estimatedTotal = extractEstimatedTotal(analysisResult);

  // Helper function to translate budget category names
  const translateCategoryName = (name: string): string => {
    const key = `budget.categories.${name}`;
    const translated = t(key);
    return translated === key ? name : translated;
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-[95vw] lg:max-w-[95vw] xl:max-w-[95vw] p-0 flex flex-col h-screen">
        <SheetHeader className="p-6 border-b bg-amber-50/50 dark:bg-amber-950/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <Hammer className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              <SheetTitle className="text-xl">
                {t("diyAnalysisView.materialAnalysis")} - {translateCategoryName(categoryName)}
                {subCategoryName && (
                  <span className="text-amber-600 dark:text-amber-400"> / {subCategoryName}</span>
                )}
              </SheetTitle>
            </div>
            <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
              <X className="h-5 w-5" />
            </Button>
          </div>
        </SheetHeader>

        <div className="flex-1 flex overflow-hidden">
          {/* Main Panel - Analysis Result */}
          <div className="flex-1 border-r overflow-hidden flex flex-col">
            <div className="p-4 border-b bg-background">
              <h3 className="font-semibold flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                Résumé détaillé des matériaux
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Liste complète des matériaux nécessaires avec prix Québec 2025
              </p>
            </div>
            <ScrollArea className="flex-1 p-6">
              <div className="prose prose-lg dark:prose-invert max-w-none
                [&_table]:w-full [&_table]:border-collapse [&_table]:text-sm
                [&_table]:table-fixed
                [&_th]:bg-amber-100 [&_th]:dark:bg-amber-900/50 [&_th]:border [&_th]:border-amber-200 [&_th]:dark:border-amber-800 [&_th]:px-3 [&_th]:py-3 [&_th]:text-left [&_th]:font-semibold [&_th]:text-amber-800 [&_th]:dark:text-amber-300 [&_th]:whitespace-normal [&_th]:break-words
                [&_td]:border [&_td]:border-amber-200 [&_td]:dark:border-amber-800 [&_td]:px-3 [&_td]:py-3 [&_td]:text-foreground [&_td]:whitespace-normal [&_td]:break-words [&_td]:align-top
                [&_tr:nth-child(even)]:bg-amber-50/50 [&_tr:nth-child(even)]:dark:bg-amber-950/30
                [&_tr:hover]:bg-amber-100/50 [&_tr:hover]:dark:bg-amber-900/30
                [&_p]:text-base [&_p]:leading-relaxed [&_p]:my-3
                [&_strong]:text-amber-700 [&_strong]:dark:text-amber-400 [&_strong]:font-semibold
                [&_h1]:text-2xl [&_h1]:mt-6 [&_h1]:mb-4 [&_h1]:text-amber-800 [&_h1]:dark:text-amber-300
                [&_h2]:text-xl [&_h2]:mt-5 [&_h2]:mb-3 [&_h2]:text-amber-700 [&_h2]:dark:text-amber-400
                [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:mt-4 [&_h3]:mb-2 [&_h3]:text-amber-600 [&_h3]:dark:text-amber-500
                [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:my-3
                [&_li]:text-base [&_li]:my-1
                [&_hr]:my-6 [&_hr]:border-amber-200 [&_hr]:dark:border-amber-800
                overflow-x-auto
              ">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {analysisResult}
                </ReactMarkdown>
              </div>
            </ScrollArea>
          </div>

          {/* Right Panel - Summary & Actions */}
          <div className="w-[350px] min-w-[350px] flex flex-col bg-amber-50/30 dark:bg-amber-950/10">
            <div className="p-4 border-b bg-background">
              <h3 className="font-semibold flex items-center gap-2 text-amber-700 dark:text-amber-400">
                <DollarSign className="h-5 w-5" />
                Sommaire des coûts
              </h3>
            </div>
            
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {/* Estimated Total Card */}
                {estimatedTotal && (
                  <div className="rounded-xl border-2 border-amber-300 dark:border-amber-700 bg-white dark:bg-background p-4">
                    <p className="text-sm font-medium text-muted-foreground mb-2">
                      Coût total estimé des matériaux:
                    </p>
                    <div className="text-3xl font-bold text-amber-600 dark:text-amber-400">
                      {estimatedTotal.toLocaleString('fr-CA')} $
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Taxes incluses (TPS + TVQ)
                    </p>
                  </div>
                )}

                {/* Info Cards */}
                <div className="space-y-3">
                  <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-white dark:bg-background p-3">
                    <div className="flex items-start gap-3">
                      <Lightbulb className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-sm text-amber-700 dark:text-amber-400">Conseils d'achat</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Comparez les prix entre Canac, Rona, Home Depot et BMR. Les ventes saisonnières peuvent réduire les coûts de 15-25%.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-white dark:bg-background p-3">
                    <div className="flex items-start gap-3">
                      <ShoppingCart className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-sm text-amber-700 dark:text-amber-400">Liste d'achat</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          La liste inclut un surplus de 10-15% pour les coupes et pertes normales.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-white dark:bg-background p-3">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-sm text-amber-700 dark:text-amber-400">Économie main-d'œuvre</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          En faisant vous-même, vous économisez 35-50% du coût total (main-d'œuvre CCQ).
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* DIY Badge */}
                <div className="flex justify-center pt-4">
                  <Badge className="bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-700 px-4 py-2">
                    <Hammer className="h-4 w-4 mr-2" />
                    Fait par moi-même
                  </Badge>
                </div>
              </div>
            </ScrollArea>

            {/* Apply Button */}
            {estimatedTotal && onApplyEstimate && (
              <div className="p-4 border-t bg-background">
                <Button 
                  className="w-full bg-amber-600 hover:bg-amber-700 text-white" 
                  size="lg"
                  onClick={() => onApplyEstimate(estimatedTotal)}
                >
                  <DollarSign className="h-5 w-5 mr-2" />
                  Appliquer: {estimatedTotal.toLocaleString('fr-CA')} $
                </Button>
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
