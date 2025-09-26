import { useCallback } from "react";
import { useEntityQuantityPopup } from "@/hooks/useEntityQuantityPopup";
import { useContainerNamePopup } from "@/hooks/useContainerNamePopup";

export type PopupManagementDeps = {
  onVisualsUpdate: (data: any) => void;
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


