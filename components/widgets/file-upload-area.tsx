"use client";
import { Button } from "@/components/ui/button";

interface FileUploadAreaProps {
  onDragOver: (event: React.DragEvent) => void;
  onDrop: (event: React.DragEvent) => void;
  onFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  isLoading?: boolean;
  variant?: "primary" | "secondary";
  className?: string;
}

export function FileUploadArea({
  onDragOver,
  onDrop,
  onFileUpload,
  isLoading = false,
  variant = "primary",
  className = "",
}: FileUploadAreaProps) {
  const isPrimary = variant === "primary";

  const containerClasses = isPrimary
    ? "bg-blue-500 rounded-lg p-12 text-center text-white mb-8"
    : "border-2 border-dashed border-gray-300 rounded-lg p-8 text-center bg-gray-50 hover:bg-gray-100 transition-colors";

  const iconClasses = isPrimary
    ? "w-8 h-8 mx-auto mb-2 text-white"
    : "w-8 h-8 mx-auto mb-2 text-gray-400";

  const textClasses = isPrimary ? "text-white" : "text-gray-700";

  const buttonClasses = isPrimary
    ? "bg-white text-blue-500 hover:bg-gray-100"
    : "bg-blue-500 text-white hover:bg-blue-600";

  return (
    <div
      className={`${containerClasses} ${className}`}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <div className="mb-4">
        <svg
          className={iconClasses}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
          />
        </svg>
      </div>
      {isLoading ? (
        <div className="flex flex-col items-center">
          <div
            className={`animate-spin rounded-full h-8 w-8 border-b-2 mb-4 ${
              isPrimary ? "border-white" : "border-blue-500"
            }`}
          ></div>
          <p className={`text-lg mb-4 ${textClasses}`}>Uploading...</p>
        </div>
      ) : (
        <>
          <p className={`text-lg mb-4 ${textClasses}`}>
            {isPrimary ? "Drag and Drop here" : "Drag and drop your file here"}
          </p>
          <p className={`text-sm mb-4 ${textClasses} opacity-75`}>or</p>
          <label htmlFor="file-upload">
            <Button variant="secondary" className={buttonClasses} asChild>
              <span>select a file</span>
            </Button>
          </label>
          <p
            className={`text-xs mt-4 font-medium ${
              isPrimary ? "opacity-90" : "text-gray-500"
            }`}
          >
            Maximum file size: 20MB • Supported formats: PDF, DOC, DOCX, TXT
          </p>
        </>
      )}
      <input
        id="file-upload"
        type="file"
        accept=".pdf,.doc,.docx,.txt"
        onChange={onFileUpload}
        className="hidden"
      />
    </div>
  );
}
