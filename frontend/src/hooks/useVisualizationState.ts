import { useState } from "react";
import type { VisualizationState } from "@/types";

export const useVisualizationState = () => {
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

  const setMainFormLoading = (mainFormLoading: boolean) => {
    setState(prev => ({ ...prev, mainFormLoading }));
  };

  const setResubmitLoading = (resubmitLoading: boolean) => {
    setState(prev => ({ ...prev, resubmitLoading }));
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

  return {
    ...state,
    setMainFormLoading,
    setResubmitLoading,
    setError,
    setResults,
    resetResults,
    resetVisuals,
  };
}; 