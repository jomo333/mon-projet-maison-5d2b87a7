import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function LanguageSelector() {
  const { i18n } = useTranslation();
  
  const toggleLanguage = (lang: string) => {
    i18n.changeLanguage(lang);
    localStorage.setItem('app_lang', lang);
  };

  return (
    <div className="flex items-center gap-0.5 bg-muted rounded-lg p-0.5">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => toggleLanguage('fr')}
        className={cn(
          "px-2 py-1 h-7 text-xs font-medium transition-all",
          i18n.language === 'fr' 
            ? "bg-background text-foreground shadow-sm" 
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        FR
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => toggleLanguage('en')}
        className={cn(
          "px-2 py-1 h-7 text-xs font-medium transition-all",
          i18n.language === 'en' 
            ? "bg-background text-foreground shadow-sm" 
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        EN
      </Button>
    </div>
  );
}
