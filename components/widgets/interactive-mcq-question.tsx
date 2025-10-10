import React, { useState } from "react";

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

interface InteractiveMCQQuestionProps {
  question: MCQQuestionData;
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
}

export function InteractiveMCQQuestion({
  question,
  index,
  isExpanded,
  onToggle,
}: InteractiveMCQQuestionProps) {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [hasAnswered, setHasAnswered] = useState(false);

  const handleOptionSelect = (optionId: string) => {
    if (hasAnswered) return; // Prevent changing answer after submission

    setSelectedOption(optionId);
    setHasAnswered(true);
    setShowExplanation(false);
  };

  const handleExplain = () => {
    setShowExplanation(true);
  };

  const handleReset = () => {
    setSelectedOption(null);
    setHasAnswered(false);
    setShowExplanation(false);
  };

  const getOptionStyle = (option: MCQOption, optionIndex: number) => {
    const baseStyle = "p-3 rounded border cursor-pointer transition-colors";

    if (!hasAnswered) {
      // Before answering - show as selectable
      return `${baseStyle} bg-white border-gray-200 hover:bg-gray-50 ${
        selectedOption === option.id ? "bg-blue-50 border-blue-300" : ""
      }`;
    }

    // After answering - show correct/incorrect
    if (option.is_correct) {
      return `${baseStyle} bg-green-50 border-green-200 text-green-800`;
    } else if (selectedOption === option.id && !option.is_correct) {
      return `${baseStyle} bg-red-50 border-red-200 text-red-800`;
    } else {
      return `${baseStyle} bg-gray-50 border-gray-200 text-gray-600`;
    }
  };

  const isCorrect =
    selectedOption &&
    question.options.find((opt) => opt.id === selectedOption)?.is_correct;

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-sm">
      <div
        className="flex items-center justify-between cursor-pointer"
        onClick={onToggle}
      >
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
        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="space-y-4">
            {/* Options */}
            <div className="space-y-2">
              {question.options.map((option, optionIndex) => (
                <div
                  key={option.id}
                  className={getOptionStyle(option, optionIndex)}
                  onClick={() => handleOptionSelect(option.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <span className="font-medium mr-3">
                        {String.fromCharCode(65 + optionIndex)})
                      </span>
                      <span>{option.text}</span>
                    </div>

                    {/* Show checkmark for correct answer after answering */}
                    {hasAnswered && option.is_correct && (
                      <span className="text-green-600 text-lg">✓</span>
                    )}

                    {/* Show X for wrong selected answer */}
                    {hasAnswered &&
                      selectedOption === option.id &&
                      !option.is_correct && (
                        <span className="text-red-600 text-lg">✗</span>
                      )}
                  </div>
                </div>
              ))}
            </div>

            {/* Answer Feedback */}
            {hasAnswered && (
              <div
                className={`p-3 rounded-lg ${
                  isCorrect
                    ? "bg-green-50 border border-green-200"
                    : "bg-red-50 border border-red-200"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    {isCorrect ? (
                      <>
                        <span className="text-green-600 text-lg mr-2">✓</span>
                        <span className="font-medium text-green-800">
                          Correct!
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="text-red-600 text-lg mr-2">✗</span>
                        <span className="font-medium text-red-800">
                          Incorrect
                        </span>
                      </>
                    )}
                  </div>

                  <div className="flex space-x-2">
                    <button
                      onClick={handleExplain}
                      className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded"
                    >
                      Explain
                    </button>
                    <button
                      onClick={handleReset}
                      className="text-sm bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded"
                    >
                      Try Again
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Explanation */}
            {showExplanation && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">Explanation:</h4>
                <p className="text-sm text-blue-800">{question.explanation}</p>
              </div>
            )}

            {/* Difficulty */}
            <div className="flex items-center justify-between">
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

              {!hasAnswered && (
                <p className="text-sm text-gray-500">
                  Select an answer to check your response
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
