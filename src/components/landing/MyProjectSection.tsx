import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { formatCurrency } from "@/lib/i18n";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { ArrowRight, Plus, FolderOpen, Calendar, DollarSign, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { fr, enCA } from "date-fns/locale";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Project {
  id: string;
  name: string;
  description: string | null;
  status: string | null;
  project_type: string | null;
  total_budget: number | null;
  created_at: string;
  updated_at: string;
}

const getStatusBadge = (status: string | null, t: (key: string) => string) => {
  switch (status) {
    case "planification":
      return <Badge variant="secondary">{t("projects.statuses.planning")}</Badge>;
    case "permis":
      return <Badge className="bg-warning/20 text-warning border-warning/30">{t("projects.statuses.permit")}</Badge>;
    case "en_cours":
      return <Badge className="bg-primary/20 text-primary border-primary/30">{t("projects.statuses.in_progress")}</Badge>;
    case "termine":
      return <Badge className="bg-success/20 text-success border-success/30">{t("projects.statuses.completed")}</Badge>;
    default:
      return <Badge variant="outline">{status || t("projects.statuses.undefined")}</Badge>;
  }
};

const getProjectTypeLabel = (type: string | null, t: (key: string) => string) => {
  switch (type) {
    case "maison-neuve":
      return t("projects.types.newHome");
    case "agrandissement":
      return t("projects.types.extension");
    case "garage-detache":
      return t("projects.types.detachedGarage");
    case "renovation-majeure":
      return t("projects.types.majorRenovation");
    case "chalet":
      return t("projects.types.cabin");
    default:
      return type || t("projects.statuses.undefined");
  }
};

export function MyProjectSection() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, loading: authLoading } = useAuth();
  const dateLocale = i18n.language === 'en' ? enCA : fr;

  const { data: projects, isLoading } = useQuery({
    queryKey: ["user-projects", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false })
        .limit(3);
      
      if (error) throw error;
      return data as Project[];
    },
    enabled: !!user,
  });

  const deleteProjectMutation = useMutation({
    mutationFn: async (projectId: string) => {
      // Delete related budget entries first
      await supabase
        .from("project_budgets")
        .delete()
        .eq("project_id", projectId);
      
      // Delete the project
      const { error } = await supabase
        .from("projects")
        .delete()
        .eq("id", projectId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-projects"] });
      toast.success(t("projects.deleted"));
    },
    onError: (error) => {
      console.error("Delete error:", error);
      toast.error(t("projects.deleteError"));
    },
  });

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  // Don't show section if not logged in or still loading
  if (authLoading || !user) return null;

  return (
    <section className="py-16 bg-muted/30">
      <div className="container">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
              {t("myProjectSection.title")}
            </h2>
            <p className="mt-2 text-muted-foreground">
              {t("myProjectSection.subtitle")}
            </p>
          </div>
          <Button variant="outline" onClick={() => navigate("/mes-projets")}>
            {t("myProjectSection.viewAll")}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-4 bg-muted rounded w-3/4" />
                  <div className="h-3 bg-muted rounded w-1/2 mt-2" />
                </CardHeader>
                <CardContent>
                  <div className="h-3 bg-muted rounded w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : projects && projects.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-3">
            {projects.map((project) => (
              <Card 
                key={project.id} 
                className="group cursor-pointer hover:shadow-lg transition-all duration-300 hover:border-primary/50"
                onClick={() => navigate("/dashboard")}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="font-display text-lg group-hover:text-primary transition-colors">
                        {project.name}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        {getProjectTypeLabel(project.project_type, t)}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(project.status, t)}
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={handleDeleteClick}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                          <AlertDialogHeader>
                            <AlertDialogTitle>{t("myProjectSection.deleteTitle")}</AlertDialogTitle>
                            <AlertDialogDescription>
                              {t("myProjectSection.deleteDescription", { name: project.name })}
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteProjectMutation.mutate(project.id);
                              }}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              {t("common.delete")}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {project.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {project.description}
                    </p>
                  )}
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      <span>
                        {project.updated_at && !isNaN(new Date(project.updated_at).getTime())
                          ? format(new Date(project.updated_at), "d MMM yyyy", { locale: dateLocale })
                          : t("common.unknownDate")}
                      </span>
                    </div>
                    {project.total_budget && project.total_budget > 0 && (
                      <div className="flex items-center gap-1">
                        <DollarSign className="h-4 w-4" />
                        <span>{formatCurrency(project.total_budget)}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center">
              <FolderOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-display text-lg font-semibold mb-2">
                {t("projects.noProjects")}
              </h3>
              <p className="text-muted-foreground mb-6">
                {t("projects.noProjectsDesc")}
              </p>
              <Button onClick={() => navigate("/start")}>
                <Plus className="mr-2 h-4 w-4" />
                {t("projects.createFirst")}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </section>
  );
}
