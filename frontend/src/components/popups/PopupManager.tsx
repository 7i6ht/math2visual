import { SVGActionMenu } from "@/components/popups/SVGActionMenu";
import { EntityQuantityPopup } from "@/components/popups/EntityQuantityPopup";
import { ContainerNamePopup } from "@/components/popups/ContainerNamePopup";

type Props = {
  isSelectorOpen: boolean;
  onCloseSelector: () => void;
  onEmbeddedSVGChange: (newType: string) => Promise<void>;

  quantityPopupState: { isOpen: boolean; dslPath: string };
  closeQuantityPopup: () => void;
  updateEntityQuantity: (newQuantity: number) => Promise<void>;

  containerNamePopupState: { isOpen: boolean; dslPath: string };
  closeContainerNamePopup: () => void;
  updateContainerName: (newContainerName: string) => Promise<void>;
};

export function PopupManager({
  isSelectorOpen,
  onCloseSelector,
  onEmbeddedSVGChange,
  quantityPopupState,
  closeQuantityPopup,
  updateEntityQuantity,
  containerNamePopupState,
  closeContainerNamePopup,
  updateContainerName,
}: Props) {
  return (
    <>
      {isSelectorOpen && (
        <SVGActionMenu
          onClosePopup={onCloseSelector}
          onEmbeddedSVGChange={onEmbeddedSVGChange}
        />
      )}

      {quantityPopupState.isOpen && quantityPopupState.dslPath && (
        <EntityQuantityPopup
          onClose={closeQuantityPopup}
          onUpdate={updateEntityQuantity}
          dslPath={quantityPopupState.dslPath}
        />
      )}

      {containerNamePopupState.isOpen && containerNamePopupState.dslPath && (
        <ContainerNamePopup
          onClose={closeContainerNamePopup}
          onUpdate={updateContainerName}
          dslPath={containerNamePopupState.dslPath}
        />
      )}
    </>
  );
}


