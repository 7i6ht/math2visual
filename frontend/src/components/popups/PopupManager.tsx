import { SVGActionMenu } from "@/components/popups/SVGActionMenu";
import { EntityQuantityPopup } from "@/components/popups/EntityQuantityPopup";
import { NamePopup } from "@/components/popups/NamePopup";

type Props = {
  isSelectorOpen: boolean;
  visualElementPath: string;
  visualType: 'formal' | 'intuitive';
  onCloseSelector: () => void;
  onEmbeddedSVGChange: (newType: string) => Promise<void>;

  quantityPopupState: { isOpen: boolean; initialQuantity: number };
  closeQuantityPopup: () => void;
  updateEntityQuantity: (newQuantity: number) => Promise<void>;

  namePopupState: { isOpen: boolean; initialValue: string; };
  closeNamePopup: () => void;
  updateName: (newValue: string) => Promise<void>;
};

export function PopupManager({
  isSelectorOpen,
  visualElementPath,
  visualType,
  onCloseSelector,
  onEmbeddedSVGChange,
  quantityPopupState,
  closeQuantityPopup,
  updateEntityQuantity,
  namePopupState,
  closeNamePopup,
  updateName,
}: Props) {
  return (
    <>
      {isSelectorOpen && (
        <SVGActionMenu
          visualElementPath={visualElementPath}
          visualType={visualType}
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

      {namePopupState.isOpen && (
        <NamePopup
          onClose={closeNamePopup}
          onUpdate={updateName}
          initialValue={namePopupState.initialValue}
        />
      )}
    </>
  );
}


