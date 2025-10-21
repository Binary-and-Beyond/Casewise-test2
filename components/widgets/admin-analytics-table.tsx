"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { apiService } from "@/lib/api";

interface AdminUser {
  id: string;
  email: string;
  username: string;
  full_name?: string;
  role: string;
  time_spent: string;
  cases_uploaded: number;
  mcq_attempted: number;
  most_questions_type: string;
  created_at: string;
  last_active: string;
  total_cases: number;
  total_mcqs: number;
  total_questions_correct?: number;
  total_questions_attempted?: number;
  average_score?: number;
}

interface AdminAnalyticsTableProps {
  onManageUsers: () => void;
}

export function AdminAnalyticsTable({
  onManageUsers,
}: AdminAnalyticsTableProps) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch real user data from API
  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await apiService.getAllUsers();
      setUsers(response.users as AdminUser[]);
    } catch (error) {
      console.error("Failed to fetch users:", error);
      setError("Failed to load user data. Please try again.");
      setUsers([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleSelectUser = (userId: string, checked: boolean) => {
    const newSelected = new Set(selectedUsers);
    if (checked) {
      newSelected.add(userId);
    } else {
      newSelected.delete(userId);
    }
    setSelectedUsers(newSelected);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedUsers(new Set(users.map((user) => user.id)));
    } else {
      setSelectedUsers(new Set());
    }
  };

  const handleExport = () => {
    const selectedUsersData = users.filter((user) =>
      selectedUsers.has(user.id)
    );
    const csvContent = [
      [
        "User",
        "Email",
        "Time Spent",
        "Cases Uploaded",
        "MCQ Attempted",
        "Most Questions Type",
        "Last Active",
      ],
      ...selectedUsersData.map((user) => [
        user.full_name || user.username,
        user.email,
        user.time_spent,
        user.cases_uploaded.toString(),
        user.mcq_attempted.toString(),
        user.most_questions_type,
        user.last_active,
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "user-analytics.csv";
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading user data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="text-red-500 text-lg mb-4">⚠️</div>
          <p className="text-red-600 mb-4">{error}</p>
          <Button
            onClick={() => window.location.reload()}
            variant="outline"
            className="border-red-300 text-red-700 hover:bg-red-50"
          >
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-6">
      {/* Analytics Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 rounded-lg">
              <svg
                className="w-6 h-6 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"
                />
              </svg>
            </div>
            <div className="ml-6">
              <p className="text-sm font-medium text-gray-600 mb-1">
                Total Users
              </p>
              <p className="text-3xl font-bold text-gray-900">{users.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-3 bg-green-100 rounded-lg">
              <svg
                className="w-6 h-6 text-green-600"
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
            <div className="ml-6">
              <p className="text-sm font-medium text-gray-600 mb-1">
                Total Users
              </p>
              <p className="text-3xl font-bold text-gray-900">{users.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-3 bg-purple-100 rounded-lg">
              <svg
                className="w-6 h-6 text-purple-600"
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
            <div className="ml-6">
              <p className="text-sm font-medium text-gray-600 mb-1">
                Total Cases
              </p>
              <p className="text-3xl font-bold text-gray-900">
                {users.reduce((sum, user) => sum + user.cases_uploaded, 0)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-3 bg-orange-100 rounded-lg">
              <svg
                className="w-6 h-6 text-orange-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div className="ml-6">
              <p className="text-sm font-medium text-gray-600 mb-1">
                MCQ Attempts
              </p>
              <p className="text-3xl font-bold text-gray-900">
                {users.reduce((sum, user) => sum + user.mcq_attempted, 0)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* User Analytics Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-8 py-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                User Analytics
              </h2>
              <p className="text-sm text-gray-600 mt-2">
                Monitor student activity and performance across the platform
              </p>
            </div>
            <Button
              onClick={fetchUsers}
              variant="outline"
              size="sm"
              className="text-blue-600 border-blue-300 hover:bg-blue-50"
            >
              🔄 Refresh
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-8 py-4 text-left">
                  <Checkbox
                    checked={
                      selectedUsers.size === users.length && users.length > 0
                    }
                    onCheckedChange={handleSelectAll}
                  />
                </th>
                <th className="px-8 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Users
                </th>
                <th className="px-8 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Time Spent
                </th>
                <th className="px-8 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cases Uploaded
                </th>
                <th className="px-8 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  MCQ Attempted
                </th>
                <th className="px-8 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Most Questions Type
                </th>
                <th className="px-8 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Active
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-8 py-5">
                    <Checkbox
                      checked={selectedUsers.has(user.id)}
                      onCheckedChange={(checked) =>
                        handleSelectUser(user.id, checked as boolean)
                      }
                    />
                  </td>
                  <td className="px-8 py-5 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {user.full_name || user.username}
                      </div>
                      <div className="text-sm text-gray-500">{user.email}</div>
                    </div>
                  </td>
                  <td className="px-8 py-5 whitespace-nowrap text-sm text-gray-900">
                    {user.time_spent}
                  </td>
                  <td className="px-8 py-5 whitespace-nowrap text-sm text-gray-900">
                    {user.cases_uploaded}
                  </td>
                  <td className="px-8 py-5 whitespace-nowrap text-sm text-gray-900">
                    {user.mcq_attempted}
                  </td>
                  <td className="px-8 py-5 whitespace-nowrap">
                    <span
                      className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${
                        user.most_questions_type === "Easy"
                          ? "bg-green-100 text-green-800"
                          : user.most_questions_type === "Hard"
                          ? "bg-red-100 text-red-800"
                          : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {user.most_questions_type}
                    </span>
                  </td>
                  <td className="px-8 py-5 whitespace-nowrap text-sm text-gray-500">
                    {user.last_active}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex justify-between items-center pt-6">
        <div className="text-sm text-gray-600">
          {selectedUsers.size} of {users.length} users selected
        </div>
        <div className="flex space-x-4">
          <Button
            onClick={handleExport}
            disabled={selectedUsers.size === 0}
            variant="outline"
            className="border-blue-300 text-blue-700 hover:bg-blue-50 px-6 py-2"
          >
            Export
          </Button>
          <Button
            onClick={onManageUsers}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2"
          >
            Manage Users
          </Button>
        </div>
      </div>
    </div>
  );
}
