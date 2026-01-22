import { useState, useEffect } from "react";
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
  X,
} from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

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
  const [supplierName, setSupplierName] = useState("");
  const [supplierPhone, setSupplierPhone] = useState("");
  const [selectedAmount, setSelectedAmount] = useState("");

  const tradeId = categoryToTradeId[categoryName] || categoryName.toLowerCase().replace(/\s+/g, '-');

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setBudget(currentBudget.toString());
      setSpent(currentSpent.toString());
      setAnalysisResult(null);
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
      setSelectedAmount(supplierStatus.amount || "");
    }
  }, [supplierStatus]);

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const fileName = `${projectId}/soumissions/${tradeId}/${Date.now()}_${file.name}`;
      
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
      if (contacts.length > 0) {
        setSupplierName(contacts[0].supplierName);
        setSupplierPhone(contacts[0].phone);
        setSelectedAmount(contacts[0].amount.replace(/[^\d]/g, ''));
      }
    } catch (error) {
      console.error("Analysis error:", error);
      toast.error(error instanceof Error ? error.message : "Erreur d'analyse");
    } finally {
      setAnalyzing(false);
    }
  };

  // Parse contacts from AI analysis
  const parseExtractedContacts = (analysisResult: string): ExtractedContact[] => {
    const contacts: ExtractedContact[] = [];
    
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
    
    return contacts;
  };

  // Save everything
  const handleSave = async () => {
    const budgetValue = parseFloat(budget) || 0;
    const spentValue = parseFloat(spent) || parseFloat(selectedAmount) || 0;
    
    // Save supplier info to task_dates
    if (supplierName) {
      const notes = JSON.stringify({
        supplierName,
        supplierPhone,
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
    toast.success("Catégorie mise à jour");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
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

        <ScrollArea className="flex-1 pr-4">
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

            {/* AI Analysis Result */}
            {analysisResult && (
              <div className="space-y-3">
                <h4 className="font-medium flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Analyse IA
                </h4>
                <div className="rounded-lg border bg-muted/30 p-4 max-h-[300px] overflow-y-auto">
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {analysisResult}
                    </ReactMarkdown>
                  </div>
                </div>
              </div>
            )}

            {/* Supplier Selection */}
            <div className="space-y-3">
              <h4 className="font-medium flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Fournisseur retenu
              </h4>
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
                    <Label htmlFor="supplier-phone">Téléphone</Label>
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
                    <Label htmlFor="supplier-amount">Montant soumission ($)</Label>
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

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={handleSave}>
            <Save className="h-4 w-4 mr-2" />
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
