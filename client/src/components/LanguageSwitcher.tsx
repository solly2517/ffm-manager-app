import { Button } from "@/components/ui/button";
import { Languages } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { language, setLanguage, t } = useLanguage();

  return (
    <div className="language-switcher" role="group" aria-label={t("language")}>
      {!compact && <Languages size={15} aria-hidden="true" />}
      <Button
        type="button"
        variant={language === "en" ? "secondary" : "outline"}
        size="sm"
        aria-pressed={language === "en"}
        onClick={() => setLanguage("en")}
      >
        EN
      </Button>
      <Button
        type="button"
        variant={language === "ar" ? "secondary" : "outline"}
        size="sm"
        aria-pressed={language === "ar"}
        onClick={() => setLanguage("ar")}
      >
        ع
      </Button>
    </div>
  );
}
