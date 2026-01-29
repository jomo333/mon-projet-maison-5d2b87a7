import { useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "react-router-dom";
import type { Json } from "@/integrations/supabase/types";

interface ClickRecord {
  eventName: string;
  timestamps: number[];
}

const REPEATED_CLICK_THRESHOLD = 5; // Number of clicks
const REPEATED_CLICK_WINDOW_MS = 30000; // 30 seconds

export function useAnalytics() {
  const { user } = useAuth();
  const location = useLocation();
  const clickRecords = useRef<Map<string, ClickRecord>>(new Map());

  // Track a generic event
  const trackEvent = useCallback(async (
    eventType: string,
    eventName: string,
    metadata: Record<string, unknown> = {}
  ) => {
    if (!user?.id) return;

    try {
      await supabase.from("user_analytics_events").insert([{
        user_id: user.id,
        event_type: eventType,
        event_name: eventName,
        page_path: location.pathname,
        metadata: metadata as Json,
      }]);
    } catch (error) {
      console.error("Failed to track event:", error);
    }
  }, [user?.id, location.pathname]);

  // Track button clicks with repeated click detection
  const trackButtonClick = useCallback(async (eventName: string, metadata: Record<string, unknown> = {}) => {
    if (!user?.id) return;

    const now = Date.now();
    
    // Get or create click record for this event
    let record = clickRecords.current.get(eventName);
    if (!record) {
      record = { eventName, timestamps: [] };
      clickRecords.current.set(eventName, record);
    }

    // Remove old timestamps outside the window
    record.timestamps = record.timestamps.filter(
      t => now - t < REPEATED_CLICK_WINDOW_MS
    );

    // Add current click
    record.timestamps.push(now);

    // Track the button click
    await trackEvent("button_click", eventName, metadata);

    // Check for repeated clicks pattern (potential bug signal)
    if (record.timestamps.length >= REPEATED_CLICK_THRESHOLD) {
      console.warn(`Repeated clicks detected on "${eventName}": ${record.timestamps.length} clicks in ${REPEATED_CLICK_WINDOW_MS / 1000}s`);
      
      // Create a bug report
      try {
        await supabase.from("bug_reports").insert([{
          user_id: user.id,
          type: "auto",
          source: "repeated_clicks",
          description: `Clics répétés détectés: ${record.timestamps.length} clics sur "${eventName}" en moins de 30 secondes`,
          page_path: location.pathname,
          metadata: {
            event_name: eventName,
            click_count: record.timestamps.length,
            timestamps: record.timestamps,
            ...metadata,
          } as Json,
        }]);

        // Also track as an event
        await trackEvent("repeated_clicks", eventName, {
          click_count: record.timestamps.length,
          ...metadata,
        });
      } catch (error) {
        console.error("Failed to create bug report:", error);
      }

      // Reset after reporting
      record.timestamps = [];
    }
  }, [user?.id, location.pathname, trackEvent]);

  // Track project creation for "time to first project" metric
  const trackProjectCreated = useCallback(async (projectId: string) => {
    if (!user?.id) return;

    try {
      await trackEvent("project_created", "first_project", { project_id: projectId });

      // Update aggregated stats
      const { data: existingStats } = await supabase
        .from("user_analytics_aggregated")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!existingStats?.first_project_at) {
        const firstSessionAt = existingStats?.first_session_at || new Date().toISOString();
        const firstProjectAt = new Date().toISOString();
        const timeToFirstProject = Math.floor(
          (new Date(firstProjectAt).getTime() - new Date(firstSessionAt).getTime()) / 1000
        );
        await supabase.from("user_analytics_aggregated").upsert([{
          user_id: user.id,
          first_project_at: firstProjectAt,
          time_to_first_project_seconds: timeToFirstProject,
          last_updated_at: new Date().toISOString(),
        }], { onConflict: "user_id" });
      }
    } catch (error) {
      console.error("Failed to track project creation:", error);
    }
  }, [user?.id, trackEvent]);

  // Track page view
  const trackPageView = useCallback(async () => {
    if (!user?.id) return;
    await trackEvent("page_view", location.pathname);
  }, [user?.id, location.pathname, trackEvent]);

  // Report a bug manually (for error boundaries, etc.)
  const reportBug = useCallback(async (
    source: string,
    description: string,
    metadata: Record<string, unknown> = {}
  ) => {
    try {
      await supabase.from("bug_reports").insert([{
        user_id: user?.id || null,
        type: "auto",
        source,
        description,
        page_path: location.pathname,
        metadata: metadata as Json,
      }]);
    } catch (error) {
      console.error("Failed to report bug:", error);
    }
  }, [user?.id, location.pathname]);

  return {
    trackEvent,
    trackButtonClick,
    trackProjectCreated,
    trackPageView,
    reportBug,
  };
}
