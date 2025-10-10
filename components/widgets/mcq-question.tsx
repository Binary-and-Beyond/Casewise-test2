"use client";

interface MCQOption {
  id: string;
  text: string;
  is_correct: boolean;
}

interface MCQQuestionData {
  id: string;
  question: string;
  options: MCQOption[];
  explanation: string;
  difficulty: string;
}

interface MCQQuestionProps {
  question: MCQQuestionData;
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
}

export function MCQQuestion({
  question,
  index,
  isExpanded,
  onToggle,
}: MCQQuestionProps) {
  return (
    <div
      className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-sm cursor-pointer"
      onClick={onToggle}
    >
      <div className="flex items-center justify-between">
        <span className="font-medium text-gray-900">
          {index + 1}) {question.question}
        </span>
        <div
          className={`text-gray-400 transition-transform duration-200 flex items-center justify-center w-6 h-6 ${
            isExpanded ? "rotate-180" : ""
          }`}
        >
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
      {isExpanded && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <div className="space-y-3">
            {/* Options */}
            <div className="space-y-2">
              {question.options.map((option, optionIndex) => (
                <div
                  key={option.id}
                  className={`p-2 rounded border ${
                    option.is_correct
                      ? "bg-green-50 border-green-200"
                      : "bg-gray-50 border-gray-200"
                  }`}
                >
                  <span className="font-medium">
                    {String.fromCharCode(65 + optionIndex)})
                  </span>{" "}
                  {option.text}
                  {option.is_correct && (
                    <span className="ml-2 text-green-600 text-sm">
                      ✓ Correct
                    </span>
                  )}
                </div>
              ))}
            </div>

            {/* Explanation */}
            <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded">
              <h4 className="font-medium text-blue-900 mb-1">Explanation:</h4>
              <p className="text-sm text-blue-800">{question.explanation}</p>
            </div>

            {/* Difficulty */}
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">Difficulty:</span>
              <span
                className={`px-2 py-1 rounded text-xs font-medium ${
                  question.difficulty.toLowerCase() === "easy"
                    ? "bg-green-100 text-green-800"
                    : question.difficulty.toLowerCase() === "moderate"
                    ? "bg-yellow-100 text-yellow-800"
                    : "bg-red-100 text-red-800"
                }`}
              >
                {question.difficulty}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
