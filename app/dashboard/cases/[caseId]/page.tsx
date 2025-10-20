"use client";

import { ChatbotFlow } from "@/components/widgets/chatbot-flow";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { apiService, Document } from "@/lib/api";

interface CasePageProps {
  params: {
    caseId: string;
  };
}

export default function CasePage({ params }: CasePageProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [document, setDocument] = useState<Document | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/");
    }
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    const loadDocument = async () => {
      try {
        // For now, we'll use a default document or the first available document
        // In a real implementation, you'd fetch the document associated with this case
        const response = await apiService.getDocuments();
        if (response.documents.length > 0) {
          setDocument(response.documents[0]);
        }
      } catch (error) {
        console.error("Failed to load document:", error);
      } finally {
        setLoading(false);
      }
    };

    if (isAuthenticated) {
      loadDocument();
    }
  }, [isAuthenticated]);

  if (isLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  if (!document) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Document Not Found
          </h1>
          <p className="text-gray-600 mb-6">
            The document for this case could not be loaded.
          </p>
          <button
            onClick={() => router.push("/dashboard")}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <ChatbotFlow
        document={document}
        onBack={() => router.push("/dashboard/cases")}
      />
    </div>
  );
}
