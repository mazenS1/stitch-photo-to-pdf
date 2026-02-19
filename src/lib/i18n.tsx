import { createContext, useContext, useState, useEffect } from "react";
import type { ReactNode } from "react";

export type Language = "en" | "ar";

interface Translations {
  title: string;
  subtitle: string;
  addPhotos: string;
  addBlankPage: string;
  preview: string;
  generating: string;
  preparingDownload: string;
  downloadPdf: string;
  download: string;
  pdfName: string;
  pdfNamePlaceholder: string;
  clearAll: string;
  photo: string;
  photos: string;
  pages: string;
  dragToReorder: string;
  tapToReorder: string;
  eachPhotoPage: string;
  eachPage: string;
  page: string;
  blankPage: string;
  blankPagePreview: string;
  blankPagePlaceholder: string;
  writeOnBlankPages: string;
  orAddBlankPage: string;
  tapToUpload: string;
  dragAndDrop: string;
  pdfPreview: string;
  close: string;
  removeImage: string;
  removePage: string;
  moveUp: string;
  moveDown: string;
}

const translations: Record<Language, Translations> = {
  en: {
    title: "Photo to PDF",
    subtitle: "Upload photos and convert them into a single PDF file",
    addPhotos: "Add Photos",
    addBlankPage: "Add Blank Page",
    preview: "Preview",
    generating: "Generating...",
    preparingDownload: "Preparing download...",
    downloadPdf: "Download PDF",
    download: "Download",
    pdfName: "PDF name",
    pdfNamePlaceholder: "e.g. photos",
    clearAll: "Clear All",
    photo: "photo",
    photos: "photos",
    pages: "pages",
    dragToReorder: "Drag pages to reorder",
    tapToReorder: "Tap arrows to reorder pages",
    eachPhotoPage: "Each photo = 1 page",
    eachPage: "Each item = 1 page",
    page: "Page",
    blankPage: "Blank page",
    blankPagePreview: "Type text below to add content",
    blankPagePlaceholder: "Write what you want on this blank page",
    writeOnBlankPages: "Write on blank pages",
    orAddBlankPage: "or use Add Blank Page to write text",
    tapToUpload: "Tap to upload photos",
    dragAndDrop: "or drag and drop images here",
    pdfPreview: "PDF Preview",
    close: "Close",
    removeImage: "Remove image",
    removePage: "Remove page",
    moveUp: "Move up",
    moveDown: "Move down",
  },
  ar: {
    title: "تحويل الصور إلى PDF",
    subtitle: "ارفع الصور وحوّلها إلى ملف PDF واحد",
    addPhotos: "إضافة صور",
    addBlankPage: "إضافة صفحة فارغة",
    preview: "معاينة",
    generating: "جاري الإنشاء...",
    preparingDownload: "جاري تجهيز التحميل...",
    downloadPdf: "تحميل PDF",
    download: "تحميل",
    pdfName: "اسم ملف PDF",
    pdfNamePlaceholder: "مثال: الصور",
    clearAll: "مسح الكل",
    photo: "صورة",
    photos: "صور",
    pages: "صفحات",
    dragToReorder: "اسحب الصفحات لإعادة الترتيب",
    tapToReorder: "اضغط الأسهم لإعادة ترتيب الصفحات",
    eachPhotoPage: "كل صورة = صفحة واحدة",
    eachPage: "كل عنصر = صفحة واحدة",
    page: "صفحة",
    blankPage: "صفحة فارغة",
    blankPagePreview: "اكتب النص بالأسفل لإضافة المحتوى",
    blankPagePlaceholder: "اكتب ما تريد في هذه الصفحة الفارغة",
    writeOnBlankPages: "الكتابة على الصفحات الفارغة",
    orAddBlankPage: "أو استخدم زر إضافة صفحة فارغة للكتابة",
    tapToUpload: "اضغط لرفع الصور",
    dragAndDrop: "أو اسحب وأفلت الصور هنا",
    pdfPreview: "معاينة PDF",
    close: "إغلاق",
    removeImage: "حذف الصورة",
    removePage: "حذف الصفحة",
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
