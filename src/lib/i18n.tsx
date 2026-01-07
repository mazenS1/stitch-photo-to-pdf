import { createContext, useContext, useState, useEffect } from "react";
import type { ReactNode } from "react";

export type Language = "en" | "ar";

interface Translations {
  title: string;
  subtitle: string;
  addPhotos: string;
  preview: string;
  generating: string;
  downloadPdf: string;
  download: string;
  clearAll: string;
  photo: string;
  photos: string;
  dragToReorder: string;
  tapToReorder: string;
  eachPhotoPage: string;
  page: string;
  tapToUpload: string;
  dragAndDrop: string;
  pdfPreview: string;
  close: string;
  removeImage: string;
  moveUp: string;
  moveDown: string;
}

const translations: Record<Language, Translations> = {
  en: {
    title: "Photo to PDF",
    subtitle: "Upload photos and convert them into a single PDF file",
    addPhotos: "Add Photos",
    preview: "Preview",
    generating: "Generating...",
    downloadPdf: "Download PDF",
    download: "Download",
    clearAll: "Clear All",
    photo: "photo",
    photos: "photos",
    dragToReorder: "Drag photos to reorder",
    tapToReorder: "Tap arrows to reorder",
    eachPhotoPage: "Each photo = 1 page",
    page: "Page",
    tapToUpload: "Tap to upload photos",
    dragAndDrop: "or drag and drop images here",
    pdfPreview: "PDF Preview",
    close: "Close",
    removeImage: "Remove image",
    moveUp: "Move up",
    moveDown: "Move down",
  },
  ar: {
    title: "تحويل الصور إلى PDF",
    subtitle: "ارفع الصور وحوّلها إلى ملف PDF واحد",
    addPhotos: "إضافة صور",
    preview: "معاينة",
    generating: "جاري الإنشاء...",
    downloadPdf: "تحميل PDF",
    download: "تحميل",
    clearAll: "مسح الكل",
    photo: "صورة",
    photos: "صور",
    dragToReorder: "اسحب الصور لإعادة الترتيب",
    tapToReorder: "اضغط الأسهم لإعادة الترتيب",
    eachPhotoPage: "كل صورة = صفحة واحدة",
    page: "صفحة",
    tapToUpload: "اضغط لرفع الصور",
    dragAndDrop: "أو اسحب وأفلت الصور هنا",
    pdfPreview: "معاينة PDF",
    close: "إغلاق",
    removeImage: "حذف الصورة",
    moveUp: "تحريك لأعلى",
    moveDown: "تحريك لأسفل",
  },
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: Translations;
  isRTL: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(
  undefined
);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem("language");
    return (saved as Language) || "ar";
  });

  const isRTL = language === "ar";

  useEffect(() => {
    localStorage.setItem("language", language);
    document.documentElement.dir = isRTL ? "rtl" : "ltr";
    document.documentElement.lang = language;
  }, [language, isRTL]);

  const value: LanguageContextType = {
    language,
    setLanguage,
    t: translations[language],
    isRTL,
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
