import { AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { AlertCircle } from "lucide-react";

interface ParseErrorSectionProps {
  message?: string;
}

export const ParseErrorSection = ({ message = "Could not parse Visual Language." }: ParseErrorSectionProps) => {
  return (
    <AccordionItem value="parse-error" className="border rounded-lg !border-b bg-destructive/5 border-destructive/20">
      <AccordionTrigger className="px-4 hover:no-underline">
        <div className="flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-destructive" />
          <span className="font-normal text-destructive">Parse Error</span>
        </div>
      </AccordionTrigger>
      <AccordionContent className="px-4">
        <div className="text-sm text-destructive">
          {message}
        </div>
      </AccordionContent>
    </AccordionItem>
  );
};


