"use client";

interface CaseSelectionOptionsProps {
  onGenerateMCQs: () => void;
  onIdentifyConcepts: () => void;
  onExploreCases: () => void;
}

export function CaseSelectionOptions({
  onGenerateMCQs,
  onIdentifyConcepts,
  onExploreCases,
}: CaseSelectionOptionsProps) {
  return (
    <div className="space-y-4">
      <div
        className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-sm cursor-pointer"
        onClick={onGenerateMCQs}
      >
        <div className="flex items-center justify-between">
          <span className="font-medium text-gray-900">A) Generate MCQs</span>
        </div>
      </div>
      <div
        className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-sm cursor-pointer"
        onClick={onIdentifyConcepts}
      >
        <div className="flex items-center justify-between">
          <span className="font-medium text-gray-900">
            B) Identify Concepts
          </span>
        </div>
      </div>
      <div
        className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-sm cursor-pointer"
        onClick={onExploreCases}
      >
        <div className="flex items-center justify-between">
          <span className="font-medium text-gray-900">C) Explore Case</span>
        </div>
      </div>
    </div>
  );
}
