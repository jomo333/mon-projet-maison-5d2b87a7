import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { AdminGuard } from "@/components/admin/AdminGuard";
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
import { Search, Download, CreditCard, ExternalLink } from "lucide-react";

interface Payment {
  id: string;
  user_id: string;
  amount: number;
  currency: string;
  status: string;
  payment_method: string | null;
  provider_id: string | null;
  invoice_url: string | null;
  created_at: string;
  profiles?: {
    display_name: string | null;
  } | null;
}

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  succeeded: { label: "Réussi", variant: "default" },
  pending: { label: "En attente", variant: "secondary" },
  failed: { label: "Échoué", variant: "destructive" },
  refunded: { label: "Remboursé", variant: "outline" },
};

export default function AdminPayments() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");
  const { toast } = useToast();

  useEffect(() => {
    fetchPayments();
  }, []);

  async function fetchPayments() {
    try {
      const { data, error } = await supabase
        .from("payments")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch profile info for each payment
      const paymentsWithProfiles = await Promise.all(
        (data || []).map(async (payment) => {
          if (!payment.user_id) return { ...payment, profiles: null };
          
          const { data: profile } = await supabase
            .from("profiles")
            .select("display_name")
            .eq("user_id", payment.user_id)
            .maybeSingle();
          
          return { ...payment, profiles: profile };
        })
      );

      setPayments(paymentsWithProfiles);
    } catch (error) {
      console.error("Error fetching payments:", error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de charger les paiements.",
      });
    } finally {
      setLoading(false);
    }
  }

  const getDateRange = (filter: string): Date | null => {
    const now = new Date();
    switch (filter) {
      case "7d":
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case "30d":
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      case "90d":
        return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      default:
        return null;
    }
  };

  const filteredPayments = payments.filter((payment) => {
    const matchesSearch =
      payment.profiles?.display_name?.toLowerCase().includes(search.toLowerCase()) ||
      payment.provider_id?.toLowerCase().includes(search.toLowerCase()) ||
      payment.id.toLowerCase().includes(search.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || payment.status === statusFilter;
    
    const dateRange = getDateRange(dateFilter);
    const matchesDate = !dateRange || new Date(payment.created_at) >= dateRange;
    
    return matchesSearch && matchesStatus && matchesDate;
  });

  const totalAmount = filteredPayments
    .filter((p) => p.status === "succeeded")
    .reduce((sum, p) => sum + Number(p.amount), 0);

  const exportCSV = () => {
    const headers = ["ID", "Date", "Client", "Montant", "Statut", "Méthode", "ID Transaction"];
    const rows = filteredPayments.map((p) => [
      p.id,
      format(new Date(p.created_at), "yyyy-MM-dd HH:mm"),
      p.profiles?.display_name || "N/A",
      `${p.amount} ${p.currency}`,
      p.status,
      p.payment_method || "N/A",
      p.provider_id || "N/A",
    ]);

    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `paiements-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
  };

  const formatCurrency = (value: number, currency: string = "CAD") => {
    return new Intl.NumberFormat("fr-CA", {
      style: "currency",
      currency,
    }).format(value);
  };

  return (
    <AdminGuard>
      <AdminLayout>
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Paiements</h1>
              <p className="text-muted-foreground mt-1">
                Historique des transactions et factures
              </p>
            </div>
            <Button onClick={exportCSV} variant="outline" className="gap-2">
              <Download className="h-4 w-4" />
              Exporter CSV
            </Button>
          </div>

          {/* Summary Card */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total des paiements réussis (filtré)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalAmount)}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {filteredPayments.filter((p) => p.status === "succeeded").length} transaction(s)
              </p>
            </CardContent>
          </Card>

          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Rechercher par client ou ID..."
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
                    <SelectItem value="succeeded">Réussi</SelectItem>
                    <SelectItem value="pending">En attente</SelectItem>
                    <SelectItem value="failed">Échoué</SelectItem>
                    <SelectItem value="refunded">Remboursé</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={dateFilter} onValueChange={setDateFilter}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Période" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes les dates</SelectItem>
                    <SelectItem value="7d">7 derniers jours</SelectItem>
                    <SelectItem value="30d">30 derniers jours</SelectItem>
                    <SelectItem value="90d">90 derniers jours</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                {filteredPayments.length} paiement{filteredPayments.length > 1 ? "s" : ""}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : filteredPayments.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Aucun paiement trouvé</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Client</TableHead>
                        <TableHead>Montant</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead>Méthode</TableHead>
                        <TableHead>ID Transaction</TableHead>
                        <TableHead className="text-right">Facture</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPayments.map((payment) => {
                        const status = statusConfig[payment.status] || {
                          label: payment.status,
                          variant: "outline" as const,
                        };
                        return (
                          <TableRow key={payment.id}>
                            <TableCell>
                              {format(new Date(payment.created_at), "d MMM yyyy", { locale: fr })}
                              <div className="text-xs text-muted-foreground">
                                {format(new Date(payment.created_at), "HH:mm")}
                              </div>
                            </TableCell>
                            <TableCell className="font-medium">
                              {payment.profiles?.display_name || "Utilisateur"}
                            </TableCell>
                            <TableCell className="font-medium">
                              {formatCurrency(payment.amount, payment.currency)}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={status.variant}
                                className={
                                  payment.status === "succeeded"
                                    ? "bg-green-100 text-green-800 hover:bg-green-100"
                                    : ""
                                }
                              >
                                {status.label}
                              </Badge>
                            </TableCell>
                            <TableCell className="capitalize">
                              {payment.payment_method || "—"}
                            </TableCell>
                            <TableCell className="font-mono text-xs">
                              {payment.provider_id
                                ? payment.provider_id.substring(0, 20) + "..."
                                : "—"}
                            </TableCell>
                            <TableCell className="text-right">
                              {payment.invoice_url ? (
                                <Button variant="ghost" size="sm" asChild>
                                  <a
                                    href={payment.invoice_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    <ExternalLink className="h-4 w-4" />
                                  </a>
                                </Button>
                              ) : (
                                "—"
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
