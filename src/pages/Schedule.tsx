import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/landing/Footer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CalendarDays,
  Table as TableIcon,
  BarChart3,
  AlertTriangle,
  Clock,
  CheckCircle,
  Loader2,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useProjectSchedule } from "@/hooks/useProjectSchedule";
import { ScheduleTable } from "@/components/schedule/ScheduleTable";
import { ScheduleCalendar } from "@/components/schedule/ScheduleCalendar";
import { ScheduleGantt } from "@/components/schedule/ScheduleGantt";
import { AlertsPanel } from "@/components/schedule/AlertsPanel";
import { AddScheduleDialog } from "@/components/schedule/AddScheduleDialog";

const Schedule = () => {
  const { user, loading: authLoading } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const selectedProjectId = searchParams.get("project");
  const [activeTab, setActiveTab] = useState("table");

  // Fetch user projects
  const { data: projects, isLoading: projectsLoading } = useQuery({
    queryKey: ["user-projects", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("projects")
        .select("id, name, status")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Set first project as selected if none selected
  useEffect(() => {
    if (projects && projects.length > 0 && !selectedProjectId) {
      setSearchParams({ project: projects[0].id });
    }
  }, [projects, selectedProjectId, setSearchParams]);

  const {
    schedules,
    alerts,
    isLoading,
    createSchedule,
    updateSchedule,
    deleteSchedule,
    dismissAlert,
    generateAlerts,
    calculateEndDate,
    checkConflicts,
  } = useProjectSchedule(selectedProjectId);

  const conflicts = checkConflicts(schedules);

  // Stats
  const stats = {
    total: schedules.length,
    pending: schedules.filter((s) => s.status === "pending").length,
    inProgress: schedules.filter((s) => s.status === "in_progress").length,
    completed: schedules.filter((s) => s.status === "completed").length,
    conflicts: conflicts.length,
    alerts: alerts.length,
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    navigate("/auth");
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold">Échéancier</h1>
            <p className="text-muted-foreground">
              Planifiez et suivez les étapes de votre projet de construction
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Select
              value={selectedProjectId || ""}
              onValueChange={(value) => setSearchParams({ project: value })}
            >
              <SelectTrigger className="w-[250px]">
                <SelectValue placeholder="Sélectionner un projet" />
              </SelectTrigger>
              <SelectContent>
                {projects?.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedProjectId && (
              <AddScheduleDialog
                projectId={selectedProjectId}
                onAdd={(schedule) => {
                  createSchedule(schedule as any);
                }}
                calculateEndDate={calculateEndDate}
              />
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-sm text-muted-foreground">Étapes totales</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-muted-foreground" />
                <span className="text-2xl font-bold">{stats.pending}</span>
              </div>
              <p className="text-sm text-muted-foreground">En attente</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Loader2 className="h-5 w-5 text-primary" />
                <span className="text-2xl font-bold">{stats.inProgress}</span>
              </div>
              <p className="text-sm text-muted-foreground">En cours</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span className="text-2xl font-bold">{stats.completed}</span>
              </div>
              <p className="text-sm text-muted-foreground">Terminées</p>
            </CardContent>
          </Card>
          <Card className={conflicts.length > 0 ? "border-destructive" : ""}>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <AlertTriangle
                  className={`h-5 w-5 ${
                    conflicts.length > 0
                      ? "text-destructive"
                      : "text-muted-foreground"
                  }`}
                />
                <span className="text-2xl font-bold">{stats.conflicts}</span>
              </div>
              <p className="text-sm text-muted-foreground">Conflits</p>
            </CardContent>
          </Card>
          <Card className={alerts.length > 0 ? "border-orange-500" : ""}>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <CalendarDays
                  className={`h-5 w-5 ${
                    alerts.length > 0 ? "text-orange-500" : "text-muted-foreground"
                  }`}
                />
                <span className="text-2xl font-bold">{stats.alerts}</span>
              </div>
              <p className="text-sm text-muted-foreground">Alertes</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-4 gap-6">
          {/* Main content */}
          <div className="lg:col-span-3">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-4">
                <TabsTrigger value="table" className="flex items-center gap-2">
                  <TableIcon className="h-4 w-4" />
                  Tableau
                </TabsTrigger>
                <TabsTrigger
                  value="calendar"
                  className="flex items-center gap-2"
                >
                  <CalendarDays className="h-4 w-4" />
                  Calendrier
                </TabsTrigger>
                <TabsTrigger value="gantt" className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Gantt
                </TabsTrigger>
              </TabsList>

              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (
                <>
                  <TabsContent value="table">
                    <ScheduleTable
                      schedules={schedules}
                      onUpdate={(schedule) => {
                        updateSchedule(schedule);
                        // Régénérer les alertes après mise à jour
                        const fullSchedule = schedules.find(
                          (s) => s.id === schedule.id
                        );
                        if (fullSchedule) {
                          generateAlerts({ ...fullSchedule, ...schedule });
                        }
                      }}
                      onDelete={deleteSchedule}
                      conflicts={conflicts}
                      calculateEndDate={calculateEndDate}
                    />
                  </TabsContent>
                  <TabsContent value="calendar">
                    <ScheduleCalendar
                      schedules={schedules}
                      conflicts={conflicts}
                    />
                  </TabsContent>
                  <TabsContent value="gantt">
                    <ScheduleGantt schedules={schedules} conflicts={conflicts} />
                  </TabsContent>
                </>
              )}
            </Tabs>

            {/* Légende des conflits */}
            {conflicts.length > 0 && (
              <Card className="mt-4 border-destructive">
                <CardHeader className="py-3">
                  <CardTitle className="text-sm flex items-center gap-2 text-destructive">
                    <AlertTriangle className="h-4 w-4" />
                    Conflits détectés ({conflicts.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="py-2">
                  <div className="space-y-2">
                    {conflicts.slice(0, 5).map((conflict, index) => (
                      <div key={index} className="text-sm">
                        <span className="font-medium">{conflict.date}</span>:{" "}
                        {conflict.trades.join(", ")}
                      </div>
                    ))}
                    {conflicts.length > 5 && (
                      <p className="text-sm text-muted-foreground">
                        Et {conflicts.length - 5} autres conflits...
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Alerts panel */}
          <div className="lg:col-span-1">
            <AlertsPanel alerts={alerts} onDismiss={dismissAlert} />
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Schedule;
