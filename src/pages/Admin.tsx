import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { AdminGuard } from "@/components/admin/AdminGuard";
import { KPICard } from "@/components/admin/KPICard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, DollarSign, TrendingUp, Clock, AlertTriangle } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";

interface DashboardStats {
  totalSubscribers: number;
  activeSubscribers: number;
  trialSubscribers: number;
  newSubscribers7d: number;
  newSubscribers30d: number;
  mrr: number;
  totalRevenue: number;
  churnRate: number;
}

const COLORS = ["hsl(210, 60%, 25%)", "hsl(210, 55%, 45%)", "hsl(210, 40%, 65%)"];

export default function Admin() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [subscriptionsByPlan, setSubscriptionsByPlan] = useState<{ name: string; count: number }[]>([]);
  const [revenueByMonth, setRevenueByMonth] = useState<{ month: string; revenue: number }[]>([]);

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        // Fetch subscriptions with plans
        const { data: subscriptions, error: subError } = await supabase
          .from("subscriptions")
          .select("*, plans(name, price_monthly)");

        if (subError) throw subError;

        // Fetch payments
        const { data: payments, error: payError } = await supabase
          .from("payments")
          .select("*")
          .eq("status", "succeeded");

        if (payError) throw payError;

        const now = new Date();
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        const activeCount = subscriptions?.filter((s) => s.status === "active").length || 0;
        const trialCount = subscriptions?.filter((s) => s.status === "trial").length || 0;
        const cancelledCount = subscriptions?.filter((s) => s.status === "cancelled").length || 0;

        const newSubs7d = subscriptions?.filter(
          (s) => new Date(s.created_at) >= sevenDaysAgo
        ).length || 0;

        const newSubs30d = subscriptions?.filter(
          (s) => new Date(s.created_at) >= thirtyDaysAgo
        ).length || 0;

        // Calculate MRR from active subscriptions
        const mrr = subscriptions
          ?.filter((s) => s.status === "active")
          .reduce((sum, s) => {
            const plan = s.plans as { price_monthly: number } | null;
            return sum + (plan?.price_monthly || 0);
          }, 0) || 0;

        const totalRevenue = payments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;

        const churnRate = subscriptions && subscriptions.length > 0
          ? Math.round((cancelledCount / subscriptions.length) * 100)
          : 0;

        setStats({
          totalSubscribers: subscriptions?.length || 0,
          activeSubscribers: activeCount,
          trialSubscribers: trialCount,
          newSubscribers7d: newSubs7d,
          newSubscribers30d: newSubs30d,
          mrr,
          totalRevenue,
          churnRate,
        });

        // Group subscriptions by plan
        const planCounts: Record<string, number> = {};
        subscriptions?.forEach((s) => {
          const planName = (s.plans as { name: string } | null)?.name || "Sans forfait";
          planCounts[planName] = (planCounts[planName] || 0) + 1;
        });
        setSubscriptionsByPlan(
          Object.entries(planCounts).map(([name, count]) => ({ name, count }))
        );

        // Group payments by month
        const monthlyRevenue: Record<string, number> = {};
        payments?.forEach((p) => {
          const date = new Date(p.created_at);
          const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
          monthlyRevenue[monthKey] = (monthlyRevenue[monthKey] || 0) + Number(p.amount);
        });
        
        // Get last 6 months
        const months = [];
        for (let i = 5; i >= 0; i--) {
          const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
          const monthName = date.toLocaleDateString("fr-CA", { month: "short" });
          months.push({ month: monthName, revenue: monthlyRevenue[key] || 0 });
        }
        setRevenueByMonth(months);
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardData();
  }, []);

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
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Tableau de bord</h1>
            <p className="text-muted-foreground mt-1">Vue d'ensemble de votre activité</p>
          </div>

          {/* KPI Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {loading ? (
              <>
                {[...Array(4)].map((_, i) => (
                  <Card key={i}>
                    <CardHeader className="pb-2">
                      <Skeleton className="h-4 w-24" />
                    </CardHeader>
                    <CardContent>
                      <Skeleton className="h-8 w-16" />
                    </CardContent>
                  </Card>
                ))}
              </>
            ) : (
              <>
                <KPICard
                  title="Abonnés actifs"
                  value={stats?.activeSubscribers || 0}
                  description={`${stats?.trialSubscribers || 0} en essai`}
                  icon={<Users className="h-4 w-4" />}
                  trend={{ value: 12, label: "vs mois dernier" }}
                />
                <KPICard
                  title="Nouveaux (7j)"
                  value={stats?.newSubscribers7d || 0}
                  description={`${stats?.newSubscribers30d || 0} sur 30 jours`}
                  icon={<TrendingUp className="h-4 w-4" />}
                />
                <KPICard
                  title="Revenu mensuel (MRR)"
                  value={formatCurrency(stats?.mrr || 0)}
                  description={`Total: ${formatCurrency(stats?.totalRevenue || 0)}`}
                  icon={<DollarSign className="h-4 w-4" />}
                  trend={{ value: 8, label: "vs mois dernier" }}
                />
                <KPICard
                  title="Taux d'annulation"
                  value={`${stats?.churnRate || 0}%`}
                  description="Des abonnements annulés"
                  icon={<AlertTriangle className="h-4 w-4" />}
                  trend={{ value: -2, label: "vs mois dernier" }}
                />
              </>
            )}
          </div>

          {/* Charts */}
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Revenus par mois</CardTitle>
                <CardDescription>Évolution des revenus sur les 6 derniers mois</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-[300px] w-full" />
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={revenueByMonth}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="month" className="text-xs" />
                      <YAxis className="text-xs" tickFormatter={(v) => `${v}$`} />
                      <Tooltip
                        formatter={(value: number) => [formatCurrency(value), "Revenu"]}
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "var(--radius)",
                        }}
                      />
                      <Bar dataKey="revenue" fill="hsl(210, 60%, 25%)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Abonnements par forfait</CardTitle>
                <CardDescription>Répartition des abonnés par type de forfait</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-[300px] w-full" />
                ) : subscriptionsByPlan.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={subscriptionsByPlan}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={2}
                        dataKey="count"
                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                      >
                        {subscriptionsByPlan.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "var(--radius)",
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    Aucun abonnement
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Quick Stats */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Essais en cours
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.trialSubscribers || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Utilisateurs en période d'essai
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total abonnés
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.totalSubscribers || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Tous statuts confondus
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Revenu moyen par utilisateur
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats && stats.activeSubscribers > 0
                    ? formatCurrency(stats.mrr / stats.activeSubscribers)
                    : formatCurrency(0)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">ARPU mensuel</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </AdminLayout>
    </AdminGuard>
  );
}
