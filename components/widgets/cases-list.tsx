"use client";
import { useState } from "react";
import { CaseCard } from "./case-card";

interface Case {
  title: string;
  difficulty: string;
  description: string;
}

interface CasesListProps {
  cases: Case[];
  onCaseSelect: (title: string) => void;
}

type SortOption = "all" | "easy" | "moderate" | "hard";

export function CasesList({ cases, onCaseSelect }: CasesListProps) {
  const [sortBy, setSortBy] = useState<SortOption>("all");

  const normalizeDifficulty = (difficulty: string): string => {
    const normalized = difficulty.toLowerCase();
    if (normalized === "difficult") return "hard";
    if (normalized === "intermediate") return "moderate";
    if (normalized === "beginner") return "easy";
    return normalized;
  };

  const getDifficultyOrder = (difficulty: string): number => {
    const normalized = normalizeDifficulty(difficulty);
    switch (normalized) {
      case "easy":
        return 1;
      case "moderate":
        return 2;
      case "hard":
        return 3;
      default:
        return 0;
    }
  };

  const filteredAndSortedCases = cases
    .filter((case_) => {
      if (sortBy === "all") return true;
      return normalizeDifficulty(case_.difficulty) === sortBy;
    })
    .sort((a, b) => {
      if (sortBy === "all") {
        // Sort by difficulty level when showing all
        return (
          getDifficultyOrder(a.difficulty) - getDifficultyOrder(b.difficulty)
        );
      }
      // When filtering by specific difficulty, maintain original order
      return 0;
    });

  return (
    <div className="space-y-4">
      {/* Sorting Controls */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-600">Filter by difficulty:</span>
          <div className="flex space-x-1">
            {[
              {
                value: "all",
                label: "All",
                color: "bg-gray-100 text-gray-800",
              },
              {
                value: "easy",
                label: "Easy",
                color: "bg-green-100 text-green-800",
              },
              {
                value: "moderate",
                label: "Moderate",
                color: "bg-yellow-100 text-yellow-800",
              },
              {
                value: "hard",
                label: "Hard",
                color: "bg-red-100 text-red-800",
              },
            ].map((option) => (
              <button
                key={option.value}
                onClick={() => setSortBy(option.value as SortOption)}
                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                  sortBy === option.value
                    ? option.color
                    : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
        <div className="text-sm text-gray-500">
          Showing {filteredAndSortedCases.length} of {cases.length} cases
        </div>
      </div>

      {/* Cases List */}
      {filteredAndSortedCases.length > 0 ? (
        <div className="space-y-4">
          {filteredAndSortedCases.map((case_, index) => (
            <CaseCard
              key={index}
              case_={case_}
              index={index}
              onSelect={onCaseSelect}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <p>No cases found for the selected difficulty level.</p>
        </div>
      )}
    </div>
  );
}
