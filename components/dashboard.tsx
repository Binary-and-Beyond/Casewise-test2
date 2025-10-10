"use client";
import { useState, useEffect } from "react";
import type React from "react";

import { Sidebar } from "@/components/layout/sidebar";
import { AdminAnalyticsTable } from "@/components/widgets/admin-analytics-table";
import { FileUploadArea } from "@/components/widgets/file-upload-area";
import { CasesList } from "@/components/widgets/cases-list";
import { Breadcrumb } from "@/components/widgets/breadcrumb";
import { CaseSelectionOptions } from "@/components/widgets/case-selection-options";
import { MCQQuestionsList } from "@/components/widgets/mcq-questions-list";
import { InteractiveMCQQuestionsList } from "@/components/widgets/interactive-mcq-questions-list";
import { ChatInput } from "@/components/widgets/chat-input";
import { ConceptsList } from "@/components/widgets/concepts-list";
import { ActionButtons } from "@/components/widgets/action-buttons";
import { StatsCard } from "@/components/widgets/stats-card";
import { ProfileSettings } from "@/components/widgets/profile-settings";
import { Notifications } from "@/components/widgets/notifications";
import { AIChat } from "@/components/widgets/ai-chat";
import { ConnectionTest } from "@/components/widgets/connection-test";
import { ChatbotFlow } from "@/components/widgets/chatbot-flow";
import { ScrollToTop } from "@/components/widgets/scroll-to-top";
import { useAuth } from "@/lib/auth-context";
import {
  apiService,
  Document,
  CaseScenario,
  ChatSession,
  ChatMessage,
  MCQQuestion,
} from "@/lib/api";

interface DashboardProps {
  // No props needed - authentication is handled by context
}

