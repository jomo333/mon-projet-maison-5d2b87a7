import { useState, useEffect, createContext, useContext, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Cookie, Settings } from "lucide-react";
import { CookiePreferencesDialog } from "./CookiePreferencesDialog";

export type CookiePreferences = {
  essential: boolean; // Always true, cannot be disabled
  analytics: boolean;
  marketing: boolean;
  functional: boolean;
};

const COOKIE_CONSENT_KEY = "mpm_cookie_consent";
const COOKIE_PREFERENCES_KEY = "mpm_cookie_preferences";

export const getStoredPreferences = (): CookiePreferences | null => {
  try {
    const stored = localStorage.getItem(COOKIE_PREFERENCES_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // Ignore parsing errors
  }
  return null;
};

export const hasConsented = (): boolean => {
  return localStorage.getItem(COOKIE_CONSENT_KEY) === "true";
};

// Context for opening cookie preferences from anywhere
type CookieConsentContextType = {
  openPreferences: () => void;
};

const CookieConsentContext = createContext<CookieConsentContextType | null>(null);

export const useCookieConsent = () => {
  const context = useContext(CookieConsentContext);
  if (!context) {
    // Return a no-op function if context is not available (prevents errors)
    return { openPreferences: () => {} };
  }
  return context;
};

export const CookieConsentProvider = ({ children }: { children: ReactNode }) => {
  const [showPreferences, setShowPreferences] = useState(false);
  const [preferences, setPreferences] = useState<CookiePreferences>({
    essential: true,
    analytics: false,
    marketing: false,
    functional: false,
  });

  useEffect(() => {
    const savedPrefs = getStoredPreferences();
    if (savedPrefs) {
      setPreferences(savedPrefs);
    }
  }, []);

  const openPreferencesDialog = () => {
    setShowPreferences(true);
  };

  const handleSavePreferences = (prefs: CookiePreferences) => {
    localStorage.setItem(COOKIE_CONSENT_KEY, "true");
    localStorage.setItem(COOKIE_PREFERENCES_KEY, JSON.stringify(prefs));
    setPreferences(prefs);
    setShowPreferences(false);
  };

  return (
    <CookieConsentContext.Provider value={{ openPreferences: openPreferencesDialog }}>
      {children}
      <CookiePreferencesDialog
        open={showPreferences}
        onOpenChange={setShowPreferences}
        preferences={preferences}
        onSave={handleSavePreferences}
      />
    </CookieConsentContext.Provider>
  );
};

export const CookieConsent = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [preferences, setPreferences] = useState<CookiePreferences>({
    essential: true,
    analytics: false,
    marketing: false,
    functional: false,
  });

  useEffect(() => {
    // Check if user has already made a choice
    const consent = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!consent) {
      // Small delay to avoid layout shift on initial load
      const timer = setTimeout(() => setIsVisible(true), 500);
      return () => clearTimeout(timer);
    } else {
      // Load saved preferences
      const savedPrefs = getStoredPreferences();
      if (savedPrefs) {
        setPreferences(savedPrefs);
        applyPreferences(savedPrefs);
      }
    }
  }, []);

  const applyPreferences = (prefs: CookiePreferences) => {
    // Here you would enable/disable third-party scripts based on preferences
    if (prefs.analytics) {
      console.log("Analytics cookies enabled");
    }
    if (prefs.marketing) {
      console.log("Marketing cookies enabled");
    }
    if (prefs.functional) {
      console.log("Functional cookies enabled");
    }
  };

  const saveConsent = (prefs: CookiePreferences) => {
    localStorage.setItem(COOKIE_CONSENT_KEY, "true");
    localStorage.setItem(COOKIE_PREFERENCES_KEY, JSON.stringify(prefs));
    setPreferences(prefs);
    applyPreferences(prefs);
    setIsVisible(false);
  };

  const handleAcceptAll = () => {
    const allAccepted: CookiePreferences = {
      essential: true,
      analytics: true,
      marketing: true,
      functional: true,
    };
    saveConsent(allAccepted);
  };

  const handleRefuseAll = () => {
    const onlyEssential: CookiePreferences = {
      essential: true,
      analytics: false,
      marketing: false,
      functional: false,
    };
    saveConsent(onlyEssential);
  };

  const handleSavePreferences = (prefs: CookiePreferences) => {
    saveConsent(prefs);
    setShowPreferences(false);
  };

  if (!isVisible) return null;

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 z-50 p-4 animate-fade-in">
        <div className="container max-w-4xl mx-auto">
          <div className="bg-background border border-border rounded-xl shadow-lg p-6">
            <div className="flex items-start gap-4">
              <div className="hidden sm:flex flex-shrink-0 w-12 h-12 rounded-full bg-primary/10 items-center justify-center">
                <Cookie className="h-6 w-6 text-primary" />
              </div>
              
              <div className="flex-1 space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-display font-semibold text-lg mb-2">
                      Gestion des cookies
                    </h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      Nous utilisons des cookies pour améliorer votre expérience, analyser le trafic et offrir du contenu pertinent. Vous pouvez accepter, refuser ou personnaliser vos préférences à tout moment.{" "}
                      <Link 
                        to="/politique-cookies" 
                        className="text-primary hover:underline"
                      >
                        En savoir plus
                      </Link>
                    </p>
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-3">
                  <Button 
                    onClick={handleAcceptAll}
                    className="flex-1 sm:flex-none"
                  >
                    Accepter
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={handleRefuseAll}
                    className="flex-1 sm:flex-none"
                  >
                    Refuser
                  </Button>
                  <Button 
                    variant="ghost" 
                    onClick={() => setShowPreferences(true)}
                    className="flex-1 sm:flex-none gap-2"
                  >
                    <Settings className="h-4 w-4" />
                    Paramétrer
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <CookiePreferencesDialog
        open={showPreferences}
        onOpenChange={setShowPreferences}
        preferences={preferences}
        onSave={handleSavePreferences}
      />
    </>
  );
};
