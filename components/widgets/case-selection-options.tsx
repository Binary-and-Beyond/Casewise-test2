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
          <div className="text-gray-400 flex items-center justify-center w-6 h-6">
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </div>
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
          <div className="text-gray-400 flex items-center justify-center w-6 h-6">
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </div>
        </div>
      </div>
      <div
        className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-sm cursor-pointer"
        onClick={onExploreCases}
      >
        <div className="flex items-center justify-between">
          <span className="font-medium text-gray-900">C) Explore Case</span>
          <div className="text-gray-400 flex items-center justify-center w-6 h-6">
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}