interface Chat {
  id: string;
  name: string;
  uploadedFile?: File | null;
  document?: Document | null;
  messageCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export function Dashboard({}: DashboardProps) {
  const { user, logout, isLoading: authLoading } = useAuth();
  const [currentView, setCurrentView] = useState<
    | "main"
    | "admin-analytics"
    | "generate-cases"
    | "case-selection"
    | "generate-mcqs"
    | "explore-cases"
    | "identify-concepts"
    | "profile-settings"
    | "notifications"
    | "chatbot-flow"
  >("main");
  const [selectedCase, setSelectedCase] = useState<string>("");
  const [activeChat, setActiveChat] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("active_chat") || "";
    }
    return "";
  });
  const [expandedQuestions, setExpandedQuestions] = useState<number[]>([]);
  const [chatMessage, setChatMessage] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [isAutoLoading, setIsAutoLoading] = useState(false);
  const [autoLoadingProgress, setAutoLoadingProgress] = useState("");
  const [generatedCases, setGeneratedCases] = useState<CaseScenario[]>([]);
  const [chats, setChats] = useState<Chat[]>([]);
  const [isLoadingChats, setIsLoadingChats] = useState(true);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(
    null
  );
  const [mcqQuestions, setMCQQuestions] = useState<MCQQuestion[]>([]);
  const [generatedConcepts, setGeneratedConcepts] = useState<string[]>([]);

  // Load user chats only after authentication is complete
  useEffect(() => {
    if (!authLoading && user) {
      loadUserChats();
    }
  }, [authLoading, user]);

  const loadUserChats = async () => {
    try {
      setIsLoadingChats(true);
      console.log("🔄 Loading user chats...");

      // Try to load from localStorage first for faster initial load
      const cachedChats = localStorage.getItem("user_chats");
      const cachedActiveChat = localStorage.getItem("active_chat");

      if (cachedChats) {
        try {
          const parsedChats = JSON.parse(cachedChats);
          console.log("📱 Loaded cached chats:", parsedChats.length);
          setChats(parsedChats);

          // Set the cached active chat if available
          if (
            cachedActiveChat &&
            parsedChats.some((chat: Chat) => chat.id === cachedActiveChat)
          ) {
            console.log("📱 Restored active chat:", cachedActiveChat);
            setActiveChat(cachedActiveChat);
          } else if (parsedChats.length > 0) {
            console.log("📱 Setting first chat as active:", parsedChats[0].id);
            setActiveChat(parsedChats[0].id);
          }
        } catch (e) {
          console.log("❌ Failed to parse cached chats:", e);
          localStorage.removeItem("user_chats");
          localStorage.removeItem("active_chat");
        }
      }

      // Then load from API to get latest data
      console.log("🌐 Fetching chats from API...");
      const userChats = await apiService.getUserChats();
      console.log("🌐 API returned chats:", userChats.length);

      // Merge API data with cached document data
      const chatList: Chat[] = userChats.map((chat) => {
        // Find the cached version to preserve document data from localStorage
        let cachedChat = chats.find((cached) => cached.id === chat.id);

        // If not found in current state, try to get from localStorage
        if (!cachedChat && cachedChats) {
          try {
            const parsedCachedChats = JSON.parse(cachedChats);
            cachedChat = parsedCachedChats.find(
              (cached: Chat) => cached.id === chat.id
            );
          } catch (e) {
            console.log("Failed to parse cached chats for document data:", e);
          }
        }

        return {
          id: chat.id,
          name: chat.name,
          uploadedFile: cachedChat?.uploadedFile || null,
          document: cachedChat?.document || null,
          messageCount: chat.message_count,
          createdAt: chat.created_at,
          updatedAt: chat.updated_at,
        };
      });

      // Update state and cache
      setChats(chatList);
      localStorage.setItem("user_chats", JSON.stringify(chatList));
      console.log("💾 Cached chats to localStorage");

      // Set the first chat as active if no active chat is set
      if (chatList.length > 0 && !activeChat) {
        const newActiveChat = chatList[0].id;
        console.log("🎯 Setting first chat as active:", newActiveChat);
        setActiveChat(newActiveChat);
        localStorage.setItem("active_chat", newActiveChat);
      }
    } catch (error) {
      console.error("❌ Failed to load chats:", error);
      setUploadError("Failed to load chats");
    } finally {
      setIsLoadingChats(false);
    }
  };

  const startChatbotFlow = (document: Document) => {
    setSelectedDocument(document);
    setCurrentView("chatbot-flow");
  };

  const createNewChat = async (documentId?: string) => {
    try {
      const newChat = await apiService.createChat({ document_id: documentId });
      const chat: Chat = {
        id: newChat.id,
        name: newChat.name,
        uploadedFile: null,
        document: null,
        messageCount: newChat.message_count,
        createdAt: newChat.created_at,
        updatedAt: newChat.updated_at,
      };

      setChats((prev) => {
        const updatedChats = [chat, ...prev];
        localStorage.setItem("user_chats", JSON.stringify(updatedChats));
        return updatedChats;
      });
      setActiveChat(newChat.id);
      localStorage.setItem("active_chat", newChat.id);
      setChatMessages([]);
      setCurrentView("main");
    } catch (error) {
      console.error("Failed to create chat:", error);
      setUploadError("Failed to create new chat");
    }
  };

  const deleteChat = async (chatId: string) => {
    try {
      await apiService.deleteChat(chatId);
      setChats((prev) => {
        const updatedChats = prev.filter((chat) => chat.id !== chatId);
        localStorage.setItem("user_chats", JSON.stringify(updatedChats));
        return updatedChats;
      });

      // If we deleted the active chat, switch to another one
      if (activeChat === chatId) {
        const remainingChats = chats.filter((chat) => chat.id !== chatId);
        if (remainingChats.length > 0) {
          const newActiveChat = remainingChats[0].id;
          setActiveChat(newActiveChat);
          localStorage.setItem("active_chat", newActiveChat);
        } else {
          setActiveChat("");
          localStorage.removeItem("active_chat");
          setChatMessages([]);
        }
      }
    } catch (error) {
      console.error("Failed to delete chat:", error);
      setUploadError("Failed to delete chat");
    }
  };

  const loadChatMessages = async (chatId: string) => {
    try {
      const messages = await apiService.getChatMessages(chatId);
      setChatMessages(messages);
    } catch (error) {
      console.error("Failed to load chat messages:", error);
    }
  };

  // Load messages when active chat changes
  useEffect(() => {
    if (activeChat) {
      loadChatMessages(activeChat);
    } else {
      setChatMessages([]);
    }
  }, [activeChat]);

  // Use generated cases if available, otherwise fallback to default cases
  const defaultCases = [
    {
      title: "Chest Pain in a Middle-Aged Man",
      difficulty: "Moderate",
      description: "patient has chest pain since yesterday night...",
    },
    {
      title: "Persistent Cough in a smoker",
      difficulty: "Easy",
      description: "patient has chest pain since yesterday night...",
    },
    {
      title: "Shortness of breath in pregnancy",
      difficulty: "Easy",
      description: "patient has chest pain since yesterday night...",
    },
    {
      title: "Diabetes Management in an elderly patient",
      difficulty: "Moderate",
      description: "patient has chest pain since yesterday night...",
    },
    {
      title: "Chest Pain in a young man",
      difficulty: "Hard",
      description: "patient has chest pain since yesterday night...",
    },
  ];

  // Convert generated cases to the format expected by CasesList
  const cases =
    generatedCases.length > 0
      ? generatedCases.map((scenario, index) => ({
          title: scenario.title,
          difficulty: scenario.difficulty,
          description: scenario.description,
          key_points: scenario.key_points,
        }))
      : defaultCases;

  const analyticsData = [
    {
      user: "Student A",
      timeSpent: "10 mins",
      casesUploaded: 10,
      mcqAttempted: 2,
      mostQuestionsType: "Easy",
    },
    {
      user: "Student B",
      timeSpent: "20mins",
      casesUploaded: 1,
      mcqAttempted: 5,
      mostQuestionsType: "Hard",
    },
    {
      user: "Student C",
      timeSpent: "50 mins",
      casesUploaded: 12,
      mcqAttempted: 10,
      mostQuestionsType: "Easy",
    },
    {
      user: "Student D",
      timeSpent: "2 hours",
      casesUploaded: 12,
      mcqAttempted: 20,
      mostQuestionsType: "Hard",
    },
    {
      user: "Student E",
      timeSpent: "10 mins",
      casesUploaded: 4,
      mcqAttempted: 10,
      mostQuestionsType: "Hard",
    },
  ];

  // Use generated MCQs if available, otherwise fall back to default questions
  const questions =
    mcqQuestions.length > 0
      ? mcqQuestions
      : [
          "Most specific marker of myocardial infarction?",
          "First-line management for STEMI?",
          "ECG finding in pericarditis vs MI?",
          "ECG status in pericarditis vs MI?",
          "First-line management for STEMI?",
          "ECG finding in pericarditis vs MI?",
          "First-line management for STEMI?",
          "Most specific marker of myocardial infarction?",
        ];

  // Use generated concepts if available, otherwise fall back to default concepts
  const concepts =
    generatedConcepts.length > 0
      ? generatedConcepts
      : [
          "Pathophysiology of myocardial infarction.",
          "Differential diagnosis of chest pain.",
          "ST elevation vs non-ST elevation. Get to know more about the here.",
        ];

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (file) {
      setIsUploading(true);
      setUploadError("");

      try {
        // Validate file size (20MB limit)
        const maxSize = 20 * 1024 * 1024; // 20MB in bytes
        if (file.size > maxSize) {
          throw new Error(
            "File size exceeds 20MB limit. Please choose a smaller file."
          );
        }

        // Validate file type
        const allowedTypes = [
          "application/pdf",
          "application/msword",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "text/plain",
          "text/markdown",
        ];

        if (!allowedTypes.includes(file.type)) {
          throw new Error(
            "Unsupported file type. Please upload PDF, DOC, DOCX, or TXT files."
          );
        }

        console.log("📤 Starting file upload:", file.name, "Size:", file.size);

        const document = await apiService.uploadDocumentEnhanced(file);
        console.log("✅ File uploaded successfully:", document);

        // Check if we have an active chat, if not create one
        let currentChatId = activeChat;
        if (!currentChatId || chats.length === 0) {
          console.log("📝 No active chat found, creating new chat...");
          const newChat = await apiService.createChat({
            document_id: document.id,
          });
          const chat: Chat = {
            id: newChat.id,
            name: newChat.name,
            uploadedFile: file,
            document: document,
            messageCount: newChat.message_count,
            createdAt: newChat.created_at,
            updatedAt: newChat.updated_at,
          };

          setChats((prev) => [chat, ...prev]);
          setActiveChat(newChat.id);
          localStorage.setItem("active_chat", newChat.id);
          currentChatId = newChat.id;
        } else {
          // Update the existing active chat with the new document
          console.log("📝 Updating existing chat with new document...");
          setChats((prev) => {
            const updatedChats = prev.map((chat) =>
              chat.id === currentChatId
                ? {
                    ...chat,
                    uploadedFile: file,
                    document: document,
                    name: file.name.replace(/\.[^/.]+$/, ""), // Use filename without extension
                  }
                : chat
            );
            // Update localStorage cache
            localStorage.setItem("user_chats", JSON.stringify(updatedChats));
            return updatedChats;
          });
        }

        setChatMessages([]);
        setCurrentView("main");

        // Auto-load all content after successful upload
        console.log("🚀 File upload successful, starting auto-generation...");
        setAutoLoadingProgress(
          "Document uploaded! Starting content generation..."
        );

        // Start auto-generation immediately
        await autoLoadAllContent(document);
      } catch (error) {
        setUploadError(
          error instanceof Error ? error.message : "Upload failed"
        );
        console.error("❌ Upload error:", error);
      } finally {
        setIsUploading(false);
      }
    }
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
  };

  const handleDrop = async (event: React.DragEvent) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file) {
      console.log("📁 File dropped:", file.name, "Size:", file.size);

      // Create a synthetic event to reuse the existing upload logic
      const syntheticEvent = {
        target: { files: [file] },
      } as unknown as React.ChangeEvent<HTMLInputElement>;
      await handleFileUpload(syntheticEvent);
    }
  };

  const handleChatSelect = (chatId: string) => {
    setActiveChat(chatId);
    localStorage.setItem("active_chat", chatId);
    setCurrentView("main");
    console.log("[v0] Chat selected:", chatId);
  };

  const getCurrentChatFile = () => {
    return chats.find((chat) => chat.id === activeChat)?.uploadedFile || null;
  };

  const getCurrentChatDocument = () => {
    return chats.find((chat) => chat.id === activeChat)?.document || null;
  };

  const getDynamicBreadcrumbs = () => {
    const currentDocument = getCurrentChatDocument();
    const documentName = currentDocument?.filename || "Document";
    const documentNameWithoutExt = documentName.replace(/\.[^/.]+$/, "");

    switch (currentView) {
      case "case-selection":
        return [
          { label: "Home", onClick: () => setCurrentView("main") },
          {
            label: documentNameWithoutExt,
            onClick: () => setCurrentView("main"),
          },
          { label: selectedCase || "Select Case", isActive: true },
        ];
      case "generate-mcqs":
        return [
          { label: "Home", onClick: () => setCurrentView("main") },
          {
            label: documentNameWithoutExt,
            onClick: () => setCurrentView("main"),
          },
          {
            label: selectedCase || "Case",
            onClick: () => setCurrentView("case-selection"),
          },
          { label: "Generate MCQs", isActive: true },
        ];
      case "explore-cases":
        return [
          { label: "Home", onClick: () => setCurrentView("main") },
          {
            label: documentNameWithoutExt,
            onClick: () => setCurrentView("main"),
          },
          {
            label: selectedCase || "Case",
            onClick: () => setCurrentView("case-selection"),
          },
          { label: "Explore Case", isActive: true },
        ];
      case "identify-concepts":
        return [
          { label: "Home", onClick: () => setCurrentView("main") },
          {
            label: documentNameWithoutExt,
            onClick: () => setCurrentView("main"),
          },
          {
            label: selectedCase || "Case",
            onClick: () => setCurrentView("case-selection"),
          },
          { label: "Identify Concepts", isActive: true },
        ];
      case "profile-settings":
        return [
          { label: "Home", onClick: () => setCurrentView("main") },
          { label: "Profile Settings", isActive: true },
        ];
      case "notifications":
        return [
          { label: "Home", onClick: () => setCurrentView("main") },
          { label: "Notifications", isActive: true },
        ];
      case "chatbot-flow":
        return [
          { label: "Home", onClick: () => setCurrentView("main") },
          {
            label: documentNameWithoutExt,
            onClick: () => setCurrentView("main"),
          },
          { label: "AI Chat", isActive: true },
        ];
      default:
        return [{ label: "Home", isActive: true }];
    }
  };

  const getBackNavigation = () => {
    switch (currentView) {
      case "case-selection":
        return { label: "Back to Main", onClick: () => setCurrentView("main") };
      case "generate-mcqs":
        return {
          label: "Back to Case",
          onClick: () => setCurrentView("case-selection"),
        };
      case "explore-cases":
        return {
          label: "Back to Case",
          onClick: () => setCurrentView("case-selection"),
        };
      case "identify-concepts":
        return {
          label: "Back to Case",
          onClick: () => setCurrentView("case-selection"),
        };
      case "profile-settings":
        return { label: "Back to Main", onClick: () => setCurrentView("main") };
      case "notifications":
        return { label: "Back to Main", onClick: () => setCurrentView("main") };
      case "chatbot-flow":
        return { label: "Back to Main", onClick: () => setCurrentView("main") };
      default:
        return null;
    }
  };

  const renderBackButton = () => {
    const backNav = getBackNavigation();
    if (!backNav) return null;

    return (
      <button
        onClick={backNav.onClick}
        className="flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4 transition-colors"
      >
        <svg
          className="w-4 h-4 mr-2"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 19l-7-7 7-7"
          />
        </svg>
        {backNav.label}
      </button>
    );
  };

  const generateCasesFromDocument = async () => {
    const currentDocument = getCurrentChatDocument();
    if (!currentDocument) {
      setUploadError("No document available for case generation");
      return;
    }

    try {
      setIsUploading(true);
      setUploadError("");

      // Use the new case titles API endpoint
      const response = await apiService.generateCaseTitles(
        currentDocument.id,
        5
      );

      // Convert the API response to the format expected by your existing CasesList component
      const adaptedCases = response.cases.map((caseTitle) => ({
        title: caseTitle.title,
        difficulty: caseTitle.difficulty,
        description: caseTitle.description,
        key_points: [], // Add empty key_points array to match the expected format
      }));

      // Update the generated cases state
      setGeneratedCases(adaptedCases);
      console.log("Cases generated successfully:", response);
    } catch (error) {
      setUploadError(
        error instanceof Error ? error.message : "Failed to generate cases"
      );
      console.error("Case generation error:", error);
    } finally {
      setIsUploading(false);
    }
  };

  const generateMCQsFromDocument = async () => {
    const currentDocument = getCurrentChatDocument();
    if (!currentDocument) {
      setUploadError("No document available for MCQ generation");
      return;
    }

    try {
      setIsUploading(true);
      setUploadError("");

      // Use the new MCQ API endpoint
      const response = await apiService.generateMCQs(
        currentDocument.id,
        undefined,
        5
      );

      // Update the MCQ questions state with full objects
      setMCQQuestions(response.questions);
      console.log("MCQs generated successfully:", response);
    } catch (error) {
      setUploadError(
        error instanceof Error ? error.message : "Failed to generate MCQs"
      );
      console.error("MCQ generation error:", error);
    } finally {
      setIsUploading(false);
    }
  };

  const generateConceptsFromDocument = async () => {
    const currentDocument = getCurrentChatDocument();
    if (!currentDocument) {
      setUploadError("No document available for concept generation");
      return;
    }

    try {
      setIsUploading(true);
      setUploadError("");

      // Use the new concepts API endpoint
      const response = await apiService.identifyConcepts(currentDocument.id, 5);

      // Extract concept strings from the API response
      const conceptStrings = response.concepts.map(
        (c) => `${c.title}: ${c.description}`
      );

      // Update the concepts state
      setGeneratedConcepts(conceptStrings);
      console.log("Concepts generated successfully:", response);
    } catch (error) {
      setUploadError(
        error instanceof Error ? error.message : "Failed to generate concepts"
      );
      console.error("Concept generation error:", error);
    } finally {
      setIsUploading(false);
    }
  };

  // Test function to verify API connectivity
  const testAPIConnectivity = async () => {
    console.log("Testing API connectivity...");
    try {
      const response = await fetch("http://localhost:8000/");
      const data = await response.json();
      console.log("Backend response:", data);
      return true;
    } catch (error) {
      console.error("API connectivity test failed:", error);
      return false;
    }
  };

  const autoLoadAllContent = async (document?: any) => {
    console.log("🚀 autoLoadAllContent called with document:", document);

    // Check if user is authenticated
    const authToken = localStorage.getItem("auth_token");
    if (!authToken) {
      console.log("❌ No auth token found, user not authenticated");
      setUploadError("Please log in to generate content.");
      return;
    }
    console.log("✅ User is authenticated");

    // Start loading state
    setIsAutoLoading(true);
    setUploadError("");
    setAutoLoadingProgress("Initializing content generation...");

    // Clear old content to prevent showing stale data
    setGeneratedCases([]);
    setMCQQuestions([]);
    setGeneratedConcepts([]);
    console.log("🧹 Cleared old content for new document");

    // Wait a bit for document to be processed
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Get current document - use provided document or get from state
    let currentDocument = document || getCurrentChatDocument();
    console.log("📄 Current document:", currentDocument);
    console.log("📄 Document ID:", currentDocument?.id);
    console.log(
      "📄 Document content length:",
      currentDocument?.content?.length
    );

    // If no document provided and none found in state, wait a bit and try again
    if (!currentDocument && !document) {
      console.log("⏳ No document found, waiting for state update...");
      setAutoLoadingProgress("Waiting for document to be processed...");
      await new Promise((resolve) => setTimeout(resolve, 2000));
      currentDocument = getCurrentChatDocument();
      console.log("📄 Document after wait:", currentDocument);
    }

    if (!currentDocument) {
      console.log("❌ No document found after retry");
      setUploadError("No document available. Please upload a document first.");
      setIsAutoLoading(false);
      setAutoLoadingProgress("");
      return;
    }

    if (
      !currentDocument.content ||
      currentDocument.content.trim().length === 0
    ) {
      console.log("❌ Document has no content");
      setUploadError(
        "Document content is not available. Please try uploading again."
      );
      setIsAutoLoading(false);
      setAutoLoadingProgress("");
      return;
    }

    console.log("✅ Document is ready, starting generation...");

    try {
      // Use quick generation first for immediate feedback
      setAutoLoadingProgress("🚀 Generating MCQs quickly...");
      console.log("🚀 Using quick generation endpoint...");

      const quickResponse = await apiService.quickGenerateContent({
        document_id: currentDocument.id,
        generate_cases: false,
        generate_mcqs: true,
        generate_concepts: false,
        generate_titles: false,
        num_cases: 5,
        num_mcqs: 5,
        num_concepts: 5,
        num_titles: 5,
      });

      if (quickResponse.success && quickResponse.mcqs) {
        setMCQQuestions(quickResponse.mcqs);
        console.log("✅ Quick MCQs generated:", quickResponse.mcqs.length);
        setAutoLoadingProgress(
          "✅ MCQs ready! Generating additional content..."
        );
      } else {
        console.log(
          "⚠️ Quick generation failed or no MCQs returned:",
          quickResponse
        );
        setAutoLoadingProgress(
          "⚠️ Quick generation failed, trying full generation..."
        );
      }

      // Now generate the rest of the content
      setAutoLoadingProgress("🚀 Generating cases, concepts, and titles...");
      console.log("🚀 Using full auto-generation endpoint...");

      const autoResponse = await apiService.autoGenerateContent({
        document_id: currentDocument.id,
        generate_cases: true,
        generate_mcqs: mcqQuestions.length === 0, // Generate MCQs if quick generation failed
        generate_concepts: true,
        generate_titles: true,
        num_cases: 5,
        num_mcqs: 5,
        num_concepts: 5,
        num_titles: 5,
      });

      if (autoResponse.success) {
        // Set all generated content
        if (autoResponse.cases) {
          setGeneratedCases(autoResponse.cases);
          console.log("✅ Cases generated:", autoResponse.cases.length);
        }

        if (autoResponse.mcqs) {
          setMCQQuestions(autoResponse.mcqs);
          console.log("✅ MCQs generated:", autoResponse.mcqs.length);
        }

        if (autoResponse.concepts) {
          const conceptStrings = autoResponse.concepts.map(
            (c) => `${c.title}: ${c.description}`
          );
          setGeneratedConcepts(conceptStrings);
          console.log("✅ Concepts identified:", autoResponse.concepts.length);
        }

        if (autoResponse.titles) {
          console.log("✅ Case titles generated:", autoResponse.titles.length);
        }

        setAutoLoadingProgress("🎉 Content generation completed successfully!");
        console.log("🎉 Auto-generation completed successfully!");

        // Show success message and clear progress
        setTimeout(() => {
          setAutoLoadingProgress("");
        }, 3000);
      } else {
        throw new Error(autoResponse.message || "Auto-generation failed");
      }
    } catch (error) {
      console.error("❌ Auto-loading error:", error);

      let errorMessage = "Failed to auto-load content";
      if (error instanceof Error) {
        errorMessage = error.message;
        console.error("Error details:", {
          message: error.message,
          stack: error.stack,
        });
      }

      // Provide specific error messages
      if (errorMessage.includes("fetch") || errorMessage.includes("Network")) {
        errorMessage =
          "Network error: Please check your internet connection and try again.";
      } else if (
        errorMessage.includes("401") ||
        errorMessage.includes("Unauthorized")
      ) {
        errorMessage = "Authentication error: Please log in again.";
      } else if (
        errorMessage.includes("Document not found") ||
        errorMessage.includes("404")
      ) {
        errorMessage = "Document not found: Please try uploading again.";
      } else if (errorMessage.includes("500")) {
        errorMessage =
          "Server error: The AI service may be temporarily unavailable. Please try again in a moment.";
      } else if (errorMessage.includes("Gemini")) {
        errorMessage =
          "AI service error: Please check your API configuration and try again.";
      }

      setUploadError(errorMessage);
      setAutoLoadingProgress("");
    } finally {
      setIsAutoLoading(false);
    }
  };

  const toggleQuestion = (index: number) => {
    setExpandedQuestions((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    );
  };

  const handleViewChange = (
    view:
      | "main"
      | "admin-analytics"
      | "generate-cases"
      | "case-selection"
      | "generate-mcqs"
      | "explore-cases"
      | "identify-concepts"
      | "profile-settings"
      | "notifications"
      | "chatbot-flow"
  ) => {
    setCurrentView(view);
  };

  const renderAdminAnalytics = () => (
    <AdminAnalyticsTable analyticsData={analyticsData} />
  );

  const renderMainDashboard = () => {
    const currentFile = getCurrentChatFile();

    // Show loading state while chats are being loaded
    if (isLoadingChats) {
      return (
        <div className="flex-1 p-8 flex flex-col items-center justify-center">
          <div className="text-center max-w-md">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading your dashboard...</p>
          </div>
        </div>
      );
    }

    // Show welcome screen if no chats exist
    if (chats.length === 0) {
      return (
        <div className="flex-1 p-8 flex flex-col items-center justify-center">
          <div className="text-center max-w-md">
            <h1 className="text-3xl font-semibold text-gray-900 mb-4">
              Welcome, {user?.full_name || user?.username || "User"}!
            </h1>
            <p className="text-gray-600 mb-8">
              Get started by creating your first chat to begin exploring medical
              cases.
            </p>

            <div className="space-y-4">
              <button
                onClick={() => createNewChat()}
                className="w-full bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition-colors"
              >
                Start New Chat
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="flex-1 p-8">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-gray-900">
            Welcome back, {user?.full_name || user?.username || "User"}!
          </h1>
        </div>

        {uploadError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600">{uploadError}</p>
          </div>
        )}

        {!currentFile ? (
          // Show upload area when no file is uploaded (when chats exist)
          <FileUploadArea
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onFileUpload={handleFileUpload}
            isLoading={isUploading}
            variant="primary"
          />
        ) : isAutoLoading ? (
          // Show auto-loading progress
          <div className="text-center py-12">
            <div className="flex flex-col items-center space-y-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              <div className="text-center">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Preparing Your Medical Case Content
                </h3>
                <p className="text-gray-600 mb-4">{autoLoadingProgress}</p>
                <div className="w-64 bg-gray-200 rounded-full h-2 mx-auto">
                  <div
                    className="bg-blue-600 h-2 rounded-full animate-pulse"
                    style={{ width: "60%" }}
                  ></div>
                </div>
                <p className="text-sm text-gray-500 mt-4">
                  This may take a few moments while we process your document...
                </p>
              </div>
            </div>
          </div>
        ) : (
          // Show Generate Cases when file is uploaded
          <div>
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-green-800">
                <strong>Uploaded:</strong> {currentFile.name}
              </p>
              {autoLoadingProgress === "All content loaded successfully!" && (
                <p className="text-green-700 mt-2">
                  ✅ All medical case content has been automatically generated!
                </p>
              )}
              {uploadError && (
                <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded">
                  <p className="text-red-800 text-sm mb-2">⚠️ {uploadError}</p>
                  <button
                    onClick={autoLoadAllContent}
                    disabled={isAutoLoading}
                    className="text-sm bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 disabled:opacity-50"
                  >
                    {isAutoLoading ? "Retrying..." : "Retry Auto-Generation"}
                  </button>
                </div>
              )}
            </div>

            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">
                  Generated Medical Cases
                </h2>
                <button
                  onClick={autoLoadAllContent}
                  disabled={isAutoLoading}
                  className="text-sm bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
                >
                  {isAutoLoading ? "Regenerating..." : "Regenerate All Content"}
                </button>
              </div>
              <div className="mb-6">
                <p className="text-gray-700">Select a case to work on:</p>
              </div>
            </div>

            <CasesList
              cases={cases}
              onCaseSelect={(title) => {
                setSelectedCase(title);
                setCurrentView("case-selection");
              }}
            />
          </div>
        )}

        {!currentFile && (
          <div className="space-y-8">
            <div className="grid grid-cols-2 gap-8">
              <StatsCard
                label="RECENT"
                value={
                  activeChat
                    ? chats.find((c) => c.id === activeChat)?.name || "No Chat"
                    : "No Chat"
                }
              />
              <StatsCard
                label="ANALYTICS"
                value="Questions Answered"
                badge={
                  activeChat
                    ? chats
                        .find((c) => c.id === activeChat)
                        ?.messageCount?.toString() || "0"
                    : "0"
                }
              />
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderCaseSelection = () => (
    <div className="flex-1 p-8">
      <div className="mb-6">
        {renderBackButton()}
        <Breadcrumb items={getDynamicBreadcrumbs()} />
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <h1 className="text-2xl font-semibold text-gray-900 mr-3">
              {selectedCase}
            </h1>
            <div className="flex items-center space-x-1">
              <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs font-medium">
                Moderate
              </span>
              <div className="text-gray-400 flex items-center justify-center w-4 h-4">
                <svg
                  className="w-3 h-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </div>
            </div>
          </div>
          <div className="text-right">
            <p
              className="text-sm font-medium text-gray-900 cursor-pointer hover:text-blue-600"
              onClick={() => setCurrentView("main")}
            >
              Cases
            </p>
          </div>
        </div>
        <p className="text-gray-700 mb-8">How would you like to proceed?</p>
      </div>

      <CaseSelectionOptions
        onGenerateMCQs={() => setCurrentView("generate-mcqs")}
        onIdentifyConcepts={() => setCurrentView("identify-concepts")}
        onExploreCases={() => setCurrentView("explore-cases")}
      />
    </div>
  );

  const renderGenerateMCQs = () => {
    return (
      <div className="flex-1 p-8">
        <div className="mb-6">
          {renderBackButton()}
          <Breadcrumb items={getDynamicBreadcrumbs()} />
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <h1 className="text-2xl font-semibold text-gray-900 mr-3">
                Chest Pain in a Middle-Aged Man
              </h1>
              <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs font-medium">
                Moderate ⌄
              </span>
            </div>
            <div className="text-right">
              <p
                className="text-sm font-medium text-gray-900 cursor-pointer hover:text-blue-600"
                onClick={() => setCurrentView("case-selection")}
              >
                Options
              </p>
            </div>
          </div>
          <div className="flex items-center justify-between mb-8">
            <p className="text-gray-700">
              MCQ questions have been automatically generated for you:
            </p>
            <button
              onClick={autoLoadAllContent}
              disabled={isAutoLoading}
              className="text-sm bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
            >
              {isAutoLoading ? "Regenerating..." : "Regenerate All Content"}
            </button>
          </div>
        </div>

        {mcqQuestions.length > 0 ? (
          <InteractiveMCQQuestionsList
            questions={mcqQuestions}
            expandedQuestions={expandedQuestions}
            onToggleQuestion={toggleQuestion}
          />
        ) : isAutoLoading ? (
          <div className="space-y-4">
            <div className="text-center py-8 text-gray-500">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p>Generating MCQ questions...</p>
              <p className="text-sm mt-2">{autoLoadingProgress}</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-center py-8 text-gray-500">
              <p>No MCQ questions available yet.</p>
              <p className="text-sm mt-2">
                Upload a document to generate interactive MCQ questions.
              </p>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderExploreCases = () => {
    const currentDocument = getCurrentChatDocument();

    return (
      <div className="flex-1 p-8 flex flex-col h-full">
        <div className="mb-6">
          {renderBackButton()}
          <Breadcrumb items={getDynamicBreadcrumbs()} />
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <h1 className="text-2xl font-semibold text-gray-900 mr-3">
                {selectedCase || "Chest Pain in a Middle-Aged Man"}
              </h1>
              <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs font-medium">
                Moderate ⌄
              </span>
            </div>
            <div className="text-right">
              <p
                className="text-sm font-medium text-gray-900 cursor-pointer hover:text-blue-600"
                onClick={() => setCurrentView("case-selection")}
              >
                Options
              </p>
            </div>
          </div>
          <p className="text-gray-700 mb-4">Chat With the AI</p>
        </div>

        {/* AI Chat Component */}
        <div className="flex-1 bg-white rounded-lg border border-gray-200 shadow-sm">
          <AIChat
            chatId={activeChat}
            documentId={currentDocument?.id}
            caseTitle={selectedCase || "Chest Pain in a Middle-Aged Man"}
            messages={chatMessages}
            onMessageSent={(message) => {
              setChatMessages((prev) => [...prev, message]);
            }}
          />
        </div>

        {/* Action Buttons */}
        <div className="mt-4">
          <ActionButtons
            onGenerateMCQs={() => setCurrentView("generate-mcqs")}
            onIdentifyConcepts={() => setCurrentView("identify-concepts")}
          />
        </div>
      </div>
    );
  };

  const renderIdentifyConcepts = () => {
    return (
      <div className="flex-1 p-8 flex flex-col">
        <div className="mb-6">
          {renderBackButton()}
          <Breadcrumb items={getDynamicBreadcrumbs()} />
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <h1 className="text-2xl font-semibold text-gray-900 mr-3">
                Chest Pain in a Middle-Aged Man
              </h1>
              <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs font-medium">
                Moderate ⌄
              </span>
            </div>
            <div className="text-right">
              <p
                className="text-sm font-medium text-gray-900 cursor-pointer hover:text-blue-600"
                onClick={() => setCurrentView("case-selection")}
              >
                Options
              </p>
            </div>
          </div>
          <div className="flex items-center justify-between mb-8">
            <p className="text-gray-700">
              Key medical concepts have been automatically identified:
            </p>
            <button
              onClick={autoLoadAllContent}
              disabled={isAutoLoading}
              className="text-sm bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
            >
              {isAutoLoading ? "Regenerating..." : "Regenerate All Content"}
            </button>
          </div>
        </div>

        <div className="flex-1 flex flex-col">
          <ConceptsList concepts={concepts} />

          <div className="mt-auto">
            <ChatInput
              message={chatMessage}
              onMessageChange={setChatMessage}
              onSend={() => console.log("Send message:", chatMessage)}
            />
          </div>
        </div>
      </div>
    );
  };

  const renderProfileSettings = () => {
    return <ProfileSettings onBack={() => setCurrentView("main")} />;
  };

  const renderNotifications = () => {
    return <Notifications onBack={() => setCurrentView("main")} />;
  };

  // Show loading state while authentication is in progress
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex relative">
      <Sidebar
        currentView={currentView}
        setCurrentView={handleViewChange}
        chats={chats}
        activeChat={activeChat}
        handleChatSelect={handleChatSelect}
        onCreateNewChat={() => createNewChat()}
        onDeleteChat={deleteChat}
        onLogout={logout}
      />

      <div className="flex-1 ml-64 relative z-0">
        {currentView === "main" && renderMainDashboard()}
        {currentView === "admin-analytics" && renderAdminAnalytics()}
        {currentView === "case-selection" && renderCaseSelection()}
        {currentView === "generate-mcqs" && renderGenerateMCQs()}
        {currentView === "explore-cases" && renderExploreCases()}
        {currentView === "identify-concepts" && renderIdentifyConcepts()}
        {currentView === "chatbot-flow" && selectedDocument && (
          <ChatbotFlow
            document={selectedDocument}
            onBack={() => setCurrentView("main")}
          />
        )}
        {currentView === "profile-settings" && renderProfileSettings()}
        {currentView === "notifications" && renderNotifications()}
      </div>

      {/* Scroll to Top Button */}
      <ScrollToTop />
    </div>
  );
}
