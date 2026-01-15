import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { ArrowRight, Plus, FolderOpen, Calendar, DollarSign } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

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

const getStatusBadge = (status: string | null) => {
  switch (status) {
    case "planification":
      return <Badge variant="secondary">Planification</Badge>;
    case "permis":
      return <Badge className="bg-warning/20 text-warning border-warning/30">En attente de permis</Badge>;
    case "en_cours":
      return <Badge className="bg-primary/20 text-primary border-primary/30">En cours</Badge>;
    case "termine":
      return <Badge className="bg-success/20 text-success border-success/30">Terminé</Badge>;
    default:
      return <Badge variant="outline">{status || "Non défini"}</Badge>;
  }
};

const getProjectTypeLabel = (type: string | null) => {
  switch (type) {
    case "maison-neuve":
      return "Maison neuve";
    case "agrandissement":
      return "Agrandissement";
    case "renovation-majeure":
      return "Rénovation majeure";
    case "chalet":
      return "Chalet";
    default:
      return type || "Non défini";
  }
};

export function MyProjectSection() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

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

  // Don't show section if not logged in or still loading
  if (authLoading || !user) return null;

  return (
    <section className="py-16 bg-muted/30">
      <div className="container">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
              Mon projet
            </h2>
            <p className="mt-2 text-muted-foreground">
              Continuez là où vous en étiez
            </p>
          </div>
          <Button variant="outline" onClick={() => navigate("/mes-projets")}>
            Voir tous mes projets
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
                        {getProjectTypeLabel(project.project_type)}
                      </CardDescription>
                    </div>
                    {getStatusBadge(project.status)}
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
                        {format(new Date(project.updated_at), "d MMM yyyy", { locale: fr })}
                      </span>
                    </div>
                    {project.total_budget && project.total_budget > 0 && (
                      <div className="flex items-center gap-1">
                        <DollarSign className="h-4 w-4" />
                        <span>{project.total_budget.toLocaleString("fr-CA")} $</span>
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
                Aucun projet pour l'instant
              </h3>
              <p className="text-muted-foreground mb-6">
                Commencez votre premier projet de construction dès maintenant
              </p>
              <Button onClick={() => navigate("/start")}>
                <Plus className="mr-2 h-4 w-4" />
                Créer mon premier projet
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </section>
  );
}
