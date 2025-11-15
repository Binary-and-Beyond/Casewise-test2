"use client";

import type React from "react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiService } from "@/lib/api";

interface ForgotPasswordFormProps {
  onBackToLoginClick: () => void;
}

export function ForgotPasswordForm({
  onBackToLoginClick,
}: ForgotPasswordFormProps) {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      await apiService.forgotPassword(email);
      setIsSuccess(true);
    } catch (err: any) {
      console.error("Forgot password error:", err);
      setError(err.message || "Failed to send reset email. Please try again.");
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
              Check Your Email
            </h1>
            <p className="text-sm text-gray-600 mb-6">
              We've sent a password reset link to <strong>{email}</strong>.
              Please check your email and click the link to reset your password.
            </p>
            <Button
              onClick={onBackToLoginClick}
              className="w-full h-12 bg-gray-700 hover:bg-gray-800 text-white font-medium rounded-md"
            >
              Back to Login
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-blue-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white p-8 rounded-lg shadow-sm">
        <div className="text-center mb-6">
          <button
            onClick={onBackToLoginClick}
            className="flex items-center text-sm text-gray-600 hover:text-gray-800 mb-4 transition-colors"
          >
            <svg
              className="w-4 h-4 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back to Login
          </button>
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">
            Forgotten your password?
          </h1>
          <p className="text-sm text-gray-600">
            There is nothing to worry about, we'll send you a message to help
            you reset your password.
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
              htmlFor="email"
              className="text-sm font-medium text-gray-700"
            >
              Email Address
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="Enter personal or work email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-11 bg-gray-100 border-0 rounded-md"
              required
              disabled={isLoading}
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
                Sending...
              </div>
            ) : (
              "Send Reset Link"
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
