import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { AdminGuard } from "@/components/admin/AdminGuard";
import { SubscriberStatusBadge } from "@/components/admin/SubscriberStatusBadge";
import { useAdmin } from "@/hooks/useAdmin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Search,
  MoreHorizontal,
  Download,
  UserCog,
  Ban,
  RefreshCw,
  Pause,
  Clock,
  Eye,
  Users,
} from "lucide-react";

interface Subscriber {
  id: string;
  user_id: string;
  status: string;
  billing_cycle: string;
  start_date: string;
  trial_end_date: string | null;
  current_period_end: string | null;
  created_at: string;
  plans: {
    id: string;
    name: string;
    price_monthly: number;
  } | null;
  profiles?: {
    display_name: string | null;
  } | null;
  user_email?: string;
}

interface Plan {
  id: string;
  name: string;
  price_monthly: number;
}

export default function AdminSubscribers() {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [planFilter, setPlanFilter] = useState<string>("all");
  const [selectedSubscriber, setSelectedSubscriber] = useState<Subscriber | null>(null);
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<string>("");
  const [newPlanId, setNewPlanId] = useState<string>("");
  const { logAdminAction } = useAdmin();
  const { toast } = useToast();

  useEffect(() => {
    fetchSubscribers();
    fetchPlans();
  }, []);

  async function fetchSubscribers() {
    try {
      const { data, error } = await supabase
        .from("subscriptions")
        .select(`
          *,
          plans (id, name, price_monthly)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch profile info for each subscriber
      const subscribersWithProfiles = await Promise.all(
        (data || []).map(async (sub) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("display_name")
            .eq("user_id", sub.user_id)
            .maybeSingle();
          
          return {
            ...sub,
            profiles: profile,
          };
        })
      );

      setSubscribers(subscribersWithProfiles);
    } catch (error) {
      console.error("Error fetching subscribers:", error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de charger les abonnés.",
      });
    } finally {
      setLoading(false);
    }
  }

  async function fetchPlans() {
    const { data } = await supabase
      .from("plans")
      .select("id, name, price_monthly")
      .eq("is_active", true)
      .order("display_order");
    setPlans(data || []);
  }

  const filteredSubscribers = subscribers.filter((sub) => {
    const matchesSearch =
      sub.profiles?.display_name?.toLowerCase().includes(search.toLowerCase()) ||
      sub.user_id.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || sub.status === statusFilter;
    const matchesPlan = planFilter === "all" || sub.plans?.id === planFilter;
    return matchesSearch && matchesStatus && matchesPlan;
  });

  const handleAction = (subscriber: Subscriber, action: string) => {
    setSelectedSubscriber(subscriber);
    setActionType(action);
    setNewPlanId(subscriber.plans?.id || "");
    setActionDialogOpen(true);
  };

  const executeAction = async () => {
    if (!selectedSubscriber) return;

    try {
      let updateData: Record<string, unknown> = {};
      let logAction = "";

      switch (actionType) {
        case "cancel":
          updateData = { status: "cancelled", cancelled_at: new Date().toISOString() };
          logAction = "subscription_cancelled";
          break;
        case "reactivate":
          updateData = { status: "active", cancelled_at: null };
          logAction = "subscription_reactivated";
          break;
        case "pause":
          updateData = { status: "paused" };
          logAction = "subscription_paused";
          break;
        case "extend_trial":
          const newTrialEnd = new Date();
          newTrialEnd.setDate(newTrialEnd.getDate() + 7);
          updateData = { trial_end_date: newTrialEnd.toISOString() };
          logAction = "trial_extended";
          break;
        case "change_plan":
          updateData = { plan_id: newPlanId };
          logAction = "plan_changed";
          break;
      }

      const { error } = await supabase
        .from("subscriptions")
        .update(updateData)
        .eq("id", selectedSubscriber.id);

      if (error) throw error;

      await logAdminAction(
        logAction,
        selectedSubscriber.user_id,
        "subscriptions",
        selectedSubscriber.id,
        { previous_status: selectedSubscriber.status, ...updateData }
      );

      toast({
        title: "Action effectuée",
        description: "L'abonnement a été mis à jour avec succès.",
      });

      fetchSubscribers();
    } catch (error) {
      console.error("Error executing action:", error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Une erreur est survenue.",
      });
    } finally {
      setActionDialogOpen(false);
      setSelectedSubscriber(null);
    }
  };

  const exportCSV = () => {
    const headers = ["ID", "Nom", "Statut", "Forfait", "Date inscription", "Prochaine facturation"];
    const rows = filteredSubscribers.map((sub) => [
      sub.id,
      sub.profiles?.display_name || "N/A",
      sub.status,
      sub.plans?.name || "N/A",
      format(new Date(sub.created_at), "yyyy-MM-dd"),
      sub.current_period_end ? format(new Date(sub.current_period_end), "yyyy-MM-dd") : "N/A",
    ]);

    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `abonnes-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("fr-CA", {
      style: "currency",
      currency: "CAD",
    }).format(value);
  };

  return (
    <AdminGuard>
      <AdminLayout>
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Abonnés</h1>
              <p className="text-muted-foreground mt-1">
                Gérez vos abonnés et leurs forfaits
              </p>
            </div>
            <Button onClick={exportCSV} variant="outline" className="gap-2">
              <Download className="h-4 w-4" />
              Exporter CSV
            </Button>
          </div>

          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Rechercher par nom ou ID..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Statut" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les statuts</SelectItem>
                    <SelectItem value="active">Actif</SelectItem>
                    <SelectItem value="trial">Essai</SelectItem>
                    <SelectItem value="cancelled">Annulé</SelectItem>
                    <SelectItem value="paused">En pause</SelectItem>
                    <SelectItem value="past_due">En retard</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={planFilter} onValueChange={setPlanFilter}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Forfait" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les forfaits</SelectItem>
                    {plans.map((plan) => (
                      <SelectItem key={plan.id} value={plan.id}>
                        {plan.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                {filteredSubscribers.length} abonné{filteredSubscribers.length > 1 ? "s" : ""}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : filteredSubscribers.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Aucun abonné trouvé</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nom</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead>Forfait</TableHead>
                        <TableHead>Inscription</TableHead>
                        <TableHead>Prochaine fact.</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredSubscribers.map((sub) => (
                        <TableRow key={sub.id}>
                          <TableCell className="font-medium">
                            {sub.profiles?.display_name || "Utilisateur"}
                            <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                              {sub.user_id}
                            </div>
                          </TableCell>
                          <TableCell>
                            <SubscriberStatusBadge status={sub.status} />
                          </TableCell>
                          <TableCell>
                            {sub.plans?.name || "—"}
                            <div className="text-xs text-muted-foreground">
                              {sub.plans ? formatCurrency(sub.plans.price_monthly) + "/mois" : ""}
                            </div>
                          </TableCell>
                          <TableCell>
                            {format(new Date(sub.created_at), "d MMM yyyy", { locale: fr })}
                          </TableCell>
                          <TableCell>
                            {sub.current_period_end
                              ? format(new Date(sub.current_period_end), "d MMM yyyy", { locale: fr })
                              : "—"}
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => handleAction(sub, "view")}>
                                  <Eye className="mr-2 h-4 w-4" />
                                  Voir détails
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleAction(sub, "change_plan")}>
                                  <UserCog className="mr-2 h-4 w-4" />
                                  Changer de forfait
                                </DropdownMenuItem>
                                {sub.status === "trial" && (
                                  <DropdownMenuItem onClick={() => handleAction(sub, "extend_trial")}>
                                    <Clock className="mr-2 h-4 w-4" />
                                    Prolonger essai (+7j)
                                  </DropdownMenuItem>
                                )}
                                {sub.status === "active" && (
                                  <DropdownMenuItem onClick={() => handleAction(sub, "pause")}>
                                    <Pause className="mr-2 h-4 w-4" />
                                    Mettre en pause
                                  </DropdownMenuItem>
                                )}
                                {sub.status === "cancelled" || sub.status === "paused" ? (
                                  <DropdownMenuItem onClick={() => handleAction(sub, "reactivate")}>
                                    <RefreshCw className="mr-2 h-4 w-4" />
                                    Réactiver
                                  </DropdownMenuItem>
                                ) : (
                                  <DropdownMenuItem
                                    onClick={() => handleAction(sub, "cancel")}
                                    className="text-destructive"
                                  >
                                    <Ban className="mr-2 h-4 w-4" />
                                    Annuler
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Action Dialog */}
          <Dialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {actionType === "cancel" && "Annuler l'abonnement"}
                  {actionType === "reactivate" && "Réactiver l'abonnement"}
                  {actionType === "pause" && "Mettre en pause"}
                  {actionType === "extend_trial" && "Prolonger l'essai"}
                  {actionType === "change_plan" && "Changer de forfait"}
                  {actionType === "view" && "Détails de l'abonnement"}
                </DialogTitle>
                <DialogDescription>
                  {actionType === "cancel" &&
                    "L'utilisateur perdra l'accès aux fonctionnalités premium."}
                  {actionType === "change_plan" && "Sélectionnez le nouveau forfait."}
                  {actionType === "extend_trial" && "L'essai sera prolongé de 7 jours."}
                </DialogDescription>
              </DialogHeader>

              {actionType === "view" && selectedSubscriber && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Nom</span>
                      <p className="font-medium">{selectedSubscriber.profiles?.display_name || "N/A"}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Statut</span>
                      <p><SubscriberStatusBadge status={selectedSubscriber.status} /></p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Forfait</span>
                      <p className="font-medium">{selectedSubscriber.plans?.name || "N/A"}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Cycle</span>
                      <p className="font-medium capitalize">{selectedSubscriber.billing_cycle}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Inscription</span>
                      <p className="font-medium">
                        {format(new Date(selectedSubscriber.created_at), "d MMMM yyyy", { locale: fr })}
                      </p>
                    </div>
                    {selectedSubscriber.trial_end_date && (
                      <div>
                        <span className="text-muted-foreground">Fin essai</span>
                        <p className="font-medium">
                          {format(new Date(selectedSubscriber.trial_end_date), "d MMMM yyyy", { locale: fr })}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {actionType === "change_plan" && (
                <Select value={newPlanId} onValueChange={setNewPlanId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un forfait" />
                  </SelectTrigger>
                  <SelectContent>
                    {plans.map((plan) => (
                      <SelectItem key={plan.id} value={plan.id}>
                        {plan.name} - {formatCurrency(plan.price_monthly)}/mois
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              <DialogFooter>
                <Button variant="outline" onClick={() => setActionDialogOpen(false)}>
                  {actionType === "view" ? "Fermer" : "Annuler"}
                </Button>
                {actionType !== "view" && (
                  <Button
                    onClick={executeAction}
                    variant={actionType === "cancel" ? "destructive" : "default"}
                  >
                    Confirmer
                  </Button>
                )}
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </AdminLayout>
    </AdminGuard>
  );
}
