"use client";
import { Lightbulb, MessageSquare, CheckSquare2 } from "lucide-react";

interface Case {
  title: string;
  difficulty: string;
  description: string;
}

interface CaseCardProps {
  case_: Case;
  index: number;
  onSelect: (title: string) => void;
  onIdentifyConcepts: (title: string) => void;
  onExploreCase: (title: string) => void;
  onGenerateMCQs: (title: string) => void;
  disabled?: boolean;
}

export function CaseCard({ 
  case_, 
  index, 
  onSelect,
  onIdentifyConcepts,
  onExploreCase,
  onGenerateMCQs,
  disabled = false
}: CaseCardProps) {
  const normalizeDifficulty = (difficulty: string): string => {
    const normalized = difficulty.toLowerCase();
    if (normalized === "difficult") return "Hard";
    if (normalized === "intermediate") return "Moderate";
    if (normalized === "beginner") return "Easy";
    return difficulty; // Return original if already correct
  };

  const getDifficultyColor = (difficulty: string) => {
    const normalized = normalizeDifficulty(difficulty);
    switch (normalized) {
      case "Easy":
        return "bg-green-100 text-green-800";
      case "Moderate":
        return "bg-yellow-100 text-yellow-800";
      case "Hard":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const handleKeyConcepts = (e: React.MouseEvent) => {
    e.stopPropagation();
    onIdentifyConcepts(case_.title);
  };

  const handleExploreCase = (e: React.MouseEvent) => {
    e.stopPropagation();
    onExploreCase(case_.title);
  };

  const handleGenerateMCQs = (e: React.MouseEvent) => {
    e.stopPropagation();
    onGenerateMCQs(case_.title);
  };

  return (
    <div
      key={index}
      className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-sm"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="font-medium text-gray-900 mb-1">{case_.title}</h3>
          <p className="text-sm text-gray-600">{case_.description}</p>
        </div>
        <div className="flex items-center space-x-1">
          <span
            className={`px-2 py-1 rounded text-xs font-medium ${getDifficultyColor(
              case_.difficulty
            )}`}
          >
            {normalizeDifficulty(case_.difficulty)}
          </span>
        </div>
      </div>
      
      {/* Action Buttons */}
      <div className="flex items-center gap-2 mt-4">
        <button
          onClick={handleKeyConcepts}
          disabled={disabled}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg border border-blue-300 text-blue-700 bg-transparent hover:bg-blue-50 transition-colors text-sm font-medium ${
            disabled ? "opacity-50" : "cursor-pointer"
          }`}
        >
          <Lightbulb className="w-4 h-4" />
          Key Concepts
        </button>
        <button
          onClick={handleExploreCase}
          disabled={disabled}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg border border-green-300 text-green-700 bg-transparent hover:bg-green-50 transition-colors text-sm font-medium ${
            disabled ? "opacity-50" : "cursor-pointer"
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          Explore Case
        </button>
        <button
          onClick={handleGenerateMCQs}
          disabled={disabled}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 text-gray-700 bg-transparent hover:bg-gray-50 transition-colors text-sm font-medium ${
            disabled ? "opacity-50" : "cursor-pointer"
          }`}
        >
          {disabled ? (
            <div className="w-4 h-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600"></div>
          ) : (
            <CheckSquare2 className="w-4 h-4" />
          )}
          Generate MCQs
        </button>
      </div>
    </div>
  );
}
