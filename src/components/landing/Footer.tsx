import { Home, Mail, Settings } from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useCookieConsent } from "@/components/cookies/CookieConsent";
import { ReportBugDialog } from "@/components/bug/ReportBugDialog";

const CookieSettingsButton = () => {
  const { t } = useTranslation();
  const { openPreferences } = useCookieConsent();
  
  return (
    <button 
      onClick={openPreferences}
      className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5"
    >
      <Settings className="h-3.5 w-3.5" />
      {t("footer.manageCookies")}
    </button>
  );
};

export function Footer() {
  const { t } = useTranslation();
  
  return (
    <footer className="border-t border-border bg-background">
      <div className="container py-12">
        <div className="grid gap-8 md:grid-cols-4">
          <div className="md:col-span-2">
            <Link to="/" className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-gradient">
                <Home className="h-5 w-5 text-accent-foreground" />
              </div>
              <span className="font-display text-xl font-bold">MonProjetMaison</span>
            </Link>
            <p className="mt-4 text-sm text-muted-foreground max-w-sm">
              {t("footer.description")}
            </p>
          </div>

          <div>
            <h4 className="font-display font-semibold mb-4">{t("footer.navigation")}</h4>
            <ul className="space-y-2">
              <li>
                <Link to="/forfaits" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  {t("footer.plans")}
                </Link>
              </li>
              <li>
                <Link to="/dashboard" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  {t("footer.dashboard")}
                </Link>
              </li>
              <li>
                <Link to="/budget" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  {t("footer.budget")}
                </Link>
              </li>
              <li>
                <Link to="/guide" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  {t("footer.guide")}
                </Link>
              </li>
              <li>
                <Link to="/confidentialite" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  {t("footer.privacy")}
                </Link>
              </li>
              <li>
                <Link to="/conditions" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  {t("footer.terms")}
                </Link>
              </li>
              <li>
                <Link to="/politique-cookies" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  {t("footer.cookiePolicy")}
                </Link>
              </li>
              <li>
                <ReportBugDialog />
              </li>
              <li>
                <CookieSettingsButton />
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-display font-semibold mb-4">{t("footer.contact")}</h4>
            <ul className="space-y-2">
              <li>
                <a
                  href="mailto:info@monprojetmaison.ca"
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Mail className="h-4 w-4" />
                  info@monprojetmaison.ca
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-border text-center">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} MonProjetMaison. {t("footer.allRightsReserved")}
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            {t("footer.disclaimer")}
          </p>
        </div>
      </div>
    </footer>
  );
}
