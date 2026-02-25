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
      className="text-sm text-slate-400 hover:text-white transition-colors flex items-center gap-1.5"
    >
      <Settings className="h-3.5 w-3.5" />
      {t("footer.manageCookies")}
    </button>
  );
};

export function BlueprintFooter() {
  const { t } = useTranslation();

  return (
    <footer className="bg-navy text-slate-300 border-t border-slate-800 pb-20 sm:pb-12">
      <div className="container py-12 px-4 sm:px-6">
        <div className="grid gap-8 md:grid-cols-5">
          {/* Brand */}
          <div className="md:col-span-2">
            <Link to="/" className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500">
                <Home className="h-5 w-5 text-navy" />
              </div>
              <span className="font-display text-xl font-bold text-white">MonProjetMaison</span>
            </Link>
            <p className="mt-4 text-sm text-slate-400 max-w-sm leading-relaxed">
              {t("footer.tagline")}
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-display font-semibold text-white mb-4">{t("nav.navigation")}</h4>
            <ul className="space-y-2.5">
              <li>
                <Link to="/forfaits" className="text-sm text-slate-400 hover:text-white transition-colors">
                  {t("nav.plans")}
                </Link>
              </li>
              <li>
                <Link to="/dashboard" className="text-sm text-slate-400 hover:text-white transition-colors">
                  {t("dashboard.title")}
                </Link>
              </li>
              <li>
                <Link to="/budget" className="text-sm text-slate-400 hover:text-white transition-colors">
                  {t("nav.budget")}
                </Link>
              </li>
              <li>
                <Link to="/guide" className="text-sm text-slate-400 hover:text-white transition-colors">
                  {t("nav.guide")}
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal & Contact */}
          <div>
            <h4 className="font-display font-semibold text-white mb-4">{t("footer.legal")} & Support</h4>
            <ul className="space-y-2.5">
              <li>
                <Link to="/confidentialite" className="text-sm text-slate-400 hover:text-white transition-colors">
                  {t("footer.privacy")}
                </Link>
              </li>
              <li>
                <Link to="/conditions" className="text-sm text-slate-400 hover:text-white transition-colors">
                  {t("footer.terms")}
                </Link>
              </li>
              <li>
                <Link to="/politique-cookies" className="text-sm text-slate-400 hover:text-white transition-colors">
                  {t("footer.cookies")}
                </Link>
              </li>
              <li>
                <CookieSettingsButton />
              </li>
              <li className="pt-2">
                <ReportBugDialog 
                  trigger={
                    <button className="text-sm text-slate-400 hover:text-amber-500 transition-colors flex items-center gap-1.5">
                      {t("footer.reportBug")}
                    </button>
                  }
                />
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-display font-semibold text-white mb-4">{t("footer.contact")}</h4>
            <ul className="space-y-2.5">
              <li>
                <a
                  href="mailto:info@monprojetmaison.ca"
                  className="flex items-center gap-2 text-sm text-slate-400 hover:text-amber-500 transition-colors"
                >
                  <Mail className="h-4 w-4 shrink-0" />
                  info@monprojetmaison.ca
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 pt-8 border-t border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-slate-500">
            {t("footer.copyright", { year: new Date().getFullYear() })}
          </p>
          <p className="text-xs text-slate-600 text-center md:text-right max-w-md">
            {t("footer.disclaimer")}
          </p>
        </div>
      </div>
    </footer>
  );
}
