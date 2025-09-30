import { useDSLContext } from "@/contexts/DSLContext";
import type { ParsedOperation } from "@/utils/dsl-parser";
import type { ComponentMapping } from "@/types/visualInteraction";
import { detectDSLChanges, updateMWPText } from "@/lib/dsl-utils";

export type VisualizationHandlersDeps = {
  svgFormal: string | null;
  svgIntuitive: string | null;
  formalError: string | null;
  intuitiveError: string | null;
  missingSVGEntities: string[] | null;
  mwp: string;
  formula: string | null;
  setResults: (
    vl: string,
    svgFormal: string | null,
    svgIntuitive: string | null,
    parsedDSL: ParsedOperation,
    formalError?: string | null,
    intuitiveError?: string | null,
    missing?: string[] | undefined,
    mwp?: string,
    formula?: string | undefined,
    componentMappings?: ComponentMapping | undefined
  ) => void
};

export const useVisualizationHandlers = ({
  svgFormal,
  svgIntuitive,
  formalError,
  intuitiveError,
  missingSVGEntities,
  mwp,
  formula,
  setResults,
}: VisualizationHandlersDeps) => {
  const { componentMappings: contextComponentMappings } =
    useDSLContext();

  const handleVLResult = (
    nextVL: string,
    nextSvgFormal: string | null,
    nextSvgIntuitive: string | null,
    nextParsedDSL: ParsedOperation,
    currentParsedDSL: ParsedOperation,
    nextFormalError?: string,
    nextIntuitiveError?: string,
    nextMissing?: string[],
    nextMWPOverride?: string,
    nextFormula?: string,
    nextMappings?: ComponentMapping
  ) => {
    let nextMWP = nextMWPOverride ?? mwp;
    if (!nextMWPOverride) {
      const changes = detectDSLChanges(currentParsedDSL, nextParsedDSL);
      if (changes.length > 0) {
        nextMWP = updateMWPText(mwp, changes);
      }
    }

    const mergedSvgFormal = nextSvgFormal ?? svgFormal;
    const mergedSvgIntuitive = nextSvgIntuitive ?? svgIntuitive;

    const mergedFormalError =
      nextFormalError !== undefined ? nextFormalError : formalError;
    const mergedIntuitiveError =
      nextIntuitiveError !== undefined ? nextIntuitiveError : intuitiveError;
    const mergedMissing =
      nextMissing !== undefined ? nextMissing : missingSVGEntities;
    const mergedFormula = nextFormula !== undefined ? nextFormula : formula;
    const mergedMappings =
      nextMappings !== undefined ? nextMappings : contextComponentMappings;

    setResults(
      nextVL,
      mergedSvgFormal,
      mergedSvgIntuitive,
      nextParsedDSL,
      mergedFormalError,
      mergedIntuitiveError,
      mergedMissing ?? undefined,
      nextMWP,
      mergedFormula ?? undefined,
      mergedMappings || undefined
    );
  };

  return {
    handleVLResult
  };
};


