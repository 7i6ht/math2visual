import React from "react";
import { HighlightableTextarea } from "./highlightable-textarea";
import { cn } from "@/lib/utils";

type MWPTextEntryProps = {
  value: string;
  onChange: React.ChangeEventHandler<HTMLTextAreaElement>;
  onSubmit?: () => void;
  onKeyDown?: React.KeyboardEventHandler<HTMLTextAreaElement>;
  errorText?: string | null;
  placeholder?: string;
  rows?: number;
  disabled?: boolean;
  highlightRanges?: Array<[number, number]>;
  containerClassName?: string;
  textareaClassName?: string;
} & Omit<
  React.ComponentProps<typeof HighlightableTextarea>,
  | "value"
  | "onChange"
  | "rows"
  | "placeholder"
  | "disabled"
  | "onKeyDown"
  | "className"
  | "highlightRanges"
>;

export const MWPTextEntry = React.forwardRef<HTMLTextAreaElement, MWPTextEntryProps>(
  (
    {
      value,
      onChange,
      onSubmit,
      onKeyDown,
      errorText,
      placeholder,
      rows = 5,
      disabled = false,
      highlightRanges,
      containerClassName,
      textareaClassName,
      ...textareaProps
    },
    ref
  ) => {
    const handleKeyDown: React.KeyboardEventHandler<HTMLTextAreaElement> = (e) => {
      if (onSubmit && e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        onSubmit();
        return;
      }
      if (onKeyDown) {
        onKeyDown(e);
      }
    };

    return (
      <div className={cn("space-y-1", containerClassName)}>
        <HighlightableTextarea
          ref={ref}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          rows={rows}
          spellCheck={false}
          disabled={disabled}
          highlightRanges={highlightRanges}
          className={cn("w-full responsive-text-font-size", textareaClassName)}
          onKeyDown={handleKeyDown}
          {...textareaProps}
        />
        {errorText ? (
          <p className="text-destructive responsive-text-font-size">{errorText}</p>
        ) : null}
      </div>
    );
  }
);

MWPTextEntry.displayName = "MWPTextEntry";


