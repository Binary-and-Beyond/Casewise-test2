"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiService } from "@/lib/api";

interface User {
  id: string;
  email: string;
  username: string;
  full_name?: string;
  role: "user" | "admin";
  status: "active" | "inactive";
  created_at: string;
  last_active: string;
  total_cases: number;
  total_mcqs: number;
}

interface UserManagementProps {
  onSave?: (changes: UserChanges) => void;
  onBackToAnalytics?: () => void;
}

interface UserChanges {
  statusChanges: Array<{
    userId: string;
    oldStatus: string;
    newStatus: string;
  }>;
  roleChanges: Array<{ userId: string; oldRole: string; newRole: string }>;
}

export function UserManagement({
  onSave,
  onBackToAnalytics,
}: UserManagementProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [originalUsers, setOriginalUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState<"all" | "user" | "admin">("all");
  const [filterStatus, setFilterStatus] = useState<
    "all" | "active" | "inactive"
  >("all");
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Fetch real user data from API
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setIsLoading(true);
        const response = await apiService.getAllUsers();
        setUsers(response.users);
        setOriginalUsers(response.users); // Store original data for comparison
        setHasChanges(false);
      } catch (error) {
        console.error("Failed to fetch users:", error);
        // Fallback to empty array if API fails
        setUsers([]);
        setOriginalUsers([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUsers();
  }, []);

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.username.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === "all" || user.role === filterRole;
    const matchesStatus =
      filterStatus === "all" || user.status === filterStatus;

    return matchesSearch && matchesRole && matchesStatus;
  });

  const handleStatusChange = (
    userId: string,
    newStatus: "active" | "inactive"
  ) => {
    setUsers((prev) =>
      prev.map((user) =>
        user.id === userId ? { ...user, status: newStatus } : user
      )
    );
    setHasChanges(true);
  };

  const handleRoleChange = (userId: string, newRole: "user" | "admin") => {
    setUsers((prev) =>
      prev.map((user) =>
        user.id === userId ? { ...user, role: newRole } : user
      )
    );
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!hasChanges) return;

    setIsSaving(true);
    try {
      // Calculate changes
      const statusChanges: Array<{
        userId: string;
        oldStatus: string;
        newStatus: string;
      }> = [];
      const roleChanges: Array<{
        userId: string;
        oldRole: string;
        newRole: string;
      }> = [];

      users.forEach((user) => {
        const originalUser = originalUsers.find((u) => u.id === user.id);
        if (originalUser) {
          if (originalUser.status !== user.status) {
            statusChanges.push({
              userId: user.id,
              oldStatus: originalUser.status,
              newStatus: user.status,
            });
          }
          if (originalUser.role !== user.role) {
            roleChanges.push({
              userId: user.id,
              oldRole: originalUser.role,
              newRole: user.role,
            });
          }
        }
      });

      const changes: UserChanges = { statusChanges, roleChanges };

      // Call the save callback
      if (onSave) {
        await onSave(changes);
      }

      // Refresh user data from API to get the latest state
      try {
        const response = await apiService.getAllUsers();
        setUsers(response.users);
        setOriginalUsers(response.users);
        setHasChanges(false);
        console.log("✅ User data refreshed after save");
      } catch (error) {
        console.error("❌ Failed to refresh user data:", error);
        // Still update local state even if refresh fails
        setOriginalUsers([...users]);
        setHasChanges(false);
      }

      console.log("✅ User changes saved successfully:", changes);
    } catch (error) {
      console.error("❌ Failed to save changes:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setUsers([...originalUsers]);
    setHasChanges(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800";
      case "inactive":
        return "bg-yellow-100 text-yellow-800";
      // only active/inactive are allowed
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-purple-100 text-purple-800";
      case "user":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-6">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">User Management</h2>
          <p className="text-gray-600 mt-2">
            Manage user accounts, roles, and permissions
          </p>
        </div>
        <div className="flex space-x-3">
          {onBackToAnalytics && (
            <Button
              onClick={onBackToAnalytics}
              variant="outline"
              className="px-4 py-2"
            >
              ← Back to Analytics
            </Button>
          )}
          {hasChanges && (
            <>
              <Button
                onClick={handleCancel}
                variant="outline"
                className="px-4 py-2 text-gray-600 border-gray-300 hover:bg-gray-50"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={isSaving}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isSaving ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Saving...
                  </div>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <Label
              htmlFor="search"
              className="text-sm font-medium text-gray-700"
            >
              Search Users
            </Label>
            <Input
              id="search"
              placeholder="Search by name, email, or username"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label
              htmlFor="role-filter"
              className="text-sm font-medium text-gray-700"
            >
              Role
            </Label>
            <select
              id="role-filter"
              value={filterRole}
              onChange={(e) =>
                setFilterRole(e.target.value as "all" | "user" | "admin")
              }
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Roles</option>
              <option value="user">Users</option>
              <option value="admin">Admins</option>
            </select>
          </div>
          <div>
            <Label
              htmlFor="status-filter"
              className="text-sm font-medium text-gray-700"
            >
              Status
            </Label>
            <select
              id="status-filter"
              value={filterStatus}
              onChange={(e) =>
                setFilterStatus(
                  e.target.value as "all" | "active" | "inactive"
                )
              }
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <div className="flex items-end">
            <Button
              onClick={() => {
                setSearchTerm("");
                setFilterRole("all");
                setFilterStatus("all");
              }}
              variant="outline"
              className="w-full"
            >
              Clear Filters
            </Button>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-8 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-8 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-8 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-8 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Activity
                </th>
                <th className="px-8 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-8 py-5 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {user.full_name || user.username}
                      </div>
                      <div className="text-sm text-gray-500">{user.email}</div>
                      <div className="text-xs text-gray-400">
                        Joined: {user.created_at}
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-5 whitespace-nowrap">
                    <span
                      className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${getRoleColor(
                        user.role
                      )}`}
                    >
                      {user.role}
                    </span>
                  </td>
                  <td className="px-8 py-5 whitespace-nowrap">
                    <span
                      className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                        user.status
                      )}`}
                    >
                      {user.status}
                    </span>
                  </td>
                  <td className="px-8 py-5 whitespace-nowrap text-sm text-gray-900">
                    <div>
                      <div>Cases: {user.total_cases}</div>
                      <div>MCQs: {user.total_mcqs}</div>
                      <div className="text-xs text-gray-500">
                        Last: {user.last_active}
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-5 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <select
                        value={user.status}
                        onChange={(e) =>
                          handleStatusChange(
                            user.id,
                            e.target.value as "active" | "inactive"
                          )
                        }
                        className="text-xs px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                      {user.role !== "admin" && (
                        <select
                          value={user.role}
                          onChange={(e) =>
                            handleRoleChange(
                              user.id,
                              e.target.value as "user" | "admin"
                            )
                          }
                          className="text-xs px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                          <option value="user">User</option>
                          <option value="admin">Admin</option>
                        </select>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex justify-between items-center">
        <div className="text-sm text-gray-600">
          Showing {filteredUsers.length} of {users.length} users
        </div>
        {hasChanges && (
          <div className="flex items-center text-orange-600 text-sm">
            <div className="w-2 h-2 bg-orange-500 rounded-full mr-2"></div>
            You have unsaved changes
          </div>
        )}
      </div>
    </div>
  );
}
