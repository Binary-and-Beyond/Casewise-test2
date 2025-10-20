"use client";

import { AIChat } from "@/components/widgets/ai-chat";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { apiService, Document, ChatSession } from "@/lib/api";

interface ChatPageProps {
  params: {
    documentId: string;
  };
}

export default function ChatPage({ params }: ChatPageProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [document, setDocument] = useState<Document | null>(null);
  const [chatSession, setChatSession] = useState<ChatSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/");
    }
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    const loadDocumentAndCreateChat = async () => {
      try {
        // Load the document
        const documentsResponse = await apiService.getDocuments();
        const doc = documentsResponse.documents.find(
          (d) => d.id === params.documentId
        );

        if (!doc) {
          console.error("Document not found:", params.documentId);
          router.push("/dashboard");
          return;
        }

        setDocument(doc);

        // Create or get existing chat session for this document
        const chatResponse = await apiService.createChat({
          document_id: doc.id,
        });
        setChatSession(chatResponse);
      } catch (error) {
        console.error("Failed to load document or create chat:", error);
      } finally {
        setLoading(false);
      }
    };

    if (isAuthenticated && params.documentId) {
      loadDocumentAndCreateChat();
    }
  }, [isAuthenticated, params.documentId, router]);

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

  if (!document || !chatSession) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Chat Not Available
          </h1>
          <p className="text-gray-600 mb-6">
            Unable to load the chat for this document.
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
      <div className="max-w-6xl mx-auto p-6">
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">AI Chat</h1>
              <p className="text-gray-600">Document: {document.filename}</p>
            </div>
            <button
              onClick={() => router.push("/dashboard")}
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg"
            >
              Back to Dashboard
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 h-[calc(100vh-200px)]">
          <AIChat
            chatId={chatSession.id}
            documentId={document.id}
            messages={chatSession.messages}
          />
        </div>
      </div>
    </div>
  );
}
