"use client";

import React, { useState, useEffect } from "react";
import { apiService } from "@/lib/api";
import { ArrowLeftIcon } from "lucide-react";

interface UserAnalytics {
  name: string;
  timeSpent: string;
  casesUploaded: number;
  mcqAttempted: number;
  mostQuestionsType: string;
  totalQuestionsCorrect: number;
  totalQuestionsAttempted: number;
  averageScore: number;
  lastActiveDate: string;
}

interface MyAnalyticsProps {
  onBackToHome?: () => void;
  generatedCases?: Array<{
    title: string;
    difficulty: string;
    description: string;
    key_points: string[];
  }>;
}

export function MyAnalytics({
  onBackToHome,
  generatedCases,
}: MyAnalyticsProps) {
  const [analytics, setAnalytics] = useState<UserAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastFetch, setLastFetch] = useState<number>(0);

  // Helper function to calculate most common difficulty type from user's case history
  const getMostCommonDifficultyType = (): string => {
    if (!generatedCases || generatedCases.length === 0) return "Easy";

    // Count difficulty occurrences
    const difficultyCount: { [key: string]: number } = {};
    generatedCases.forEach((case_) => {
      const difficulty = case_.difficulty?.toLowerCase() || "easy";
      difficultyCount[difficulty] = (difficultyCount[difficulty] || 0) + 1;
    });

    // Find the most common difficulty
    let mostCommon = "easy";
    let maxCount = 0;

    Object.entries(difficultyCount).forEach(([difficulty, count]) => {
      if (count > maxCount) {
        maxCount = count;
        mostCommon = difficulty;
      }
    });

    // Capitalize first letter
    return mostCommon.charAt(0).toUpperCase() + mostCommon.slice(1);
  };

  const refreshAnalytics = async () => {
    try {
      setIsLoading(true);
      setError("");
      const response = await apiService.getUserAnalytics();
      setAnalytics(response);
      setLastFetch(Date.now());
    } catch (error) {
      console.error("Failed to refresh analytics:", error);
      setError("Failed to load analytics data");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const loadAnalytics = async () => {
      try {
        setIsLoading(true);
        const response = await apiService.getUserAnalytics();
        setAnalytics(response);
        setLastFetch(Date.now());
      } catch (error) {
        console.error("Failed to load analytics:", error);
        setError("Failed to load analytics data");
      } finally {
        setIsLoading(false);
      }
    };

    // Only fetch if we haven't fetched in the last 30 seconds
    const now = Date.now();
    if (now - lastFetch > 30000) {
      loadAnalytics();
    } else {
      setIsLoading(false);
    }
  }, [lastFetch]);

  if (isLoading) {
    return (
      <div className="flex-1 p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">My Analytics</h1>
          <p className="text-gray-600 mt-2">
            View your learning progress and statistics
          </p>
        </div>

        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading your analytics...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">My Analytics</h1>
          <p className="text-gray-600 mt-2">
            View your learning progress and statistics
          </p>
        </div>

        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-8">
      {/* Back to Home above heading */}
      {onBackToHome && (
        <div className="mb-3">
          <button
            onClick={onBackToHome}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors hover:text-blue-600 cursor-pointer flex items-center gap-2"
          >
            <ArrowLeftIcon className="w-4 h-4" />
            Back to Home
          </button>
        </div>
      )}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">My Analytics</h1>
        <p className="text-gray-600 mt-2">
          View your learning progress and statistics
        </p>
      </div>

      {/* Analytics Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                  Name
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                  Time Spent
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                  Cases Uploaded
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                  MCQ Attempted
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                  Most Questions Type
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                  Correct Answers
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                  Average Score
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {analytics && (
                <tr className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    {analytics.name}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {analytics.timeSpent}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {analytics.casesUploaded}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {analytics.mcqAttempted}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        (analytics.mostQuestionsType || "Easy") === "Easy"
                          ? "bg-green-100 text-green-800"
                          : (analytics.mostQuestionsType || "Moderate") ===
                            "Moderate"
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {analytics.mostQuestionsType}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {analytics.totalQuestionsCorrect} /{" "}
                    {analytics.totalQuestionsAttempted}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    <span
                      className={`font-medium ${
                        analytics.averageScore >= 80
                          ? "text-green-600"
                          : analytics.averageScore >= 60
                          ? "text-yellow-600"
                          : "text-red-600"
                      }`}
                    >
                      {analytics.averageScore}%
                    </span>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Additional Statistics Cards */}
      {analytics && (
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <svg
                    className="w-5 h-5 text-blue-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Cases</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {analytics.casesUploaded}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                  <svg
                    className="w-5 h-5 text-green-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">
                  Correct Answers
                </p>
                <p className="text-2xl font-semibold text-gray-900">
                  {analytics.totalQuestionsCorrect}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <svg
                    className="w-5 h-5 text-yellow-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Time Spent</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {analytics.timeSpent}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                  <svg
                    className="w-5 h-5 text-purple-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                    />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">
                  Average Score
                </p>
                <p className="text-2xl font-semibold text-gray-900">
                  {analytics.averageScore}%
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
