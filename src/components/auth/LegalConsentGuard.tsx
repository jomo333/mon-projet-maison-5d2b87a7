import { ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLegalConsent } from "@/hooks/useLegalConsent";
import { LegalAcceptanceDialog } from "./LegalAcceptanceDialog";

interface LegalConsentGuardProps {
  children: ReactNode;
}

export function LegalConsentGuard({ children }: LegalConsentGuardProps) {
  const { user, loading: authLoading } = useAuth();
  const { needsAcceptance, isLoading: consentLoading, markAsAccepted } = useLegalConsent(user?.id);

  // Don't show dialog while loading
  if (authLoading || consentLoading) {
    return <>{children}</>;
  }

  // User not logged in, no need to check
  if (!user) {
    return <>{children}</>;
  }

  return (
    <>
      {children}
      <LegalAcceptanceDialog
        open={needsAcceptance}
        userId={user.id}
        onAccepted={markAsAccepted}
      />
    </>
  );
}
