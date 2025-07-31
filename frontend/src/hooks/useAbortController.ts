import { useRef } from "react";

export const useAbortController = () => {
  const controllerRef = useRef<AbortController | null>(null);

  const createController = (): AbortController => {
    const controller = new AbortController();
    controllerRef.current = controller;
    return controller;
  };

  const abort = (): boolean => {
    if (controllerRef.current) {
      controllerRef.current.abort();
      controllerRef.current = null;
      return true; // Successfully aborted
    }
    return false; // Nothing to abort
  };

  const cleanup = () => {
    controllerRef.current = null;
  };

  const hasActiveController = (): boolean => {
    return controllerRef.current !== null;
  };

  const setController = (controller: AbortController) => {
    controllerRef.current = controller;
  };

  return {
    createController,
    abort,
    cleanup,
    hasActiveController,
    setController,
  };
}; 