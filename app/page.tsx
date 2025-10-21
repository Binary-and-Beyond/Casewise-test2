"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { LoginForm } from "@/components/login-form";
import { SignUpForm } from "@/components/signup-form";
import { ForgotPasswordForm } from "@/components/forgot-password-form";
import { AdminLoginForm } from "@/components/admin-login-form";
import { Dashboard } from "@/components/dashboard";
import { useAuth } from "@/lib/auth-context";

function AuthPageContent() {
  const { isAuthenticated, isLoading } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [currentView, setCurrentView] = useState<
    "login" | "signup" | "forgot" | "admin"
  >("login");

  // Handle URL parameters for authentication views
  useEffect(() => {
    const view = searchParams.get("view");
    if (view === "signup") {
      setCurrentView("signup");
    } else if (view === "forgot-password") {
      setCurrentView("forgot");
    } else if (view === "admin") {
      setCurrentView("admin");
    } else {
      setCurrentView("login");
    }
  }, [searchParams]);

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // If user is authenticated, redirect to dashboard
  if (isAuthenticated) {
    router.push("/dashboard");
    return null;
  }

  // Show authentication forms for non-authenticated users
  if (currentView === "forgot") {
    return (
      <ForgotPasswordForm onBackToLoginClick={() => setCurrentView("login")} />
    );
  }

  if (currentView === "admin") {
    return (
      <AdminLoginForm
        onBackToLoginClick={() => setCurrentView("login")}
        onLoginSuccess={() => {
          // Admin login success is handled by the auth context
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {currentView === "login" && (
          <LoginForm
            onSignUpClick={() => setCurrentView("signup")}
            onForgotPasswordClick={() => setCurrentView("forgot")}
            onAdminLoginClick={() => setCurrentView("admin")}
            onLoginSuccess={() => {
              // Login success is handled by the auth context
              // No need to manually change view
            }}
          />
        )}
        {currentView === "signup" && (
          <SignUpForm
            onLoginClick={() => setCurrentView("login")}
            onSignUpSuccess={() => {
              // Signup success is handled by the auth context
              // No need to manually change view
            }}
          />
        )}
      </div>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading...</p>
          </div>
        </div>
      }
    >
      <AuthPageContent />
    </Suspense>
  );
}
