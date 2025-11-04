import { useCallback, useMemo } from "react";
import { useSVGSelector } from "./useSVGSelector";
import { useEntityQuantityPopup } from "@/hooks/useEntityQuantityPopup";
import { useNamePopup } from "@/hooks/useNamePopup";
import type { ComponentMapping } from "@/types/visualInteraction";
import type { ParsedOperation } from "@/utils/dsl-parser";

export type PopupManagementDeps = {
  onVisualsUpdate: (data: {
    visual_language: string;
    svg_formal: string | null;
    svg_intuitive: string | null;
    formal_error: string | null;
    intuitive_error: string | null;
    missing_svg_entities: string[];
    componentMappings: ComponentMapping;
    parsedDSL: ParsedOperation;
  }) => void;
};

export const usePopupManagement = ({ onVisualsUpdate }: PopupManagementDeps) => {

  const {
    selectorState : selectorPopupState,
    openSelector : openSelectorPopup,
    closeSelector : closeSelectorPopup,
    updateEmbeddedSVG : updateSVG,
  } = useSVGSelector({ onVisualsUpdate });

  const {
    popupState: quantityPopupState,
    openPopup: openQuantityPopup,
    closePopup: closeQuantityPopup,
    updateEntityQuantity,
  } = useEntityQuantityPopup({ onVisualsUpdate });

  const {
    popupState: namePopupState,
    openPopup: openNamePopup,
    closePopup: closeNamePopup,
    updateFieldValue: updateName,
  } = useNamePopup({ onVisualsUpdate });

  const handleEmbeddedSVGClick = useCallback(
    (event: MouseEvent) => openSelectorPopup(event),
    [openSelectorPopup]
  );

  const handleEntityQuantityClick = useCallback(
    (event: MouseEvent) => openQuantityPopup(event),
    [openQuantityPopup]
  );

  const handleNameClick = useCallback(
    (event: MouseEvent) => openNamePopup(event),
    [openNamePopup]
  );

  return useMemo(() => ({
    selectorPopupState,
    closeSelectorPopup,
    updateSVG,
    handleEmbeddedSVGClick,
    quantityPopupState,
    closeQuantityPopup,
    updateEntityQuantity,
    handleEntityQuantityClick,
    namePopupState,
    closeNamePopup,
    updateName,
    handleNameClick,
  }), [
    selectorPopupState,
    closeSelectorPopup,
    updateSVG,
    handleEmbeddedSVGClick,
    quantityPopupState,
    closeQuantityPopup,
    updateEntityQuantity,
    handleEntityQuantityClick,
    namePopupState,
    closeNamePopup,
    updateName,
    handleNameClick,
  ]);
};


