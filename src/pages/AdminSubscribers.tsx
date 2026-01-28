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
  Shield,
  ShieldOff,
} from "lucide-react";

interface UserWithSubscription {
  id: string; // profile id
  user_id: string;
  display_name: string | null;
  created_at: string;
  isAdmin: boolean;
  subscription: {
    id: string;
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
  } | null;
}

interface Plan {
  id: string;
  name: string;
  price_monthly: number;
}

export default function AdminSubscribers() {
  const [users, setUsers] = useState<UserWithSubscription[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [planFilter, setPlanFilter] = useState<string>("all");
  const [selectedUser, setSelectedUser] = useState<UserWithSubscription | null>(null);
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<string>("");
  const [newPlanId, setNewPlanId] = useState<string>("");
  const { logAdminAction } = useAdmin();
  const { toast } = useToast();

  useEffect(() => {
    fetchUsers();
    fetchPlans();
  }, []);

  async function fetchUsers() {
    try {
      // Fetch all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (profilesError) throw profilesError;

      // Fetch all subscriptions with plans
      const { data: subscriptions, error: subsError } = await supabase
        .from("subscriptions")
        .select(`
          *,
          plans (id, name, price_monthly)
        `);

      if (subsError) throw subsError;

      // Fetch all admin roles
      const { data: adminRoles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin");

      if (rolesError) throw rolesError;

      // Create sets/maps for quick lookup
      const subscriptionMap = new Map();
      (subscriptions || []).forEach((sub) => {
        subscriptionMap.set(sub.user_id, sub);
      });

      const adminUserIds = new Set((adminRoles || []).map((r) => r.user_id));

      // Combine profiles with their subscriptions and admin status
      const usersWithSubs: UserWithSubscription[] = (profiles || []).map((profile) => ({
        id: profile.id,
        user_id: profile.user_id,
        display_name: profile.display_name,
        created_at: profile.created_at,
        isAdmin: adminUserIds.has(profile.user_id),
        subscription: subscriptionMap.get(profile.user_id) || null,
      }));

      setUsers(usersWithSubs);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de charger les utilisateurs.",
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

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.display_name?.toLowerCase().includes(search.toLowerCase()) ||
      user.user_id.toLowerCase().includes(search.toLowerCase());
    
    const userStatus = user.subscription?.status || "free";
    const matchesStatus = statusFilter === "all" || userStatus === statusFilter;
    
    const userPlanId = user.subscription?.plans?.id || "free";
    const matchesPlan = planFilter === "all" || 
      (planFilter === "free" ? !user.subscription : userPlanId === planFilter);
    
    return matchesSearch && matchesStatus && matchesPlan;
  });

  const handleAction = (user: UserWithSubscription, action: string) => {
    setSelectedUser(user);
    setActionType(action);
    setNewPlanId(user.subscription?.plans?.id || "");
    setActionDialogOpen(true);
  };

  const executeAction = async () => {
    if (!selectedUser) return;

    try {
      // Handle admin role actions
      if (actionType === "make_admin") {
        const { error } = await supabase
          .from("user_roles")
          .insert({ user_id: selectedUser.user_id, role: "admin" });

        if (error) throw error;

        await logAdminAction(
          "admin_role_granted",
          selectedUser.user_id,
          "user_roles",
          undefined,
          { role: "admin" }
        );

        toast({
          title: "Rôle admin attribué",
          description: `${selectedUser.display_name || "L'utilisateur"} est maintenant administrateur.`,
        });

        fetchUsers();
        setActionDialogOpen(false);
        setSelectedUser(null);
        return;
      }

      if (actionType === "remove_admin") {
        const { error } = await supabase
          .from("user_roles")
          .delete()
          .eq("user_id", selectedUser.user_id)
          .eq("role", "admin");

        if (error) throw error;

        await logAdminAction(
          "admin_role_revoked",
          selectedUser.user_id,
          "user_roles",
          undefined,
          { role: "admin" }
        );

        toast({
          title: "Rôle admin retiré",
          description: `${selectedUser.display_name || "L'utilisateur"} n'est plus administrateur.`,
        });

        fetchUsers();
        setActionDialogOpen(false);
        setSelectedUser(null);
        return;
      }

      // Handle assign/change plan for users WITHOUT subscription
      if (actionType === "assign_plan" && !selectedUser.subscription && newPlanId) {
        const { error } = await supabase
          .from("subscriptions")
          .insert({
            user_id: selectedUser.user_id,
            plan_id: newPlanId,
            status: "active",
            billing_cycle: "monthly",
            start_date: new Date().toISOString(),
            current_period_start: new Date().toISOString(),
            current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          });

        if (error) throw error;

        await logAdminAction(
          "subscription_created",
          selectedUser.user_id,
          "subscriptions",
          undefined,
          { plan_id: newPlanId, reason: "admin_manual_assignment" }
        );

        toast({
          title: "Forfait assigné",
          description: `${selectedUser.display_name || "L'utilisateur"} a maintenant accès au forfait.`,
        });

        fetchUsers();
        setActionDialogOpen(false);
        setSelectedUser(null);
        return;
      }

      // Handle subscription actions (require subscription)
      if (!selectedUser.subscription) return;

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
          updateData = { plan_id: newPlanId, status: "active" };
          logAction = "plan_changed";
          break;
      }

      const { error } = await supabase
        .from("subscriptions")
        .update(updateData)
        .eq("id", selectedUser.subscription.id);

      if (error) throw error;

      await logAdminAction(
        logAction,
        selectedUser.user_id,
        "subscriptions",
        selectedUser.subscription.id,
        { previous_status: selectedUser.subscription.status, ...updateData }
      );

      toast({
        title: "Action effectuée",
        description: "L'abonnement a été mis à jour avec succès.",
      });

      fetchUsers();
    } catch (error) {
      console.error("Error executing action:", error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Une erreur est survenue.",
      });
    } finally {
      setActionDialogOpen(false);
      setSelectedUser(null);
    }
  };

  const exportCSV = () => {
    const headers = ["ID Utilisateur", "Nom", "Statut", "Forfait", "Date inscription", "Prochaine facturation"];
    const rows = filteredUsers.map((user) => [
      user.user_id,
      user.display_name || "N/A",
      user.subscription?.status || "Gratuit",
      user.subscription?.plans?.name || "Gratuit",
      format(new Date(user.created_at), "yyyy-MM-dd"),
      user.subscription?.current_period_end 
        ? format(new Date(user.subscription.current_period_end), "yyyy-MM-dd") 
        : "N/A",
    ]);

    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `utilisateurs-${format(new Date(), "yyyy-MM-dd")}.csv`;
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
              <h1 className="text-3xl font-bold tracking-tight">Utilisateurs</h1>
              <p className="text-muted-foreground mt-1">
                Tous les comptes avec leur forfait
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
                    <SelectItem value="free">Gratuit</SelectItem>
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
                    <SelectItem value="free">Gratuit</SelectItem>
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
                {filteredUsers.length} utilisateur{filteredUsers.length > 1 ? "s" : ""}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Aucun utilisateur trouvé</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nom</TableHead>
                        <TableHead>Admin</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead>Forfait</TableHead>
                        <TableHead>Inscription</TableHead>
                        <TableHead>Prochaine fact.</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell className="font-medium">
                            {user.display_name || "Utilisateur"}
                            <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                              {user.user_id}
                            </div>
                          </TableCell>
                          <TableCell>
                            {user.isAdmin ? (
                              <span className="inline-flex items-center gap-1 text-xs font-medium text-primary">
                                <Shield className="h-3.5 w-3.5" />
                                Admin
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <SubscriberStatusBadge status={user.subscription?.status || "free"} />
                          </TableCell>
                          <TableCell>
                            {user.subscription?.plans?.name || "Gratuit"}
                            <div className="text-xs text-muted-foreground">
                              {user.subscription?.plans 
                                ? formatCurrency(user.subscription.plans.price_monthly) + "/mois" 
                                : "0 $/mois"}
                            </div>
                          </TableCell>
                          <TableCell>
                            {format(new Date(user.created_at), "d MMM yyyy", { locale: fr })}
                          </TableCell>
                          <TableCell>
                            {user.subscription?.current_period_end
                              ? format(new Date(user.subscription.current_period_end), "d MMM yyyy", { locale: fr })
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
                                <DropdownMenuItem onClick={() => handleAction(user, "view")}>
                                  <Eye className="mr-2 h-4 w-4" />
                                  Voir détails
                                </DropdownMenuItem>
                                {user.isAdmin ? (
                                  <DropdownMenuItem 
                                    onClick={() => handleAction(user, "remove_admin")}
                                    className="text-destructive"
                                  >
                                    <ShieldOff className="mr-2 h-4 w-4" />
                                    Retirer admin
                                  </DropdownMenuItem>
                                ) : (
                                  <DropdownMenuItem onClick={() => handleAction(user, "make_admin")}>
                                    <Shield className="mr-2 h-4 w-4" />
                                    Rendre admin
                                  </DropdownMenuItem>
                                )}
                                {user.subscription ? (
                                  <>
                                    <DropdownMenuItem onClick={() => handleAction(user, "change_plan")}>
                                      <UserCog className="mr-2 h-4 w-4" />
                                      Changer de forfait
                                    </DropdownMenuItem>
                                    {user.subscription.status === "trial" && (
                                      <DropdownMenuItem onClick={() => handleAction(user, "extend_trial")}>
                                        <Clock className="mr-2 h-4 w-4" />
                                        Prolonger essai (+7j)
                                      </DropdownMenuItem>
                                    )}
                                    {user.subscription.status === "active" && (
                                      <DropdownMenuItem onClick={() => handleAction(user, "pause")}>
                                        <Pause className="mr-2 h-4 w-4" />
                                        Mettre en pause
                                      </DropdownMenuItem>
                                    )}
                                    {user.subscription.status === "cancelled" || user.subscription.status === "paused" ? (
                                      <DropdownMenuItem onClick={() => handleAction(user, "reactivate")}>
                                        <RefreshCw className="mr-2 h-4 w-4" />
                                        Réactiver
                                      </DropdownMenuItem>
                                    ) : (
                                      <DropdownMenuItem
                                        onClick={() => handleAction(user, "cancel")}
                                        className="text-destructive"
                                      >
                                        <Ban className="mr-2 h-4 w-4" />
                                        Annuler
                                      </DropdownMenuItem>
                                    )}
                                  </>
                                ) : (
                                  <DropdownMenuItem onClick={() => handleAction(user, "assign_plan")}>
                                    <UserCog className="mr-2 h-4 w-4" />
                                    Assigner un forfait
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
                  {actionType === "assign_plan" && "Assigner un forfait"}
                  {actionType === "view" && "Détails de l'utilisateur"}
                  {actionType === "make_admin" && "Rendre administrateur"}
                  {actionType === "remove_admin" && "Retirer le rôle admin"}
                </DialogTitle>
                <DialogDescription>
                  {actionType === "cancel" &&
                    "L'utilisateur perdra l'accès aux fonctionnalités premium."}
                  {actionType === "change_plan" && "Sélectionnez le nouveau forfait."}
                  {actionType === "assign_plan" && "Sélectionnez le forfait à assigner à cet utilisateur (pour testeur)."}
                  {actionType === "extend_trial" && "L'essai sera prolongé de 7 jours."}
                  {actionType === "make_admin" && 
                    "Cet utilisateur aura accès à toutes les fonctionnalités d'administration."}
                  {actionType === "remove_admin" && 
                    "Cet utilisateur n'aura plus accès aux fonctionnalités d'administration."}
                </DialogDescription>
              </DialogHeader>

              {actionType === "view" && selectedUser && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Nom</span>
                      <p className="font-medium">{selectedUser.display_name || "N/A"}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Statut</span>
                      <p><SubscriberStatusBadge status={selectedUser.subscription?.status || "free"} /></p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Forfait</span>
                      <p className="font-medium">{selectedUser.subscription?.plans?.name || "Gratuit"}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Cycle</span>
                      <p className="font-medium capitalize">{selectedUser.subscription?.billing_cycle || "N/A"}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Inscription</span>
                      <p className="font-medium">
                        {format(new Date(selectedUser.created_at), "d MMMM yyyy", { locale: fr })}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">ID Utilisateur</span>
                      <p className="font-medium text-xs truncate">{selectedUser.user_id}</p>
                    </div>
                    {selectedUser.subscription?.trial_end_date && (
                      <div>
                        <span className="text-muted-foreground">Fin essai</span>
                        <p className="font-medium">
                          {format(new Date(selectedUser.subscription.trial_end_date), "d MMMM yyyy", { locale: fr })}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {(actionType === "change_plan" || actionType === "assign_plan") && (
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
                {actionType !== "view" && (actionType === "make_admin" || actionType === "remove_admin" || actionType === "assign_plan" || selectedUser?.subscription) && (
                  <Button
                    onClick={executeAction}
                    variant={actionType === "cancel" || actionType === "remove_admin" ? "destructive" : "default"}
                    disabled={(actionType === "assign_plan" || actionType === "change_plan") && !newPlanId}
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
