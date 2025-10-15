"use client";

import React from "react";

interface MCQCompletionPopupProps {
  isOpen: boolean;
  correctAnswers: number;
  totalQuestions: number;
  onClose: () => void;
  onContinue: () => void;
}

export function MCQCompletionPopup({
  isOpen,
  correctAnswers,
  totalQuestions,
  onClose,
  onContinue,
}: MCQCompletionPopupProps) {
  if (!isOpen) return null;

  const percentage = Math.round((correctAnswers / totalQuestions) * 100);
  const isPassing = percentage >= 60; // 60% or higher is considered passing

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4 shadow-xl relative">
        {/* Close Icon */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-6 h-6 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
        >
          <svg
            className="w-4 h-4 text-gray-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        <div className="text-center">
          {/* Title */}
          <h3 className="text-2xl font-bold text-gray-800 mb-4">
            Completed Successfully
          </h3>

          {/* Message */}
          <p className="text-gray-600 mb-8 text-base leading-relaxed">
            You have successfully completed this case round and answered{" "}
            {correctAnswers} out of {totalQuestions} questions.
          </p>

          {/* Action Button */}
          <button
            onClick={onContinue}
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-medium transition-colors"
          >
            Finish
          </button>
        </div>
      </div>
    </div>
  );
}
