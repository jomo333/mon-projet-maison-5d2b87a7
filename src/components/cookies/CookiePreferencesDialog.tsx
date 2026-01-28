import { useState, useEffect } from "react";
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

const cookieCategories = [
  {
    key: "essential" as const,
    title: "Cookies essentiels",
    description: "Ces cookies sont nécessaires au fonctionnement du site et ne peuvent pas être désactivés. Ils permettent notamment la navigation, la sécurité et l'authentification.",
    icon: Shield,
    required: true,
  },
  {
    key: "analytics" as const,
    title: "Cookies analytiques",
    description: "Ces cookies nous aident à comprendre comment les visiteurs utilisent le site en collectant des informations de manière anonyme. Ils permettent d'améliorer nos services.",
    icon: BarChart3,
    required: false,
  },
  {
    key: "marketing" as const,
    title: "Cookies marketing",
    description: "Ces cookies sont utilisés pour vous présenter des publicités pertinentes et mesurer l'efficacité de nos campagnes marketing.",
    icon: Megaphone,
    required: false,
  },
  {
    key: "functional" as const,
    title: "Cookies fonctionnels",
    description: "Ces cookies permettent d'améliorer les fonctionnalités du site, comme la mémorisation de vos préférences (langue, région, etc.).",
    icon: Wrench,
    required: false,
  },
];

export const CookiePreferencesDialog = ({
  open,
  onOpenChange,
  preferences,
  onSave,
}: CookiePreferencesDialogProps) => {
  const [localPreferences, setLocalPreferences] = useState<CookiePreferences>(preferences);

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
            Paramètres des cookies
          </DialogTitle>
          <DialogDescription>
            Personnalisez vos préférences en matière de cookies. Vous pouvez modifier ces paramètres à tout moment.{" "}
            <Link to="/politique-cookies" className="text-primary hover:underline">
              Consulter notre politique de cookies
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
                            Requis
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
            Tout refuser
          </Button>
          <Button
            variant="outline"
            onClick={handleAcceptAll}
            className="w-full sm:w-auto"
          >
            Tout accepter
          </Button>
          <Button 
            onClick={handleSave}
            className="w-full sm:w-auto"
          >
            Enregistrer mes choix
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
