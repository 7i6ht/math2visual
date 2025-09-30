import { useCallback } from "react";
import { useEntityQuantityPopup } from "@/hooks/useEntityQuantityPopup";
import { useContainerNamePopup } from "@/hooks/useContainerNamePopup";
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
    popupState: quantityPopupState,
    openPopup: openQuantityPopup,
    closePopup: closeQuantityPopup,
    updateEntityQuantity,
  } = useEntityQuantityPopup({ onVisualsUpdate });

  const {
    popupState: containerNamePopupState,
    openPopup: openContainerNamePopup,
    closePopup: closeContainerNamePopup,
    updateContainerName,
  } = useContainerNamePopup({ onVisualsUpdate });

  const handleEntityQuantityClick = useCallback(
    (dslPath: string, event: MouseEvent) => {
      openQuantityPopup(dslPath, event);
    },
    [openQuantityPopup]
  );

  const handleContainerNameClick = useCallback(
    (dslPath: string, event: MouseEvent) => {
      openContainerNamePopup(dslPath, event);
    },
    [openContainerNamePopup]
  );

  return {
    quantityPopupState,
    closeQuantityPopup,
    updateEntityQuantity,
    containerNamePopupState,
    closeContainerNamePopup,
    updateContainerName,
    handleEntityQuantityClick,
    handleContainerNameClick,
  };
};


