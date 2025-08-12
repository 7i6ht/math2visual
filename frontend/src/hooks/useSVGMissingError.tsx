import { useRef, useState } from "react";
import { toast } from "sonner";
import { UploadService } from "@/utils/upload";
import { ValidationError } from "@/types";
import { Upload as UploadIcon } from "lucide-react";

interface UseSVGMissingErrorArgs {
  missingSVGEntities: string[];
  onGenerate?: (toastId: string | undefined) => Promise<void>;
  onAllFilesUploaded?: () => void;
}

export const useSVGMissingError = ({
  missingSVGEntities,
  onGenerate,
  onAllFilesUploaded,
}: UseSVGMissingErrorArgs) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [currentEntityIndex, setCurrentEntityIndex] = useState(0);
  const [uploadLoading, setUploadLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUploadAndRegenerate = async (file: File): Promise<void> => {
    if (!onGenerate) return;
    const [toastId, uploadSuccess] = await handleUploadOnly(file);
    if (!uploadSuccess) return;
    try {
      await onGenerate(toastId);
    } catch (error) {
      console.error("Upload and regenerate failed:", error);
      toast.error("Upload and regenerate failed", {
        id: toastId,
        description:
          error instanceof Error
            ? error.message
            : "Failed to regenerate visualizations",
      });
    }
  };

  const handleUploadOnly = async (file: File): Promise<[string, boolean]> => {
    const uploadToastId = `upload-${Date.now()}`;
    const filename = missingSVGEntities[currentEntityIndex];

    try {
      setUploadLoading(true);

      toast.loading("Uploading SVG file...", { id: uploadToastId });

      const uploadResult = await UploadService.uploadSVG(file, filename);

      if (!uploadResult.success) {
        throw new Error(uploadResult.error || "Upload failed");
      }

      setCurrentEntityIndex((prev) => prev + 1);

      // Check if all files have been uploaded
      const totalFiles = missingSVGEntities.length;
      if (currentEntityIndex === totalFiles - 1 && onAllFilesUploaded) {
        toast.success("All missing files have been uploaded!", {
          id: uploadToastId,
        });
        onAllFilesUploaded();
      } else {
        toast.success("SVG file uploaded successfully", { id: uploadToastId });
      }

      return [uploadToastId, true];
    } catch (uploadError) {
      console.error("Upload failed:", uploadError);

      let errorTitle = "Upload failed";
      let errorDescription =
        uploadError instanceof Error
          ? uploadError.message
          : "An unexpected error occurred";

      // Check if this is a ValidationError with validation details
      if (ValidationError.isValidationError(uploadError)) {
        errorTitle = uploadError.title;
        errorDescription = uploadError.message;
        
        // Log validation details for debugging
        // console.log("Validation details:", uploadError.validationDetails);
      } else if (uploadError instanceof Error) {
        // Fallback to basic string matching for legacy errors
        if (uploadError.message.includes("Network error")) {
          errorTitle = "Connection error";
        } else if (uploadError.message.includes("timed out")) {
          errorTitle = "Upload timeout";
        } else if (uploadError.message.includes("too large")) {
          errorTitle = "File too large";
        } else if (uploadError.message.includes("malicious")) {
          errorTitle = "Security check failed";
        }
      }

      toast.error(errorTitle, {
        id: uploadToastId,
        description: errorDescription,
      });

      return [uploadToastId, false];
    } finally {
      setUploadLoading(false);
      // Clear the file input after each upload attempt (success or failure)
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleFileSelect = (file: File) => {
    if (!file.name.toLowerCase().endsWith(".svg")) {
      toast.error("Please select an SVG file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("File too large. Maximum size is 5MB.");
      return;
    }

    const isMultipleEntities = missingSVGEntities.length > 1;
    const isLastEntity = currentEntityIndex === missingSVGEntities.length - 1;

    if (isMultipleEntities && !isLastEntity) {
      handleUploadOnly(file);
      return;
    }

    handleUploadAndRegenerate(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;

    const file = files[0];
    handleFileSelect(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    handleFileSelect(file);
    // Clear the input to allow selecting the same file again
    e.currentTarget.value = "";
  };

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  const getButtonText = () => {
    if (uploadLoading) return "Processing...";

    const isLastEntity = currentEntityIndex === missingSVGEntities.length - 1;
    const isMultipleEntities = missingSVGEntities.length > 1;
    if (isMultipleEntities && !isLastEntity) {
      return "Upload";
    }

    return "Upload & Regenerate"; // Is single entity or last entity
  };

  const getButtonIcon = () => {
    if (uploadLoading) return null;
    return <UploadIcon className="w-4 h-4 mr-2" />;
  };

  return {
    // state
    isDragOver,
    uploadLoading,
    currentEntityIndex,
    // refs
    fileInputRef,
    // handlers
    handleDrop,
    handleDragOver,
    handleDragLeave,
    handleFileInputChange,
    openFileDialog,
    // ui helpers
    getButtonText,
    getButtonIcon,
  } as const;
};


