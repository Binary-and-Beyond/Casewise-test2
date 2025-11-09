"use client";

import type React from "react";
import { useState, useEffect } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/lib/auth-context";
import { config, debugEnv } from "@/lib/config";
import { BiHide, BiShow } from "react-icons/bi";

interface SignUpFormProps {
  onLoginClick: () => void;
  onSignUpSuccess: () => void;
}

export function SignUpForm({ onLoginClick, onSignUpSuccess }: SignUpFormProps) {
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
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [error, setError] = useState("");

  const { signup, googleAuth } = useAuth();

  // Initialize Google Auth when component mounts
  useEffect(() => {
    const initializeGoogle = () => {
      const clientId = config.googleClientId;

      console.log("🔍 Google OAuth Debug (Signup):");
      console.log("- Client ID:", clientId);
      console.log(
        "- Environment variable:",
        process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
      );
      console.log("- Window location:", window.location.origin);

      if (!clientId) {
        console.warn(
          "Google Client ID not configured. Google login will not be available."
        );
        return;
      }

      if (
        typeof window !== "undefined" &&
        window.google &&
        window.google.accounts &&
        clientId !== "your-google-client-id-here"
      ) {
        try {
          window.google.accounts.id.initialize({
            client_id: clientId,
            callback: async (response: any) => {
              try {
                setIsGoogleLoading(true);
                setError("");
                await googleAuth(response.credential);
                onSignUpSuccess();
              } catch (error) {
                setError(
                  error instanceof Error
                    ? error.message
                    : "Google authentication failed"
                );
              } finally {
                setIsGoogleLoading(false);
              }
            },
            auto_select: false,
            cancel_on_tap_outside: true,
          });

          // Render the Google button
          const buttonElement = document.getElementById("google-signup-button");
          if (buttonElement) {
            window.google.accounts.id.renderButton(buttonElement, {
              theme: "outline",
              size: "large",
              width: "100%",
              text: "signup_with",
              shape: "rectangular",
              logo_alignment: "left",
            });

            // Force the button to maintain full width, center alignment, and prevent auto-detection
            setTimeout(() => {
              const googleButton = buttonElement.querySelector(
                'div[role="button"]'
              ) as HTMLElement;
              if (googleButton) {
                // Force full width and center alignment
                googleButton.style.width = "100%";
                googleButton.style.minWidth = "100%";
                googleButton.style.margin = "0 auto";
                googleButton.style.display = "flex";
                googleButton.style.justifyContent = "center";
                googleButton.style.alignItems = "center";

                // Set up observer to prevent text changes
                const observer = new MutationObserver((mutations) => {
                  mutations.forEach((mutation) => {
                    if (
                      mutation.type === "childList" ||
                      mutation.type === "characterData"
                    ) {
                      const textElement = googleButton.querySelector("span");
                      if (
                        textElement &&
                        textElement.textContent &&
                        !textElement.textContent.includes("Sign up with Google")
                      ) {
                        textElement.textContent = "Sign up with Google";
                      }
                    }
                  });
                });

                observer.observe(googleButton, {
                  childList: true,
                  subtree: true,
                  characterData: true,
                });

                // Initial text check
                const textElement = googleButton.querySelector("span");
                if (
                  textElement &&
                  textElement.textContent !== "Sign up with Google"
                ) {
                  textElement.textContent = "Sign up with Google";
                }
              }
            }, 100);
          }
        } catch (error) {
          console.error("Error initializing Google Auth:", error);
        }
      }
    };

    // Wait for Google to load
    if (typeof window !== "undefined") {
      if (window.google && window.google.accounts) {
        initializeGoogle();
      } else {
        const checkGoogle = setInterval(() => {
          if (window.google && window.google.accounts) {
            clearInterval(checkGoogle);
            initializeGoogle();
          }
        }, 100);

        // Cleanup interval after 5 seconds
        setTimeout(() => {
          clearInterval(checkGoogle);
        }, 5000);
      }
    }
  }, [googleAuth, onSignUpSuccess]);

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
      onSignUpSuccess();
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
              First Name <span className="text-red-500">*</span>
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
              Last Name <span className="text-red-500">*</span>
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
            Email <span className="text-red-500">*</span>
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
            Password <span className="text-red-500">*</span>
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
                setPasswordFocused(false);
                setShowPasswordRequirements(true);
                setShowPassword(false); // Show password when first focused
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
                <BiHide className="h-5 w-5 opacity-60 hover:opacity-100" />
              ) : (
                <BiShow className="h-5 w-5 opacity-60 hover:opacity-100" />
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
          disabled={isLoading || isGoogleLoading}
          className="w-full h-12 bg-gray-700 hover:bg-gray-800 text-white font-medium rounded-md disabled:opacity-50"
        >
          {isLoading ? "Creating account..." : "Sign Up"}
        </Button>
      </form>

      <div className="mt-6 space-y-3">
        <div className="relative w-full flex justify-center items-center">
          <div
            id="google-signup-button"
            className="w-full h-12 flex justify-center items-center"
            style={{
              minWidth: "100%",
              width: "100%",
            }}
          ></div>
          {isGoogleLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 rounded border">
              <span className="text-sm text-gray-600">Signing up...</span>
            </div>
          )}
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
