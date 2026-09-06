import { Button } from "@/components/ui/button";
import { Languages } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";

export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { language, setLanguage, t } = useLanguage();
  const { isAuthenticated } = useAuth();
  const utils = trpc.useUtils();
  const saveLanguage = trpc.auth.updateDefaultLanguage.useMutation({
    onSuccess: () => utils.auth.me.invalidate(),
  });
  const chooseLanguage = (next: "en" | "ar") => {
    setLanguage(next);
    if (isAuthenticated) saveLanguage.mutate({ language: next });
  };

  return (
    <div className="language-switcher" role="group" aria-label={t("language")}>
      {!compact && <Languages size={15} aria-hidden="true" />}
      <Button
        type="button"
        variant={language === "en" ? "secondary" : "outline"}
        size="sm"
        aria-pressed={language === "en"}
        onClick={() => chooseLanguage("en")}
      >
        EN
      </Button>
      <Button
        type="button"
        variant={language === "ar" ? "secondary" : "outline"}
        size="sm"
        aria-pressed={language === "ar"}
        onClick={() => chooseLanguage("ar")}
      >
        ع
      </Button>
    </div>
  );
}
