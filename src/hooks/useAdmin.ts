import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export function useAdmin() {
  const { user, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkAdminRole() {
      if (!user) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .eq("role", "admin")
          .maybeSingle();

        if (error) {
          console.error("Error checking admin role:", error);
          setIsAdmin(false);
        } else {
          setIsAdmin(!!data);
        }
      } catch (err) {
        console.error("Error checking admin role:", err);
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    }

    if (!authLoading) {
      checkAdminRole();
    }
  }, [user, authLoading]);

  const logAdminAction = async (
    action: string,
    targetUserId?: string,
    targetTable?: string,
    targetId?: string,
    details?: Record<string, unknown>
  ) => {
    if (!user || !isAdmin) return;

    try {
      await supabase.from("admin_audit_log").insert([{
        admin_id: user.id,
        action,
        target_user_id: targetUserId || null,
        target_table: targetTable || null,
        target_id: targetId || null,
        details: (details || {}) as unknown as Record<string, never>,
      }]);
    } catch (error) {
      console.error("Error logging admin action:", error);
    }
  };

  return { isAdmin, loading: loading || authLoading, logAdminAction };
}
