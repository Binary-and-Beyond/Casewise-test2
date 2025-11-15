"use client";

import type React from "react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiService } from "@/lib/api";

interface ResetPasswordFormProps {
  token: string;
  onSuccess: () => void;
}

export function ResetPasswordForm({
  token,
  onSuccess,
}: ResetPasswordFormProps) {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validate passwords
    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsLoading(true);

    try {
      await apiService.resetPassword(token, newPassword);
      setIsSuccess(true);
      // Call onSuccess after a short delay to show success message
      setTimeout(() => {
        onSuccess();
      }, 2000);
    } catch (err: any) {
      console.error("Reset password error:", err);
      setError(err.message || "Failed to reset password. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="fixed inset-0 bg-blue-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white p-8 rounded-lg shadow-sm">
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-semibold text-gray-900 mb-2">
              Password Reset Successful
            </h1>
            <p className="text-sm text-gray-600 mb-6">
              Your password has been successfully reset. You can now log in with
              your new password.
            </p>
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-sm text-gray-500 mt-2">
              Redirecting to login...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-blue-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white p-8 rounded-lg shadow-sm">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">
            Reset Your Password
          </h1>
          <p className="text-sm text-gray-600">
            Enter your new password below. Make sure it's at least 8 characters
            long.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label
              htmlFor="newPassword"
              className="text-sm font-medium text-gray-700"
            >
              New Password
            </Label>
            <Input
              id="newPassword"
              type="password"
              placeholder="Enter your new password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="h-11 bg-gray-100 border-0 rounded-md"
              required
              disabled={isLoading}
              minLength={8}
            />
          </div>

          <div className="space-y-2">
            <Label
              htmlFor="confirmPassword"
              className="text-sm font-medium text-gray-700"
            >
              Confirm New Password
            </Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="Confirm your new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="h-11 bg-gray-100 border-0 rounded-md"
              required
              disabled={isLoading}
              minLength={8}
            />
          </div>

          <Button
            type="submit"
            className="w-full h-12 bg-gray-700 hover:bg-gray-800 text-white font-medium rounded-md disabled:opacity-50"
            disabled={isLoading}
          >
            {isLoading ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Resetting...
              </div>
            ) : (
              "Reset Password"
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
