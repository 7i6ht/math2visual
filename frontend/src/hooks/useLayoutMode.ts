import { useMemo } from "react";

export const useLayoutMode = (
  hasCompletedGeneration: boolean,
  mpFormLoading: boolean
) => {
  return useMemo(
    () => ({
      showInitialView: !hasCompletedGeneration || mpFormLoading,
      showTwoColumnView: hasCompletedGeneration && !mpFormLoading,
    }),
    [hasCompletedGeneration, mpFormLoading]
  );
};


