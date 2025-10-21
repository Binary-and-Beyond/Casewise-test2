"use client";

import React from "react";

interface NavigationWarningPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  onCancel: () => void;
}

export function NavigationWarningPopup({
  isOpen,
  onClose,
  onConfirm,
  onCancel,
}: NavigationWarningPopupProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-white/30 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4 shadow-xl relative">
        {/* Close Icon */}
        <button
          onClick={onCancel}
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
            Not Completed
          </h3>

          {/* Message */}
          <p className="text-gray-600 mb-8 text-base leading-relaxed">
            You have still questions to complete in this case round. If you
            leave now your session won't be saved.
          </p>

          {/* Action Button */}
          <button
            onClick={onConfirm}
            className="bg-teal-600 hover:bg-teal-700 text-white px-8 py-3 rounded-lg font-medium transition-colors"
          >
            Leave Anyway
          </button>
        </div>
      </div>
    </div>
  );
}
