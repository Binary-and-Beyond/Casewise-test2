"use client";

import type React from "react";
import { useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth-context";
import { BiHide, BiShow } from "react-icons/bi";

interface AdminLoginFormProps {
  onBackToLoginClick: () => void;
  onLoginSuccess: () => void;
}

export function AdminLoginForm({
  onBackToLoginClick,
  onLoginSuccess,
}: AdminLoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const { adminLogin } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      await adminLogin(email, password);
      onLoginSuccess();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Admin login failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full bg-white p-8 rounded-lg shadow-sm">
      <div className="text-center mb-8">
        <div className="flex items-center justify-center mb-6">
          <Image
            src="/casewise_Icon.svg"
            alt="CaseWise"
            width={32}
            height={32}
            className="mr-2"
          />
          <span className="text-xl font-medium text-gray-700">CaseWise</span>
        </div>
        <h1 className="text-2xl font-semibold text-gray-900 text-left">
          Admin Login
        </h1>
        <p className="text-sm text-gray-600 text-left mt-2">
          Access the admin dashboard to manage users and analytics
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
            htmlFor="admin-email"
            className="text-sm font-medium text-gray-700"
          >
            Admin Email
          </Label>
          <Input
            id="admin-email"
            type="email"
            placeholder="admin@casewise.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-11 bg-gray-100 border-0 rounded-md"
            required
          />
        </div>

        <div className="space-y-2">
          <Label
            htmlFor="admin-password"
            className="text-sm font-medium text-gray-700"
          >
            Admin Password
          </Label>
          <div className="relative">
            <Input
              id="admin-password"
              type={showPassword ? "text" : "password"}
              placeholder="Admin Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onFocus={() => setShowPassword(false)}
              onBlur={() => setShowPassword(false)}
              required
              className="h-11 bg-gray-100 border-0 rounded-md pr-10"
            />
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={(e) => {
                e.preventDefault();
                setShowPassword(!showPassword);
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 transition-transform duration-200"
            >
              {showPassword ? (
                <BiShow className="h-5 w-5 opacity-60 hover:opacity-100" />
              ) : (
                <BiHide className="h-5 w-5 opacity-60 hover:opacity-100" />
              )}
            </button>
          </div>
        </div>

        <Button
          type="submit"
          disabled={isLoading}
          className="w-full h-12 bg-red-600 hover:bg-red-700 text-white font-medium rounded-md disabled:opacity-50"
        >
          {isLoading ? "Signing in..." : "Admin Login"}
        </Button>
      </form>

      <div className="mt-6 text-center">
        <p className="text-sm text-gray-600">
          Regular user?{" "}
          <button
            onClick={onBackToLoginClick}
            className="text-blue-600 hover:underline"
          >
            Back to User Login
          </button>
        </p>
      </div>

      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
        <p className="text-xs text-blue-800">
          <strong>Demo Admin Credentials:</strong>
          <br />
          Email: admin@casewise.com
          <br />
          Password: admin123
        </p>
      </div>
    </div>
  );
}
