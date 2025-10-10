"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { apiService } from "@/lib/api";

export function ConnectionTest() {
  const [isTesting, setIsTesting] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const testConnection = async () => {
    setIsTesting(true);
    setResult(null);

    try {
      const testResult = await apiService.testConnection();
      setResult(testResult);
    } catch (error) {
      setResult({
        success: false,
        message:
          error instanceof Error ? error.message : "Unknown error occurred",
      });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="p-4 border border-gray-200 rounded-lg bg-gray-50">
      <h3 className="text-lg font-semibold mb-3">Backend Connection Test</h3>
      <p className="text-sm text-gray-600 mb-4">
        Test if your frontend can connect to the backend API. This helps
        diagnose CORS issues.
      </p>

      <Button
        onClick={testConnection}
        disabled={isTesting}
        className="mb-4"
        variant="outline"
      >
        {isTesting ? "Testing..." : "Test Connection"}
      </Button>

      {result && (
        <div
          className={`p-3 rounded-md ${
            result.success
              ? "bg-green-50 border border-green-200"
              : "bg-red-50 border border-red-200"
          }`}
        >
          <div className="flex items-center">
            <div
              className={`w-2 h-2 rounded-full mr-2 ${
                result.success ? "bg-green-500" : "bg-red-500"
              }`}
            />
            <span
              className={`text-sm font-medium ${
                result.success ? "text-green-800" : "text-red-800"
              }`}
            >
              {result.success ? "Success" : "Error"}
            </span>
          </div>
          <p
            className={`text-sm mt-1 ${
              result.success ? "text-green-700" : "text-red-700"
            }`}
          >
            {result.message}
          </p>
        </div>
      )}

      {result && !result.success && (
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
          <h4 className="text-sm font-medium text-yellow-800 mb-2">
            Troubleshooting Steps:
          </h4>
          <ul className="text-sm text-yellow-700 space-y-1">
            <li>1. Ensure your backend is running on http://localhost:8000</li>
            <li>2. Check that CORS is properly configured in your backend</li>
            <li>3. Verify the API_BASE_URL in your environment variables</li>
            <li>4. Check browser console for detailed error messages</li>
          </ul>
        </div>
      )}
    </div>
  );
}
