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
  hint?: string;
}

interface InteractiveMCQQuestionProps {
  question: MCQQuestionData;
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
  onQuestionCompleted?: (questionId: string, isCorrect: boolean) => void;
  onQuestionAttempted?: () => void;
}

export function InteractiveMCQQuestion({
  question,
  index,
  isExpanded,
  onToggle,
  onQuestionCompleted,
  onQuestionAttempted,
}: InteractiveMCQQuestionProps) {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [showAnswer, setShowAnswer] = useState(false);
  const [previousAnswers, setPreviousAnswers] = useState<string[]>([]);
  const [isCompleted, setIsCompleted] = useState(false);

  const handleOptionSelect = (optionId: string) => {
    // Prevent any further attempts if question is already completed
    if (isCompleted) return;

    // Notify parent that user has started attempting this question
    if (attempts === 0) {
      onQuestionAttempted?.();
    }

    setSelectedOption(optionId);
    const newAttemptCount = attempts + 1;
    setAttempts(newAttemptCount);
    setPreviousAnswers((prev) => [...prev, optionId]);

    const isCorrect = question.options.find(
      (opt) => opt.id === optionId
    )?.is_correct;

    if (isCorrect) {
      setHasAnswered(true);
      setShowExplanation(false);
      setIsCompleted(true);
      // Notify parent that question is completed correctly
      onQuestionCompleted?.(question.id, true);
    } else if (newAttemptCount >= 3) {
      // After 3 attempts, automatically show the explanation
      setHasAnswered(true);
      setShowAnswer(true);
      setShowExplanation(true); // Automatically show explanation
      setIsCompleted(true);
      // Notify parent that question is completed after 3 attempts
      onQuestionCompleted?.(question.id, false);
    } else {
      // Show hint after first attempt
      setShowHint(true);
    }
  };

  const handleExplain = () => {
    setShowExplanation(true);
  };

  const handleReset = () => {
    setSelectedOption(null);
    setHasAnswered(false);
    setShowExplanation(false);
    setAttempts(0);
    setShowHint(false);
    setShowAnswer(false);
    setPreviousAnswers([]);
    setIsCompleted(false);
  };

  const getOptionStyle = (option: MCQOption, optionIndex: number) => {
    const baseStyle = "p-3 rounded border cursor-pointer transition-colors";

    if (!hasAnswered || attempts < 3) {
      // Before final answer or during attempts - show as selectable
      const isPreviousAnswer = previousAnswers.includes(option.id);
      const isCurrentSelection = selectedOption === option.id;

      if (isPreviousAnswer && !option.is_correct) {
        // Show previous wrong answers as disabled
        return `${baseStyle} bg-red-50 border-red-200 text-red-600 cursor-not-allowed opacity-60`;
      } else if (isCurrentSelection) {
        return `${baseStyle} bg-blue-50 border-blue-300`;
      } else {
        return `${baseStyle} bg-white border-gray-200 hover:bg-gray-50`;
      }
    }

    // After 3 attempts or correct answer - show correct/incorrect
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

  // Determine background color based on completion status
  const getBackgroundColor = () => {
    if (isCompleted) {
      const isCorrect =
        selectedOption &&
        question.options.find((opt) => opt.id === selectedOption)?.is_correct;
      return isCorrect ? "bg-green-100" : "bg-red-100";
    }
    return "bg-white";
  };

  return (
    <div
      className={`${getBackgroundColor()} border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-colors`}
    >
      <div
        className="flex items-center justify-between cursor-pointer"
        onClick={onToggle}
      >
        <span className="font-medium text-gray-900">
          {index + 1}) {question.question}
        </span>
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
                  onClick={() => {
                    // Don't allow clicking if question is completed
                    if (isCompleted) {
                      return;
                    }
                    // Don't allow clicking on previously attempted wrong answers
                    if (
                      previousAnswers.includes(option.id) &&
                      !option.is_correct
                    ) {
                      return;
                    }
                    handleOptionSelect(option.id);
                  }}
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

            {/* Attempt Counter */}
            {attempts > 0 && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <span className="text-blue-600 text-sm font-medium">
                      Attempt {attempts} of 3
                    </span>
                    {attempts < 3 && !isCorrect && (
                      <span className="ml-2 text-blue-600 text-sm">
                        ({3 - attempts} attempts remaining)
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Hint Display */}
            {showHint && attempts < 3 && !isCorrect && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center">
                  <span className="text-yellow-600 text-lg mr-2">💡</span>
                  <span className="font-medium text-yellow-800">
                    Hint:{" "}
                    {question.hint ||
                      "Think about the key concepts in the question."}
                  </span>
                </div>
              </div>
            )}

            {/* Answer Feedback */}
            {(hasAnswered || attempts >= 3) && (
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
                          Correct! Well done!
                        </span>
                      </>
                    ) : attempts >= 3 ? (
                      <>
                        <span className="text-red-600 text-lg mr-2">✗</span>
                        <span className="font-medium text-red-800">
                          Incorrect after 3 attempts
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
                    {attempts < 3 && (
                      <button
                        onClick={handleExplain}
                        className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded"
                      >
                        Explain
                      </button>
                    )}
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

            {/* Correct Answer section removed - only explanation will be shown */}

            {/* Explanation */}
            {showExplanation && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">
                  {attempts >= 3 ? "Answer Explanation:" : "Explanation:"}
                </h4>
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

              {!hasAnswered && attempts < 3 && (
                <p className="text-sm text-gray-500">
                  Select an answer to check your response
                </p>
              )}
              {attempts >= 3 && !isCorrect && (
                <p className="text-sm text-red-500">Maximum attempts reached</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
