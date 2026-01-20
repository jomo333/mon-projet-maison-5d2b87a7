import { useState, useEffect } from "react";
import { tradeTypes } from "@/data/tradeTypes";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { 
  FileText, 
  Upload, 
  Trash2, 
  CheckCircle2, 
  Loader2, 
  Download,
  Building2,
  FileCheck,
  Phone
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface SoumissionsManagerProps {
  projectId: string;
}

// Corps de métier pertinents pour les soumissions
const soumissionTrades = [
  { id: "excavation", name: "Excavation", description: "Creusage du terrain et préparation du sol" },
  { id: "fondation", name: "Fondation/Béton", description: "Coulage des fondations et dalles de béton" },
  { id: "charpente", name: "Charpentier", description: "Structure et ossature de la maison" },
  { id: "toiture", name: "Couvreur", description: "Installation du toit et bardeaux" },
  { id: "fenetre", name: "Fenêtres/Portes", description: "Fourniture et installation des fenêtres et portes" },
  { id: "electricite", name: "Électricien", description: "Installation électrique complète" },
  { id: "plomberie", name: "Plombier", description: "Plomberie et raccordements" },
  { id: "hvac", name: "Chauffage/Ventilation", description: "Système de chauffage et ventilation" },
  { id: "isolation", name: "Isolation", description: "Isolation des murs, plafonds et sous-sol" },
  { id: "gypse", name: "Plâtrier/Gypse", description: "Pose des panneaux de gypse" },
  { id: "peinture", name: "Peintre", description: "Peinture intérieure et extérieure" },
  { id: "plancher", name: "Plancher", description: "Installation des planchers" },
  { id: "ceramique", name: "Céramiste", description: "Pose de céramique salle de bain/cuisine" },
  { id: "armoires", name: "Ébéniste/Armoires", description: "Armoires de cuisine et salle de bain" },
  { id: "comptoirs", name: "Comptoirs", description: "Installation des comptoirs" },
  { id: "exterieur", name: "Revêtement extérieur", description: "Revêtement et finition extérieure" },
  { id: "amenagement", name: "Aménagement paysager", description: "Terrassement et aménagement extérieur" },
];

interface SoumissionStatus {
  tradeId: string;
  isCompleted: boolean;
  supplierName?: string;
  supplierPhone?: string;
}

export function SoumissionsManager({ projectId }: SoumissionsManagerProps) {
  const queryClient = useQueryClient();
  const [expandedTrade, setExpandedTrade] = useState<string | null>(null);
  const [uploadingTrade, setUploadingTrade] = useState<string | null>(null);
  const [supplierInputs, setSupplierInputs] = useState<Record<string, { name: string; phone: string }>>({});

  // Charger les statuts des soumissions depuis task_dates
  const { data: soumissionStatuses, isLoading: loadingStatuses } = useQuery({
    queryKey: ['soumission-statuses', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('task_dates')
        .select('*')
        .eq('project_id', projectId)
        .eq('step_id', 'plans-permis')
        .like('task_id', 'soumission-%');
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!projectId,
  });

  // Charger les documents de soumission
  const { data: soumissionDocs, isLoading: loadingDocs } = useQuery({
    queryKey: ['soumission-docs', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('task_attachments')
        .select('*')
        .eq('project_id', projectId)
        .eq('step_id', 'plans-permis')
        .like('task_id', 'soumission-%');
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!projectId,
  });

  // Initialiser les inputs des fournisseurs
  useEffect(() => {
    if (soumissionStatuses) {
      const inputs: Record<string, { name: string; phone: string }> = {};
      soumissionStatuses.forEach(status => {
        const tradeId = status.task_id.replace('soumission-', '');
        const notes = status.notes ? JSON.parse(status.notes) : {};
        inputs[tradeId] = {
          name: notes.supplierName || '',
          phone: notes.supplierPhone || '',
        };
      });
      setSupplierInputs(inputs);
    }
  }, [soumissionStatuses]);

  // Mutation pour sauvegarder le statut
  const saveStatusMutation = useMutation({
    mutationFn: async ({ tradeId, isCompleted, supplierName, supplierPhone }: SoumissionStatus) => {
      const notes = JSON.stringify({ supplierName, supplierPhone, isCompleted });
      
      const { data: existing } = await supabase
        .from('task_dates')
        .select('id')
        .eq('project_id', projectId)
        .eq('step_id', 'plans-permis')
        .eq('task_id', `soumission-${tradeId}`)
        .single();

      if (existing) {
        const { error } = await supabase
          .from('task_dates')
          .update({ notes })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('task_dates')
          .insert({
            project_id: projectId,
            step_id: 'plans-permis',
            task_id: `soumission-${tradeId}`,
            notes,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['soumission-statuses', projectId] });
    },
  });

  // Mutation pour uploader un document
  const uploadMutation = useMutation({
    mutationFn: async ({ tradeId, file }: { tradeId: string; file: File }) => {
      const fileExt = file.name.split('.').pop();
      const fileName = `${projectId}/soumissions/${tradeId}/${Date.now()}_${file.name}`;
      
      // Upload vers le storage
      const { error: uploadError, data: uploadData } = await supabase.storage
        .from('task-attachments')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Obtenir l'URL publique
      const { data: urlData } = supabase.storage
        .from('task-attachments')
        .getPublicUrl(fileName);

      // Sauvegarder dans la base de données
      const { error: dbError } = await supabase
        .from('task_attachments')
        .insert({
          project_id: projectId,
          step_id: 'plans-permis',
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
    onSuccess: (_, { tradeId }) => {
      queryClient.invalidateQueries({ queryKey: ['soumission-docs', projectId] });
      toast({
        title: "Document ajouté",
        description: "La soumission a été téléchargée avec succès.",
      });
      setUploadingTrade(null);
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: "Impossible de télécharger le document",
        variant: "destructive",
      });
      setUploadingTrade(null);
    },
  });

  // Mutation pour supprimer un document
  const deleteMutation = useMutation({
    mutationFn: async (attachmentId: string) => {
      const { error } = await supabase
        .from('task_attachments')
        .delete()
        .eq('id', attachmentId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['soumission-docs', projectId] });
      toast({
        title: "Document supprimé",
        description: "Le document a été supprimé.",
      });
    },
  });

  const handleFileUpload = (tradeId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setUploadingTrade(tradeId);
      uploadMutation.mutate({ tradeId, file: files[0] });
    }
    e.target.value = '';
  };

  const getTradeStatus = (tradeId: string) => {
    const status = soumissionStatuses?.find(s => s.task_id === `soumission-${tradeId}`);
    if (!status?.notes) return { isCompleted: false, supplierName: '', supplierPhone: '' };
    try {
      const notes = JSON.parse(status.notes);
      return {
        isCompleted: notes.isCompleted || false,
        supplierName: notes.supplierName || '',
        supplierPhone: notes.supplierPhone || '',
      };
    } catch {
      return { isCompleted: false, supplierName: '', supplierPhone: '' };
    }
  };

  const getTradeDocs = (tradeId: string) => {
    return soumissionDocs?.filter(d => d.task_id === `soumission-${tradeId}`) || [];
  };

  const handleToggleCompleted = (tradeId: string) => {
    const current = getTradeStatus(tradeId);
    const inputs = supplierInputs[tradeId] || { name: '', phone: '' };
    saveStatusMutation.mutate({
      tradeId,
      isCompleted: !current.isCompleted,
      supplierName: inputs.name || current.supplierName,
      supplierPhone: inputs.phone || current.supplierPhone,
    });
  };

  const handleSaveSupplier = (tradeId: string) => {
    const current = getTradeStatus(tradeId);
    const inputs = supplierInputs[tradeId] || { name: '', phone: '' };
    saveStatusMutation.mutate({
      tradeId,
      isCompleted: current.isCompleted,
      supplierName: inputs.name,
      supplierPhone: inputs.phone,
    });
    toast({
      title: "Fournisseur enregistré",
      description: `${inputs.name} a été enregistré.`,
    });
  };

  const getTradeColor = (tradeId: string) => {
    const trade = tradeTypes.find(t => t.id === tradeId);
    return trade?.color || "#6B7280";
  };

  const completedCount = soumissionTrades.filter(t => getTradeStatus(t.id).isCompleted).length;

  if (loadingStatuses || loadingDocs) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 font-medium">
          <Building2 className="h-5 w-5 text-primary" />
          <span>Soumissions par corps de métier</span>
        </div>
        <Badge variant={completedCount === soumissionTrades.length ? "default" : "secondary"}>
          {completedCount}/{soumissionTrades.length} complétées
        </Badge>
      </div>

      <p className="text-sm text-muted-foreground">
        Obtenez au moins 3 soumissions par spécialité et téléchargez-les pour les comparer.
      </p>

      <div className="space-y-2">
        {soumissionTrades.map((trade) => {
          const status = getTradeStatus(trade.id);
          const docs = getTradeDocs(trade.id);
          const isExpanded = expandedTrade === trade.id;
          const inputs = supplierInputs[trade.id] || { name: '', phone: '' };

          return (
            <Card 
              key={trade.id}
              className={`transition-all ${status.isCompleted ? 'bg-green-50/50 dark:bg-green-950/20 border-green-200 dark:border-green-800' : ''}`}
            >
              <CardContent className="p-4">
                <div 
                  className="flex items-center gap-3 cursor-pointer"
                  onClick={() => setExpandedTrade(isExpanded ? null : trade.id)}
                >
                  <div 
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: getTradeColor(trade.id) }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`font-medium ${status.isCompleted ? 'text-green-700 dark:text-green-400' : ''}`}>
                        {trade.name}
                      </span>
                      {status.isCompleted && (
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                      )}
                      {docs.length > 0 && (
                        <Badge variant="outline" className="text-xs">
                          {docs.length} doc{docs.length > 1 ? 's' : ''}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {status.supplierName ? `✓ ${status.supplierName}` : trade.description}
                    </p>
                  </div>
                  <div 
                    className="shrink-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleCompleted(trade.id);
                    }}
                  >
                    <Checkbox checked={status.isCompleted} />
                  </div>
                </div>

                {isExpanded && (
                  <div className="mt-4 pt-4 border-t space-y-4">
                    {/* Infos fournisseur */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-muted-foreground mb-1 block">
                          Fournisseur retenu
                        </label>
                        <Input
                          placeholder="Nom du fournisseur"
                          value={inputs.name}
                          onChange={(e) => setSupplierInputs(prev => ({
                            ...prev,
                            [trade.id]: { ...prev[trade.id], name: e.target.value }
                          }))}
                        />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground mb-1 block">
                          Téléphone
                        </label>
                        <div className="flex gap-2">
                          <Input
                            placeholder="514-555-1234"
                            value={inputs.phone}
                            onChange={(e) => setSupplierInputs(prev => ({
                              ...prev,
                              [trade.id]: { ...prev[trade.id], phone: e.target.value }
                            }))}
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleSaveSupplier(trade.id)}
                            disabled={saveStatusMutation.isPending}
                          >
                            {saveStatusMutation.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <FileCheck className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Documents de soumission */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          Documents de soumission
                        </span>
                        <label>
                          <input
                            type="file"
                            className="hidden"
                            accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                            onChange={(e) => handleFileUpload(trade.id, e)}
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            asChild
                            disabled={uploadingTrade === trade.id}
                          >
                            <span className="cursor-pointer">
                              {uploadingTrade === trade.id ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              ) : (
                                <Upload className="h-4 w-4 mr-2" />
                              )}
                              Ajouter
                            </span>
                          </Button>
                        </label>
                      </div>

                      {docs.length > 0 ? (
                        <div className="space-y-2">
                          {docs.map((doc) => (
                            <div 
                              key={doc.id}
                              className="flex items-center gap-2 p-2 bg-muted/50 rounded-md"
                            >
                              <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                              <span className="text-sm truncate flex-1">{doc.file_name}</span>
                              <a
                                href={doc.file_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="shrink-0"
                              >
                                <Button size="icon" variant="ghost" className="h-8 w-8">
                                  <Download className="h-4 w-4" />
                                </Button>
                              </a>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={() => deleteMutation.mutate(doc.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground italic">
                          Aucune soumission téléchargée pour ce corps de métier.
                        </p>
                      )}
                    </div>

                    {status.supplierPhone && (
                      <a 
                        href={`tel:${status.supplierPhone}`}
                        className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                      >
                        <Phone className="h-4 w-4" />
                        Appeler {status.supplierName || 'le fournisseur'}
                      </a>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
