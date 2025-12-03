import "./App.css";
import { HighlightingProvider } from "@/contexts/HighlightingContext";
import { DSLProvider } from "@/contexts/DSLContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { AppLayout } from "@/components/layout/AppLayout";

function App() {
  return (
    <LanguageProvider>
      <HighlightingProvider>
        <DSLProvider>
          <AppLayout />
        </DSLProvider>
      </HighlightingProvider>
    </LanguageProvider>
  );
}

export default App;
