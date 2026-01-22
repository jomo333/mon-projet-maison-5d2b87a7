import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  FileText,
  Upload,
  Trash2,
  Loader2,
  Download,
  Sparkles,
  CheckCircle2,
  Phone,
  User,
  DollarSign,
  Save,
  Maximize2,
  ChevronUp,
  ChevronDown,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { AnalysisFullView } from "./AnalysisFullView";

interface CategorySubmissionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  categoryName: string;
  categoryColor: string;
  currentBudget: number;
  currentSpent: number;
  onSave: (budget: number, spent: number, supplierInfo?: SupplierInfo) => void;
}

interface SupplierInfo {
  name: string;
  phone: string;
  amount: number;
}

interface ExtractedContact {
  docName: string;
  supplierName: string;
  phone: string;
  amount: string;
  options?: SupplierOption[];
}

interface SupplierOption {
  name: string;
  amount: string;
  description?: string;
}

// Map category names to trade IDs for storage
const categoryToTradeId: Record<string, string> = {
  "Excavation et fondation": "excavation",
  "Structure et charpente": "charpente",
  "Toiture": "toiture",
  "Fenêtres et portes": "fenetre",
  "Isolation et pare-vapeur": "isolation",
  "Plomberie": "plomberie",
  "Électricité": "electricite",
  "Chauffage et ventilation (HVAC)": "hvac",
  "Revêtement extérieur": "exterieur",
  "Gypse et peinture": "gypse",
  "Revêtements de sol": "plancher",
  "Travaux ébénisterie (cuisine/SDB)": "armoires",
  "Finitions intérieures": "finitions",
};

