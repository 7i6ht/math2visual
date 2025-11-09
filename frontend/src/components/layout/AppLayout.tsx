import { useEffect } from "react";
import { Toaster } from "@/components/ui/sonner";
import { useAppState } from "@/hooks/useAppState";
import { startCursorTracking, stopCursorTracking, isAnalyticsEnabled, trackOutermostScroll } from "@/services/analyticsTracker";
import { InitialView } from "./InitialView";
import { TwoColumnView } from "./TwoColumnView";

export function AppLayout() {
  const appState = useAppState();
  const analyticsEnabled = isAnalyticsEnabled();

  // Initialize analytics cursor tracking and body scroll tracking
  useEffect(() => {
    if (analyticsEnabled) {
      startCursorTracking();
      
      // Add scroll listener to body element
      const handleBodyScroll = (event: Event) => {
        trackOutermostScroll(event);
      };
      
      document.body.addEventListener('scroll', handleBodyScroll);
      
      return () => {
        document.body.removeEventListener('scroll', handleBodyScroll);
        stopCursorTracking();
      };
    }
  }, [analyticsEnabled]);

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


