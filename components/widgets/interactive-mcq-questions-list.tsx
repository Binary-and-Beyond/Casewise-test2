import React, { useState, useEffect } from "react";
import { InteractiveMCQQuestion } from "./interactive-mcq-question";

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

interface InteractiveMCQQuestionsListProps {
  questions: MCQQuestionData[];
  expandedQuestions: number[];
  onToggleQuestion: (index: number) => void;
  onAllQuestionsCompleted?: (
    correctAnswers: number,
    totalQuestions: number
  ) => void;
  onQuestionAttempted?: () => void;
}

export function InteractiveMCQQuestionsList({
  questions,
  expandedQuestions,
  onToggleQuestion,
  onAllQuestionsCompleted,
  onQuestionAttempted,
}: InteractiveMCQQuestionsListProps) {
  const [completedQuestions, setCompletedQuestions] = useState<Set<string>>(
    new Set()
  );
  const [correctAnswers, setCorrectAnswers] = useState<Set<string>>(new Set());

  const handleQuestionCompleted = (questionId: string, isCorrect: boolean) => {
    console.log(`✅ Question ${questionId} completed. Correct: ${isCorrect}`);

    setCompletedQuestions((prev) => new Set([...prev, questionId]));
    if (isCorrect) {
      setCorrectAnswers((prev) => new Set([...prev, questionId]));
    }
  };

  useEffect(() => {
    console.log("🔍 MCQ Questions List - Checking completion status:");
    console.log("   Completed questions:", completedQuestions.size);
    console.log("   Total questions:", questions.length);
    console.log("   Correct answers:", correctAnswers.size);

    // Check if all questions are completed
    if (completedQuestions.size === questions.length && questions.length > 0) {
      console.log("🎉 All questions completed! Triggering completion callback");
      onAllQuestionsCompleted?.(correctAnswers.size, questions.length);
    }
  }, [
    completedQuestions,
    correctAnswers,
    questions.length,
    // Removed onAllQuestionsCompleted from dependencies to prevent infinite loop
  ]);

  return (
    <div className="space-y-3">
      {questions.map((question, index) => (
        <InteractiveMCQQuestion
          key={question.id}
          question={question}
          index={index}
          isExpanded={expandedQuestions.includes(index)}
          onToggle={() => onToggleQuestion(index)}
          onQuestionCompleted={handleQuestionCompleted}
          onQuestionAttempted={onQuestionAttempted}
        />
      ))}
    </div>
  );
}
