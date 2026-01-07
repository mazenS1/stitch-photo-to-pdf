import { PhotoToPdf } from "@/components/photo-to-pdf";
import { LanguageProvider } from "@/lib/i18n";

export function App() {
  return (
    <LanguageProvider>
      <PhotoToPdf />
    </LanguageProvider>
  );
}

export default App;
