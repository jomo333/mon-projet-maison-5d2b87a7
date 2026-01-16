import { useState, useEffect, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { format, parseISO, differenceInCalendarDays } from "date-fns";
import { fr } from "date-fns/locale";
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
  Calendar,
  Flag,
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
  const [activeTab, setActiveTab] = useState("gantt");

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
    completeStep,
    updateScheduleAndRecalculate,
  } = useProjectSchedule(selectedProjectId);

  const conflicts = checkConflicts(schedules);

  // Calculer les dates de début et fin du projet basées sur l'échéancier
  const projectDates = useMemo(() => {
    const schedulesWithDates = schedules.filter((s) => s.start_date && s.end_date);
    if (schedulesWithDates.length === 0) return null;

    const startDates = schedulesWithDates.map((s) => parseISO(s.start_date!));
    const endDates = schedulesWithDates.map((s) => parseISO(s.end_date!));

    const projectStart = new Date(Math.min(...startDates.map((d) => d.getTime())));
    const projectEnd = new Date(Math.max(...endDates.map((d) => d.getTime())));
    const totalDays = differenceInCalendarDays(projectEnd, projectStart) + 1;

    return {
      start: projectStart,
      end: projectEnd,
      totalDays,
    };
  }, [schedules]);

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
      
      {/* Barre d'onglets rapide sticky */}
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-6">
              <h1 className="text-xl font-bold hidden md:block">Échéancier</h1>
              
              {/* Onglets rapides */}
              <div className="flex items-center gap-1 bg-muted p-1 rounded-lg">
                <button
                  onClick={() => setActiveTab("table")}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeTab === "table"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <TableIcon className="h-4 w-4" />
                  <span className="hidden sm:inline">Tableau</span>
                </button>
                <button
                  onClick={() => setActiveTab("calendar")}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeTab === "calendar"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <CalendarDays className="h-4 w-4" />
                  <span className="hidden sm:inline">Calendrier</span>
                </button>
                <button
                  onClick={() => setActiveTab("gantt")}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeTab === "gantt"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <BarChart3 className="h-4 w-4" />
                  <span className="hidden sm:inline">Gantt</span>
                </button>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Indicateurs rapides */}
              {conflicts.length > 0 && (
                <Badge variant="destructive" className="flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  {conflicts.length} conflit{conflicts.length > 1 ? "s" : ""}
                </Badge>
              )}
              {alerts.length > 0 && (
                <Badge variant="secondary" className="flex items-center gap-1 bg-orange-500/10 text-orange-600 border-orange-500/20">
                  <Clock className="h-3 w-3" />
                  {alerts.length} alerte{alerts.length > 1 ? "s" : ""}
                </Badge>
              )}
              
              <Select
                value={selectedProjectId || ""}
                onValueChange={(value) => setSearchParams({ project: value })}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Projet" />
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
        </div>
        
        {/* Bannière dates du projet */}
        {projectDates && (
          <div className="container mx-auto px-4 py-2 border-t bg-muted/30">
            <div className="flex items-center justify-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                <span className="text-muted-foreground">Début:</span>
                <span className="font-semibold">
                  {format(projectDates.start, "d MMMM yyyy", { locale: fr })}
                </span>
              </div>
              <div className="h-4 w-px bg-border" />
              <div className="flex items-center gap-2">
                <Flag className="h-4 w-4 text-green-500" />
                <span className="text-muted-foreground">Fin:</span>
                <span className="font-semibold">
                  {format(projectDates.end, "d MMMM yyyy", { locale: fr })}
                </span>
              </div>
              <div className="h-4 w-px bg-border" />
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Durée totale:</span>
                <span className="font-semibold">{projectDates.totalDays} jours</span>
              </div>
            </div>
          </div>
        )}
      </div>

      <main className="container mx-auto px-4 py-6">
        {/* Stats compacts */}
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-6">
          <div className="bg-card rounded-lg border p-3 text-center">
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Total</p>
          </div>
          <div className="bg-card rounded-lg border p-3 text-center">
            <div className="flex items-center justify-center gap-1">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-2xl font-bold">{stats.pending}</span>
            </div>
            <p className="text-xs text-muted-foreground">En attente</p>
          </div>
          <div className="bg-card rounded-lg border p-3 text-center">
            <div className="flex items-center justify-center gap-1">
              <Loader2 className="h-4 w-4 text-primary" />
              <span className="text-2xl font-bold">{stats.inProgress}</span>
            </div>
            <p className="text-xs text-muted-foreground">En cours</p>
          </div>
          <div className="bg-card rounded-lg border p-3 text-center">
            <div className="flex items-center justify-center gap-1">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-2xl font-bold">{stats.completed}</span>
            </div>
            <p className="text-xs text-muted-foreground">Terminées</p>
          </div>
          <div className={`bg-card rounded-lg border p-3 text-center ${conflicts.length > 0 ? "border-destructive" : ""}`}>
            <div className="flex items-center justify-center gap-1">
              <AlertTriangle className={`h-4 w-4 ${conflicts.length > 0 ? "text-destructive" : "text-muted-foreground"}`} />
              <span className="text-2xl font-bold">{stats.conflicts}</span>
            </div>
            <p className="text-xs text-muted-foreground">Conflits</p>
          </div>
          <div className={`bg-card rounded-lg border p-3 text-center ${alerts.length > 0 ? "border-orange-500" : ""}`}>
            <div className="flex items-center justify-center gap-1">
              <CalendarDays className={`h-4 w-4 ${alerts.length > 0 ? "text-orange-500" : "text-muted-foreground"}`} />
              <span className="text-2xl font-bold">{stats.alerts}</span>
            </div>
            <p className="text-xs text-muted-foreground">Alertes</p>
          </div>
        </div>

        <div className="grid lg:grid-cols-4 gap-6">
          {/* Main content */}
          <div className="lg:col-span-3">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <>
                {activeTab === "table" && (
                  <ScheduleTable
                    schedules={schedules}
                    onUpdate={async (schedule) => {
                      // Utiliser updateScheduleAndRecalculate pour propager les changements
                      await updateScheduleAndRecalculate(schedule.id, schedule);
                      const fullSchedule = schedules.find(
                        (s) => s.id === schedule.id
                      );
                      if (fullSchedule) {
                        generateAlerts({ ...fullSchedule, ...schedule });
                      }
                    }}
                    onDelete={deleteSchedule}
                    onComplete={completeStep}
                    conflicts={conflicts}
                    calculateEndDate={calculateEndDate}
                  />
                )}
                {activeTab === "calendar" && (
                  <ScheduleCalendar
                    schedules={schedules}
                    conflicts={conflicts}
                  />
                )}
                {activeTab === "gantt" && (
                  <ScheduleGantt schedules={schedules} conflicts={conflicts} />
                )}
              </>
            )}

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
