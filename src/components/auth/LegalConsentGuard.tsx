import { ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useLegalConsent } from "@/hooks/useLegalConsent";
import { LegalAcceptanceDialog } from "./LegalAcceptanceDialog";
import { Loader2 } from "lucide-react";

interface LegalConsentGuardProps {
  children: ReactNode;
}

// Routes où on affiche la page immédiatement sans attendre auth/consent (ex: retour Stripe)
const SKIP_LOADING_ROUTES = ["/achat-reussi", "/mes-projets", "/forfaits"];

export function LegalConsentGuard({ children }: LegalConsentGuardProps) {
  const { user, loading: authLoading } = useAuth();
  const location = useLocation();
  const { needsAcceptance, isLoading: consentLoading, markAsAccepted } = useLegalConsent(user?.id);
  const skipLoading = SKIP_LOADING_ROUTES.some((r) => location.pathname === r);

  // Show loading state while checking auth and consent (sauf achat-reussi)
  if (!skipLoading && (authLoading || (user && consentLoading))) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // User not logged in, no need to check consent
  if (!user) {
    return <>{children}</>;
  }

  // User needs to accept terms - block access completely
  if (needsAcceptance) {
    return (
      <div className="min-h-screen bg-background">
        <LegalAcceptanceDialog
          open={true}
          userId={user.id}
          onAccepted={markAsAccepted}
        />
      </div>
    );
  }

  // User has accepted, show app
  return <>{children}</>;
}
