"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { apiService, User, AuthResponse } from "./api";

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (
    email: string,
    password: string,
    rememberMe?: boolean
  ) => Promise<void>;
  adminLogin: (
    email: string,
    password: string,
    rememberMe?: boolean
  ) => Promise<void>;
  signup: (
    email: string,
    username: string,
    password: string,
    fullName?: string
  ) => Promise<void>;
  googleAuth: (idToken: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  isAdmin: boolean;
  refreshToken: () => Promise<boolean>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing token on mount
    const storedToken = localStorage.getItem("auth_token");
    if (storedToken) {
      setToken(storedToken);
      // Verify token and get user info
      verifyToken(storedToken);
    } else {
      setIsLoading(false);
    }

    // Set up periodic token verification (every 5 minutes)
    const interval = setInterval(() => {
      if (storedToken && user) {
        verifyToken(storedToken);
      }
    }, 5 * 60 * 1000); // 5 minutes

    // Handle browser tab visibility changes
    const handleVisibilityChange = () => {
      if (!document.hidden && storedToken && user) {
        // User returned to tab, verify token
        verifyToken(storedToken);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  const verifyToken = async (token: string) => {
    try {
      const userData = await apiService.getCurrentUser();
      setUser(userData);
      setToken(token);
    } catch (error) {
      console.warn("Token verification failed:", error);
      // Token is invalid or expired, clear it
      localStorage.removeItem("auth_token");
      setToken(null);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (
    email: string,
    password: string,
    rememberMe: boolean = false
  ) => {
    try {
      const response: AuthResponse = await apiService.login({
        email,
        password,
        remember_me: rememberMe,
      });

      // Store token
      localStorage.setItem("auth_token", response.access_token);
      setToken(response.access_token);

      // Get user data
      const userData = await apiService.getCurrentUser();
      setUser(userData);
    } catch (error) {
      throw error;
    }
  };

  const adminLogin = async (
    email: string,
    password: string,
    rememberMe: boolean = false
  ) => {
    try {
      const response: AuthResponse = await apiService.adminLogin({
        email,
        password,
        remember_me: rememberMe,
      });

      // Store token
      localStorage.setItem("auth_token", response.access_token);
      setToken(response.access_token);

      // Get user data
      const userData = await apiService.getCurrentUser();
      setUser(userData);
    } catch (error) {
      throw error;
    }
  };

  const signup = async (
    email: string,
    username: string,
    password: string,
    fullName?: string
  ) => {
    try {
      await apiService.signup({
        email,
        username,
        password,
        full_name: fullName,
      });
      // After successful signup, automatically log in
      await login(email, password);
    } catch (error) {
      throw error;
    }
  };

  const googleAuth = async (idToken: string) => {
    try {
      const response: AuthResponse = await apiService.googleAuth(idToken);

      // Store token
      localStorage.setItem("auth_token", response.access_token);
      setToken(response.access_token);

      // Get user data
      const userData = await apiService.getCurrentUser();
      setUser(userData);
    } catch (error) {
      throw error;
    }
  };

  const refreshToken = async (): Promise<boolean> => {
    const storedToken = localStorage.getItem("auth_token");
    if (!storedToken) {
      return false;
    }

    try {
      const userData = await apiService.getCurrentUser();
      setUser(userData);
      setToken(storedToken);
      return true;
    } catch (error) {
      console.warn("Token refresh failed:", error);
      logout();
      return false;
    }
  };

  const logout = () => {
    // Clear authentication data
    localStorage.removeItem("auth_token");
    setToken(null);
    setUser(null);

    // Clear any pending API calls or redirect to login
    console.log("User logged out successfully");

    // Redirect to login page if not already there
    if (typeof window !== "undefined" && window.location.pathname !== "/") {
      window.location.href = "/";
    }
  };

  const refreshUser = async () => {
    try {
      const userData = await apiService.getCurrentUser();
      setUser(userData);
    } catch (error) {
      console.error("Failed to refresh user data:", error);
    }
  };

  const value: AuthContextType = {
    user,
    token,
    isLoading,
    login,
    adminLogin,
    signup,
    googleAuth,
    logout,
    refreshToken,
    refreshUser,
    isAuthenticated: !!token && !!user,
    isAdmin: user?.role === "admin",
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
