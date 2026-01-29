import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "react-router-dom";
import { Bug, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface ReportBugDialogProps {
  trigger?: React.ReactNode;
  variant?: "button" | "link" | "icon";
}

export function ReportBugDialog({ trigger, variant = "link" }: ReportBugDialogProps) {
  const { t } = useTranslation();
  const location = useLocation();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!description.trim()) {
      toast.error(t("reportBug.descriptionRequired", "Veuillez décrire le problème"));
      return;
    }

    setLoading(true);
    
    try {
      const pagePath = location.pathname + location.search;
      const metadata = {
        user_agent: navigator.userAgent,
        language: navigator.language,
        screen_width: window.innerWidth,
        screen_height: window.innerHeight,
        timestamp: new Date().toISOString(),
      };

      const { error } = await supabase.from("bug_reports").insert({
        user_id: user?.id || null,
        source: "user_report",
        type: "bug",
        description: description.trim(),
        page_path: pagePath,
        metadata,
      });

      if (error) throw error;

      toast.success(t("reportBug.success", "Merci, votre signalement a été envoyé !"));
      setDescription("");
      setOpen(false);
    } catch (error) {
      console.error("Error submitting bug report:", error);
      toast.error(t("reportBug.error", "Erreur lors de l'envoi du signalement"));
    } finally {
      setLoading(false);
    }
  };

  const defaultTrigger = variant === "button" ? (
    <Button variant="outline" size="sm" className="gap-2">
      <Bug className="h-4 w-4" />
      {t("reportBug.title", "Signaler un bug")}
    </Button>
  ) : variant === "icon" ? (
    <Button variant="ghost" size="icon" title={t("reportBug.title", "Signaler un bug")}>
      <Bug className="h-4 w-4" />
    </Button>
  ) : (
    <button className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5">
      <Bug className="h-3.5 w-3.5" />
      {t("reportBug.title", "Signaler un bug")}
    </button>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bug className="h-5 w-5 text-destructive" />
              {t("reportBug.title", "Signaler un bug")}
            </DialogTitle>
            <DialogDescription>
              {t("reportBug.description", "Décrivez le problème que vous avez rencontré. Nous examinerons votre signalement rapidement.")}
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="bug-description">
                {t("reportBug.problemLabel", "Décrivez le problème")} *
              </Label>
              <Textarea
                id="bug-description"
                placeholder={t("reportBug.placeholder", "Expliquez ce qui s'est passé, ce que vous attendiez, et les étapes pour reproduire le problème...")}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={5}
                className="resize-none"
                required
              />
            </div>
            
            <p className="text-xs text-muted-foreground">
              {t("reportBug.autoCapture", "La page actuelle et des informations techniques seront automatiquement incluses.")}
            </p>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              {t("common.cancel", "Annuler")}
            </Button>
            <Button type="submit" disabled={loading} className="gap-2">
              {loading ? (
                <span className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              {t("reportBug.send", "Envoyer")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
