import { supabase } from "@/integrations/supabase/client";
import type { CookiePreferences } from "@/components/cookies/CookieConsent";

export async function saveCookiePreferencesToDB(
  userId: string,
  preferences: CookiePreferences
): Promise<void> {
  try {
    const { error } = await supabase
      .from("user_consents")
      .update({
        cookie_analytics: preferences.analytics,
        cookie_marketing: preferences.marketing,
        cookie_functional: preferences.functional,
        cookie_accepted_at: new Date().toISOString(),
      })
      .eq("user_id", userId);

    if (error) {
      // If no row exists yet, we can't update - that's ok, legal consent will create it
      console.log("Cookie preferences not saved to DB (user may not have legal consent yet):", error.message);
    }
  } catch (error) {
    console.error("Error saving cookie preferences to DB:", error);
  }
}

export async function syncCookiePreferencesOnLogin(userId: string): Promise<void> {
  try {
    // Get current preferences from localStorage
    const stored = localStorage.getItem("mpm_cookie_preferences");
    if (!stored) return;

    const preferences: CookiePreferences = JSON.parse(stored);
    await saveCookiePreferencesToDB(userId, preferences);
  } catch (error) {
    console.error("Error syncing cookie preferences:", error);
  }
}
