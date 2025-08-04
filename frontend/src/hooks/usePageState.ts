import { useState } from "react";
import type { PageState, SVGMissingError } from "@/types";

export const usePageState = () => {
  const [state, setState] = useState<PageState>({
    vl: null,
    mpFormLoading: false,
    vlFormLoading: false,
    svgFormal: null,
    svgIntuitive: null,
    formalError: null,
    intuitiveError: null,
    currentAbortFunction: undefined,
    missingSvgError: null,
    uploadLoading: false,
  });

  const setMpFormLoading = (mpFormLoading: boolean, abortFn?: () => void) => {
    setState(prev => ({ 
      ...prev, 
      mpFormLoading,
      currentAbortFunction: mpFormLoading ? abortFn : undefined
    }));
  };

  const setVLFormLoading = (vlFormLoading: boolean, abortFn?: () => void) => {
    setState(prev => ({ 
      ...prev, 
      vlFormLoading,
      currentAbortFunction: vlFormLoading ? abortFn : undefined
    }));
  };

  const setResults = (
    vl: string,
    svgFormal: string | null,
    svgIntuitive: string | null,
    formalError?: string | null,
    intuitiveError?: string | null,
    isSvgMissing?: boolean,
    missingSvgName?: string
  ) => {
    // Determine if we have a missing SVG error
    let missingSvgError: SVGMissingError | null = null;
    if (isSvgMissing && missingSvgName) {
      const bothFailed = !svgFormal && !svgIntuitive;
      missingSvgError = {
        missing_svg_name: missingSvgName,
        both_failed: bothFailed
      };
    }

    setState(prev => ({
      ...prev,
      vl,
      svgFormal,
      svgIntuitive,
      formalError: formalError || null,
      intuitiveError: intuitiveError || null,
      missingSvgError,
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
      missingSvgError: null,
    }));
  };

  const resetVisuals = () => {
    setState(prev => ({
      ...prev,
      svgFormal: null,
      svgIntuitive: null,
      formalError: null,
      intuitiveError: null,
      missingSvgError: null,
    }));
  };

  const setUploadLoading = (uploadLoading: boolean) => {
    setState(prev => ({ ...prev, uploadLoading }));
  };

  const clearMissingSvgError = () => {
    setState(prev => ({ ...prev, missingSvgError: null }));
  };

  return {
    ...state,
    setMpFormLoading,
    setVLFormLoading,
    setResults,
    resetResults,
    resetVisuals,
    setUploadLoading,
    clearMissingSvgError,
  };
}; 