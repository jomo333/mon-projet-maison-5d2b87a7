import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Link } from "react-router-dom";
import { CookiePreferences } from "./CookieConsent";
import { Shield, BarChart3, Megaphone, Wrench } from "lucide-react";

interface CookiePreferencesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preferences: CookiePreferences;
  onSave: (preferences: CookiePreferences) => void;
}

export const CookiePreferencesDialog = ({
  open,
  onOpenChange,
  preferences,
  onSave,
}: CookiePreferencesDialogProps) => {
  const { t } = useTranslation();
  const [localPreferences, setLocalPreferences] = useState<CookiePreferences>(preferences);

  const cookieCategories = [
    {
      key: "essential" as const,
      title: t("cookies.categories.essential"),
      description: t("cookies.categories.essentialDesc"),
      icon: Shield,
      required: true,
    },
    {
      key: "analytics" as const,
      title: t("cookies.categories.analytics"),
      description: t("cookies.categories.analyticsDesc"),
      icon: BarChart3,
      required: false,
    },
    {
      key: "marketing" as const,
      title: t("cookies.categories.marketing"),
      description: t("cookies.categories.marketingDesc"),
      icon: Megaphone,
      required: false,
    },
    {
      key: "functional" as const,
      title: t("cookies.categories.functional"),
      description: t("cookies.categories.functionalDesc"),
      icon: Wrench,
      required: false,
    },
  ];

  useEffect(() => {
    setLocalPreferences(preferences);
  }, [preferences]);

  const handleToggle = (key: keyof CookiePreferences) => {
    if (key === "essential") return; // Cannot disable essential cookies
    
    setLocalPreferences((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleAcceptAll = () => {
    const allAccepted: CookiePreferences = {
      essential: true,
      analytics: true,
      marketing: true,
      functional: true,
    };
    setLocalPreferences(allAccepted);
    onSave(allAccepted);
  };

  const handleRefuseAll = () => {
    const onlyEssential: CookiePreferences = {
      essential: true,
      analytics: false,
      marketing: false,
      functional: false,
    };
    setLocalPreferences(onlyEssential);
    onSave(onlyEssential);
  };

  const handleSave = () => {
    onSave(localPreferences);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">
            {t("cookies.settingsTitle")}
          </DialogTitle>
          <DialogDescription>
            {t("cookies.settingsDescription")}{" "}
            <Link to="/politique-cookies" className="text-primary hover:underline">
              {t("cookies.viewPolicy")}
            </Link>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {cookieCategories.map((category) => {
            const Icon = category.icon;
            const isEnabled = localPreferences[category.key];
            
            return (
              <div
                key={category.key}
                className={`p-4 rounded-lg border ${
                  category.required 
                    ? "bg-muted/50 border-border" 
                    : "bg-background border-border"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex gap-3">
                    <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${
                      isEnabled ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                    }`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Label 
                          htmlFor={category.key} 
                          className="font-medium cursor-pointer"
                        >
                          {category.title}
                        </Label>
                        {category.required && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                            {t("cookies.required")}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {category.description}
                      </p>
                    </div>
                  </div>
                  <Switch
                    id={category.key}
                    checked={isEnabled}
                    onCheckedChange={() => handleToggle(category.key)}
                    disabled={category.required}
                  />
                </div>
              </div>
            );
          })}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={handleRefuseAll}
            className="w-full sm:w-auto"
          >
            {t("cookies.refuseAll")}
          </Button>
          <Button
            variant="outline"
            onClick={handleAcceptAll}
            className="w-full sm:w-auto"
          >
            {t("cookies.acceptAll")}
          </Button>
          <Button 
            onClick={handleSave}
            className="w-full sm:w-auto"
          >
            {t("cookies.savePreferences")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
