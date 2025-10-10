"use client";
import { MCQQuestion } from "./mcq-question";

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

interface MCQQuestionsListProps {
  questions: MCQQuestionData[];
  expandedQuestions: number[];
  onToggleQuestion: (index: number) => void;
}

export function MCQQuestionsList({
  questions,
  expandedQuestions,
  onToggleQuestion,
}: MCQQuestionsListProps) {
  return (
    <div className="space-y-3">
      {questions.map((question, index) => (
        <MCQQuestion
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
