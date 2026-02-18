import { useTranslation } from "react-i18next";
import { formatCurrency } from "@/lib/i18n";
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
  CheckCircle2,
  Phone,
  DollarSign,
  ArrowLeft,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// Helper function to parse currency strings like "8 353,79 $", "25,652$", "25652"
// Handles French format (comma as decimal, space as thousand separator)
const parseAmount = (amount: string | undefined): number => {
  if (!amount) return 0;
  
  // First, remove dollar signs and trim
  let cleaned = amount.replace(/\$/g, '').trim();
  
  // Remove spaces (thousand separators in French format)
  cleaned = cleaned.replace(/\s/g, '');
  
  // Check if this is French format (comma as decimal separator)
  // French: "8353,79" - has comma, no period OR comma after period
  // English: "8,353.79" - has period after comma
  const hasComma = cleaned.includes(',');
  const hasPeriod = cleaned.includes('.');
  
  if (hasComma && !hasPeriod) {
    // French format: comma is decimal separator
    cleaned = cleaned.replace(',', '.');
  } else if (hasComma && hasPeriod) {
    // Mixed format - determine which is decimal based on position
    const commaPos = cleaned.lastIndexOf(',');
    const periodPos = cleaned.lastIndexOf('.');
    
    if (commaPos > periodPos) {
      // Comma is after period: French with thousand separator (rare but possible)
      // e.g., "8.353,79" -> remove periods, replace comma with period
      cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    } else {
      // Period is after comma: English format
      // e.g., "8,353.79" -> just remove commas
      cleaned = cleaned.replace(/,/g, '');
    }
  }
  // If only period, it's already in correct format
  
  // Remove any remaining non-numeric characters except decimal point
  cleaned = cleaned.replace(/[^\d.]/g, '');
  
  return Math.round(parseFloat(cleaned) || 0);
};

interface SupplierOption {
  name: string;
  amount: string;
  description?: string;
}

interface ExtractedContact {
  docName: string;
  supplierName: string;
  phone: string;
  amount: string;
  options?: SupplierOption[];
}

interface AnalysisFullViewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categoryName: string;
  categoryColor: string;
  analysisResult: string;
  extractedSuppliers: ExtractedContact[];
  selectedSupplierIndex: number | null;
  selectedOptionIndex: number | null;
  onSelectSupplier: (index: number) => void;
  onSelectOption: (optionIndex: number) => void;
  onConfirmSelection: () => void;
}

