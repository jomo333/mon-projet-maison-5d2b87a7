import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";

// Clés de requêtes contenant des données projets/utilisateur à vider au changement de compte
const PROJECT_QUERY_PREFIXES = [
  "projects",
  "project",
  "user-projects",
  "project-budget",
  "project-plans",
  "project-schedules",
  "project-documents",
  "all-project-photos",
  "project-starting-step",
  "project-details",
  "category-suppliers",
  "sub-categories",
  "supplier-status",
  "diy-supplier-status",
  "task-submissions",
  "category-docs",
  "task-attachments",
  "schedule-alerts",
  "completed-tasks",
  "task-dates",
  "step-photos",
  "style-photos",
  "soumission-statuses",
  "soumission-docs",
  "diy-invoices",
  "factures-materiaux",
];

/**
 * Quand l'utilisateur change (déconnexion, reconnexion, changement de compte),
 * on vide tout le cache des projets pour éviter d'afficher les données d'un autre utilisateur.
 */
export function InvalidateProjectsOnAuthChange() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const previousUserId = useRef<string | null>(undefined);

  useEffect(() => {
    const currentUserId = user?.id ?? null;
    if (previousUserId.current === undefined) {
      previousUserId.current = currentUserId;
      return;
    }
    if (previousUserId.current === currentUserId) return;
    previousUserId.current = currentUserId;

    // Supprimer toutes les requêtes liées aux projets (évite données d'un autre compte)
    for (const prefix of PROJECT_QUERY_PREFIXES) {
      queryClient.removeQueries({ predicate: (q) => q.queryKey[0] === prefix });
    }
    // Invalider les requêtes projets principales pour refetch immédiat
    queryClient.invalidateQueries({ queryKey: ["projects"] });
    queryClient.invalidateQueries({ queryKey: ["user-projects"] });
  }, [user?.id, queryClient]);

  return null;
}
