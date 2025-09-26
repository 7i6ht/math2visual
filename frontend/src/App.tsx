import "./App.css";
import { HighlightingProvider } from "@/contexts/HighlightingContext";
import { DSLProvider } from "@/contexts/DSLContext";
import { AppLayout } from "@/components/layout/AppLayout";

function App() {
  return (
    <HighlightingProvider>
      <DSLProvider>
        <AppLayout />
      </DSLProvider>
    </HighlightingProvider>
  );
}

export default App;
