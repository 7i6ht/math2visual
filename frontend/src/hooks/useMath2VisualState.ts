import { useState } from "react";
import type { VisualizationState } from "@/types";
import { useAbortController } from "./useAbortController";

export const useMath2VisualState = () => {
  const [state, setState] = useState<VisualizationState>({
    vl: null,
    error: null,
    mainFormLoading: false,
    resubmitLoading: false,
    svgFormal: null,
    svgIntuitive: null,
    formalError: null,
    intuitiveError: null,
  });

  // Abort controllers for ongoing requests
  const mainAbortController = useAbortController();
  const resubmitAbortController = useAbortController();

  const setMainFormLoading = (mainFormLoading: boolean) => {
    setState(prev => ({ ...prev, mainFormLoading }));
    
    // Clean up abort controller when loading stops
    if (!mainFormLoading) {
      mainAbortController.cleanup();
    }
  };

  const setResubmitLoading = (resubmitLoading: boolean) => {
    setState(prev => ({ ...prev, resubmitLoading }));
    
    // Clean up abort controller when loading stops
    if (!resubmitLoading) {
      resubmitAbortController.cleanup();
    }
  };

  const setError = (error: string | null) => {
    setState(prev => ({ ...prev, error }));
  };

  const setResults = (
    vl: string,
    svgFormal: string | null,
    svgIntuitive: string | null,
    formalError?: string | null,
    intuitiveError?: string | null
  ) => {
    setState(prev => ({
      ...prev,
      vl,
      svgFormal,
      svgIntuitive,
      formalError: formalError || null,
      intuitiveError: intuitiveError || null,
      error: null,
    }));
  };

  const resetResults = () => {
    setState(prev => ({
      ...prev,
      vl: null,
      svgFormal: null,
      svgIntuitive: null,
      formalError: null,
      intuitiveError: null,
      error: null,
    }));
  };

  const resetVisuals = () => {
    setState(prev => ({
      ...prev,
      svgFormal: null,
      svgIntuitive: null,
      formalError: null,
      intuitiveError: null,
      error: null,
    }));
  };

  const abortMainRequest = () => {
    if (mainAbortController.abort()) {
      setMainFormLoading(false);
      setError("Generation cancelled");
    }
  };

  const abortResubmitRequest = () => {
    if (resubmitAbortController.abort()) {
      setResubmitLoading(false);
      setError("Update cancelled");
    }
  };

  const setMainAbortController = (controller: AbortController) => {
    mainAbortController.setController(controller);
  };

  const setResubmitAbortController = (controller: AbortController) => {
    resubmitAbortController.setController(controller);
  };

  return {
    ...state,
    setMainFormLoading,
    setResubmitLoading,
    setError,
    setResults,
    resetResults,
    resetVisuals,
    abortMainRequest,
    abortResubmitRequest,
    setMainAbortController,
    setResubmitAbortController,
  };
}; 