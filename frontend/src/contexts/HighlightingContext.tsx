import { createContext, useContext, useState, type ReactNode } from 'react';

interface HighlightingContextType {
  // State
  currentDSLPath: string | null;
  dslHighlightRanges: Array<[number, number]>;
  mwpHighlightRanges: Array<[number, number]>;
  
  // Actions
  setCurrentDSLPath: (path: string | null) => void;
  setDslHighlightRanges: (ranges: Array<[number, number]>) => void;
  setMwpHighlightRanges: (ranges: Array<[number, number]>) => void;
}

const HighlightingContext = createContext<HighlightingContextType | undefined>(undefined);

interface HighlightingProviderProps {
  children: ReactNode;
}

export function HighlightingProvider({ children }: HighlightingProviderProps) {
  const [currentDSLPath, setCurrentDSLPath] = useState<string | null>(null);
  const [dslHighlightRanges, setDslHighlightRanges] = useState<Array<[number, number]>>([]);
  const [mwpHighlightRanges, setMwpHighlightRanges] = useState<Array<[number, number]>>([]);

  const value: HighlightingContextType = {
    currentDSLPath,
    dslHighlightRanges,
    mwpHighlightRanges,
    setCurrentDSLPath,
    setDslHighlightRanges,
    setMwpHighlightRanges,
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
