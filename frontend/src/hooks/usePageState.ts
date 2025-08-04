import { useState } from "react";
import type { PageState } from "@/types";

export const usePageState = () => {
  const [state, setState] = useState<PageState>({
    vl: null,
    mainFormLoading: false,
    resubmitLoading: false,
    svgFormal: null,
    svgIntuitive: null,
    formalError: null,
    intuitiveError: null,
    currentAbortFunction: undefined,
  });

  const setMainFormLoading = (mainFormLoading: boolean, abortFn?: () => void) => {
    setState(prev => ({ 
      ...prev, 
      mainFormLoading,
      currentAbortFunction: mainFormLoading ? abortFn : undefined
    }));
  };

  const setResubmitLoading = (resubmitLoading: boolean, abortFn?: () => void) => {
    setState(prev => ({ 
      ...prev, 
      resubmitLoading,
      currentAbortFunction: resubmitLoading ? abortFn : undefined
    }));
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
    }));
  };

  const resetVisuals = () => {
    setState(prev => ({
      ...prev,
      svgFormal: null,
      svgIntuitive: null,
      formalError: null,
      intuitiveError: null,
    }));
  };

  return {
    ...state,
    setMainFormLoading,
    setResubmitLoading,
    setResults,
    resetResults,
    resetVisuals,
  };
}; 