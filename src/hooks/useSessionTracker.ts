import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

const SESSION_ID_KEY = "current_session_id";
const HEARTBEAT_INTERVAL = 30000; // 30 seconds

export function useSessionTracker() {
  const sessionIdRef = useRef<string | null>(null);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    let isMounted = true;

    const startSession = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !isMounted) return;

      // Check if there's an existing session to end
      const existingSessionId = sessionStorage.getItem(SESSION_ID_KEY);
      if (existingSessionId) {
        await endSession(existingSessionId);
      }

      // Create new session
      const { data, error } = await supabase
        .from("user_sessions")
        .insert({
          user_id: user.id,
          session_start: new Date().toISOString(),
        })
        .select("id")
        .single();

      if (error) {
        console.error("Error creating session:", error);
        return;
      }

      if (data && isMounted) {
        sessionIdRef.current = data.id;
        sessionStorage.setItem(SESSION_ID_KEY, data.id);
        startHeartbeat(data.id);
      }
    };

    const endSession = async (sessionId: string) => {
      const sessionStart = await getSessionStart(sessionId);
      if (!sessionStart) return;

      const now = new Date();
      const durationSeconds = Math.floor((now.getTime() - new Date(sessionStart).getTime()) / 1000);

      await supabase
        .from("user_sessions")
        .update({
          session_end: now.toISOString(),
          duration_seconds: durationSeconds,
        })
        .eq("id", sessionId);

      sessionStorage.removeItem(SESSION_ID_KEY);
    };

    const getSessionStart = async (sessionId: string): Promise<string | null> => {
      const { data } = await supabase
        .from("user_sessions")
        .select("session_start")
        .eq("id", sessionId)
        .single();
      return data?.session_start || null;
    };

    const startHeartbeat = (sessionId: string) => {
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
      }

      // Update session_end periodically so we capture time even if browser closes abruptly
      heartbeatRef.current = setInterval(async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          if (heartbeatRef.current) clearInterval(heartbeatRef.current);
          return;
        }

        const sessionStart = await getSessionStart(sessionId);
        if (!sessionStart) return;

        const now = new Date();
        const durationSeconds = Math.floor((now.getTime() - new Date(sessionStart).getTime()) / 1000);

        await supabase
          .from("user_sessions")
          .update({
            session_end: now.toISOString(),
            duration_seconds: durationSeconds,
          })
          .eq("id", sessionId);
      }, HEARTBEAT_INTERVAL);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden" && sessionIdRef.current) {
        // User left the page - update session end
        navigator.sendBeacon && updateSessionBeacon(sessionIdRef.current);
      }
    };

    const updateSessionBeacon = (sessionId: string) => {
      // Fallback: just update via regular call since sendBeacon doesn't work well with Supabase
      endSession(sessionId);
    };

    const handleBeforeUnload = () => {
      if (sessionIdRef.current) {
        endSession(sessionIdRef.current);
      }
    };

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) {
        startSession();
      } else if (event === "SIGNED_OUT") {
        if (sessionIdRef.current) {
          endSession(sessionIdRef.current);
          sessionIdRef.current = null;
        }
        if (heartbeatRef.current) {
          clearInterval(heartbeatRef.current);
        }
      }
    });

    // Start session if user is already logged in
    startSession();

    // Listen for page visibility changes
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      isMounted = false;
      subscription.unsubscribe();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
      }
    };
  }, []);
}
