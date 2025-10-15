"use client";

interface Case {
  title: string;
  difficulty: string;
  description: string;
}

interface CaseCardProps {
  case_: Case;
  index: number;
  onSelect: (title: string) => void;
}

export function CaseCard({ case_, index, onSelect }: CaseCardProps) {
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

  return (
    <div
      key={index}
      className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-sm cursor-pointer"
      onClick={() => onSelect(case_.title)}
    >
      <div className="flex items-start justify-between">
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
    </div>
  );
}
