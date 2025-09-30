import { Toaster } from "@/components/ui/sonner";
import { useAppState } from "@/hooks/useAppState";
import { InitialView } from "./InitialView";
import { TwoColumnView } from "./TwoColumnView";

export function AppLayout() {
  const appState = useAppState();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-muted/30">
      { appState.hasCompletedGeneration ? (
        <TwoColumnView appState={appState} />
      ) : (
        <InitialView appState={appState} />
      )}
      <Toaster />
    </div>
  );
}


