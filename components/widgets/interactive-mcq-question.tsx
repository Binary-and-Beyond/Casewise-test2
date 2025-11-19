import React, { useState } from "react";
import { apiService } from "../../lib/api";

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
  const [dynamicHint, setDynamicHint] = useState<string>("");
  const [isGeneratingHint, setIsGeneratingHint] = useState(false);

  const generateDynamicHint = async () => {
    if (isGeneratingHint) return;

    // Show loading state immediately
    setIsGeneratingHint(true);
    setShowHint(true); // Show hint container immediately with loading animation
    
    try {
      const response = await apiService.generateDynamicHint({
        question_id: question.id,
        question_text: question.question,
        options: question.options,
        user_attempts: attempts,
        document_context: undefined, // We could pass document context if available
      });
      setDynamicHint(response.hint);
    } catch (error) {
      console.error("Failed to generate dynamic hint:", error);
      // Fallback to static hint if available
      if (!question.hint) {
        setDynamicHint("Think about the key concepts in the question.");
      }
    } finally {
      setIsGeneratingHint(false);
    }
  };

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
      // Only count as correct if it's the FIRST attempt
      const isFirstAttemptCorrect = newAttemptCount === 1;
      onQuestionCompleted?.(question.id, isFirstAttemptCorrect);
    } else if (newAttemptCount >= 3) {
      // After 3 attempts, automatically show the explanation
      setHasAnswered(true);
      setShowAnswer(true);
      setShowExplanation(true); // Automatically show explanation
      setIsCompleted(true);
      // Notify parent that question is completed after 3 attempts (incorrect)
      onQuestionCompleted?.(question.id, false);
    } else {
      // Generate dynamic hint after first attempt
      generateDynamicHint();
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
    setDynamicHint("");
    setIsGeneratingHint(false);
  };

  const getOptionStyle = (option: MCQOption, optionIndex: number) => {
    const baseStyle = "p-3 rounded border cursor-pointer transition-colors";

    if (!hasAnswered || attempts < 3) {
      // Before final answer or during attempts - show as selectable
      const isPreviousAnswer = previousAnswers.includes(option.id);
      const isCurrentSelection = selectedOption === option.id;

      if (isPreviousAnswer && !option.is_correct) {
        // Show previous wrong answers as disabled
        return `${baseStyle} bg-red-50 border-red-200 text-red-600 opacity-60`;
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

            {/* Hint Display - Show immediately when generating */}
            {(showHint || isGeneratingHint) && attempts < 3 && !isCorrect && (
              <div className="p-4 bg-yellow-50 border-2 border-yellow-300 rounded-lg shadow-sm">
                <div className="flex items-start">
                  <span className="text-yellow-600 text-xl mr-3 mt-0.5">💡</span>
                  <div className="flex-1">
                    <span className="font-semibold text-yellow-900 block mb-1">
                      Hint:
                    </span>
                    {isGeneratingHint ? (
                      <div className="flex items-center space-x-3 py-2">
                        <div className="relative">
                          <svg
                            className="animate-spin h-5 w-5 text-yellow-600"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                          >
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                            ></circle>
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            ></path>
                          </svg>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-yellow-800 font-medium">
                            Generating AI hint...
                          </span>
                          <span className="text-yellow-600 text-sm mt-1">
                            This may take a few seconds
                          </span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-yellow-900 leading-relaxed">
                        {dynamicHint ||
                          question.hint ||
                          "Think about the key concepts in the question."}
                      </p>
                    )}
                  </div>
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
                    {attempts <= 3 && (
                      <button
                        onClick={handleExplain}
                        className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded"
                      >
                        Explain
                      </button>
                    )}
                    {!isCorrect && (
                      <button
                        onClick={handleReset}
                        className="text-sm bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded"
                      >
                        Try Again
                      </button>
                    )}
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

            {/* Status Messages */}
            <div className="flex items-center justify-end">
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
