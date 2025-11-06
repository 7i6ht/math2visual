import { AlertCircle } from "lucide-react";

interface ParseErrorSectionProps {
  message?: string;
}

export const ParseErrorSection = ({ message = "Could not parse Visual Language." }: ParseErrorSectionProps) => {
  return (
    <div className="w-full space-y-4 p-4 bg-destructive/5 border border-destructive/20 rounded-lg">
      <div className="flex items-center gap-3">
        <AlertCircle className="responsive-icon-font-size text-destructive" />
        <h3 className="font-semibold text-destructive responsive-text-font-size">Parse Error</h3>
      </div>
      <div className="responsive-text-font-size text-destructive">
        {message}
      </div>
    </div>
  );
};


