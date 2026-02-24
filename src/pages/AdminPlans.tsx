import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/lib/i18n";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { AdminGuard } from "@/components/admin/AdminGuard";
import { useAdmin } from "@/hooks/useAdmin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, Star, Package, GripVertical } from "lucide-react";

interface Plan {
  id: string;
  name: string;
  description: string | null;
  price_monthly: number;
  price_yearly: number | null;
  features: string[];
  limits: Record<string, number>;
  is_active: boolean;
  is_featured: boolean;
  display_order: number;
}

const defaultPlan: Omit<Plan, "id"> = {
  name: "",
  description: "",
  price_monthly: 0,
  price_yearly: null,
  features: [],
  limits: { projects: 1, ai_analyses: 0, uploads_gb: 0.5 },
  is_active: true,
  is_featured: false,
  display_order: 0,
};

export default function AdminPlans() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [formData, setFormData] = useState<Omit<Plan, "id">>(defaultPlan);
  const [featuresText, setFeaturesText] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [planToDelete, setPlanToDelete] = useState<Plan | null>(null);
  const { logAdminAction } = useAdmin();
  const { toast } = useToast();

  useEffect(() => {
    fetchPlans();
  }, []);

  async function fetchPlans() {
    try {
      const { data, error } = await supabase
        .from("plans")
        .select("*")
        .order("display_order");

      if (error) throw error;

      setPlans(
        (data || []).map((p) => ({
          ...p,
          features: Array.isArray(p.features) ? (p.features as string[]) : [],
          limits: typeof p.limits === "object" && p.limits !== null ? (p.limits as Record<string, number>) : {},
        }))
      );
    } catch (error) {
      console.error("Error fetching plans:", error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de charger les forfaits.",
      });
    } finally {
      setLoading(false);
    }
  }

  const openCreateDialog = () => {
    setEditingPlan(null);
    setFormData({
      ...defaultPlan,
      display_order: plans.length + 1,
    });
    setFeaturesText("");
    setDialogOpen(true);
  };

  const openEditDialog = (plan: Plan) => {
    setEditingPlan(plan);
    setFormData({
      name: plan.name,
      description: plan.description,
      price_monthly: plan.price_monthly,
      price_yearly: plan.price_yearly,
      features: plan.features,
      limits: plan.limits,
      is_active: plan.is_active,
      is_featured: plan.is_featured,
      display_order: plan.display_order,
    });
    setFeaturesText(plan.features.join("\n"));
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Le nom du forfait est requis.",
      });
      return;
    }

    setSaving(true);

    try {
      const features = featuresText
        .split("\n")
        .map((f) => f.trim())
        .filter((f) => f.length > 0);

      const planData = {
        name: formData.name.trim(),
        description: formData.description?.trim() || null,
        price_monthly: formData.price_monthly,
        price_yearly: formData.price_yearly,
        features,
        limits: formData.limits,
        is_active: formData.is_active,
        is_featured: formData.is_featured,
        display_order: formData.display_order,
      };

      if (editingPlan) {
        const { error } = await supabase
          .from("plans")
          .update(planData)
          .eq("id", editingPlan.id);

        if (error) throw error;

        await logAdminAction("plan_updated", undefined, "plans", editingPlan.id, planData);
        toast({ title: "Forfait mis à jour" });
      } else {
        const { data, error } = await supabase
          .from("plans")
          .insert(planData)
          .select()
          .single();

        if (error) throw error;

        await logAdminAction("plan_created", undefined, "plans", data.id, planData);
        toast({ title: "Forfait créé" });
      }

      setDialogOpen(false);
      fetchPlans();
    } catch (error) {
      console.error("Error saving plan:", error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de sauvegarder le forfait.",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!planToDelete) return;

    try {
      const { error } = await supabase
        .from("plans")
        .delete()
        .eq("id", planToDelete.id);

      if (error) throw error;

      await logAdminAction("plan_deleted", undefined, "plans", planToDelete.id, {
        name: planToDelete.name,
      });

      toast({ title: "Forfait supprimé" });
      setDeleteDialogOpen(false);
      setPlanToDelete(null);
      fetchPlans();
    } catch (error) {
      console.error("Error deleting plan:", error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de supprimer le forfait.",
      });
    }
  };

  // Use centralized formatCurrency from i18n (already imported at top)

  return (
    <AdminGuard>
      <AdminLayout>
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Forfaits</h1>
              <p className="text-muted-foreground mt-1">
                Créez et gérez vos offres d'abonnement
              </p>
            </div>
            <Button onClick={openCreateDialog} className="gap-2">
              <Plus className="h-4 w-4" />
              Nouveau forfait
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                {plans.length} forfait{plans.length > 1 ? "s" : ""}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : plans.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Aucun forfait créé</p>
                  <Button onClick={openCreateDialog} variant="outline" className="mt-4">
                    Créer votre premier forfait
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto touch-pan-x -mx-4 sm:mx-0 px-4 sm:px-0" style={{ WebkitOverflowScrolling: "touch" }}>
                  <Table className="min-w-[640px]">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12"></TableHead>
                        <TableHead>Nom</TableHead>
                        <TableHead>Prix mensuel</TableHead>
                        <TableHead>Prix annuel</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead>Fonctionnalités</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {plans.map((plan) => (
                        <TableRow key={plan.id}>
                          <TableCell>
                            <GripVertical className="h-4 w-4 text-muted-foreground" />
                          </TableCell>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              {plan.name}
                              {plan.is_featured && (
                                <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                              )}
                            </div>
                            {plan.description && (
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {plan.description}
                              </p>
                            )}
                          </TableCell>
                          <TableCell>{formatCurrency(plan.price_monthly)}</TableCell>
                          <TableCell>
                            {plan.price_yearly ? formatCurrency(plan.price_yearly) : "—"}
                          </TableCell>
                          <TableCell>
                            <Badge variant={plan.is_active ? "default" : "secondary"}>
                              {plan.is_active ? "Actif" : "Inactif"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-muted-foreground">
                              {plan.features.length} fonctionnalité
                              {plan.features.length > 1 ? "s" : ""}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openEditDialog(plan)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setPlanToDelete(plan);
                                  setDeleteDialogOpen(true);
                                }}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Create/Edit Dialog */}
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingPlan ? "Modifier le forfait" : "Nouveau forfait"}
                </DialogTitle>
                <DialogDescription>
                  {editingPlan
                    ? "Modifiez les détails du forfait"
                    : "Créez un nouveau forfait d'abonnement"}
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nom du forfait *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      placeholder="Ex: Essentiel"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="order">Ordre d'affichage</Label>
                    <Input
                      id="order"
                      type="number"
                      value={formData.display_order}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          display_order: parseInt(e.target.value) || 0,
                        })
                      }
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    value={formData.description || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    placeholder="Ex: Pour les autoconstructeurs sérieux"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="price_monthly">Prix mensuel (CAD)</Label>
                    <Input
                      id="price_monthly"
                      type="number"
                      step="0.01"
                      value={formData.price_monthly}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          price_monthly: parseFloat(e.target.value) || 0,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="price_yearly">Prix annuel (CAD)</Label>
                    <Input
                      id="price_yearly"
                      type="number"
                      step="0.01"
                      value={formData.price_yearly || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          price_yearly: e.target.value
                            ? parseFloat(e.target.value)
                            : null,
                        })
                      }
                      placeholder="Optionnel"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="features">Fonctionnalités (une par ligne)</Label>
                  <Textarea
                    id="features"
                    value={featuresText}
                    onChange={(e) => setFeaturesText(e.target.value)}
                    placeholder="3 projets&#10;Analyses IA (5/mois)&#10;Stockage 5 Go"
                    rows={5}
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="limit_projects">Limite projets</Label>
                    <Input
                      id="limit_projects"
                      type="number"
                      value={formData.limits.projects ?? 1}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          limits: {
                            ...formData.limits,
                            projects: parseInt(e.target.value) || 0,
                          },
                        })
                      }
                      placeholder="-1 = illimité"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="limit_ai">Analyses IA/mois</Label>
                    <Input
                      id="limit_ai"
                      type="number"
                      value={formData.limits.ai_analyses ?? 0}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          limits: {
                            ...formData.limits,
                            ai_analyses: parseInt(e.target.value) || 0,
                          },
                        })
                      }
                      placeholder="-1 = illimité"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="limit_storage">Stockage (Go)</Label>
                    <Input
                      id="limit_storage"
                      type="number"
                      step="0.1"
                      value={formData.limits.uploads_gb ?? 0.5}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          limits: {
                            ...formData.limits,
                            uploads_gb: parseFloat(e.target.value) || 0,
                          },
                        })
                      }
                    />
                  </div>
                </div>

                <div className="flex items-center gap-6 pt-2">
                  <div className="flex items-center gap-2">
                    <Switch
                      id="is_active"
                      checked={formData.is_active}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, is_active: checked })
                      }
                    />
                    <Label htmlFor="is_active">Actif</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      id="is_featured"
                      checked={formData.is_featured}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, is_featured: checked })
                      }
                    />
                    <Label htmlFor="is_featured">Mis en avant</Label>
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Annuler
                </Button>
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? "Sauvegarde..." : "Sauvegarder"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Delete Confirmation Dialog */}
          <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Supprimer le forfait</DialogTitle>
                <DialogDescription>
                  Êtes-vous sûr de vouloir supprimer le forfait "{planToDelete?.name}" ?
                  Cette action est irréversible.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                  Annuler
                </Button>
                <Button variant="destructive" onClick={handleDelete}>
                  Supprimer
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </AdminLayout>
    </AdminGuard>
  );
}
