import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CURRENT_TERMS_VERSION, CURRENT_PRIVACY_VERSION } from "@/components/auth/LegalAcceptanceDialog";

interface ConsentStatus {
  needsAcceptance: boolean;
  isLoading: boolean;
  checkConsent: () => Promise<void>;
  markAsAccepted: () => void;
}

export function useLegalConsent(userId: string | undefined): ConsentStatus {
  const [needsAcceptance, setNeedsAcceptance] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const checkConsent = useCallback(async () => {
    if (!userId) {
      setIsLoading(false);
      setNeedsAcceptance(false);
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase
        .from("user_consents")
        .select("terms_version, privacy_version")
        .eq("user_id", userId)
        .maybeSingle();

      if (error) {
        console.error("Error checking consent:", error);
        setNeedsAcceptance(true);
        return;
      }

      // Si pas de consentement enregistré, ou versions obsolètes
      if (!data) {
        setNeedsAcceptance(true);
      } else {
        const termsOutdated = data.terms_version !== CURRENT_TERMS_VERSION;
        const privacyOutdated = data.privacy_version !== CURRENT_PRIVACY_VERSION;
        setNeedsAcceptance(termsOutdated || privacyOutdated);
      }
    } catch (error) {
      console.error("Error:", error);
      setNeedsAcceptance(true);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  const markAsAccepted = useCallback(() => {
    setNeedsAcceptance(false);
  }, []);

  useEffect(() => {
    checkConsent();
    // Timeout de sécurité : éviter spinner infini si Supabase est lent (ex: après retour Stripe)
    const t = setTimeout(() => setIsLoading(false), 3000);
    return () => clearTimeout(t);
  }, [checkConsent]);

  return {
    needsAcceptance,
    isLoading,
    checkConsent,
    markAsAccepted,
  };
}
