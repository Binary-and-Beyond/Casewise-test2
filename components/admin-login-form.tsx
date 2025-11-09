"use client";

import type React from "react";
import { useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
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
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [error, setError] = useState("");

  const { adminLogin } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      await adminLogin(email, password, rememberMe);
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
            Email Address
          </Label>
          <Input
            id="admin-email"
            type="email"
            placeholder="Email"
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
            Password
          </Label>
          <div className="relative">
            <Input
              id="admin-password"
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onFocus={() => {
                setPasswordFocused(false);
                setShowPassword(false); // Show password when first focused
              }}
              onBlur={() => {
                setPasswordFocused(false);
                setShowPassword(false); // Hide password when losing focus
              }}
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

        <div className="flex items-center justify-between py-2">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="admin-remember"
              checked={rememberMe}
              onCheckedChange={(checked) => setRememberMe(checked as boolean)}
            />
            <Label htmlFor="admin-remember" className="text-sm text-gray-600">
              Remember me
            </Label>
          </div>
          <button
            type="button"
            className="text-sm text-gray-600 hover:text-gray-800"
          >
            Forgot Password?
          </button>
        </div>

        <Button
          type="submit"
          disabled={isLoading || isGoogleLoading}
          className="w-full h-12 bg-gray-700 hover:bg-gray-800 text-white font-medium rounded-md disabled:opacity-50"
        >
          {isLoading ? "Logging in..." : "Log In"}
        </Button>
      </form>

      <div className="mt-6 space-y-3">
        <div className="relative w-full">
          <div
            id="google-signin-button"
            className="w-full h-12"
            style={{
              minWidth: "100%",
              width: "100%",
            }}
          ></div>
          {isGoogleLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 rounded border">
              <span className="text-sm text-gray-600">Signing in...</span>
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 text-center">
        <button
          onClick={onBackToLoginClick}
          className="text-sm text-gray-500 hover:text-gray-700 underline"
        >
          User Login
        </button>
      </div>
    </div>
  );
}