export function CategorySubmissionsDialog({
  open,
  onOpenChange,
  projectId,
  categoryName,
  categoryColor,
  currentBudget,
  currentSpent,
  onSave,
}: CategorySubmissionsDialogProps) {
  const queryClient = useQueryClient();
  const [budget, setBudget] = useState(currentBudget.toString());
  const [spent, setSpent] = useState(currentSpent.toString());
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [extractedSuppliers, setExtractedSuppliers] = useState<ExtractedContact[]>([]);
  const [selectedSupplierIndex, setSelectedSupplierIndex] = useState<number | null>(null);
  const [selectedOptionIndex, setSelectedOptionIndex] = useState<number | null>(null);
  const [supplierName, setSupplierName] = useState("");
  const [supplierPhone, setSupplierPhone] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [contactPersonPhone, setContactPersonPhone] = useState("");
  const [selectedAmount, setSelectedAmount] = useState("");
  const [showFullAnalysis, setShowFullAnalysis] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [showScrollButtons, setShowScrollButtons] = useState({ up: false, down: false });

  // Handle scroll inside dialog
  const handleDialogScroll = () => {
    if (scrollAreaRef.current) {
      const viewport = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (viewport) {
        const { scrollTop, scrollHeight, clientHeight } = viewport;
        setShowScrollButtons({
          up: scrollTop > 100,
          down: scrollTop + clientHeight < scrollHeight - 50
        });
      }
    }
  };

  const scrollToTop = () => {
    const viewport = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]');
    viewport?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const scrollToBottom = () => {
    const viewport = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]');
    if (viewport) {
      viewport.scrollTo({ top: viewport.scrollHeight, behavior: 'smooth' });
    }
  };

  useEffect(() => {
    if (open && scrollAreaRef.current) {
      const viewport = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (viewport) {
        viewport.addEventListener('scroll', handleDialogScroll);
        handleDialogScroll(); // Initial check
        return () => viewport.removeEventListener('scroll', handleDialogScroll);
      }
    }
  }, [open, analysisResult, extractedSuppliers]);

  const tradeId = categoryToTradeId[categoryName] || categoryName.toLowerCase().replace(/\s+/g, '-');

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setBudget(currentBudget.toString());
      setSpent(currentSpent.toString());
      setAnalysisResult(null);
      setExtractedSuppliers([]);
      setSelectedSupplierIndex(null);
      setSelectedOptionIndex(null);
    }
  }, [open, currentBudget, currentSpent]);

  // Fetch existing documents for this category
  const { data: documents = [], isLoading: loadingDocs } = useQuery({
    queryKey: ['category-docs', projectId, tradeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('task_attachments')
        .select('*')
        .eq('project_id', projectId)
        .eq('step_id', 'soumissions')
        .eq('task_id', `soumission-${tradeId}`);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!projectId && open,
  });

  // Fetch existing supplier status
  const { data: supplierStatus } = useQuery({
    queryKey: ['supplier-status', projectId, tradeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('task_dates')
        .select('*')
        .eq('project_id', projectId)
        .eq('step_id', 'soumissions')
        .eq('task_id', `soumission-${tradeId}`)
        .maybeSingle();
      
      if (error) throw error;
      if (data?.notes) {
        try {
          return JSON.parse(data.notes);
        } catch {
          return null;
        }
      }
      return null;
    },
    enabled: !!projectId && open,
  });

  // Set supplier info from saved status
  useEffect(() => {
    if (supplierStatus) {
      setSupplierName(supplierStatus.supplierName || "");
      setSupplierPhone(supplierStatus.supplierPhone || "");
      setContactPerson(supplierStatus.contactPerson || "");
      setContactPersonPhone(supplierStatus.contactPersonPhone || "");
      setSelectedAmount(supplierStatus.amount || "");
    }
  }, [supplierStatus]);

  // Sanitize filename for storage (remove spaces and special characters)
  const sanitizeFileName = (name: string): string => {
    return name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove accents
      .replace(/[^a-zA-Z0-9._-]/g, '_') // Replace special chars with underscore
      .replace(/_+/g, '_'); // Replace multiple underscores with single
  };

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const sanitizedName = sanitizeFileName(file.name);
      const fileName = `${projectId}/soumissions/${tradeId}/${Date.now()}_${sanitizedName}`;
      
      const { error: uploadError } = await supabase.storage
        .from('task-attachments')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('task-attachments')
        .getPublicUrl(fileName);

      const { error: dbError } = await supabase
        .from('task_attachments')
        .insert({
          project_id: projectId,
          step_id: 'soumissions',
          task_id: `soumission-${tradeId}`,
          file_name: file.name,
          file_url: urlData.publicUrl,
          file_type: file.type,
          file_size: file.size,
          category: 'soumission',
        });

      if (dbError) throw dbError;
      return urlData.publicUrl;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['category-docs', projectId, tradeId] });
      toast.success("Document téléchargé avec succès");
      setUploading(false);
    },
    onError: (error) => {
      console.error("Upload error:", error);
      toast.error("Erreur lors du téléchargement");
      setUploading(false);
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (attachmentId: string) => {
      const { error } = await supabase
        .from('task_attachments')
        .delete()
        .eq('id', attachmentId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['category-docs', projectId, tradeId] });
      toast.success("Document supprimé");
    },
  });

  // Delete supplier from database
  const handleDeleteSupplier = async () => {
    // Reset local state
    setSupplierName("");
    setSupplierPhone("");
    setContactPerson("");
    setContactPersonPhone("");
    setSelectedAmount("");
    setSpent("0");
    setSelectedSupplierIndex(null);
    setSelectedOptionIndex(null);
    setAnalysisResult(null);
    setExtractedSuppliers([]);

    // Delete from database
    const { error } = await supabase
      .from('task_dates')
      .delete()
      .eq('project_id', projectId)
      .eq('step_id', 'soumissions')
      .eq('task_id', `soumission-${tradeId}`);

    if (error) {
      console.error("Error deleting supplier:", error);
      toast.error("Erreur lors de la suppression");
      return;
    }

    // Update budget spent to 0
    onSave(parseFloat(budget) || 0, 0);
    
    queryClient.invalidateQueries({ queryKey: ['supplier-status', projectId, tradeId] });
    toast.success("Fournisseur supprimé");
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setUploading(true);
      uploadMutation.mutate(files[0]);
    }
    e.target.value = '';
  };

  // AI Analysis
  const analyzeDocuments = async () => {
    if (documents.length === 0) {
      toast.error("Veuillez d'abord télécharger des soumissions");
      return;
    }

    setAnalyzing(true);
    setAnalysisResult("");

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-soumissions`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            tradeName: categoryName,
            tradeDescription: `Soumissions pour ${categoryName}`,
            documents: documents.map(d => ({
              file_name: d.file_name,
              file_url: d.file_url,
            })),
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erreur lors de l'analyse");
      }

      if (!response.body) {
        throw new Error("Pas de réponse du serveur");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let result = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              result += content;
              setAnalysisResult(result);
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      setAnalysisResult(result);
      toast.success("Analyse terminée");
      
      // Try to extract contacts from analysis
      const contacts = parseExtractedContacts(result);
      setExtractedSuppliers(contacts);
      
      // Don't auto-select, let user choose
      if (contacts.length > 0) {
        toast.info(`${contacts.length} fournisseur(s) détecté(s). Sélectionnez votre choix ci-dessous.`);
      }
    } catch (error) {
      console.error("Analysis error:", error);
      toast.error(error instanceof Error ? error.message : "Erreur d'analyse");
    } finally {
      setAnalyzing(false);
    }
  };

  // Handle supplier selection
  const handleSelectSupplier = (index: number) => {
    setSelectedSupplierIndex(index);
    setSelectedOptionIndex(null);
    const supplier = extractedSuppliers[index];
    if (supplier) {
      setSupplierName(supplier.supplierName);
      setSupplierPhone(supplier.phone);
      setSelectedAmount(supplier.amount.replace(/[^\d]/g, ''));
      setSpent(supplier.amount.replace(/[^\d]/g, ''));
    }
  };

  // Handle option selection
  const handleSelectOption = (optionIndex: number) => {
    setSelectedOptionIndex(optionIndex);
    if (selectedSupplierIndex !== null) {
      const supplier = extractedSuppliers[selectedSupplierIndex];
      const option = supplier?.options?.[optionIndex];
      if (option) {
        setSelectedAmount(option.amount.replace(/[^\d]/g, ''));
        setSpent(option.amount.replace(/[^\d]/g, ''));
      }
    }
  };

  // Parse contacts from AI analysis - supports multiple formats
  const parseExtractedContacts = (analysisResult: string): ExtractedContact[] => {
    const contacts: ExtractedContact[] = [];
    
    // Try to extract from the new emoji-based format
    // Look for patterns like "🏢 Nom Entreprise" followed by "📞 Téléphone:" and "💰 Montant:"
    const companyBlocks = analysisResult.split(/(?=\*\*🏢)/);
    
    for (const block of companyBlocks) {
      if (!block.includes('🏢')) continue;
      
      const nameMatch = block.match(/🏢\s*\*?\*?([^*\n]+)/);
      const phoneMatch = block.match(/📞\s*(?:Téléphone\s*:?\s*)?([0-9\-\.\s\(\)]+)/);
      
      // Multiple patterns for amounts - more flexible matching (supports decimals and spaces)
      let amount = '';
      
      // Pattern 1: Montant avant taxes: 30 833.04 $ or Montant avant taxes: 30 833 $
      const amountMatch1 = block.match(/Montant\s*avant\s*taxes\s*:?\s*([0-9\s,]+(?:\.[0-9]+)?)\s*\$/i);
      // Pattern 2: Prix avant taxes: X $ 
      const amountMatch2 = block.match(/Prix\s*avant\s*taxes\s*:?\s*([0-9\s,]+(?:\.[0-9]+)?)\s*\$/i);
      // Pattern 3: Sous-total: X $
      const amountMatch3 = block.match(/Sous-total\s*:?\s*([0-9\s,]+(?:\.[0-9]+)?)\s*\$/i);
      // Pattern 4: Total avec taxes: X $ (fallback - will use net price if available)
      const amountMatch4 = block.match(/Total\s*avec\s*taxes\s*:?\s*\*?\*?([0-9\s,]+(?:\.[0-9]+)?)\s*\$\*?\*?/i);
      // Pattern 5: Any number followed by $ in the pricing section
      const amountMatch5 = block.match(/💰[^$]*?([0-9]{1,3}(?:[\s,][0-9]{3})*(?:\.[0-9]+)?)\s*\$/);
      
      // Priority: before taxes > subtotal > with taxes
      if (amountMatch1) amount = amountMatch1[1].replace(/[\s,]/g, '');
      else if (amountMatch2) amount = amountMatch2[1].replace(/[\s,]/g, '');
      else if (amountMatch3) amount = amountMatch3[1].replace(/[\s,]/g, '');
      else if (amountMatch5) amount = amountMatch5[1].replace(/[\s,]/g, '');
      else if (amountMatch4) amount = amountMatch4[1].replace(/[\s,]/g, '');
      
      if (nameMatch) {
        // Try to extract options from the block
        const options: SupplierOption[] = [];
        
        // Look for option patterns like "Option A: X $" or "Forfait Premium: X $"
        const optionMatches = block.matchAll(/(?:Option|Forfait|Package|OPTION)\s*(?:SÉPARÉE\s*:?\s*)?([A-Za-zÀ-ÿ0-9\s]+?)\s*:?\s*([0-9\s,]+(?:\.[0-9]+)?)\s*\$/gi);
        for (const match of optionMatches) {
          options.push({
            name: match[1].trim(),
            amount: match[2].replace(/[\s,]/g, ''),
          });
        }
        
        contacts.push({
          docName: '',
          supplierName: nameMatch[1].trim().replace(/\*+/g, ''),
          phone: phoneMatch ? phoneMatch[1].trim() : '',
          amount: amount,
          options: options.length > 0 ? options : undefined,
        });
      }
    }
    
    // Try to extract amounts from comparison table for suppliers without amounts
    const tableAmounts: Record<string, string> = {};
    const tableRows = analysisResult.matchAll(/\|\s*\*?\*?([^|*]+)\*?\*?\s*\|\s*\*?\*?([0-9\s,]+)\s*\$\*?\*?\s*\|/g);
    for (const row of tableRows) {
      const name = row[1].trim();
      const amt = row[2].replace(/[\s,]/g, '');
      if (name && !name.includes('Entreprise') && !name.includes('---') && !name.includes('Critère') && amt) {
        tableAmounts[name.toLowerCase()] = amt;
      }
    }
    
    // Fill in missing amounts from table
    for (const contact of contacts) {
      if (!contact.amount) {
        const key = contact.supplierName.toLowerCase();
        for (const [tableName, tableAmt] of Object.entries(tableAmounts)) {
          if (key.includes(tableName) || tableName.includes(key)) {
            contact.amount = tableAmt;
            break;
          }
        }
      }
    }
    
    // If no contacts found, try to extract from comparison table directly
    if (contacts.length === 0) {
      for (const [name, amt] of Object.entries(tableAmounts)) {
        contacts.push({
          docName: '',
          supplierName: name.charAt(0).toUpperCase() + name.slice(1),
          phone: '',
          amount: amt,
        });
      }
    }
    
    // Fallback: try old format with ```contacts block
    if (contacts.length === 0) {
      const contactsMatch = analysisResult.match(/```contacts\n([\s\S]*?)```/);
      if (contactsMatch) {
        const lines = contactsMatch[1].split('\n').filter(line => line.trim() && line.includes('|'));
        for (const line of lines) {
          const parts = line.split('|').map(p => p.trim());
          if (parts.length >= 4) {
            contacts.push({
              docName: parts[0],
              supplierName: parts[1],
              phone: parts[2],
              amount: parts[3],
            });
          }
        }
      }
    }
    
    console.log("Extracted suppliers:", contacts);
    return contacts;
  };

  // Save analysis summary as a document
  const saveAnalysisSummary = async (summary: string) => {
    if (!summary) return null;
    
    // Create a text file blob from the summary
    const blob = new Blob([summary], { type: 'text/markdown' });
    const fileName = `Analyse_IA_${categoryName.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.md`;
    const sanitizedFileName = sanitizeFileName(fileName);
    const storagePath = `${projectId}/soumissions/${tradeId}/analyses/${Date.now()}_${sanitizedFileName}`;
    
    // Upload to storage
    const { error: uploadError } = await supabase.storage
      .from('task-attachments')
      .upload(storagePath, blob);

    if (uploadError) {
      console.error("Error uploading analysis summary:", uploadError);
      return null;
    }

    const { data: urlData } = supabase.storage
      .from('task-attachments')
      .getPublicUrl(storagePath);

    // Save to task_attachments
    const { error: dbError } = await supabase
      .from('task_attachments')
      .insert({
        project_id: projectId,
        step_id: 'soumissions',
        task_id: `soumission-${tradeId}`,
        file_name: `Résumé analyse IA - ${categoryName}`,
        file_url: urlData.publicUrl,
        file_type: 'text/markdown',
        file_size: blob.size,
        category: 'analyse',
      });

    if (dbError) {
      console.error("Error saving analysis to DB:", dbError);
      return null;
    }

    return urlData.publicUrl;
  };

  // Save everything
  const handleSave = async (saveAnalysis = false) => {
    const budgetValue = parseFloat(budget) || 0;
    const spentValue = parseFloat(spent) || parseFloat(selectedAmount) || 0;
    
    // Save analysis summary if requested
    if (saveAnalysis && analysisResult) {
      await saveAnalysisSummary(analysisResult);
      toast.success(`Le résumé a été enregistré dans vos dossiers sous "Soumissions > ${categoryName}"`, {
        duration: 5000,
      });
    }
    
    // Save supplier info to task_dates
    if (supplierName) {
      const notes = JSON.stringify({
        supplierName,
        supplierPhone,
        contactPerson,
        contactPersonPhone,
        amount: selectedAmount,
        isCompleted: true,
      });

      const { data: existing } = await supabase
        .from('task_dates')
        .select('id')
        .eq('project_id', projectId)
        .eq('step_id', 'soumissions')
        .eq('task_id', `soumission-${tradeId}`)
        .maybeSingle();

      if (existing) {
        await supabase
          .from('task_dates')
          .update({ notes })
          .eq('id', existing.id);
      } else {
        await supabase
          .from('task_dates')
          .insert({
            project_id: projectId,
            step_id: 'soumissions',
            task_id: `soumission-${tradeId}`,
            notes,
          });
      }
    }

    onSave(budgetValue, spentValue, supplierName ? {
      name: supplierName,
      phone: supplierPhone,
      amount: spentValue,
    } : undefined);
    
    queryClient.invalidateQueries({ queryKey: ['supplier-status', projectId, tradeId] });
    queryClient.invalidateQueries({ queryKey: ['category-docs', projectId, tradeId] });
    if (!saveAnalysis) {
      toast.success("Catégorie mise à jour");
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div 
              className="w-4 h-4 rounded" 
              style={{ backgroundColor: categoryColor }}
            />
            {categoryName}
          </DialogTitle>
          <DialogDescription>
            Gérez le budget, les soumissions et le fournisseur retenu
          </DialogDescription>
        </DialogHeader>

        <div className="relative flex-1">
          <ScrollArea ref={scrollAreaRef} className="h-full max-h-[60vh] pr-4">
          <div className="space-y-6">
            {/* Budget Section */}
            <div className="space-y-3">
              <h4 className="font-medium flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Budget
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="budget">Budget estimé ($)</Label>
                  <Input
                    id="budget"
                    type="number"
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="spent">Coût réel ($)</Label>
                  <Input
                    id="spent"
                    type="number"
                    value={spent}
                    onChange={(e) => setSpent(e.target.value)}
                    placeholder="0"
                  />
                </div>
              </div>
            </div>

            {/* Documents Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-medium flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Soumissions ({documents.length})
                </h4>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={uploading}
                    onClick={() => document.getElementById(`upload-${tradeId}`)?.click()}
                  >
                    {uploading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4" />
                    )}
                    <span className="ml-2">Télécharger</span>
                  </Button>
                  <input
                    id={`upload-${tradeId}`}
                    type="file"
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                  {documents.length > 0 && (
                    <Button
                      variant="default"
                      size="sm"
                      disabled={analyzing}
                      onClick={analyzeDocuments}
                    >
                      {analyzing ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Sparkles className="h-4 w-4" />
                      )}
                      <span className="ml-2">Analyser IA</span>
                    </Button>
                  )}
                </div>
              </div>

              {loadingDocs ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : documents.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground border rounded-lg border-dashed">
                  <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Aucune soumission téléchargée</p>
                  <p className="text-xs">Cliquez sur "Télécharger" pour ajouter des documents</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between p-2 rounded-lg border bg-muted/30"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText className="h-4 w-4 text-primary shrink-0" />
                        <span className="text-sm truncate">{doc.file_name}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => window.open(doc.file_url, '_blank')}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => deleteMutation.mutate(doc.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Selected Supplier Summary - Show when supplier is chosen */}
            {supplierName && (
              <div className="rounded-xl border-2 border-primary bg-primary/5 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold flex items-center gap-2 text-lg text-primary">
                    <CheckCircle2 className="h-5 w-5" />
                    Fournisseur retenu
                  </h4>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleDeleteSupplier}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Supprimer fournisseur
                    </Button>
                    <Badge className="bg-primary text-primary-foreground">
                      Sélectionné
                    </Badge>
                  </div>
                </div>
                <div className="grid gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Entreprise:</span>
                    <span className="font-semibold">🏢 {supplierName}</span>
                  </div>
                  {supplierPhone && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Téléphone:</span>
                      <span className="font-medium flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {supplierPhone}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between pt-2 border-t">
                    <span className="text-muted-foreground">Coût retenu:</span>
                    <span className="font-bold text-xl text-primary">
                      {parseInt(spent || selectedAmount || '0').toLocaleString('fr-CA')} $
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* AI Analysis Result - Compact Preview */}
            {analysisResult && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium flex items-center gap-2 text-lg">
                    <Sparkles className="h-5 w-5 text-primary" />
                    Analyse terminée
                  </h4>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowFullAnalysis(true)}
                    className="gap-2"
                  >
                    <Maximize2 className="h-4 w-4" />
                    Voir le résumé de l'analyse
                  </Button>
                </div>
                <div className="rounded-lg border bg-primary/5 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-foreground">
                        {extractedSuppliers.length} fournisseur(s) détecté(s)
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {supplierName 
                          ? "Fournisseur sélectionné. Cliquez sur 'Voir le résumé' pour modifier."
                          : "Cliquez sur 'Voir le résumé' pour consulter l'analyse et sélectionner votre fournisseur"
                        }
                      </p>
                    </div>
                    <Badge variant="secondary" className="bg-primary/10 text-primary">
                      <Sparkles className="h-3 w-3 mr-1" />
                      IA
                    </Badge>
                  </div>
                </div>
              </div>
            )}

            {/* Supplier Selection Cards - shown after analysis */}
            {extractedSuppliers.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-medium flex items-center gap-2 text-lg">
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                  Choisir le fournisseur retenu
                </h4>
                <div className="grid gap-3">
                  {extractedSuppliers.map((supplier, index) => (
                    <div
                      key={index}
                      onClick={() => handleSelectSupplier(index)}
                      className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        selectedSupplierIndex === index
                          ? 'border-primary bg-primary/5 shadow-md'
                          : 'border-border hover:border-primary/50 hover:bg-muted/50'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="font-semibold text-foreground flex items-center gap-2">
                            {selectedSupplierIndex === index && (
                              <CheckCircle2 className="h-5 w-5 text-primary" />
                            )}
                            🏢 {supplier.supplierName}
                          </div>
                          {supplier.phone && (
                            <div className="text-sm text-muted-foreground flex items-center gap-2">
                              <Phone className="h-3 w-3" />
                              {supplier.phone}
                            </div>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-lg text-primary">
                            {parseInt(supplier.amount).toLocaleString('fr-CA')} $
                          </div>
                          <div className="text-xs text-muted-foreground">avant taxes</div>
                        </div>
                      </div>

                      {/* Options for this supplier */}
                      {selectedSupplierIndex === index && supplier.options && supplier.options.length > 0 && (
                        <div className="mt-4 pt-4 border-t space-y-2">
                          <Label className="text-sm font-medium">Options disponibles:</Label>
                          <div className="grid gap-2">
                            {supplier.options.map((option, optIndex) => (
                              <div
                                key={optIndex}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSelectOption(optIndex);
                                }}
                                className={`p-3 rounded border cursor-pointer transition-all ${
                                  selectedOptionIndex === optIndex
                                    ? 'border-primary bg-primary/10'
                                    : 'border-border hover:border-primary/50'
                                }`}
                              >
                                <div className="flex justify-between items-center">
                                  <span className="font-medium">{option.name}</span>
                                  <span className="font-bold text-primary">
                                    {parseInt(option.amount).toLocaleString('fr-CA')} $
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
                  ))}
                </div>
              </div>
            )}

            {/* Manual Supplier Entry or Selected Supplier Details */}
            <div className="space-y-3">
              <h4 className="font-medium flex items-center gap-2">
                <User className="h-4 w-4" />
                {extractedSuppliers.length > 0 ? 'Fiche du fournisseur retenu' : 'Fournisseur retenu'}
              </h4>
              
              {selectedSupplierIndex !== null && (
                <Badge variant="secondary" className="bg-primary/10 text-primary">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Sélectionné depuis l'analyse
                </Badge>
              )}

              <div className="grid gap-3">
                <div className="space-y-2">
                  <Label htmlFor="supplier-name">Nom du fournisseur</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="supplier-name"
                      value={supplierName}
                      onChange={(e) => setSupplierName(e.target.value)}
                      placeholder="Nom de l'entreprise"
                      className="pl-9"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="supplier-phone">Téléphone entreprise</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="supplier-phone"
                        value={supplierPhone}
                        onChange={(e) => setSupplierPhone(e.target.value)}
                        placeholder="514-XXX-XXXX"
                        className="pl-9"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="supplier-amount">Montant retenu ($)</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="supplier-amount"
                        type="number"
                        value={selectedAmount}
                        onChange={(e) => {
                          setSelectedAmount(e.target.value);
                          setSpent(e.target.value);
                        }}
                        placeholder="0"
                        className="pl-9"
                      />
                    </div>
                  </div>
                </div>

                {/* Contact Person Section */}
                <div className="pt-3 border-t">
                  <Label className="text-sm font-medium text-muted-foreground mb-2 block">
                    Personne à contacter (optionnel)
                  </Label>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="contact-person">Nom du contact</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="contact-person"
                          value={contactPerson}
                          onChange={(e) => setContactPerson(e.target.value)}
                          placeholder="Jean Tremblay"
                          className="pl-9"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="contact-person-phone">Téléphone direct</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="contact-person-phone"
                          value={contactPersonPhone}
                          onChange={(e) => setContactPersonPhone(e.target.value)}
                          placeholder="514-XXX-XXXX"
                          className="pl-9"
                        />
                      </div>
                    </div>
                  </div>
                </div>
                {supplierStatus?.isCompleted && (
                  <Badge variant="secondary" className="w-fit bg-success/10 text-success">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Fournisseur confirmé
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </ScrollArea>
          
          {/* Scroll buttons inside dialog */}
          {(showScrollButtons.up || showScrollButtons.down) && (
            <div className="absolute right-6 bottom-4 flex flex-col gap-2 z-10">
              {showScrollButtons.up && (
                <Button
                  variant="secondary"
                  size="icon"
                  onClick={scrollToTop}
                  className="h-9 w-9 rounded-full shadow-lg bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  <ChevronUp className="h-4 w-4" />
                </Button>
              )}
              {showScrollButtons.down && (
                <Button
                  variant="secondary"
                  size="icon"
                  onClick={scrollToBottom}
                  className="h-9 w-9 rounded-full shadow-lg bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  <ChevronDown className="h-4 w-4" />
                </Button>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={() => handleSave(false)}>
            <Save className="h-4 w-4 mr-2" />
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>

      {/* Full Analysis View */}
      <AnalysisFullView
        open={showFullAnalysis}
        onOpenChange={setShowFullAnalysis}
        categoryName={categoryName}
        categoryColor={categoryColor}
        analysisResult={analysisResult || ''}
        extractedSuppliers={extractedSuppliers}
        selectedSupplierIndex={selectedSupplierIndex}
        selectedOptionIndex={selectedOptionIndex}
        onSelectSupplier={handleSelectSupplier}
        onSelectOption={handleSelectOption}
        onConfirmSelection={() => {
          setShowFullAnalysis(false);
          handleSave(true); // Save with analysis summary
        }}
      />
    </Dialog>
  );
}
