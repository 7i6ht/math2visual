import { createContext, useContext, useState, type ReactNode } from 'react';

interface HighlightingContextType {
  // State
  currentDSLPath: string | null;
  currentTargetElement: Element | null;
  dslHighlightRanges: Array<[number, number]>;
  mwpHighlightRanges: Array<[number, number]>;
  formulaHighlightRanges: Array<[number, number]>;
  
  // Actions
  setDslHighlightRanges: (ranges: Array<[number, number]>) => void;
  setMwpHighlightRanges: (ranges: Array<[number, number]>) => void;
  setFormulaHighlightRanges: (ranges: Array<[number, number]>) => void;
  setCurrentDSLPath: (path: string | null) => void;
  setSelectedElement: (element: Element | null) => void;
  clearHighlighting: () => void;
}

const HighlightingContext = createContext<HighlightingContextType | undefined>(undefined);

interface HighlightingProviderProps {
  children: ReactNode;
}

export function HighlightingProvider({ children }: HighlightingProviderProps) {
  const [currentDSLPath, setCurrentDSLPath] = useState<string | null>(null);
  const [currentTargetElement, setCurrentTargetElement] = useState<Element | null>(null);
  const [dslHighlightRanges, setDslHighlightRanges] = useState<Array<[number, number]>>([]);
  const [mwpHighlightRanges, setMwpHighlightRanges] = useState<Array<[number, number]>>([]);
  const [formulaHighlightRanges, setFormulaHighlightRanges] = useState<Array<[number, number]>>([]);

  const setSelectedElement = (element: Element | null) => {
    setCurrentTargetElement(element);
    setCurrentDSLPath(element?.getAttribute('data-dsl-path') || null);
  };

  const clearHighlighting = () => {
    setDslHighlightRanges([]);
    setMwpHighlightRanges([]);
    setFormulaHighlightRanges([]);
    setSelectedElement(null);
  };

  const value: HighlightingContextType = {
    currentDSLPath,
    currentTargetElement,
    dslHighlightRanges,
    mwpHighlightRanges,
    formulaHighlightRanges,
    setDslHighlightRanges,
    setMwpHighlightRanges,
    setFormulaHighlightRanges,
    setCurrentDSLPath,
    setSelectedElement,
    clearHighlighting,
  };

  return (
    <HighlightingContext.Provider value={value}>
      {children}
    </HighlightingContext.Provider>
  );
}

export function useHighlightingContext(): HighlightingContextType {
  const context = useContext(HighlightingContext);
  if (context === undefined) {
    throw new Error('useHighlightingContext must be used within a HighlightingProvider');
  }
  return context;
}
