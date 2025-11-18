"use client";

interface ActionButtonsProps {
  onGenerateMCQs: () => void;
  onIdentifyConcepts: () => void;
  disabled?: boolean;
}

export function ActionButtons({
  onGenerateMCQs,
  onIdentifyConcepts,
  disabled = false,
}: ActionButtonsProps) {
  return (
    <div className="flex gap-4 justify-center">
      <button
        onClick={onIdentifyConcepts}
        disabled={disabled}
        className="px-6 py-3 border-2 border-blue-600 text-blue-600 bg-transparent rounded-lg hover:bg-blue-50 transition-colors font-medium shadow-sm hover:shadow-md flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
          />
        </svg>
        Identify Concepts
      </button>
      <button
        onClick={onGenerateMCQs}
        disabled={disabled}
        className="px-6 py-3 border-2 border-green-600 text-green-600 bg-transparent rounded-lg hover:bg-green-50 transition-colors font-medium shadow-sm hover:shadow-md flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
        Generate MCQs
      </button>
    </div>
  );
}
