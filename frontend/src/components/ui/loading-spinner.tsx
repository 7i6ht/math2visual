import type { LoadingSpinnerProps } from "@/types";

export const LoadingSpinner = ({ message = "Generating..." }: LoadingSpinnerProps) => {
  return (
    <div className="flex items-center justify-center space-x-2">
      <div className="loading-spinner"></div>
      <span className="text-muted-foreground">{message}</span>
    </div>
  );
}; 