import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";

/**
 * Quand l'utilisateur change (déconnexion, reconnexion, changement de compte),
 * on invalide / supprime le cache des projets pour éviter d'afficher les projets
 * d'un autre utilisateur ou un projet "non trouvé" après changement de compte.
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

    if (currentUserId === null) {
      queryClient.removeQueries({ queryKey: ["projects"] });
      queryClient.removeQueries({ queryKey: ["project"] });
      queryClient.removeQueries({ queryKey: ["user-projects"] });
      queryClient.removeQueries({ queryKey: ["all-project-photos"] });
      queryClient.removeQueries({ queryKey: ["project-documents"] });
    } else {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["project"] });
      queryClient.invalidateQueries({ queryKey: ["user-projects"] });
    }
  }, [user?.id, queryClient]);

  return null;
}
