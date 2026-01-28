import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { AdminGuard } from "@/components/admin/AdminGuard";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Search, FileText, User, Settings, CreditCard, Package } from "lucide-react";

interface AuditLog {
  id: string;
  admin_id: string;
  action: string;
  target_user_id: string | null;
  target_table: string | null;
  target_id: string | null;
  details: Record<string, unknown>;
  ip_address: string | null;
  created_at: string;
  admin_profile?: {
    display_name: string | null;
  } | null;
}

const actionConfig: Record<string, { label: string; icon: typeof User; color: string }> = {
  subscription_cancelled: { label: "Abonnement annulé", icon: CreditCard, color: "text-red-600" },
  subscription_reactivated: { label: "Abonnement réactivé", icon: CreditCard, color: "text-green-600" },
  subscription_paused: { label: "Abonnement en pause", icon: CreditCard, color: "text-yellow-600" },
  trial_extended: { label: "Essai prolongé", icon: CreditCard, color: "text-blue-600" },
  plan_changed: { label: "Forfait modifié", icon: Package, color: "text-purple-600" },
  plan_created: { label: "Forfait créé", icon: Package, color: "text-green-600" },
  plan_updated: { label: "Forfait modifié", icon: Package, color: "text-blue-600" },
  plan_deleted: { label: "Forfait supprimé", icon: Package, color: "text-red-600" },
  settings_updated: { label: "Paramètres modifiés", icon: Settings, color: "text-gray-600" },
};

export default function AdminLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const { toast } = useToast();

  useEffect(() => {
    fetchLogs();
  }, []);

  async function fetchLogs() {
    try {
      const { data, error } = await supabase
        .from("admin_audit_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);

      if (error) throw error;

      // Fetch admin profiles
      const logsWithProfiles = await Promise.all(
        (data || []).map(async (log) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("display_name")
            .eq("user_id", log.admin_id)
            .maybeSingle();
          
          return { 
            ...log, 
            details: typeof log.details === "object" && log.details !== null 
              ? (log.details as Record<string, unknown>) 
              : {},
            admin_profile: profile 
          };
        })
      );

      setLogs(logsWithProfiles);
    } catch (error) {
      console.error("Error fetching logs:", error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de charger le journal d'activité.",
      });
    } finally {
      setLoading(false);
    }
  }

  const uniqueActions = [...new Set(logs.map((log) => log.action))];

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.admin_profile?.display_name?.toLowerCase().includes(search.toLowerCase()) ||
      log.action.toLowerCase().includes(search.toLowerCase()) ||
      log.target_id?.toLowerCase().includes(search.toLowerCase());
    
    const matchesAction = actionFilter === "all" || log.action === actionFilter;
    
    return matchesSearch && matchesAction;
  });

  const getActionDisplay = (action: string) => {
    const config = actionConfig[action];
    if (config) {
      return config;
    }
    return {
      label: action.replace(/_/g, " "),
      icon: FileText,
      color: "text-gray-600",
    };
  };

  return (
    <AdminGuard>
      <AdminLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Journal d'activité</h1>
            <p className="text-muted-foreground mt-1">
              Historique des actions administratives
            </p>
          </div>

          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Rechercher..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select value={actionFilter} onValueChange={setActionFilter}>
                  <SelectTrigger className="w-full sm:w-[220px]">
                    <SelectValue placeholder="Type d'action" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes les actions</SelectItem>
                    {uniqueActions.map((action) => (
                      <SelectItem key={action} value={action}>
                        {getActionDisplay(action).label}
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
                <FileText className="h-5 w-5" />
                {filteredLogs.length} entrée{filteredLogs.length > 1 ? "s" : ""}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  {[...Array(10)].map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : filteredLogs.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Aucune entrée dans le journal</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Admin</TableHead>
                        <TableHead>Action</TableHead>
                        <TableHead>Cible</TableHead>
                        <TableHead>Détails</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredLogs.map((log) => {
                        const actionDisplay = getActionDisplay(log.action);
                        const ActionIcon = actionDisplay.icon;
                        
                        return (
                          <TableRow key={log.id}>
                            <TableCell className="whitespace-nowrap">
                              {format(new Date(log.created_at), "d MMM yyyy", { locale: fr })}
                              <div className="text-xs text-muted-foreground">
                                {format(new Date(log.created_at), "HH:mm:ss")}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                                  <User className="h-4 w-4 text-primary" />
                                </div>
                                <span className="font-medium">
                                  {log.admin_profile?.display_name || "Admin"}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <ActionIcon className={`h-4 w-4 ${actionDisplay.color}`} />
                                <Badge variant="outline">{actionDisplay.label}</Badge>
                              </div>
                            </TableCell>
                            <TableCell>
                              {log.target_table && (
                                <div className="text-sm">
                                  <span className="text-muted-foreground">{log.target_table}</span>
                                  {log.target_id && (
                                    <div className="font-mono text-xs truncate max-w-[150px]">
                                      {log.target_id}
                                    </div>
                                  )}
                                </div>
                              )}
                              {log.target_user_id && !log.target_table && (
                                <div className="font-mono text-xs truncate max-w-[150px]">
                                  {log.target_user_id}
                                </div>
                              )}
                            </TableCell>
                            <TableCell>
                              {log.details && Object.keys(log.details).length > 0 && (
                                <pre className="text-xs bg-muted p-2 rounded max-w-[300px] overflow-x-auto">
                                  {JSON.stringify(log.details, null, 2).substring(0, 200)}
                                  {JSON.stringify(log.details).length > 200 && "..."}
                                </pre>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </AdminLayout>
    </AdminGuard>
  );
}
