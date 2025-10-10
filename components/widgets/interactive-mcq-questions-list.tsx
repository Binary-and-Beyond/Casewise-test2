import React from "react";
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
}

export function InteractiveMCQQuestionsList({
  questions,
  expandedQuestions,
  onToggleQuestion,
}: InteractiveMCQQuestionsListProps) {
  return (
    <div className="space-y-4">
      {questions.map((question, index) => (
        <InteractiveMCQQuestion
          key={question.id}
          question={question}
          index={index}
          isExpanded={expandedQuestions.includes(index)}
          onToggle={() => onToggleQuestion(index)}
        />
      ))}
    </div>
  );
}
