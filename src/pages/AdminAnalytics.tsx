import { useState, useEffect, useMemo } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { AdminGuard } from "@/components/admin/AdminGuard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { format, formatDistanceToNow, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { fr } from "date-fns/locale";
import { 
  BarChart3, 
  Bug, 
  Clock, 
  Users, 
  Brain, 
  Search,
  CheckCircle,
  XCircle,
  AlertTriangle,
  FileText,
  FileSearch,
  Hammer,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";

interface UserSessionStats {
  user_id: string;
  email: string;
  display_name: string | null;
  last_session_at: string | null;
  total_sessions: number;
  total_time_seconds: number;
  avg_session_seconds: number;
  time_to_first_project_seconds: number | null;
  first_project_at: string | null;
}

interface BugReport {
  id: string;
  user_id: string | null;
  type: string;
  source: string;
  description: string | null;
  page_path: string | null;
  metadata: unknown;
  resolved: boolean;
  admin_notes: string | null;
  created_at: string;
  user_email?: string | null;
  user_display_name?: string | null;
}

interface AIUsageStats {
  user_id: string;
  email: string;
  display_name: string | null;
  total_analyses: number;
  this_month_analyses: number;
  plan_count: number;
  soumissions_count: number;
  diy_count: number;
  building_code_count: number;
  chat_count: number;
}

interface AIAnalysisTypeBreakdown {
  analysis_type: string;
  count: number;
}

export default function AdminAnalytics() {
  const [loading, setLoading] = useState(true);
  const [sessionStats, setSessionStats] = useState<UserSessionStats[]>([]);
  const [bugReports, setBugReports] = useState<BugReport[]>([]);
  const [aiUsageStats, setAiUsageStats] = useState<AIUsageStats[]>([]);
  const [aiTypeBreakdown, setAiTypeBreakdown] = useState<AIAnalysisTypeBreakdown[]>([]);
  
  // Filters
  const [bugFilter, setBugFilter] = useState<string>("all");
  const [bugSourceFilter, setBugSourceFilter] = useState<string>("all");
  const [aiMonthFilter, setAiMonthFilter] = useState<string>("current");
  const [searchQuery, setSearchQuery] = useState<string>("");
  
  // Dialog state
  const [selectedBug, setSelectedBug] = useState<BugReport | null>(null);
  const [adminNotes, setAdminNotes] = useState<string>("");

  useEffect(() => {
    fetchAllData();
  }, [aiMonthFilter]);

  const fetchAllData = async () => {
    setLoading(true);
    await Promise.all([
      fetchSessionStats(),
      fetchBugReports(),
      fetchAIUsageStats(),
    ]);
    setLoading(false);
  };

  const fetchSessionStats = async () => {
    try {
      // Get all users with their session data
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("user_id, display_name");

      if (profilesError) throw profilesError;

      const { data: sessions, error: sessionsError } = await supabase
        .from("user_sessions")
        .select("*")
        .order("session_start", { ascending: false });

      if (sessionsError) throw sessionsError;

      const { data: aggregated, error: aggError } = await supabase
        .from("user_analytics_aggregated")
        .select("*");

      if (aggError && aggError.code !== "PGRST116") {
        console.error("Error fetching aggregated stats:", aggError);
      }

      // Get auth users emails - we need to map by user_id
      // We'll use profiles as the base and build stats from sessions
      const userMap = new Map<string, UserSessionStats>();

      for (const profile of profiles || []) {
        const userSessions = (sessions || []).filter(s => s.user_id === profile.user_id);
        const totalSessions = userSessions.length;
        const totalTime = userSessions.reduce((acc, s) => acc + (s.duration_seconds || 0), 0);
        const lastSession = userSessions[0];
        const agg = (aggregated || []).find(a => a.user_id === profile.user_id);

        userMap.set(profile.user_id, {
          user_id: profile.user_id,
          email: profile.display_name || profile.user_id,
          display_name: profile.display_name,
          last_session_at: lastSession?.session_start || null,
          total_sessions: totalSessions,
          total_time_seconds: totalTime,
          avg_session_seconds: totalSessions > 0 ? Math.floor(totalTime / totalSessions) : 0,
          time_to_first_project_seconds: agg?.time_to_first_project_seconds || null,
          first_project_at: agg?.first_project_at || null,
        });
      }

      setSessionStats(Array.from(userMap.values()).sort((a, b) => {
        if (!a.last_session_at) return 1;
        if (!b.last_session_at) return -1;
        return new Date(b.last_session_at).getTime() - new Date(a.last_session_at).getTime();
      }));
    } catch (error) {
      console.error("Error fetching session stats:", error);
      toast.error("Erreur lors du chargement des statistiques de session");
    }
  };

  const fetchBugReports = async () => {
    try {
      const { data, error } = await supabase
        .from("bug_reports")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch user profiles for bugs with user_id
      const userIds = [...new Set((data || []).filter(b => b.user_id).map(b => b.user_id))];
      let profilesMap = new Map<string, { display_name: string | null }>();
      
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, display_name")
          .in("user_id", userIds);
        
        if (profiles) {
          profiles.forEach(p => profilesMap.set(p.user_id, { display_name: p.display_name }));
        }
      }

      // Enrich bug reports with user info
      const enrichedBugs = (data || []).map(bug => ({
        ...bug,
        user_display_name: bug.user_id ? profilesMap.get(bug.user_id)?.display_name : null,
      }));

      setBugReports(enrichedBugs);
    } catch (error) {
      console.error("Error fetching bug reports:", error);
      toast.error("Erreur lors du chargement des rapports de bugs");
    }
  };

  const fetchAIUsageStats = async () => {
    try {
      // Determine date range based on filter
      let startDate: Date;
      let endDate: Date;
      
      if (aiMonthFilter === "current") {
        startDate = startOfMonth(new Date());
        endDate = endOfMonth(new Date());
      } else if (aiMonthFilter === "last") {
        startDate = startOfMonth(subMonths(new Date(), 1));
        endDate = endOfMonth(subMonths(new Date(), 1));
      } else {
        // All time - set a very old start date
        startDate = new Date("2020-01-01");
        endDate = new Date();
      }

      const { data: usage, error: usageError } = await supabase
        .from("ai_analysis_usage")
        .select("*")
        .gte("created_at", startDate.toISOString())
        .lte("created_at", endDate.toISOString());

      if (usageError) throw usageError;

      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("user_id, display_name");

      if (profilesError) throw profilesError;

      // Build user stats
      const userMap = new Map<string, AIUsageStats>();

      for (const profile of profiles || []) {
        const userUsage = (usage || []).filter(u => u.user_id === profile.user_id);
        
        const stats: AIUsageStats = {
          user_id: profile.user_id,
          email: profile.display_name || profile.user_id,
          display_name: profile.display_name,
          total_analyses: userUsage.length,
          this_month_analyses: userUsage.length,
          plan_count: userUsage.filter(u => u.analysis_type === "analyze-plan").length,
          soumissions_count: userUsage.filter(u => u.analysis_type === "analyze-soumissions").length,
          diy_count: userUsage.filter(u => u.analysis_type === "analyze-diy-materials").length,
          building_code_count: userUsage.filter(u => u.analysis_type === "search-building-code").length,
          chat_count: userUsage.filter(u => u.analysis_type === "chat-assistant").length,
        };

        if (stats.total_analyses > 0) {
          userMap.set(profile.user_id, stats);
        }
      }

      setAiUsageStats(Array.from(userMap.values()).sort((a, b) => b.total_analyses - a.total_analyses));

      // Calculate type breakdown
      const typeCount = new Map<string, number>();
      for (const u of usage || []) {
        typeCount.set(u.analysis_type, (typeCount.get(u.analysis_type) || 0) + 1);
      }

      setAiTypeBreakdown(Array.from(typeCount.entries()).map(([type, count]) => ({
        analysis_type: type,
        count,
      })).sort((a, b) => b.count - a.count));

    } catch (error) {
      console.error("Error fetching AI usage stats:", error);
      toast.error("Erreur lors du chargement des statistiques IA");
    }
  };

  const handleToggleResolved = async (bugId: string, currentResolved: boolean) => {
    try {
      const { error } = await supabase
        .from("bug_reports")
        .update({ resolved: !currentResolved })
        .eq("id", bugId);

      if (error) throw error;
      
      setBugReports(prev => prev.map(b => 
        b.id === bugId ? { ...b, resolved: !currentResolved } : b
      ));
      toast.success(currentResolved ? "Bug marqué comme non résolu" : "Bug marqué comme résolu");
    } catch (error) {
      console.error("Error updating bug status:", error);
      toast.error("Erreur lors de la mise à jour");
    }
  };

  const handleSaveAdminNotes = async () => {
    if (!selectedBug) return;
    
    try {
      const { error } = await supabase
        .from("bug_reports")
        .update({ admin_notes: adminNotes })
        .eq("id", selectedBug.id);

      if (error) throw error;
      
      setBugReports(prev => prev.map(b => 
        b.id === selectedBug.id ? { ...b, admin_notes: adminNotes } : b
      ));
      setSelectedBug(null);
      toast.success("Notes sauvegardées");
    } catch (error) {
      console.error("Error saving admin notes:", error);
      toast.error("Erreur lors de la sauvegarde");
    }
  };

  const formatDuration = (seconds: number): string => {
    if (!seconds || seconds < 60) return `${seconds || 0}s`;
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      const remainingHours = hours % 24;
      return `${days}j ${remainingHours}h`;
    }
    if (hours > 0) return `${hours}h ${minutes}min`;
    return `${minutes}min`;
  };

  const getAnalysisTypeLabel = (type: string): string => {
    const labels: Record<string, string> = {
      "analyze-plan": "Plans",
      "analyze-soumissions": "Soumissions",
      "analyze-diy-materials": "DIY Matériaux",
      "search-building-code": "Code bâtiment",
      "chat-assistant": "Assistant",
    };
    return labels[type] || type;
  };

  const getAnalysisTypeIcon = (type: string) => {
    const icons: Record<string, React.ReactNode> = {
      "analyze-plan": <FileText className="h-4 w-4" />,
      "analyze-soumissions": <FileSearch className="h-4 w-4" />,
      "analyze-diy-materials": <Hammer className="h-4 w-4" />,
      "search-building-code": <Search className="h-4 w-4" />,
      "chat-assistant": <Brain className="h-4 w-4" />,
    };
    return icons[type] || <Brain className="h-4 w-4" />;
  };

  const filteredBugReports = useMemo(() => {
    return bugReports.filter(bug => {
      if (bugFilter === "resolved" && !bug.resolved) return false;
      if (bugFilter === "unresolved" && bug.resolved) return false;
      if (bugSourceFilter !== "all" && bug.source !== bugSourceFilter) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          bug.description?.toLowerCase().includes(query) ||
          bug.page_path?.toLowerCase().includes(query) ||
          bug.source.toLowerCase().includes(query)
        );
      }
      return true;
    });
  }, [bugReports, bugFilter, bugSourceFilter, searchQuery]);

  // Calculate summary stats
  const totalUsers = sessionStats.length;
  const activeUsers = sessionStats.filter(s => {
    if (!s.last_session_at) return false;
    const daysSinceLastSession = (Date.now() - new Date(s.last_session_at).getTime()) / (1000 * 60 * 60 * 24);
    return daysSinceLastSession < 7;
  }).length;
  const totalAIAnalyses = aiUsageStats.reduce((acc, s) => acc + s.total_analyses, 0);
  const unresolvedBugs = bugReports.filter(b => !b.resolved).length;

  return (
    <AdminGuard>
      <AdminLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Analyses & Bugs</h1>
              <p className="text-muted-foreground">
                Suivi de l'utilisation, sessions et rapports de bugs
              </p>
            </div>
            <Button onClick={fetchAllData} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Actualiser
            </Button>
          </div>

          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Utilisateurs actifs</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{activeUsers}</div>
                <p className="text-xs text-muted-foreground">sur {totalUsers} total (7 derniers jours)</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Analyses IA</CardTitle>
                <Brain className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalAIAnalyses}</div>
                <p className="text-xs text-muted-foreground">
                  {aiMonthFilter === "current" ? "ce mois" : aiMonthFilter === "last" ? "mois dernier" : "total"}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Bugs non résolus</CardTitle>
                <Bug className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-destructive">{unresolvedBugs}</div>
                <p className="text-xs text-muted-foreground">sur {bugReports.length} total</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Temps moyen session</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatDuration(
                    sessionStats.length > 0
                      ? Math.floor(sessionStats.reduce((acc, s) => acc + s.avg_session_seconds, 0) / sessionStats.length)
                      : 0
                  )}
                </div>
                <p className="text-xs text-muted-foreground">moyenne par utilisateur</p>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="sessions" className="space-y-4">
            <TabsList>
              <TabsTrigger value="sessions" className="gap-2">
                <Users className="h-4 w-4" />
                Sessions
              </TabsTrigger>
              <TabsTrigger value="bugs" className="gap-2">
                <Bug className="h-4 w-4" />
                Bugs ({unresolvedBugs})
              </TabsTrigger>
              <TabsTrigger value="ai" className="gap-2">
                <Brain className="h-4 w-4" />
                Analyses IA
              </TabsTrigger>
            </TabsList>

            {/* Sessions Tab */}
            <TabsContent value="sessions" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Sessions utilisateurs</CardTitle>
                  <CardDescription>
                    Historique des connexions, temps passé et métriques d'engagement
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <p className="text-muted-foreground">Chargement...</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Utilisateur</TableHead>
                          <TableHead>Dernière connexion</TableHead>
                          <TableHead className="text-right">Sessions</TableHead>
                          <TableHead className="text-right">Temps total</TableHead>
                          <TableHead className="text-right">Temps moyen</TableHead>
                          <TableHead className="text-right">Temps → 1er projet</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sessionStats.map((user) => (
                          <TableRow key={user.user_id}>
                            <TableCell className="font-medium">
                              {user.display_name || user.email}
                            </TableCell>
                            <TableCell>
                              {user.last_session_at ? (
                                <span title={format(new Date(user.last_session_at), "PPpp", { locale: fr })}>
                                  {formatDistanceToNow(new Date(user.last_session_at), { addSuffix: true, locale: fr })}
                                </span>
                              ) : (
                                <span className="text-muted-foreground">Jamais</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">{user.total_sessions}</TableCell>
                            <TableCell className="text-right">{formatDuration(user.total_time_seconds)}</TableCell>
                            <TableCell className="text-right">{formatDuration(user.avg_session_seconds)}</TableCell>
                            <TableCell className="text-right">
                              {user.time_to_first_project_seconds !== null ? (
                                formatDuration(user.time_to_first_project_seconds)
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Bugs Tab */}
            <TabsContent value="bugs" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Rapports de bugs</CardTitle>
                  <CardDescription>
                    Bugs détectés automatiquement et signalés par les utilisateurs
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Filters */}
                  <div className="flex gap-4 flex-wrap">
                    <Select value={bugFilter} onValueChange={setBugFilter}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Statut" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tous</SelectItem>
                        <SelectItem value="unresolved">Non résolus</SelectItem>
                        <SelectItem value="resolved">Résolus</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={bugSourceFilter} onValueChange={setBugSourceFilter}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Source" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Toutes sources</SelectItem>
                        <SelectItem value="repeated_clicks">Clics répétés</SelectItem>
                        <SelectItem value="error">Erreur</SelectItem>
                        <SelectItem value="user_report">Signalement</SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="relative flex-1 min-w-[200px]">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Rechercher..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                  </div>

                  {loading ? (
                    <p className="text-muted-foreground">Chargement...</p>
                  ) : filteredBugReports.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">Aucun bug trouvé</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Utilisateur</TableHead>
                          <TableHead>Source</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead>Page</TableHead>
                          <TableHead>Statut</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredBugReports.map((bug) => (
                          <TableRow key={bug.id}>
                            <TableCell className="whitespace-nowrap">
                              {format(new Date(bug.created_at), "dd/MM/yy HH:mm")}
                            </TableCell>
                            <TableCell className="text-sm">
                              {bug.user_display_name || bug.user_id?.slice(0, 8) || "—"}
                            </TableCell>
                            <TableCell>
                              <Badge 
                                variant={
                                  bug.source === "repeated_clicks" 
                                    ? "destructive" 
                                    : bug.source === "user_report" 
                                      ? "default" 
                                      : "secondary"
                                }
                              >
                                {bug.source === "repeated_clicks" && <AlertTriangle className="h-3 w-3 mr-1" />}
                                {bug.source === "user_report" ? "Utilisateur" : bug.source}
                              </Badge>
                            </TableCell>
                            <TableCell className="max-w-[300px] truncate">
                              {bug.description || "—"}
                            </TableCell>
                            <TableCell className="text-muted-foreground text-sm">
                              {bug.page_path || "—"}
                            </TableCell>
                            <TableCell>
                              {bug.resolved ? (
                                <Badge variant="outline" className="text-green-600">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Résolu
                                </Badge>
                              ) : (
                                <Badge variant="destructive">
                                  <XCircle className="h-3 w-3 mr-1" />
                                  Non résolu
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex gap-2 justify-end">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleToggleResolved(bug.id, bug.resolved)}
                                >
                                              {bug.resolved ? "Rouvrir" : "Résoudre"}
                                            </Button>
                                            <Dialog>
                                  <DialogTrigger asChild>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => {
                                        setSelectedBug(bug);
                                        setAdminNotes(bug.admin_notes || "");
                                      }}
                                    >
                                      Notes
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent>
                                    <DialogHeader>
                                      <DialogTitle>Notes admin</DialogTitle>
                                    </DialogHeader>
                                    <div className="space-y-4">
                                      <div className="bg-muted p-3 rounded-lg text-sm">
                                        <p className="font-medium">Description:</p>
                                        <p>{bug.description}</p>
                                        <p className="font-medium mt-2">Métadonnées:</p>
                                        <pre className="text-xs overflow-auto max-h-32">
                                          {JSON.stringify(bug.metadata, null, 2)}
                                        </pre>
                                      </div>
                                      <Textarea
                                        placeholder="Notes sur ce bug..."
                                        value={adminNotes}
                                        onChange={(e) => setAdminNotes(e.target.value)}
                                        rows={4}
                                      />
                                      <Button onClick={handleSaveAdminNotes}>
                                        Sauvegarder
                                      </Button>
                                    </div>
                                  </DialogContent>
                                </Dialog>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* AI Usage Tab */}
            <TabsContent value="ai" className="space-y-4">
              {/* Type breakdown cards */}
              <div className="grid gap-4 md:grid-cols-5">
                {aiTypeBreakdown.map((type) => (
                  <Card key={type.analysis_type}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">
                        {getAnalysisTypeLabel(type.analysis_type)}
                      </CardTitle>
                      {getAnalysisTypeIcon(type.analysis_type)}
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{type.count}</div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Utilisation des analyses IA</CardTitle>
                      <CardDescription>
                        Répartition par utilisateur et type d'analyse
                      </CardDescription>
                    </div>
                    <Select value={aiMonthFilter} onValueChange={setAiMonthFilter}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Période" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="current">Ce mois</SelectItem>
                        <SelectItem value="last">Mois dernier</SelectItem>
                        <SelectItem value="all">Tout temps</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <p className="text-muted-foreground">Chargement...</p>
                  ) : aiUsageStats.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">Aucune analyse pour cette période</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Utilisateur</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                          <TableHead className="text-right">Plans</TableHead>
                          <TableHead className="text-right">Soumissions</TableHead>
                          <TableHead className="text-right">DIY</TableHead>
                          <TableHead className="text-right">Code bât.</TableHead>
                          <TableHead className="text-right">Chat</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {aiUsageStats.map((user) => (
                          <TableRow key={user.user_id}>
                            <TableCell className="font-medium">
                              {user.display_name || user.email}
                            </TableCell>
                            <TableCell className="text-right font-bold">{user.total_analyses}</TableCell>
                            <TableCell className="text-right">{user.plan_count || "—"}</TableCell>
                            <TableCell className="text-right">{user.soumissions_count || "—"}</TableCell>
                            <TableCell className="text-right">{user.diy_count || "—"}</TableCell>
                            <TableCell className="text-right">{user.building_code_count || "—"}</TableCell>
                            <TableCell className="text-right">{user.chat_count || "—"}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </AdminLayout>
    </AdminGuard>
  );
}
