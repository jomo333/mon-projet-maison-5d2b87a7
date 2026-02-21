import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Upload, Camera, Loader2 } from "lucide-react";

interface FileOrPhotoUploadProps {
  /** Called when files are selected (via file picker or camera) */
  onFilesSelected: (files: FileList) => void;
  accept?: string;
  disabled?: boolean;
  uploading?: boolean;
  /** Label for the file button (default: "Fichier / PDF") */
  fileLabel?: string;
  /** Label for the photo button (default: "Prendre une photo") */
  photoLabel?: string;
  /** Additional class names for the wrapper */
  className?: string;
  /** Button size */
  size?: "sm" | "default" | "lg";
  /** Variant for file button */
  fileVariant?: "outline" | "default" | "secondary";
  /** Variant for photo button */
  photoVariant?: "outline" | "default" | "secondary";
  multiple?: boolean;
}

/**
 * Dual upload button: one for regular file picker (PDF, docs, images)
 * and one that opens the camera directly on mobile devices.
 * Both are hidden <input> elements triggered by the visible buttons.
 *
 * The camera input uses `capture="environment"` so it opens the rear camera
 * on mobile, and falls back to a file picker on desktop.
 */
export function FileOrPhotoUpload({
  onFilesSelected,
  accept = ".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp,.heic",
  disabled = false,
  uploading = false,
  fileLabel = "Fichier / PDF",
  photoLabel = "Photo du document",
  className = "",
  size = "sm",
  fileVariant = "outline",
  photoVariant = "outline",
  multiple = false,
}: FileOrPhotoUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFilesSelected(e.target.files);
      // Reset value so same file can be re-selected
      e.target.value = "";
    }
  };

  return (
    <div className={`flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2 w-full sm:w-auto ${className}`}>
      {/* Hidden file input (PDFs, docs, any image) */}
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        className="hidden"
        multiple={multiple}
        onChange={handleChange}
      />

      {/* Hidden camera/photo input — capture="environment" opens rear camera on mobile */}
      <input
        ref={photoInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleChange}
      />

      {/* File button */}
      <Button
        variant={fileVariant}
        size={size}
        disabled={disabled || uploading}
        onClick={() => fileInputRef.current?.click()}
        className="gap-1.5 w-full sm:w-auto min-h-[44px]"
        type="button"
      >
        {uploading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Upload className="h-4 w-4" />
        )}
        {fileLabel}
      </Button>

      {/* Camera / Photo button */}
      <Button
        variant={photoVariant}
        size={size}
        disabled={disabled || uploading}
        onClick={() => photoInputRef.current?.click()}
        className="gap-1.5 w-full sm:w-auto min-h-[44px]"
        type="button"
      >
        <Camera className="h-4 w-4" />
        {photoLabel}
      </Button>
    </div>
  );
}
