"use client";

interface CaseSelectionOptionsProps {
  onGenerateMCQs: () => void;
  onIdentifyConcepts: () => void;
  onExploreCases: () => void;
  disabled?: boolean;
}

export function CaseSelectionOptions({
  onGenerateMCQs,
  onIdentifyConcepts,
  onExploreCases,
  disabled = false,
}: CaseSelectionOptionsProps) {
  return (
    <div className="space-y-4">
      <div
        className={`bg-white border border-gray-200 rounded-lg p-4 ${
          disabled
            ? "opacity-50 cursor-not-allowed"
            : "hover:shadow-sm cursor-pointer"
        }`}
        onClick={disabled ? undefined : onIdentifyConcepts}
      >
        <div className="flex items-center justify-between">
          <span className="font-medium text-gray-900">
            A) Identify Concepts
          </span>
        </div>
      </div>
      <div
        className={`bg-white border border-gray-200 rounded-lg p-4 ${
          disabled
            ? "opacity-50 cursor-not-allowed"
            : "hover:shadow-sm cursor-pointer"
        }`}
        onClick={disabled ? undefined : onExploreCases}
      >
        <div className="flex items-center justify-between">
          <span className="font-medium text-gray-900">B) Explore Case</span>
        </div>
      </div>
      <div
        className={`bg-white border border-gray-200 rounded-lg p-4 ${
          disabled
            ? "opacity-50 cursor-not-allowed"
            : "hover:shadow-sm cursor-pointer"
        }`}
        onClick={disabled ? undefined : onGenerateMCQs}
      >
        <div className="flex items-center justify-between">
          <span className="font-medium text-gray-900">C) Generate MCQs</span>
        </div>
      </div>
    </div>
  );
}