export function AnalysisFullView({
  open,
  onOpenChange,
  categoryName,
  categoryColor,
  analysisResult,
  extractedSuppliers,
  selectedSupplierIndex,
  selectedOptionIndex,
  onSelectSupplier,
  onSelectOption,
  onConfirmSelection,
}: AnalysisFullViewProps) {
  const { t } = useTranslation();
  const selectedSupplier = selectedSupplierIndex !== null ? extractedSuppliers[selectedSupplierIndex] : null;

  // Helper function to translate budget category names
  const translateCategoryName = (name: string): string => {
    const key = `budget.categories.${name}`;
    const translated = t(key);
    return translated === key ? name : translated;
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-[95vw] lg:max-w-[95vw] xl:max-w-[95vw] p-0 flex flex-col h-screen">
        <SheetHeader className="p-6 border-b bg-muted/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div
                className="w-4 h-4 rounded"
                style={{ backgroundColor: categoryColor }}
              />
              <SheetTitle className="text-xl">
                {t("analysisFullView.quoteAnalysis")} - {translateCategoryName(categoryName)}
              </SheetTitle>
            </div>
            <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
              <X className="h-5 w-5" />
            </Button>
          </div>
        </SheetHeader>

        <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0">
          {/* Left Panel - Analysis Result */}
          <div className="flex-1 border-r overflow-hidden flex flex-col min-w-0">
            <div className="p-4 border-b bg-background">
              <h3 className="font-semibold flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Résumé de l'analyse
              </h3>
            </div>
            <ScrollArea className="flex-1 p-6">
              <div className="prose prose-lg dark:prose-invert max-w-none
                [&_table]:w-full [&_table]:border-collapse [&_table]:text-sm
                [&_table]:table-fixed
                [&_th]:bg-muted [&_th]:border [&_th]:border-border [&_th]:px-3 [&_th]:py-3 [&_th]:text-left [&_th]:font-semibold [&_th]:text-foreground [&_th]:whitespace-normal [&_th]:break-words
                [&_td]:border [&_td]:border-border [&_td]:px-3 [&_td]:py-3 [&_td]:text-foreground [&_td]:whitespace-normal [&_td]:break-words [&_td]:align-top
                [&_tr:nth-child(even)]:bg-muted/50
                [&_tr:hover]:bg-accent/50
                [&_p]:text-base [&_p]:leading-relaxed [&_p]:my-3
                [&_strong]:text-primary [&_strong]:font-semibold
                [&_h1]:text-2xl [&_h1]:mt-6 [&_h1]:mb-4
                [&_h2]:text-xl [&_h2]:mt-5 [&_h2]:mb-3
                [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:mt-4 [&_h3]:mb-2
                [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:my-3
                [&_li]:text-base [&_li]:my-1
                [&_hr]:my-6 [&_hr]:border-border
                overflow-x-auto
              ">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {analysisResult}
                </ReactMarkdown>
              </div>
            </ScrollArea>
          </div>

          {/* Right Panel - Supplier Selection */}
          <div className="w-full md:w-[350px] md:min-w-[300px] flex flex-col bg-muted/20 shrink-0">
            <div className="p-4 border-b bg-background">
              <h3 className="font-semibold flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                Sélectionner un fournisseur
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Cliquez sur un fournisseur pour le sélectionner
              </p>
            </div>
            
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-3">
                {extractedSuppliers.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Sparkles className="h-10 w-10 mx-auto mb-3 opacity-50" />
                    <p>Aucun fournisseur détecté</p>
                    <p className="text-sm">L'analyse n'a pas pu extraire les informations des fournisseurs.</p>
                  </div>
                ) : (
                  extractedSuppliers.map((supplier, index) => (
                    <div
                      key={index}
                      onClick={() => onSelectSupplier(index)}
                      className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                        selectedSupplierIndex === index
                          ? 'border-primary bg-primary/10 shadow-lg'
                          : 'border-border hover:border-primary/50 hover:bg-background'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-2 flex-1 min-w-0">
                          <div className="font-semibold text-foreground flex items-center gap-2">
                            {selectedSupplierIndex === index && (
                              <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
                            )}
                            <span className="truncate">🏢 {supplier.supplierName}</span>
                          </div>
                          {supplier.phone && (
                            <div className="text-sm text-muted-foreground flex items-center gap-2">
                              <Phone className="h-4 w-4 shrink-0" />
                              <span>{supplier.phone}</span>
                            </div>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <div className="font-bold text-xl text-primary">
                            {formatCurrency(parseAmount(supplier.amount))}
                          </div>
                          <div className="text-xs text-muted-foreground">avant taxes</div>
                        </div>
                      </div>

                      {/* Options for selected supplier */}
                      {selectedSupplierIndex === index && supplier.options && supplier.options.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-border/50 space-y-2">
                          <p className="text-sm font-medium text-muted-foreground">Options disponibles:</p>
                          <div className="grid gap-2">
                            {supplier.options.map((option, optIndex) => (
                              <div
                                key={optIndex}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onSelectOption(optIndex);
                                }}
                                className={`p-3 rounded-lg border cursor-pointer transition-all ${
                                  selectedOptionIndex === optIndex
                                    ? 'border-primary bg-primary/20'
                                    : 'border-border/50 hover:border-primary/50 bg-background/50'
                                }`}
                              >
                                <div className="flex justify-between items-center">
                                  <span className="font-medium text-sm">{option.name}</span>
                                  <span className="font-bold text-primary">
                                    {formatCurrency(parseAmount(option.amount))}
                                  </span>
                                </div>
                                {option.description && (
                                  <p className="text-xs text-muted-foreground mt-1">{option.description}</p>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>

            {/* Selection Summary & Confirm */}
            {selectedSupplier && (
              <div className="p-4 border-t bg-background">
                <div className="rounded-lg bg-primary/5 border border-primary/20 p-4 mb-4">
                  <p className="text-sm font-medium text-muted-foreground mb-1">Fournisseur sélectionné:</p>
                  <p className="font-semibold text-lg">{selectedSupplier.supplierName}</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-sm text-muted-foreground">Montant retenu:</span>
                      <span className="font-bold text-xl text-primary">
                        {formatCurrency(parseAmount(
                          selectedOptionIndex !== null && selectedSupplier.options?.[selectedOptionIndex]
                            ? selectedSupplier.options[selectedOptionIndex].amount
                            : selectedSupplier.amount
                        ))}
                      </span>
                  </div>
                </div>
                <Button 
                  className="w-full" 
                  size="lg"
                  onClick={onConfirmSelection}
                >
                  <CheckCircle2 className="h-5 w-5 mr-2" />
                  Confirmer et enregistrer
                </Button>
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
