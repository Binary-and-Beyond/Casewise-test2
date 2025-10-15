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

interface LoginFormProps {
  onSignUpClick: () => void;
  onForgotPasswordClick: () => void;
  onLoginSuccess: () => void; // Added onLoginSuccess prop
}

export function LoginForm({
  onSignUpClick,
  onForgotPasswordClick,
  onLoginSuccess,
}: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const { login, googleAuth } = useAuth();

  // Initialize Google Auth when component mounts
  useEffect(() => {
    const initializeGoogle = () => {
      const clientId =
        config.googleClientId ||
        "667668054845-4e63o2dlu50jlttnetusiukphseo33ck.apps.googleusercontent.com";

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
                await googleAuth(response.credential);
                onLoginSuccess();
              } catch (error) {
                setError(
                  error instanceof Error
                    ? error.message
                    : "Google authentication failed"
                );
              }
            },
            auto_select: false,
            cancel_on_tap_outside: true,
          });

          // Render the Google button
          const buttonElement = document.getElementById("google-signin-button");
          if (buttonElement) {
            window.google.accounts.id.renderButton(buttonElement, {
              theme: "outline",
              size: "large",
              width: "100%",
              text: "signin_with",
              shape: "rectangular",
            });
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
  }, [googleAuth, onLoginSuccess]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      await login(email, password);
      onLoginSuccess();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Login failed");
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
          Log In
        </h1>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email" className="text-sm font-medium text-gray-700">
            Email Address
          </Label>
          <Input
            id="email"
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
              id="remember"
              checked={rememberMe}
              onCheckedChange={(checked) => setRememberMe(checked as boolean)}
            />
            <Label htmlFor="remember" className="text-sm text-gray-600">
              Remember me
            </Label>
          </div>
          <button
            type="button"
            onClick={onForgotPasswordClick}
            className="text-sm text-gray-600 hover:text-gray-800"
          >
            Forgot Password?
          </button>
        </div>

        <Button
          type="submit"
          disabled={isLoading}
          className="w-full h-12 bg-gray-700 hover:bg-gray-800 text-white font-medium rounded-md disabled:opacity-50"
        >
          {isLoading ? "Logging in..." : "Log In"}
        </Button>
      </form>

      <div className="mt-6 space-y-3">
        <div className="flex justify-center">
          <div className="relative w-full max-w-xs">
            <div id="google-signin-button" className="w-full h-12"></div>
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 rounded border">
                <span className="text-sm text-gray-600">Signing in...</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 text-center">
        <p className="text-sm text-gray-600">
          No account yet?{" "}
          <button
            onClick={onSignUpClick}
            className="text-blue-600 hover:underline"
          >
            Sign Up
          </button>
        </p>
      </div>
    </div>
  );
}
