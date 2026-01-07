import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/i18n";
import type { Language } from "@/lib/i18n";

export function LanguageToggle() {
  const { language, setLanguage } = useLanguage();

  const toggleLanguage = () => {
    const newLang: Language = language === "en" ? "ar" : "en";
    setLanguage(newLang);
  };

  return (
    <Button
      onClick={toggleLanguage}
      variant="outline"
      size="sm"
      className="font-semibold"
      aria-label={
        language === "en" ? "Switch to Arabic" : "التبديل إلى الإنجليزية"
      }
    >
      {language === "en" ? "عربي" : "English"}
    </Button>
  );
}
