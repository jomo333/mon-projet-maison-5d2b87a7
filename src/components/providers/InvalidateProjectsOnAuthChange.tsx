import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";

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

    // Vider tout le cache pour éviter d'afficher les données d'un autre compte
    queryClient.clear();
  }, [user?.id, queryClient]);

  return null;
}
