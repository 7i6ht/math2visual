import { useEffect } from "react";
import { Toaster } from "@/components/ui/sonner";
import { useAppState } from "@/hooks/useAppState";
import { useAnalytics } from "@/hooks/useAnalytics";
import { InitialView } from "./InitialView";
import { TwoColumnView } from "./TwoColumnView";

export function AppLayout() {
  const appState = useAppState();
  const { startCursorTracking, isAnalyticsEnabled, trackOutermostScroll } = useAnalytics();

  // Initialize analytics cursor tracking and body scroll tracking
  useEffect(() => {
    if (isAnalyticsEnabled) {
      startCursorTracking();
      
      // Add scroll listener to body element
      const handleBodyScroll = (event: Event) => {
        trackOutermostScroll(event as any);
      };
      
      document.body.addEventListener('scroll', handleBodyScroll);
      
      return () => {
        document.body.removeEventListener('scroll', handleBodyScroll);
      };
    }
  }, [startCursorTracking, isAnalyticsEnabled, trackOutermostScroll]);

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


