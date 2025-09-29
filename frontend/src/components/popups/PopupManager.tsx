import { SVGActionMenu } from "@/components/popups/SVGActionMenu";
import { EntityQuantityPopup } from "@/components/popups/EntityQuantityPopup";
import { ContainerNamePopup } from "@/components/popups/ContainerNamePopup";

type Props = {
  isSelectorOpen: boolean;
  onCloseSelector: () => void;
  onEmbeddedSVGChange: (newType: string) => Promise<void>;

  quantityPopupState: { isOpen: boolean; initialQuantity: number };
  closeQuantityPopup: () => void;
  updateEntityQuantity: (newQuantity: number) => Promise<void>;

  containerNamePopupState: { isOpen: boolean; initialContainerName: string };
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

      {quantityPopupState.isOpen && (
        <EntityQuantityPopup
          onClose={closeQuantityPopup}
          onUpdate={updateEntityQuantity}
          initialQuantity={quantityPopupState.initialQuantity}
        />
      )}

      {containerNamePopupState.isOpen && (
        <ContainerNamePopup
          onClose={closeContainerNamePopup}
          onUpdate={updateContainerName}
          initialContainerName={containerNamePopupState.initialContainerName}
        />
      )}
    </>
  );
}


