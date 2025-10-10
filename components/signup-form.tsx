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

interface SignUpFormProps {
  onLoginClick: () => void;
}

export function SignUpForm({ onLoginClick }: SignUpFormProps) {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    agreeToTerms: false,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [showPasswordRequirements, setShowPasswordRequirements] =
    useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const { signup } = useAuth();

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    if (!formData.agreeToTerms) {
      setError("Please agree to the Terms of Service and Privacy Policy");
      setIsLoading(false);
      return;
    }

    try {
      const fullName = `${formData.firstName} ${formData.lastName}`.trim();
      const username = `${formData.firstName}${formData.lastName}`
        .toLowerCase()
        .replace(/\s+/g, "");

      await signup(formData.email, username, formData.password, fullName);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Signup failed");
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
          Sign Up
        </h1>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label
              htmlFor="firstName"
              className="text-sm font-medium text-gray-700"
            >
              First Name
            </Label>
            <Input
              id="firstName"
              type="text"
              placeholder="First Name"
              value={formData.firstName}
              onChange={(e) => handleInputChange("firstName", e.target.value)}
              className="h-11 bg-gray-100 border-0 rounded-md"
              required
            />
          </div>
          <div className="space-y-2">
            <Label
              htmlFor="lastName"
              className="text-sm font-medium text-gray-700"
            >
              Last Name
            </Label>
            <Input
              id="lastName"
              type="text"
              placeholder="Last Name"
              value={formData.lastName}
              onChange={(e) => handleInputChange("lastName", e.target.value)}
              className="h-11 bg-gray-100 border-0 rounded-md"
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="email" className="text-sm font-medium text-gray-700">
            Email
          </Label>
          <Input
            id="email"
            type="email"
            placeholder="Email"
            value={formData.email}
            onChange={(e) => handleInputChange("email", e.target.value)}
            className="h-11 bg-gray-100 border-0 rounded-md"
            required
          />
        </div>

        <div className="space-y-2">
          <Label
            htmlFor="password"
            className="text-sm font-medium text-gray-700"
          >
            Password
          </Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={formData.password}
              onChange={(e) => {
                handleInputChange("password", e.target.value);
                setShowPasswordRequirements(e.target.value.length > 0);
              }}
              onFocus={() => {
                setPasswordFocused(true);
                setShowPasswordRequirements(true);
                setShowPassword(true); // Show password when first focused
              }}
              onBlur={() => {
                setPasswordFocused(false);
                // Only show requirements if password has content, otherwise hide them
                setShowPasswordRequirements(formData.password.length > 0);
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
          {showPasswordRequirements && (
            <div className="text-xs text-gray-500 space-y-1">
              <p>Password must contain:</p>
              <ul className="ml-4 space-y-1">
                <li
                  className={
                    formData.password.length >= 8
                      ? "text-green-600"
                      : "text-red-600"
                  }
                >
                  ✓ At least 8 characters
                </li>
                <li
                  className={
                    /[a-zA-Z]/.test(formData.password)
                      ? "text-green-600"
                      : "text-red-600"
                  }
                >
                  ✓ At least one letter
                </li>
                <li
                  className={
                    /\d/.test(formData.password)
                      ? "text-green-600"
                      : "text-red-600"
                  }
                >
                  ✓ At least one number
                </li>
                <li
                  className={
                    /[!@#$%^&*(),.?":{}|<>]/.test(formData.password)
                      ? "text-green-600"
                      : "text-red-600"
                  }
                >
                  ✓ At least one symbol
                </li>
              </ul>
            </div>
          )}
        </div>

        <div className="flex items-start space-x-2 py-2">
          <Checkbox
            id="terms"
            checked={formData.agreeToTerms}
            onCheckedChange={(checked) =>
              setFormData((prev) => ({
                ...prev,
                agreeToTerms: checked as boolean,
              }))
            }
            className="mt-0.5"
          />
          <Label
            htmlFor="terms"
            className="text-sm text-gray-600 leading-relaxed"
          >
            I agree to the Terms of Service and Privacy Policy.
          </Label>
        </div>

        <Button
          type="submit"
          disabled={isLoading}
          className="w-full h-12 bg-gray-700 hover:bg-gray-800 text-white font-medium rounded-md disabled:opacity-50"
        >
          {isLoading ? "Creating account..." : "Sign Up"}
        </Button>
      </form>

      <div className="mt-6 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Button
            variant="outline"
            className="h-12 border-gray-300 bg-white hover:bg-gray-50 text-gray-700"
          >
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Log in with Google
          </Button>
          <Button
            variant="outline"
            className="h-12 border-gray-300 bg-white hover:bg-gray-50 text-gray-700"
          >
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"
              />
            </svg>
            Log in with Apple
          </Button>
        </div>
      </div>

      <div className="mt-6 text-center">
        <button
          type="button"
          onClick={onLoginClick}
          className="text-sm text-gray-600 hover:text-gray-800 underline"
        >
          Already have an account?
        </button>
      </div>
    </div>
  );
}
