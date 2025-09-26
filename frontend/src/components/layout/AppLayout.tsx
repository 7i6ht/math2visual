import { Toaster } from "@/components/ui/sonner";
import { useAppState } from "@/hooks/useAppState";
import { useLayoutMode } from "@/hooks/useLayoutMode";
import { InitialView } from "./InitialView";
import { TwoColumnView } from "./TwoColumnView";

export function AppLayout() {
  const appState = useAppState();
  const { showInitialView } = useLayoutMode(
    appState.hasCompletedGeneration,
    appState.mpFormLoading
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-muted/30">
      {showInitialView ? (
        <InitialView appState={appState} />
      ) : (
        <TwoColumnView appState={appState} />
      )}
      <Toaster />
    </div>
  );
}


