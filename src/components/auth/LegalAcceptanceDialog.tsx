import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Loader2, Shield, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Version des documents légaux - à incrémenter lors des mises à jour
export const CURRENT_TERMS_VERSION = "1.0";
export const CURRENT_PRIVACY_VERSION = "1.0";

interface LegalAcceptanceDialogProps {
  open: boolean;
  userId: string;
  onAccepted: () => void;
}

export function LegalAcceptanceDialog({ open, userId, onAccepted }: LegalAcceptanceDialogProps) {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const [accepted, setAccepted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  // Sur mobile : pas de target="_blank" (popups bloquées) → navigation dans le même onglet
  const linkProps = isMobile ? {} : { target: "_blank" as const, rel: "noopener noreferrer" };

  const handleAccept = async () => {
    if (!accepted) {
      toast.error(t("legalAcceptance.pleaseAccept"));
      return;
    }

    setIsLoading(true);

    try {
      // Get user's IP and user agent for compliance tracking
      const userAgent = navigator.userAgent;
      
      const { error } = await supabase
        .from("user_consents")
        .upsert({
          user_id: userId,
          terms_version: CURRENT_TERMS_VERSION,
          privacy_version: CURRENT_PRIVACY_VERSION,
          terms_accepted_at: new Date().toISOString(),
          privacy_accepted_at: new Date().toISOString(),
          user_agent: userAgent,
        }, {
          onConflict: "user_id"
        });

      if (error) {
        console.error("Error saving consent:", error);
        toast.error(t("legalAcceptance.saveError"));
        return;
      }

      toast.success(t("legalAcceptance.thankYou"));
      onAccepted();
    } catch (error) {
      console.error("Error:", error);
      toast.error(t("errors.generic"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent 
        className="w-[95vw] max-w-md mx-auto [&>button]:hidden"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <div className="max-h-[80vh] overflow-y-auto space-y-4 p-1">
          <DialogHeader className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-full bg-primary/10 shrink-0">
                <Shield className="h-5 w-5 text-primary" />
              </div>
              <DialogTitle className="font-display text-lg">
                {t("legalAcceptance.title")}
              </DialogTitle>
            </div>
            <DialogDescription className="text-sm">
              {t("legalAcceptance.description")}
            </DialogDescription>
          </DialogHeader>

          {/* Boutons pour lire les documents */}
          <div className="grid grid-cols-1 gap-2">
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start text-left h-auto py-2"
              asChild
            >
              <Link to="/conditions" {...linkProps}>
                <FileText className="h-4 w-4 mr-2 shrink-0" />
                <span className="text-xs sm:text-sm">{t("legalAcceptance.readTerms")}</span>
              </Link>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start text-left h-auto py-2"
              asChild
            >
              <Link to="/confidentialite" {...linkProps}>
                <FileText className="h-4 w-4 mr-2 shrink-0" />
                <span className="text-xs sm:text-sm">{t("legalAcceptance.readPrivacy")}</span>
              </Link>
            </Button>
          </div>

          <div className="flex items-start gap-3 pt-3 border-t">
            <Checkbox
              id="legal-acceptance"
              checked={accepted}
              onCheckedChange={(checked) => setAccepted(checked === true)}
              className="mt-0.5 shrink-0"
            />
            <Label 
              htmlFor="legal-acceptance" 
              className="text-sm leading-relaxed cursor-pointer"
            >
              {t("legalAcceptance.acceptLabel")}{" "}
              <span className="font-medium text-primary">{t("legalAcceptance.termsOfUse")}</span>
              {" "}{t("common.and")}{" "}
              <span className="font-medium text-primary">{t("legalAcceptance.privacyPolicy")}</span>
            </Label>
          </div>

          <p className="text-xs text-muted-foreground">
            {t("legalAcceptance.recordNote")}
          </p>

          <Button 
            onClick={handleAccept} 
            disabled={!accepted || isLoading}
            className="w-full"
            size="lg"
          >
            {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {t("legalAcceptance.continue")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
