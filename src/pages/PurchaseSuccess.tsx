import { useTranslation } from "react-i18next";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/landing/Footer";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

const PurchaseSuccess = () => {
  const { t } = useTranslation();
  const base = typeof window !== "undefined" ? window.location.origin : "";
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="mb-6 flex justify-center">
            <div className="rounded-full bg-green-100 p-4">
              <Check className="h-12 w-12 text-green-600" strokeWidth={3} />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">{t("purchaseSuccess.title")}</h1>
          <p className="text-muted-foreground mb-8">{t("purchaseSuccess.message")}</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild>
              <a href={`${base}/#/mes-projets`}>{t("purchaseSuccess.myProjects")}</a>
            </Button>
            <Button variant="secondary" asChild>
              <a href={`${base}/#/forfaits`}>{t("purchaseSuccess.plans")}</a>
            </Button>
            <Button variant="outline" asChild>
              <a href={`${base}/#/`}>{t("purchaseSuccess.home")}</a>
            </Button>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default PurchaseSuccess;
