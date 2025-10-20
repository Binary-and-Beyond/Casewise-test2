"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";

import { Sidebar } from "@/components/layout/sidebar";
import { MyAnalytics } from "@/components/widgets/my-analytics";
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
import { MCQCompletionPopup } from "@/components/widgets/mcq-completion-popup";
import { NavigationWarningPopup } from "@/components/widgets/navigation-warning-popup";
import { Button } from "@/components/ui/button";
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
  document_id?: string;
  document_filename?: string;
  document_content_preview?: string;
  message_count: number;
  created_at: string;
  updated_at: string;
  user_id: string;
}

export function Dashboard({}: DashboardProps) {
  const { user, logout, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  // Get current view from pathname instead of state
  const getCurrentView = ():
    | "main"
    | "admin-analytics"
    | "generate-cases"
    | "case-selection"
    | "generate-mcqs"
    | "explore-cases"
    | "identify-concepts"
    | "concept-detail"
    | "profile-settings"
    | "notifications"
    | "chatbot-flow" => {
    if (pathname === "/dashboard") return "main";
    if (pathname === "/dashboard/analytics") return "admin-analytics";
    if (pathname === "/dashboard/cases") return "case-selection";
    if (pathname === "/dashboard/mcqs") return "generate-mcqs";
    if (pathname === "/dashboard/explore") return "explore-cases";
    if (pathname === "/dashboard/concepts") return "identify-concepts";
    if (pathname.startsWith("/dashboard/concepts/")) return "concept-detail";
    if (pathname === "/dashboard/profile") return "profile-settings";
    if (pathname === "/dashboard/notifications") return "notifications";
    if (pathname.startsWith("/dashboard/chat/")) return "chatbot-flow";
    return "main";
  };

  const [currentView, setCurrentView] = useState<
    | "main"
    | "admin-analytics"
    | "generate-cases"
    | "case-selection"
    | "generate-mcqs"
    | "explore-cases"
    | "identify-concepts"
    | "concept-detail"
    | "profile-settings"
    | "notifications"
    | "chatbot-flow"
  >(getCurrentView());

  // Sync currentView with pathname changes
  useEffect(() => {
    const newView = getCurrentView();
    setCurrentView(newView);
  }, [pathname]);

  const [selectedCase, setSelectedCase] = useState<string>(() => {
    // Load saved selected case from localStorage
    if (typeof window !== "undefined") {
      const savedCase = localStorage.getItem("selected_case");
      if (savedCase) {
        console.log("🚀 Restoring saved case:", savedCase);
        return savedCase;
      }
    }
    return "";
  });

  const [selectedConcept, setSelectedConcept] = useState<string>(() => {
    // Load saved selected concept from localStorage
    if (typeof window !== "undefined") {
      const savedConcept = localStorage.getItem("selected_concept");
      if (savedConcept) {
        console.log("🚀 Restoring saved concept:", savedConcept);
        return savedConcept;
      }
    }
    return "";
  });
  const [activeChat, setActiveChat] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("active_chat") || "";
    }
    return "";
  });

  // State for context-specific chats
  const [contextChats, setContextChats] = useState<Record<string, string>>({});

  // Test API connection for debugging (only on first mount)
  useEffect(() => {
    const testAPI = async () => {
      console.log("🔍 Testing API connection on component mount...");
      try {
        await apiService.testConnection();
      } catch (error) {
        console.error("🔍 API test failed:", error);
      }
    };

    testAPI();
  }, []);

  const [expandedQuestions, setExpandedQuestions] = useState<number[]>([]);
  const [chatMessage, setChatMessage] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [isAutoLoading, setIsAutoLoading] = useState(false);
  const [autoLoadingProgress, setAutoLoadingProgress] = useState("");
  const [generatedCases, setGeneratedCases] = useState<CaseScenario[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const cachedCases = localStorage.getItem("generated_cases");
        if (cachedCases) {
          const parsedCases = JSON.parse(cachedCases);
          console.log(
            "🚀 Initializing generated cases from localStorage:",
            parsedCases.length,
            "cases"
          );
          return parsedCases;
        }
      } catch (e) {
        console.log("❌ Failed to parse cached generated cases on init:", e);
      }
    }
    return [];
  });
  const [chats, setChats] = useState<Chat[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const cachedChats = localStorage.getItem("user_chats");
        if (cachedChats) {
          const parsedChats = JSON.parse(cachedChats);
          console.log(
            "🚀 Initializing chats from localStorage:",
            parsedChats.length
          );
          return parsedChats;
        }
      } catch (e) {
        console.log("❌ Failed to parse cached chats on init:", e);
      }
    }
    return [];
  });
  const [isLoadingChats, setIsLoadingChats] = useState(true);
  const [isLoadingChatsInProgress, setIsLoadingChatsInProgress] =
    useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(
    null
  );
  const [mcqQuestions, setMCQQuestions] = useState<
    Record<string, MCQQuestion[]>
  >(() => {
    if (typeof window !== "undefined") {
      try {
        const cachedMCQs = localStorage.getItem("mcq_questions");
        if (cachedMCQs) {
          const parsedMCQs = JSON.parse(cachedMCQs);
          console.log(
            "🚀 Initializing MCQ questions from localStorage:",
            Object.keys(parsedMCQs).length,
            "cases"
          );
          return parsedMCQs;
        }
      } catch (e) {
        console.log("❌ Failed to parse cached MCQ questions on init:", e);
      }
    }
    return {};
  });
  const [generatedConcepts, setGeneratedConcepts] = useState<
    Record<string, string[]>
  >(() => {
    if (typeof window !== "undefined") {
      try {
        const cachedConcepts = localStorage.getItem("generated_concepts");
        if (cachedConcepts) {
          const parsedConcepts = JSON.parse(cachedConcepts);
          console.log(
            "🚀 Initializing concepts from localStorage:",
            Object.keys(parsedConcepts).length,
            "cases"
          );
          return parsedConcepts;
        }
      } catch (e) {
        console.log("❌ Failed to parse cached concepts on init:", e);
      }
    }
    return {};
  });
  const [isGeneratingConcepts, setIsGeneratingConcepts] = useState(false);
  const [isGeneratingMCQs, setIsGeneratingMCQs] = useState<string | null>(null);
  const conceptGenerationRef = useRef<boolean>(false);

  // MCQ completion and navigation warning states
  const [showCompletionPopup, setShowCompletionPopup] = useState(false);
  const [completionStats, setCompletionStats] = useState({
    correct: 0,
    total: 0,
  });
  const [showNavigationWarning, setShowNavigationWarning] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<
    (() => void) | null
  >(null);
  const [hasUnsavedProgress, setHasUnsavedProgress] = useState(false);

  // Ensure a case is selected when in explore-cases view
  useEffect(() => {
    if (
      currentView === "explore-cases" &&
      generatedCases.length > 0 &&
      !selectedCase
    ) {
      console.log("🎯 Auto-selecting first case for explore-cases view");
      const firstCase = generatedCases[0];
      setSelectedCaseWithPersistence(firstCase.title);
    }
  }, [currentView, generatedCases, selectedCase]);

  // Ensure a concept is selected when in concept-detail view
  useEffect(() => {
    if (currentView === "concept-detail" && !selectedConcept) {
      console.log(
        "🎯 No concept selected for concept-detail view, redirecting to identify-concepts"
      );
      navigateToView("identify-concepts");
    }
  }, [currentView, selectedConcept]);

  // Clear any saved view on component mount to ensure we always start with main
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("current_view");
    }
  }, []);

  // Load chats immediately on component mount if available in localStorage
  useEffect(() => {
    console.log("🔄 Component mount effect - checking for cached chats");
    const cachedChats = localStorage.getItem("user_chats");
    const cachedActiveChat = localStorage.getItem("active_chat");

    console.log("🔄 Cached chats exists:", !!cachedChats);
    console.log("🔄 Current chats length:", chats.length);
    console.log("🔄 User:", user);

    if (cachedChats && chats.length === 0 && !user) {
      try {
        const parsedChats = JSON.parse(cachedChats);
        console.log("🔄 Loading cached chats on mount:", parsedChats.length);

        // Check if cached chats are in the old format and migrate them
        const migratedChats = parsedChats.map((chat: any) => {
          // If it's the old format, convert it to new format
          if (
            chat.uploadedFile !== undefined ||
            chat.document !== undefined ||
            chat.messageCount !== undefined
          ) {
            console.log("🔄 Migrating old chat format:", chat.id);
            return {
              id: chat.id,
              name: chat.name,
              document_id: chat.document?.id || null,
              document_filename:
                chat.uploadedFile?.name || chat.document?.filename || null,
              document_content_preview:
                chat.document?.content?.substring(0, 200) + "..." || null,
              message_count: chat.messageCount || 0,
              created_at: chat.createdAt || new Date().toISOString(),
              updated_at: chat.updatedAt || new Date().toISOString(),
              user_id: (user as any)?.id || "unknown",
            };
          }
          // If it's already in the new format, return as is
          return chat;
        });

        setChats(migratedChats);

        if (
          cachedActiveChat &&
          migratedChats.some((chat: Chat) => chat.id === cachedActiveChat)
        ) {
          console.log("🔄 Restoring active chat on mount:", cachedActiveChat);
          setActiveChat(cachedActiveChat);
        } else if (migratedChats.length > 0) {
          console.log(
            "🔄 Setting first chat as active on mount:",
            migratedChats[0].id
          );
          setActiveChat(migratedChats[0].id);
        }
        setIsLoadingChats(false);
      } catch (e) {
        console.log("❌ Failed to parse cached chats on mount:", e);
        // Clear corrupted cache
        localStorage.removeItem("user_chats");
        localStorage.removeItem("active_chat");
      }
    }
  }, [user]);

  // Load user chats only after authentication is complete
  useEffect(() => {
    console.log(
      "🔄 Auth effect triggered - authLoading:",
      authLoading,
      "user:",
      !!user
    );

    if (!authLoading && user) {
      console.log("🔄 Auth complete, loading chats for user:", user.id);
      loadUserChats();
    } else if (!authLoading && !user) {
      console.log("🔄 No user found, clearing chats");
      setChats([]);
      setActiveChat("");
      localStorage.removeItem("user_chats");
      localStorage.removeItem("active_chat");
    } else {
      console.log("🔄 Auth still loading or user not ready");
    }
  }, [authLoading, user]);

  // Chat persistence is handled by localStorage and API calls
  // Removed automatic refresh to prevent unnecessary reloads

  // Generate concepts on-demand when identify-concepts view is accessed
  useEffect(() => {
    if (
      currentView === "identify-concepts" &&
      selectedCase &&
      (!generatedConcepts[selectedCase] ||
        generatedConcepts[selectedCase].length === 0) &&
      !isGeneratingConcepts &&
      !conceptGenerationRef.current
    ) {
      const generateConceptsOnDemand = async () => {
        // Prevent multiple simultaneous calls
        if (conceptGenerationRef.current) return;

        conceptGenerationRef.current = true;
        console.log("🎯 Generating concepts on-demand...");

        // Add a small delay to make the loading animation appear smoothly
        setTimeout(() => {
          setIsGeneratingConcepts(true);
          setAutoLoadingProgress("📚 Generating key concepts...");
        }, 50);

        try {
          const currentDocument = getCurrentChatDocument();
          if (currentDocument) {
            // Use the dedicated identify concepts API instead of autoGenerateContent
            const conceptsResponse = await apiService.identifyConcepts(
              currentDocument.id,
              5
            );

            console.log("📊 Concepts response:", conceptsResponse);

            if (
              conceptsResponse.concepts &&
              conceptsResponse.concepts.length > 0
            ) {
              const conceptStrings = conceptsResponse.concepts.map(
                (c) => `${c.title}: ${c.description}`
              );
              setGeneratedConcepts((prev) => ({
                ...prev,
                [selectedCase]: conceptStrings,
              }));
              console.log(
                "✅ Concepts generated on-demand:",
                conceptStrings.length
              );

              // Save concepts to database
              try {
                const contentToSave = {
                  concepts: conceptsResponse.concepts,
                  case_title: selectedCase,
                };
                await apiService.saveGeneratedContent(
                  activeChat,
                  contentToSave
                );
                console.log("✅ Concepts saved to database");
              } catch (error) {
                console.error("❌ Failed to save concepts to database:", error);
              }
            } else {
              console.log("❌ No concepts in response:", conceptsResponse);
            }
          }
        } catch (error) {
          console.error("❌ Failed to generate concepts on-demand:", error);
        } finally {
          setIsGeneratingConcepts(false);
          setAutoLoadingProgress("");
          conceptGenerationRef.current = false;
        }
      };

      generateConceptsOnDemand();
    }
  }, [currentView, selectedCase, isGeneratingConcepts, activeChat]);

  const loadUserChats = async () => {
    // Prevent multiple simultaneous calls
    if (isLoadingChatsInProgress) {
      console.log("🔄 Chat loading already in progress, skipping...");
      return;
    }

    try {
      setIsLoadingChatsInProgress(true);
      setIsLoadingChats(true);
      console.log("🔄 Loading user chats...");

      // Skip cached chat loading to prevent flicker - go directly to API

      // Load from API to get latest data
      console.log("🌐 Fetching chats from API...");
      console.log("🌐 Current user:", user);
      console.log("🌐 Auth token:", localStorage.getItem("auth_token"));

      // Add a small delay to ensure loading state is visible
      await new Promise((resolve) => setTimeout(resolve, 500));

      const userChats = await apiService.getUserChats();
      console.log("🌐 API returned chats:", userChats.length);
      console.log("🌐 API chat data:", userChats);

      if (userChats.length === 0) {
        console.log(
          "⚠️ No chats returned from API - this might be expected for new users"
        );
      }

      // Use API data directly - no need for localStorage merging
      const chatList: Chat[] = userChats.map((chat) => ({
        id: chat.id,
        name: chat.name,
        document_id: chat.document_id,
        document_filename: chat.document_filename,
        document_content_preview: chat.document_content_preview,
        message_count: chat.message_count,
        created_at: chat.created_at,
        updated_at: chat.updated_at,
        user_id: chat.user_id,
      }));

      // Filter out any chats with invalid IDs
      const validChats = chatList.filter((chat) => {
        const isValid =
          chat.id && chat.id.length === 24 && /^[0-9a-fA-F]{24}$/.test(chat.id);
        if (!isValid) {
          console.warn("⚠️ Filtering out chat with invalid ID:", chat.id);
        }
        return isValid;
      });

      console.log(
        `📊 Loaded ${validChats.length} valid chats out of ${chatList.length} total`
      );

      // Update state and cache
      setChats(validChats);
      localStorage.setItem("user_chats", JSON.stringify(validChats));
      console.log("💾 Cached valid chats to localStorage");

      // Set the first chat as active if no active chat is set
      if (validChats.length > 0 && !activeChat) {
        const newActiveChat = validChats[0].id;
        console.log("🎯 Setting first chat as active:", newActiveChat);
        setActiveChat(newActiveChat);
        localStorage.setItem("active_chat", newActiveChat);
        // Load content for the new active chat
        loadActiveChatContent(newActiveChat);
        // Load messages for the new active chat
        loadActiveChatMessages(newActiveChat);
      } else if (validChats.length > 0 && activeChat) {
        // Verify that the active chat still exists in the loaded chats
        const activeChatExists = validChats.some(
          (chat) => chat.id === activeChat
        );
        if (!activeChatExists) {
          console.log(
            "🎯 Active chat no longer exists, setting first chat as active"
          );
          const newActiveChat = validChats[0].id;
          setActiveChat(newActiveChat);
          localStorage.setItem("active_chat", newActiveChat);
          // Load content for the new active chat
          loadActiveChatContent(newActiveChat);
          // Load messages for the new active chat
          loadActiveChatMessages(newActiveChat);
        } else {
          // Load content for the existing active chat
          loadActiveChatContent(activeChat);
          // Load messages for the existing active chat
          loadActiveChatMessages(activeChat);
        }
      }
    } catch (error) {
      console.error("❌ Failed to load chats:", error);

      // If API fails, try to use cached chats as fallback
      const cachedChats = localStorage.getItem("user_chats");
      if (cachedChats) {
        try {
          const parsedChats = JSON.parse(cachedChats);
          console.log("🔄 Using cached chats as fallback:", parsedChats.length);

          // Migrate old format chats if needed
          const migratedChats = parsedChats.map((chat: any) => {
            if (
              chat.uploadedFile !== undefined ||
              chat.document !== undefined ||
              chat.messageCount !== undefined
            ) {
              console.log("🔄 Migrating old chat format in fallback:", chat.id);
              return {
                id: chat.id,
                name: chat.name,
                document_id: chat.document?.id || null,
                document_filename:
                  chat.uploadedFile?.name || chat.document?.filename || null,
                document_content_preview:
                  chat.document?.content?.substring(0, 200) + "..." || null,
                message_count: chat.messageCount || 0,
                created_at: chat.createdAt || new Date().toISOString(),
                updated_at: chat.updatedAt || new Date().toISOString(),
                user_id: user?.id || "unknown",
              };
            }
            return chat;
          });

          setChats(migratedChats);

          // Restore active chat from cache
          const cachedActiveChat = localStorage.getItem("active_chat");
          if (
            cachedActiveChat &&
            migratedChats.some((chat: Chat) => chat.id === cachedActiveChat)
          ) {
            setActiveChat(cachedActiveChat);
          } else if (migratedChats.length > 0) {
            setActiveChat(migratedChats[0].id);
          }
        } catch (e) {
          console.error("❌ Failed to parse cached chats:", e);
          setUploadError("Failed to load chats. Please refresh the page.");
        }
      } else {
        setUploadError("Failed to load chats. Please refresh the page.");
      }
    } finally {
      setIsLoadingChats(false);
      setIsLoadingChatsInProgress(false);
    }
  };

  const loadActiveChatContent = async (chatId: string) => {
    if (!chatId) return;

    try {
      console.log("📚 Loading content for active chat:", chatId);
      const content = await apiService.getGeneratedContent(chatId);

      if (content.cases && content.cases.length > 0) {
        setGeneratedCases(content.cases);
        console.log("✅ Loaded cases for active chat:", content.cases.length);

        // Validate that the selected case exists in the loaded cases
        const caseTitles = content.cases.map((c) => c.title);
        if (selectedCase && !caseTitles.includes(selectedCase)) {
          console.log(
            "⚠️ Selected case not found in loaded cases, clearing selection"
          );
          setSelectedCase("");
          localStorage.removeItem("selected_case");
        }
      }

      if (content.mcqs && content.mcqs.length > 0) {
        // Group MCQs by case title
        const mcqGroups: Record<string, any[]> = {};
        content.mcqs.forEach((mcq) => {
          const caseTitle = mcq.case_title || "General";
          if (!mcqGroups[caseTitle]) {
            mcqGroups[caseTitle] = [];
          }
          mcqGroups[caseTitle].push(mcq);
        });
        setMCQQuestions(mcqGroups);
        console.log("✅ Loaded MCQs for active chat:", content.mcqs.length);
      }

      if (content.concepts && content.concepts.length > 0) {
        // Group concepts by case title
        const conceptGroups: Record<string, string[]> = {};
        content.concepts.forEach((concept) => {
          const caseTitle = concept.case_title || "General";
          if (!conceptGroups[caseTitle]) {
            conceptGroups[caseTitle] = [];
          }
          conceptGroups[caseTitle].push(
            `${concept.title}: ${concept.description}`
          );
        });
        setGeneratedConcepts(conceptGroups);
        console.log(
          "✅ Loaded concepts for active chat:",
          content.concepts.length
        );
      }

      console.log("✅ Active chat content loaded successfully");
    } catch (error) {
      console.error("❌ Failed to load active chat content:", error);
    }
  };

  const loadActiveChatMessages = async (chatId: string, caseTitle?: string) => {
    if (!chatId) return;

    try {
      // Always use the original chat ID for API calls, not the concatenated one
      console.log("💬 Loading messages for active chat:", chatId);
      const messages = await apiService.getChatMessages(chatId);
      setChatMessages(messages);
      console.log("✅ Loaded messages for active chat:", messages.length);
    } catch (error) {
      console.error("❌ Failed to load active chat messages:", error);
      setChatMessages([]);
    }
  };

  const startChatbotFlow = (document: Document) => {
    setSelectedDocument(document);
    navigateToView("chatbot-flow");
  };

  const createNewChat = async (documentId?: string) => {
    try {
      const requestData: any = {};
      if (documentId) {
        requestData.document_id = documentId;
      }
      const newChat = await apiService.createChat(requestData);
      console.log("📝 New chat created:", newChat);
      console.log("📝 New chat ID:", newChat.id);
      console.log("📝 New chat ID type:", typeof newChat.id);
      console.log("📝 New chat ID length:", newChat.id?.length);

      // Validate the returned chat ID
      if (
        !newChat.id ||
        newChat.id.length !== 24 ||
        !/^[0-9a-fA-F]{24}$/.test(newChat.id)
      ) {
        console.error("❌ Invalid chat ID returned from API:", newChat.id);
        setUploadError("Invalid chat ID returned from server");
        return;
      }

      const chat: Chat = {
        id: newChat.id,
        name: newChat.name,
        document_id: newChat.document_id,
        document_filename: newChat.document_filename,
        document_content_preview: newChat.document_content_preview,
        message_count: newChat.message_count,
        created_at: newChat.created_at,
        updated_at: newChat.updated_at,
        user_id: newChat.user_id,
      };

      setChats((prev) => {
        const updatedChats = [chat, ...prev];
        localStorage.setItem("user_chats", JSON.stringify(updatedChats));
        console.log("💾 Chat created and cached to localStorage");
        return updatedChats;
      });
      setActiveChat(newChat.id);
      localStorage.setItem("active_chat", newChat.id);
      setChatMessages([]);
      navigateToView("main");

      // Clear any previous errors
      setUploadError("");

      // Chat created successfully - no need for additional refresh
    } catch (error) {
      console.error("Failed to create chat:", error);
      setUploadError("Failed to create new chat");
    }
  };

  const getOrCreateContextChat = async (
    caseTitle?: string,
    conceptTitle?: string
  ): Promise<string | null> => {
    try {
      console.log("🔄 getOrCreateContextChat called with:", {
        caseTitle,
        conceptTitle,
      });

      const currentDocument = getCurrentChatDocument();
      if (!currentDocument) {
        console.error("❌ No document available for context chat");
        return null;
      }

      console.log("📄 Current document:", currentDocument.id);

      // Create context key for caching
      const contextKey = conceptTitle
        ? `concept:${conceptTitle}`
        : caseTitle
        ? `case:${caseTitle}`
        : "main";

      console.log("🔑 Context key:", contextKey);

      // Check if we already have a context chat for this
      if (contextChats[contextKey]) {
        console.log(
          "🔄 Using existing context chat:",
          contextChats[contextKey]
        );
        return contextChats[contextKey];
      }

      // Create or get context-specific chat
      const requestData: any = {
        document_id: currentDocument.id,
        parent_chat_id: activeChat,
      };

      if (caseTitle) {
        requestData.case_title = caseTitle;
      }
      if (conceptTitle) {
        requestData.concept_title = conceptTitle;
      }

      console.log("🔄 Creating/getting context chat:", requestData);
      console.log("🔄 Active chat ID:", activeChat);

      const contextChat = await apiService.getOrCreateContextChat(requestData);

      console.log("✅ Context chat created/found:", contextChat.id);

      // Cache the context chat ID
      setContextChats((prev) => ({
        ...prev,
        [contextKey]: contextChat.id,
      }));

      return contextChat.id;
    } catch (error) {
      console.error("❌ Failed to create/get context chat:", error);
      console.error("❌ Error details:", error);
      return null;
    }
  };

  // Context-aware AI Chat component
  const ContextAIChat = ({
    caseTitle,
    conceptTitle,
    documentId,
    messages,
    onMessageSent,
  }: {
    caseTitle?: string;
    conceptTitle?: string;
    documentId?: string;
    messages: ChatMessage[];
    onMessageSent: (message: ChatMessage) => void;
  }) => {
    const [contextChatId, setContextChatId] = useState<string | null>(null);
    const [isLoadingContext, setIsLoadingContext] = useState(false);
    const [contextMessages, setContextMessages] = useState<ChatMessage[]>([]);

    useEffect(() => {
      const initializeContextChat = async () => {
        setIsLoadingContext(true);

        // Set a timeout to prevent infinite loading
        const timeoutId = setTimeout(() => {
          console.log(
            "⏰ Context chat initialization timeout, falling back to main chat"
          );
          setContextChatId(activeChat);
          setContextMessages(messages);
          setIsLoadingContext(false);
        }, 10000); // 10 second timeout

        try {
          const chatId = await getOrCreateContextChat(caseTitle, conceptTitle);

          // Clear timeout if we got a response
          clearTimeout(timeoutId);

          if (chatId) {
            setContextChatId(chatId);
            console.log("🔄 Loading messages for context chat:", chatId);
            const loadedMessages = await apiService.getChatMessages(chatId);
            console.log("✅ Loaded context messages:", loadedMessages.length);
            setContextMessages(loadedMessages);
          } else {
            // Fallback to main chat if context chat creation fails
            console.log(
              "⚠️ Context chat creation failed, falling back to main chat"
            );
            setContextChatId(activeChat);
            setContextMessages(messages);
          }
        } catch (error) {
          // Clear timeout on error
          clearTimeout(timeoutId);
          console.error("❌ Failed to initialize context chat:", error);
          // Fallback to main chat on error
          console.log("⚠️ Error occurred, falling back to main chat");
          setContextChatId(activeChat);
          setContextMessages(messages);
        } finally {
          setIsLoadingContext(false);
        }
      };

      initializeContextChat();
    }, [caseTitle, conceptTitle, activeChat, messages]);

    const handleMessageSent = (message: ChatMessage) => {
      setContextMessages((prev) => [...prev, message]);
      onMessageSent(message);
    };

    // Show chat immediately without loading state

    if (!contextChatId) {
      return (
        <div className="flex items-center justify-center h-32">
          <p className="text-gray-500">Failed to load chat</p>
        </div>
      );
    }

    return (
      <AIChat
        chatId={contextChatId}
        documentId={documentId}
        caseTitle={conceptTitle || caseTitle}
        messages={contextMessages}
        onMessageSent={handleMessageSent}
      />
    );
  };

  const deleteChat = async (chatId: string) => {
    try {
      // Clear any previous errors
      setUploadError("");

      console.log(`🗑️ Deleting chat: ${chatId}`);

      await apiService.deleteChat(chatId);

      // Remove from chats list
      setChats((prev) => {
        const updatedChats = prev.filter((chat) => chat.id !== chatId);
        localStorage.setItem("user_chats", JSON.stringify(updatedChats));
        console.log(
          `✅ Removed chat from list. Remaining chats: ${updatedChats.length}`
        );
        return updatedChats;
      });

      // Clear context-specific chats from localStorage
      if (typeof window !== "undefined") {
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith(`chat_messages_${chatId}-`)) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach((key) => {
          localStorage.removeItem(key);
          console.log(`🗑️ Removed context chat: ${key}`);
        });
      }

      // If we deleted the active chat, switch to another one
      if (activeChat === chatId) {
        const remainingChats = chats.filter((chat) => chat.id !== chatId);
        if (remainingChats.length > 0) {
          const newActiveChat = remainingChats[0].id;
          console.log(`🔄 Switching to new active chat: ${newActiveChat}`);
          setActiveChat(newActiveChat);
          localStorage.setItem("active_chat", newActiveChat);
          // Load content for the new active chat
          loadActiveChatContent(newActiveChat);
          loadActiveChatMessages(newActiveChat);
        } else {
          // No chats left, clear everything
          console.log("🔄 No chats remaining, clearing all state");
          setActiveChat("");
          localStorage.removeItem("active_chat");
          navigateToView("main");
          setChatMessages([]);
          setGeneratedCases([]);
          setMCQQuestions({});
          setGeneratedConcepts({});
          // Clear context chats state
          setContextChats({});
        }
      }

      console.log("✅ Chat deleted successfully");
    } catch (error) {
      console.error("Failed to delete chat:", error);
      setUploadError("Failed to delete chat. Please try again.");
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

  // Persist MCQ questions to localStorage whenever they change
  useEffect(() => {
    if (typeof window !== "undefined" && Object.keys(mcqQuestions).length > 0) {
      try {
        localStorage.setItem("mcq_questions", JSON.stringify(mcqQuestions));
        console.log(
          "💾 Saved MCQ questions to localStorage:",
          Object.keys(mcqQuestions).length,
          "cases"
        );
      } catch (e) {
        console.log("❌ Failed to save MCQ questions to localStorage:", e);
      }
    }
  }, [mcqQuestions]);

  // Persist generated concepts to localStorage whenever they change
  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      Object.keys(generatedConcepts).length > 0
    ) {
      try {
        localStorage.setItem(
          "generated_concepts",
          JSON.stringify(generatedConcepts)
        );
        console.log(
          "💾 Saved concepts to localStorage:",
          Object.keys(generatedConcepts).length,
          "cases"
        );
      } catch (e) {
        console.log("❌ Failed to save concepts to localStorage:", e);
      }
    }
  }, [generatedConcepts]);

  // Persist generated cases to localStorage whenever they change
  useEffect(() => {
    if (typeof window !== "undefined" && generatedCases.length > 0) {
      try {
        localStorage.setItem("generated_cases", JSON.stringify(generatedCases));
        console.log(
          "💾 Saved generated cases to localStorage:",
          generatedCases.length,
          "cases"
        );
      } catch (e) {
        console.log("❌ Failed to save generated cases to localStorage:", e);
      }
    }
  }, [generatedCases]);

  // Persist selected concept to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== "undefined" && selectedConcept) {
      try {
        localStorage.setItem("selected_concept", selectedConcept);
        console.log(
          "💾 Saved selected concept to localStorage:",
          selectedConcept
        );
      } catch (e) {
        console.log("❌ Failed to save selected concept to localStorage:", e);
      }
    }
  }, [selectedConcept]);

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

  // Get MCQs for the selected case, or fall back to default questions
  const getMCQsForCase = (caseTitle: string) => {
    return (
      mcqQuestions[caseTitle] || [
        "Most specific marker of myocardial infarction?",
        "First-line management for STEMI?",
        "Complications of acute MI?",
        "Risk stratification in NSTEMI?",
        "Long-term management post-MI?",
      ]
    );
  };

  // Use generated concepts for the selected case if available, otherwise fall back to default concepts
  const concepts =
    selectedCase &&
    generatedConcepts[selectedCase] &&
    generatedConcepts[selectedCase].length > 0
      ? generatedConcepts[selectedCase]
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
        console.log(
          "🔑 Auth token:",
          localStorage.getItem("auth_token") ? "Present" : "Missing"
        );

        // Add retry logic for upload
        let document: Document | undefined;
        let retryCount = 0;
        const maxRetries = 3;

        while (retryCount < maxRetries) {
          try {
            document = await apiService.uploadDocumentEnhanced(file);
            break; // Success, exit retry loop
          } catch (error) {
            retryCount++;
            console.log(`📤 Upload attempt ${retryCount} failed:`, error);

            if (retryCount >= maxRetries) {
              throw error; // Re-throw if all retries exhausted
            }

            // Wait before retry
            await new Promise((resolve) =>
              setTimeout(resolve, 1000 * retryCount)
            );
            console.log(
              `📤 Retrying upload (attempt ${retryCount + 1}/${maxRetries})...`
            );
          }
        }

        if (!document) {
          throw new Error("Upload failed after all retry attempts");
        }

        // TypeScript assertion - we know document is not undefined after the check above
        const uploadedDocument = document as Document;

        console.log("✅ File uploaded successfully:", uploadedDocument);
        console.log(
          "📄 Document content preview:",
          uploadedDocument.content?.substring(0, 200) + "..."
        );

        // Check if we have an active chat, if not create one
        let currentChatId = activeChat;
        if (!currentChatId || chats.length === 0) {
          console.log("📝 No active chat found, creating new chat...");
          const newChat = await apiService.createChat({
            document_id: uploadedDocument.id,
          });
          const chat: Chat = {
            id: newChat.id,
            name: newChat.name,
            document_id: newChat.document_id,
            document_filename: newChat.document_filename,
            document_content_preview: newChat.document_content_preview,
            message_count: newChat.message_count,
            created_at: newChat.created_at,
            updated_at: newChat.updated_at,
            user_id: newChat.user_id,
          };

          setChats((prev) => [chat, ...prev]);
          setActiveChat(newChat.id);
          localStorage.setItem("active_chat", newChat.id);
          localStorage.setItem("user_chats", JSON.stringify([chat]));
          console.log("💾 New chat with document created and cached");
          currentChatId = newChat.id;
        } else {
          // Update the existing active chat with the new document
          console.log("📝 Updating existing chat with new document...");

          // Update chat in MongoDB
          try {
            const updatedChat = await apiService.updateChatDocument(
              currentChatId,
              uploadedDocument.id
            );
            console.log("✅ Chat updated in MongoDB:", updatedChat);
          } catch (error) {
            console.error("❌ Failed to update chat in MongoDB:", error);
          }

          setChats((prev) => {
            const updatedChats = prev.map((chat) =>
              chat.id === currentChatId
                ? {
                    ...chat,
                    document_id: uploadedDocument.id,
                    document_filename: file.name,
                    document_content_preview:
                      uploadedDocument.content?.substring(0, 200) + "..." || "",
                    name: file.name.replace(/\.[^/.]+$/, ""), // Use filename without extension
                  }
                : chat
            );
            // Update localStorage cache
            localStorage.setItem("user_chats", JSON.stringify(updatedChats));
            console.log("💾 Existing chat updated with document and cached");
            return updatedChats;
          });
        }

        setChatMessages([]);
        navigateToView("main");

        // Auto-load all content after successful upload
        console.log("🚀 File upload successful, starting auto-generation...");
        console.log("📄 Document passed to autoLoadAllContent:", document);
        setAutoLoadingProgress(
          "Document uploaded! Starting content generation..."
        );

        // Start auto-generation immediately
        console.log("🎯 Calling autoLoadAllContent...");
        await autoLoadAllContent(uploadedDocument);
        console.log("✅ autoLoadAllContent completed");
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

  const handleChatSelect = async (chatId: string) => {
    console.log("🔄 Switching to chat:", chatId);
    console.log("🔄 Chat ID type:", typeof chatId);
    console.log("🔄 Chat ID length:", chatId?.length);
    console.log("🔄 Chat ID value:", JSON.stringify(chatId));

    // Validate chat ID format (MongoDB ObjectId should be 24 characters)
    if (!chatId || chatId.length !== 24 || !/^[0-9a-fA-F]{24}$/.test(chatId)) {
      console.error("❌ Invalid chat ID format:", chatId);
      setUploadError("Invalid chat ID format");
      return;
    }

    // Check if we have unsaved progress before switching chats
    if (hasUnsavedProgress) {
      handleNavigationAttempt(async () => {
        await performChatSwitch(chatId);
      });
      return;
    }

    await performChatSwitch(chatId);
  };

  const performChatSwitch = async (chatId: string) => {
    setActiveChat(chatId);
    localStorage.setItem("active_chat", chatId);
    navigateToView("main");
    setChatMessages([]);
    setSelectedCase("");
    setUploadError("");

    // Load generated content for this chat
    try {
      console.log("📚 Loading generated content for chat:", chatId);
      const content = await apiService.getGeneratedContent(chatId);

      if (content.cases && content.cases.length > 0) {
        setGeneratedCases(content.cases);
        console.log("✅ Loaded cases:", content.cases.length);
      }

      if (content.mcqs && content.mcqs.length > 0) {
        // Group MCQs by case title
        const mcqGroups: Record<string, any[]> = {};
        content.mcqs.forEach((mcq) => {
          const caseTitle = mcq.case_title || "General";
          if (!mcqGroups[caseTitle]) {
            mcqGroups[caseTitle] = [];
          }
          mcqGroups[caseTitle].push(mcq);
        });
        setMCQQuestions(mcqGroups);
        console.log("✅ Loaded MCQs:", content.mcqs.length);
      }

      if (content.concepts && content.concepts.length > 0) {
        // Group concepts by case title
        const conceptGroups: Record<string, string[]> = {};
        content.concepts.forEach((concept) => {
          const caseTitle = concept.case_title || "General";
          if (!conceptGroups[caseTitle]) {
            conceptGroups[caseTitle] = [];
          }
          conceptGroups[caseTitle].push(
            `${concept.title}: ${concept.description}`
          );
        });
        setGeneratedConcepts(conceptGroups);
        console.log("✅ Loaded concepts:", content.concepts.length);
      }

      console.log("✅ Generated content loaded successfully");
    } catch (error) {
      console.error("❌ Failed to load generated content:", error);
      // Clear content if loading fails
      setGeneratedCases([]);
      setMCQQuestions({});
      setGeneratedConcepts({});
    }

    // Load chat messages
    await loadActiveChatMessages(chatId);

    // Chat selection complete
  };

  const debugChatPersistence = () => {
    console.log("🔍 DEBUG: Chat Persistence Status");
    console.log("Current chats state:", chats);
    console.log("Active chat:", activeChat);
    console.log("LocalStorage user_chats:", localStorage.getItem("user_chats"));
    console.log(
      "LocalStorage active_chat:",
      localStorage.getItem("active_chat")
    );
    console.log("Is loading chats:", isLoadingChats);
    console.log("Is loading in progress:", isLoadingChatsInProgress);
  };

  const clearOldCache = () => {
    console.log("🧹 Clearing old cache data...");
    localStorage.removeItem("user_chats");
    localStorage.removeItem("active_chat");
    setChats([]);
    setActiveChat("");
    console.log("✅ Old cache cleared");
  };

  const testChatLoading = async () => {
    console.log("🧪 Testing chat loading...");
    console.log("🧪 Current user:", user);
    console.log("🧪 Auth token:", localStorage.getItem("auth_token"));

    try {
      const chats = await apiService.getUserChats();
      console.log("🧪 Test result - chats:", chats);
    } catch (error) {
      console.error("🧪 Test failed:", error);
    }
  };

  const getCurrentChatFile = () => {
    const currentChat = chats.find((chat) => chat.id === activeChat);
    return currentChat?.document_filename || null;
  };

  const getCurrentChatDocument = () => {
    const currentChat = chats.find((chat) => chat.id === activeChat);
    return currentChat
      ? {
          id: currentChat.document_id || "",
          filename: currentChat.document_filename || "Unknown Document",
          content: currentChat.document_content_preview || "",
        }
      : null;
  };

  const getDynamicBreadcrumbs = () => {
    const currentDocument = getCurrentChatDocument();
    const documentName = currentDocument?.filename || "Document";
    const documentNameWithoutExt = documentName.replace(/\.[^/.]+$/, "");

    switch (currentView) {
      case "case-selection":
        return [
          {
            label: "Home",
            onClick: () => {
              setUploadError("");
              navigateToView("main");
            },
          },
          {
            label: documentNameWithoutExt,
            onClick: () => {
              setUploadError("");
              navigateToView("main");
            },
          },
          { label: selectedCase || "Select Case", isActive: true },
        ];
      case "generate-mcqs":
        return [
          {
            label: "Home",
            onClick: () => {
              setUploadError("");
              navigateToView("main");
            },
          },
          {
            label: documentNameWithoutExt,
            onClick: () => {
              setUploadError("");
              navigateToView("main");
            },
          },
          {
            label: selectedCase || "Case",
            onClick: () => {
              console.log("🔘 Back button clicked in", currentView);
              navigateToView("case-selection");
            },
          },
          { label: "Generate MCQs", isActive: true },
        ];
      case "explore-cases":
        return [
          {
            label: "Home",
            onClick: () => {
              setUploadError("");
              navigateToView("main");
            },
          },
          {
            label: documentNameWithoutExt,
            onClick: () => {
              setUploadError("");
              navigateToView("main");
            },
          },
          {
            label: selectedCase || "Case",
            onClick: () => {
              console.log("🔘 Back button clicked in", currentView);
              navigateToView("case-selection");
            },
          },
          { label: "Explore Case", isActive: true },
        ];
      case "identify-concepts":
        return [
          {
            label: "Home",
            onClick: () => {
              setUploadError("");
              navigateToView("main");
            },
          },
          {
            label: documentNameWithoutExt,
            onClick: () => {
              setUploadError("");
              navigateToView("main");
            },
          },
          {
            label: selectedCase || "Case",
            onClick: () => {
              console.log("🔘 Back button clicked in", currentView);
              navigateToView("case-selection");
            },
          },
          { label: "Identify Concepts", isActive: true },
        ];
      case "concept-detail":
        return [
          {
            label: "Home",
            onClick: () => {
              setUploadError("");
              navigateToView("main");
            },
          },
          {
            label: documentNameWithoutExt,
            onClick: () => {
              setUploadError("");
              navigateToView("main");
            },
          },
          {
            label: selectedCase || "Case",
            onClick: () => {
              console.log("🔘 Back button clicked in", currentView);
              navigateToView("case-selection");
            },
          },
          {
            label: "Identify Concepts",
            onClick: () => navigateToView("identify-concepts"),
          },
          { label: "Question 01", isActive: true },
        ];
      case "profile-settings":
        return [
          {
            label: "Home",
            onClick: () => {
              setUploadError("");
              navigateToView("main");
            },
          },
          { label: "Profile Settings", isActive: true },
        ];
      case "notifications":
        return [
          {
            label: "Home",
            onClick: () => {
              setUploadError("");
              navigateToView("main");
            },
          },
          { label: "Notifications", isActive: true },
        ];
      case "chatbot-flow":
        return [
          {
            label: "Home",
            onClick: () => {
              setUploadError("");
              navigateToView("main");
            },
          },
          {
            label: documentNameWithoutExt,
            onClick: () => {
              setUploadError("");
              navigateToView("main");
            },
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
        return {
          label: "Back to Main",
          onClick: () => {
            setUploadError("");
            navigateToView("main");
          },
        };
      case "generate-mcqs":
        return {
          label: "Back to Case",
          onClick: () => navigateToView("case-selection"),
        };
      case "explore-cases":
        return {
          label: "Back to Case",
          onClick: () => navigateToView("case-selection"),
        };
      case "identify-concepts":
        return {
          label: "Back to Case",
          onClick: () => navigateToView("case-selection"),
        };
      case "concept-detail":
        return {
          label: "Back to Concepts",
          onClick: () => navigateToView("identify-concepts"),
        };
      case "profile-settings":
        return {
          label: "Back to Main",
          onClick: () => {
            setUploadError("");
            navigateToView("main");
          },
        };
      case "notifications":
        return {
          label: "Back to Main",
          onClick: () => {
            setUploadError("");
            navigateToView("main");
          },
        };
      case "chatbot-flow":
        return {
          label: "Back to Main",
          onClick: () => {
            setUploadError("");
            navigateToView("main");
          },
        };
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

  const generateMCQsFromDocument = async (retryCount = 0) => {
    const currentDocument = getCurrentChatDocument();
    if (!currentDocument) {
      setUploadError("No document available for MCQ generation");
      return;
    }

    // Check if MCQs already exist for this case
    if (
      selectedCase &&
      mcqQuestions[selectedCase] &&
      mcqQuestions[selectedCase].length > 0
    ) {
      const hasHints = mcqQuestions[selectedCase].some(
        (q) => q.hint && q.hint.trim() !== ""
      );
      if (hasHints) {
        console.log(
          "🚀 MCQs with hints already exist for case:",
          selectedCase,
          "skipping generation"
        );
        return;
      } else {
        console.log(
          "🔄 MCQs exist but without hints for case:",
          selectedCase,
          "regenerating with hints"
        );
      }
    }

    try {
      setIsUploading(true);
      setUploadError("");

      // Use the new MCQ API endpoint
      const response = await apiService.generateMCQs(
        currentDocument.id,
        undefined,
        5,
        true // Include hints
      );

      // Update the MCQ questions state with full objects for the selected case
      if (selectedCase) {
        setMCQQuestions((prev) => ({
          ...prev,
          [selectedCase]: response.questions,
        }));
        console.log(
          "MCQs generated successfully for case:",
          selectedCase,
          response
        );
      } else {
        console.log("No case selected for MCQ generation");
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to generate MCQs";
      console.error("MCQ generation error:", error);

      // Retry logic - retry up to 2 times
      if (retryCount < 2) {
        console.log(
          `🔄 Retrying MCQ generation (attempt ${retryCount + 1}/2)...`
        );
        setTimeout(() => {
          generateMCQsFromDocument(retryCount + 1);
        }, 2000); // Wait 2 seconds before retry
      } else {
        setUploadError(`${errorMessage} (Failed after 3 attempts)`);
      }
    } finally {
      setIsUploading(false);
    }
  };

  const retryMCQGeneration = async () => {
    if (!selectedCase) return;

    setIsGeneratingMCQs(selectedCase);
    setUploadError("");

    try {
      const currentDocument = getCurrentChatDocument();
      if (!currentDocument) {
        setUploadError("No document available for MCQ generation");
        setIsGeneratingMCQs(null);
        return;
      }

      const mcqResponse = await apiService.generateMCQs(
        currentDocument.id,
        selectedCase,
        5 // Generate 5 MCQs per case
      );

      if (mcqResponse.questions && mcqResponse.questions.length > 0) {
        setMCQQuestions((prev) => ({
          ...prev,
          [selectedCase]: mcqResponse.questions,
        }));

        // Add a small delay to ensure state updates before clearing generating state
        setTimeout(() => {
          setIsGeneratingMCQs(null);

          // Double-check that MCQs are still there after a short delay
          setTimeout(() => {
            const currentMCQs = mcqQuestions[selectedCase];
            if (!currentMCQs || currentMCQs.length === 0) {
              try {
                const cachedMCQs = localStorage.getItem("mcq_questions");
                if (cachedMCQs) {
                  const parsedMCQs = JSON.parse(cachedMCQs);
                  if (
                    parsedMCQs[selectedCase] &&
                    parsedMCQs[selectedCase].length > 0
                  ) {
                    setMCQQuestions(parsedMCQs);
                  }
                }
              } catch (e) {
                console.error(
                  `❌ Failed to restore MCQs for ${selectedCase}:`,
                  e
                );
              }
            }
          }, 200);
        }, 100);
      } else {
        setUploadError("No MCQs were generated. Please try again.");
        setIsGeneratingMCQs(null);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to generate MCQs";
      console.error("MCQ generation error:", error);
      setUploadError(`Failed to generate MCQs: ${errorMessage}`);
      setIsGeneratingMCQs(null);
    }
  };

  const generateConceptsFromDocument = async (retryCount = 0) => {
    const currentDocument = getCurrentChatDocument();
    if (!currentDocument) {
      setUploadError("No document available for concept generation");
      return;
    }

    // Check if concepts already exist for this case
    if (
      selectedCase &&
      generatedConcepts[selectedCase] &&
      generatedConcepts[selectedCase].length > 0
    ) {
      console.log(
        "🚀 Concepts already exist for case:",
        selectedCase,
        "skipping generation"
      );
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

      // Update the concepts state for the selected case
      setGeneratedConcepts((prev) => ({
        ...prev,
        [selectedCase]: conceptStrings,
      }));

      // Save concepts to database
      try {
        const contentToSave = {
          concepts: response.concepts,
          case_title: selectedCase,
        };
        await apiService.saveGeneratedContent(activeChat, contentToSave);
        console.log("✅ Concepts saved to database");
      } catch (error) {
        console.error("❌ Failed to save concepts to database:", error);
      }

      console.log("Concepts generated successfully:", response);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.error("Concept generation error:", error);
      console.error("Error details:", {
        message: errorMessage,
        stack: error instanceof Error ? error.stack : undefined,
        currentDocument: currentDocument?.id,
      });

      // Retry logic - retry up to 2 times
      if (retryCount < 2) {
        console.log(
          `🔄 Retrying concept generation (attempt ${retryCount + 1}/2)...`
        );
        setTimeout(() => {
          generateConceptsFromDocument(retryCount + 1);
        }, 2000); // Wait 2 seconds before retry
      } else {
        setUploadError(
          `Failed to generate concepts: ${errorMessage} (Failed after 3 attempts)`
        );
      }
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
    setMCQQuestions({});
    setGeneratedConcepts({});
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
      // Step 1: Generate cases only (fastest)
      setAutoLoadingProgress("🚀 Generating medical cases...");
      console.log("🚀 Step 1: Generating cases only...");
      console.log("📄 Document details:", {
        id: currentDocument.id,
        filename: currentDocument.filename,
        contentLength: currentDocument.content?.length,
        contentType: currentDocument.content_type,
      });

      const casesResponse = await apiService.autoGenerateContent({
        document_id: currentDocument.id,
        generate_cases: true,
        generate_mcqs: true,
        generate_concepts: true,
        generate_titles: true,
        num_cases: 5,
        num_mcqs: 5, // Generate 5 MCQs per case
        num_concepts: 5, // Generate 5 concepts
        num_titles: 5,
      });

      console.log("📊 Cases response:", casesResponse);
      console.log("📊 Cases response success:", casesResponse.success);
      console.log("📊 Cases response cases:", casesResponse.cases);
      console.log("📊 Cases response message:", casesResponse.message);

      if (casesResponse.success) {
        // Set generated cases
        if (casesResponse.cases) {
          setGeneratedCases(casesResponse.cases);
          console.log("✅ Cases generated:", casesResponse.cases.length);
          console.log(
            "✅ Cases details:",
            casesResponse.cases.map((c) => ({
              title: c.title,
              difficulty: c.difficulty,
            }))
          );

          // Validate that the selected case exists in the generated cases
          const caseTitles = casesResponse.cases.map((c) => c.title);
          if (selectedCase && !caseTitles.includes(selectedCase)) {
            console.log(
              "⚠️ Selected case not found in generated cases, clearing selection"
            );
            setSelectedCase("");
            localStorage.removeItem("selected_case");
          }
        }

        // Set generated MCQs if available
        if (casesResponse.mcqs && casesResponse.mcqs.length > 0) {
          // Group MCQs by case title (assuming first case gets the MCQs for now)
          const firstCaseTitle = casesResponse.cases?.[0]?.title || "General";
          setMCQQuestions((prev) => ({
            ...prev,
            [firstCaseTitle]: casesResponse.mcqs!,
          }));
          console.log("✅ MCQs generated:", casesResponse.mcqs.length);
        }

        // Set generated concepts if available
        if (casesResponse.concepts && casesResponse.concepts.length > 0) {
          // Group concepts by case title
          const conceptGroups: Record<string, string[]> = {};
          casesResponse.concepts.forEach((concept) => {
            const caseTitle = concept.case_title || "General";
            if (!conceptGroups[caseTitle]) {
              conceptGroups[caseTitle] = [];
            }
            conceptGroups[caseTitle].push(
              `${concept.title}: ${concept.description}`
            );
          });
          setGeneratedConcepts(conceptGroups);
          console.log("✅ Concepts generated:", casesResponse.concepts.length);
        }

        setAutoLoadingProgress(
          "🎉 All content generated successfully! Cases, MCQs, and concepts are ready."
        );
        console.log("🎉 Auto-generation completed successfully!");

        // Save generated content to database
        try {
          const contentToSave = {
            cases: casesResponse.cases || [],
            mcqs: casesResponse.mcqs || [],
            concepts: casesResponse.concepts || [],
            case_title: casesResponse.cases?.[0]?.title,
          };

          console.log("💾 Saving generated content to database...");
          await apiService.saveGeneratedContent(activeChat, contentToSave);
          console.log("✅ Generated content saved successfully");
        } catch (error) {
          console.error("❌ Failed to save generated content:", error);
        }

        // Reload chats to update the state with the new chat
        console.log("🔄 Reloading chats to update state...");
        await loadUserChats();

        // Show success message and clear progress
        setTimeout(() => {
          setAutoLoadingProgress("");
        }, 3000);
      } else {
        throw new Error(casesResponse.message || "Content generation failed");
      }
    } catch (error) {
      console.error("❌ Auto-loading error:", error);
      console.error("❌ Error type:", typeof error);
      console.error("❌ Error constructor:", error?.constructor?.name);

      let errorMessage = "Failed to auto-load content";
      if (error instanceof Error) {
        errorMessage = error.message;
        console.error("Error details:", {
          message: error.message,
          stack: error.stack,
        });
      } else {
        console.error("Non-Error object:", error);
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
      // Always reload chats to ensure state is updated
      console.log("🔄 Reloading chats in finally block...");
      loadUserChats();
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
      | "concept-detail"
      | "profile-settings"
      | "notifications"
      | "chatbot-flow"
  ) => {
    // Check if we're currently in MCQ view and have unsaved progress
    if (
      (currentView === "explore-cases" || currentView === "generate-mcqs") &&
      hasUnsavedProgress
    ) {
      handleNavigationAttempt(() => {
        setUploadError("");
        setCurrentViewWithPersistence(view);
      });
    } else {
      // Clear any error messages when changing views
      setUploadError("");
      setCurrentViewWithPersistence(view);
    }
  };

  const navigateToView = (view: string) => {
    switch (view) {
      case "main":
        router.push("/dashboard");
        break;
      case "admin-analytics":
        router.push("/dashboard/analytics");
        break;
      case "case-selection":
        router.push("/dashboard/cases");
        break;
      case "generate-mcqs":
        router.push("/dashboard/mcqs");
        break;
      case "explore-cases":
        router.push("/dashboard/explore");
        break;
      case "identify-concepts":
        router.push("/dashboard/concepts");
        break;
      case "concept-detail":
        // For concept detail, we need to navigate to a specific concept
        // This will be handled by the concept selection logic
        router.push("/dashboard/concepts");
        break;
      case "profile-settings":
        router.push("/dashboard/profile");
        break;
      case "notifications":
        router.push("/dashboard/notifications");
        break;
      case "chatbot-flow":
        router.push("/dashboard");
        break;
      default:
        router.push("/dashboard");
        break;
    }
  };

  const setCurrentViewWithPersistence = (
    view:
      | "main"
      | "admin-analytics"
      | "generate-cases"
      | "case-selection"
      | "generate-mcqs"
      | "explore-cases"
      | "identify-concepts"
      | "concept-detail"
      | "profile-settings"
      | "notifications"
      | "chatbot-flow"
  ) => {
    // All views now have routes, so navigate to them
    navigateToView(view);
  };

  const setSelectedCaseWithPersistence = (caseTitle: string) => {
    setSelectedCase(caseTitle);
    localStorage.setItem("selected_case", caseTitle);
  };

  const handleConceptSelect = (concept: string) => {
    setSelectedConcept(concept);
    localStorage.setItem("selected_concept", concept);
    // Navigate to the specific concept route
    const conceptId = concept.toLowerCase().replace(/\s+/g, "-");
    router.push(`/dashboard/concepts/${conceptId}`);
  };

  // MCQ completion handlers
  const handleMCQCompletion = useCallback(
    (correctAnswers: number, totalQuestions: number) => {
      setCompletionStats({ correct: correctAnswers, total: totalQuestions });
      setShowCompletionPopup(true);
      setHasUnsavedProgress(false); // Progress is now saved/completed
    },
    []
  );

  const handleCompletionPopupClose = () => {
    console.log("🔄 Closing completion popup");
    setShowCompletionPopup(false);
  };

  const [isUpdatingAnalytics, setIsUpdatingAnalytics] = useState(false);

  const handleCompletionPopupContinue = async () => {
    // Prevent multiple clicks
    if (isUpdatingAnalytics) {
      console.log("⏳ Analytics update already in progress, ignoring click");
      return;
    }

    console.log("🔄 Finishing completion popup (dashboard)");
    console.log("📊 Completion stats:", completionStats);

    setIsUpdatingAnalytics(true);

    try {
      // Update user analytics with MCQ completion data
      const analyticsData = {
        correct_answers: completionStats.correct,
        total_questions: completionStats.total,
        // case_id is optional and not needed for dashboard context
      };

      console.log("📤 Sending analytics data:", analyticsData);

      const result = await apiService.updateMCQAnalytics(analyticsData);

      console.log("✅ Analytics updated successfully:", result);
    } catch (error) {
      console.error("❌ Failed to update analytics:", error);
      console.error("❌ Error details:", error);
      // Don't block the user flow if analytics update fails
    } finally {
      setIsUpdatingAnalytics(false);
    }

    setShowCompletionPopup(false);
    // Could navigate to next section or show summary
  };

  // Navigation warning handlers
  const handleNavigationAttempt = (navigationFunction: () => void) => {
    if (hasUnsavedProgress) {
      setPendingNavigation(() => navigationFunction);
      setShowNavigationWarning(true);
    } else {
      navigationFunction();
    }
  };

  const handleNavigationConfirm = () => {
    setShowNavigationWarning(false);
    setHasUnsavedProgress(false);
    if (pendingNavigation) {
      pendingNavigation();
      setPendingNavigation(null);
    }
  };

  const handleNavigationCancel = () => {
    setShowNavigationWarning(false);
    setPendingNavigation(null);
  };

  // Track when user starts answering questions
  const handleQuestionAttempted = () => {
    setHasUnsavedProgress(true);
  };

  const renderMyAnalytics = () => <MyAnalytics />;

  const renderMainDashboard = () => {
    const currentFile = getCurrentChatFile();

    // Show dashboard immediately without loading state

    // Show welcome screen if no chats exist
    if (chats.length === 0) {
      return (
        <div className="flex-1 p-8 flex flex-col items-center justify-center">
          <div className="text-center max-w-2xl">
            {/* User Profile Image */}
            <div className="mb-6 flex justify-center">
              <div className="w-20 h-20 rounded-full overflow-hidden">
                {user?.profile_image_url ? (
                  <Image
                    src={user.profile_image_url}
                    alt="User Profile"
                    width={80}
                    height={80}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-blue-500 flex items-center justify-center">
                    <span className="text-white text-2xl font-medium">
                      {user?.full_name?.charAt(0) ||
                        user?.username?.charAt(0) ||
                        "U"}
                    </span>
                  </div>
                )}
              </div>
            </div>
            <h1 className="text-3xl font-semibold text-gray-900 mb-4">
              Welcome, {user?.full_name || user?.username || "User"}!
            </h1>
            <p className="text-gray-600 mb-8">
              Get started by creating a new chat and uploading a medical
              document to generate cases, MCQs, and concepts automatically.
            </p>

            <div className="space-y-4">
              <button
                onClick={() => createNewChat()}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors text-base font-medium shadow-md"
              >
                Create New Chat
              </button>

              <p className="text-sm text-gray-500">
                You'll be able to upload your document after creating a new chat
              </p>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="flex-1 p-8">
        <div className="mb-8">
          <div className="flex items-center gap-4">
            {/* User Profile Image */}
            <div className="w-12 h-12 rounded-full overflow-hidden">
              {user?.profile_image_url ? (
                <Image
                  src={user.profile_image_url}
                  alt="User Profile"
                  width={48}
                  height={48}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-blue-500 flex items-center justify-center">
                  <span className="text-white text-lg font-medium">
                    {user?.full_name?.charAt(0) ||
                      user?.username?.charAt(0) ||
                      "U"}
                  </span>
                </div>
              )}
            </div>
            <h1 className="text-2xl font-semibold text-gray-900">
              Welcome back, {user?.full_name || user?.username || "User"}!
            </h1>
          </div>
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
                <strong>Uploaded:</strong> {currentFile}
              </p>
              {autoLoadingProgress === "All content loaded successfully!" && (
                <p className="text-green-700 mt-2">
                  ✅ All medical case content has been automatically generated!
                </p>
              )}
              {uploadError && (
                <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded">
                  <p className="text-red-800 text-sm">⚠️ {uploadError}</p>
                </div>
              )}
            </div>

            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">
                  Generated Medical Cases
                </h2>
              </div>
              <div className="mb-6">
                <p className="text-gray-700">Select a case to work on:</p>
              </div>
            </div>

            <CasesList
              cases={cases}
              onCaseSelect={async (title) => {
                setSelectedCaseWithPersistence(title);
                setCurrentViewWithPersistence("case-selection");

                // Generate MCQs on-demand for the selected case
                if (!mcqQuestions[title] || mcqQuestions[title].length === 0) {
                  console.log(
                    `🎯 Generating MCQs on-demand for case: ${title}`
                  );
                  setIsGeneratingMCQs(title);
                  setAutoLoadingProgress(`📝 Generating MCQs for: ${title}...`);

                  try {
                    const currentDocument = getCurrentChatDocument();
                    if (currentDocument) {
                      const mcqResponse = await apiService.generateMCQs(
                        currentDocument.id,
                        title,
                        5 // Generate 5 MCQs per case
                      );

                      console.log(`📊 MCQ response for ${title}:`, mcqResponse);
                      console.log(`📊 MCQ questions:`, mcqResponse.questions);

                      if (mcqResponse.questions) {
                        setMCQQuestions((prev) => ({
                          ...prev,
                          [title]: mcqResponse.questions,
                        }));
                        console.log(
                          `✅ Generated ${mcqResponse.questions.length} MCQs for: ${title}`
                        );
                        setAutoLoadingProgress("");
                      } else {
                        console.log(
                          `❌ No MCQ questions in response for: ${title}`
                        );
                        setAutoLoadingProgress("");
                      }
                    }
                  } catch (error) {
                    console.error(
                      `❌ Failed to generate MCQs for case: ${title}`,
                      error
                    );
                    setAutoLoadingProgress("");
                  } finally {
                    setIsGeneratingMCQs(null);
                  }
                }
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
                        ?.message_count?.toString() || "0"
                    : "0"
                }
              />
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderCaseSelection = () => {
    // If no chats exist, redirect to main view
    if (chats.length === 0) {
      navigateToView("main");
      return null;
    }

    return (
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
              </div>
            </div>
            <div className="text-right">
              <p
                className="text-sm font-medium text-gray-900 cursor-pointer hover:text-blue-600"
                onClick={() => navigateToView("main")}
              >
                Cases
              </p>
            </div>
          </div>
          <p className="text-gray-700 mb-8">How would you like to proceed?</p>
        </div>

        <CaseSelectionOptions
          onGenerateMCQs={() => setCurrentViewWithPersistence("generate-mcqs")}
          onIdentifyConcepts={() => navigateToView("identify-concepts")}
          onExploreCases={() => setCurrentViewWithPersistence("explore-cases")}
        />
      </div>
    );
  };

  const renderGenerateMCQs = () => {
    // If no chats exist, redirect to main view
    if (chats.length === 0) {
      navigateToView("main");
      return null;
    }

    return (
      <div className="flex-1 p-8">
        <div className="mb-6">
          {renderBackButton()}
          <Breadcrumb items={getDynamicBreadcrumbs()} />
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <h1 className="text-2xl font-semibold text-gray-900 mr-3">
                {selectedCase || "MCQ Questions"}
              </h1>
              <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs font-medium">
                Moderate
              </span>
            </div>
            <div className="text-right">
              <p
                className="text-sm font-medium text-gray-900 cursor-pointer hover:text-blue-600"
                onClick={() => navigateToView("case-selection")}
              >
                Options
              </p>
            </div>
          </div>
          <div className="flex items-center justify-between mb-8">
            <p className="text-gray-700">
              MCQ questions have been automatically generated for you:
            </p>
          </div>
        </div>

        {selectedCase &&
        mcqQuestions[selectedCase] &&
        mcqQuestions[selectedCase].length > 0 ? (
          <InteractiveMCQQuestionsList
            questions={mcqQuestions[selectedCase]}
            expandedQuestions={expandedQuestions}
            onToggleQuestion={toggleQuestion}
            onAllQuestionsCompleted={handleMCQCompletion}
            onQuestionAttempted={handleQuestionAttempted}
          />
        ) : isGeneratingMCQs === selectedCase ? (
          <div className="space-y-4">
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">
                Generating MCQ questions for this case...
              </p>
              <p className="text-sm mt-2 text-gray-500">
                This may take a few moments while we create questions based on
                your document.
              </p>
            </div>
          </div>
        ) : isAutoLoading ? (
          <div className="space-y-4">
            <div className="text-center py-8 text-gray-500">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p>Generating MCQ questions...</p>
              <p className="text-sm mt-2">{autoLoadingProgress}</p>
            </div>
          </div>
        ) : selectedCase ? (
          <div className="space-y-4">
            <div className="text-center py-8 text-gray-500">
              <p>No MCQ questions available for this case yet.</p>
              <p className="text-sm mt-2">
                MCQs are being generated for each case individually.
              </p>
              <div className="mt-4">
                <Button
                  onClick={retryMCQGeneration}
                  disabled={isGeneratingMCQs === selectedCase}
                  variant="outline"
                  size="sm"
                >
                  {isGeneratingMCQs === selectedCase ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2"></div>
                      Generating...
                    </>
                  ) : (
                    "Retry MCQ Generation"
                  )}
                </Button>
                {uploadError && (
                  <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded">
                    <p className="text-red-800 text-sm">⚠️ {uploadError}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-center py-8 text-gray-500">
              <p>Select a case to view its MCQ questions.</p>
              <p className="text-sm mt-2">
                Each case will have its own unique set of questions.
              </p>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderExploreCases = () => {
    const currentDocument = getCurrentChatDocument();

    // If no chats exist, redirect to main view
    if (chats.length === 0) {
      navigateToView("main");
      return null;
    }

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
                Moderate
              </span>
            </div>
            <div className="text-right">
              <p
                className="text-sm font-medium text-gray-900 cursor-pointer hover:text-blue-600"
                onClick={() => navigateToView("case-selection")}
              >
                Options
              </p>
            </div>
          </div>
          <p className="text-gray-700 mb-4">Chat With the AI</p>
        </div>

        {/* AI Chat Component */}
        <div className="flex-1 bg-white rounded-lg border border-gray-200 shadow-sm">
          {(() => {
            // Use the actual case title from the generated cases if selectedCase is empty
            const actualCaseTitle =
              selectedCase ||
              (generatedCases.length > 0 ? generatedCases[0].title : "default");
            const contextChatId = `${activeChat}-case-${actualCaseTitle}`;
            console.log(
              `🎯 Explore Cases - Generated chatId: ${contextChatId}`
            );
            console.log(`🎯 Active chat: ${activeChat}`);
            console.log(`🎯 Selected case: ${selectedCase}`);
            console.log(`🎯 Actual case title: ${actualCaseTitle}`);
            console.log(
              `🎯 Generated cases:`,
              generatedCases.map((c) => c.title)
            );
            return (
              <AIChat
                chatId={contextChatId}
                documentId={currentDocument?.id}
                caseTitle={actualCaseTitle}
                messages={[]}
                onMessageSent={(message) => {
                  // Don't update the shared chatMessages state
                  // The AIChat component handles its own context-specific messages
                }}
              />
            );
          })()}
        </div>

        {/* Action Buttons */}
        <div className="mt-4">
          <ActionButtons
            onGenerateMCQs={() =>
              setCurrentViewWithPersistence("generate-mcqs")
            }
            onIdentifyConcepts={() =>
              setCurrentViewWithPersistence("identify-concepts")
            }
          />
        </div>
      </div>
    );
  };

  const renderIdentifyConcepts = () => {
    // If no chats exist, redirect to main view
    if (chats.length === 0) {
      navigateToView("main");
      return null;
    }

    return (
      <div className="flex-1 p-8 flex flex-col">
        <div className="mb-6">
          {renderBackButton()}
          <Breadcrumb items={getDynamicBreadcrumbs()} />
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <h1 className="text-2xl font-semibold text-gray-900 mr-3">
                {selectedCase || "Key Concepts"}
              </h1>
              <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs font-medium">
                Moderate
              </span>
            </div>
            <div className="text-right">
              <p
                className="text-sm font-medium text-gray-900 cursor-pointer hover:text-blue-600"
                onClick={() => navigateToView("case-selection")}
              >
                Options
              </p>
            </div>
          </div>
          <div className="flex items-center justify-between mb-8">
            <p className="text-gray-700">
              {isGeneratingConcepts
                ? "Generating key medical concepts..."
                : "Key medical concepts have been automatically identified:"}
            </p>
          </div>
        </div>

        <div className="flex-1 flex flex-col">
          {isGeneratingConcepts ? (
            <div className="flex-1 flex items-center justify-center animate-fade-in">
              <div className="text-center max-w-md">
                <div className="relative">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600 mx-auto mb-6"></div>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Generating Key Concepts
                </h3>
                <p className="text-gray-600 mb-4">
                  Analyzing your document to identify important medical
                  concepts...
                </p>
                <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all duration-1000 ease-out"
                    style={{ width: "65%" }}
                  ></div>
                </div>
                <p className="text-sm text-gray-500 mt-3">
                  This usually takes 10-15 seconds
                </p>
              </div>
            </div>
          ) : (
            <ConceptsList
              concepts={concepts}
              onConceptSelect={handleConceptSelect}
            />
          )}

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

  const renderConceptDetail = () => {
    // If no chats exist, redirect to main view
    if (chats.length === 0) {
      navigateToView("main");
      return null;
    }

    return (
      <div className="flex-1 p-8 flex flex-col h-full">
        <div className="mb-6">
          {renderBackButton()}
          <Breadcrumb items={getDynamicBreadcrumbs()} />
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <h1 className="text-2xl font-semibold text-gray-900 mr-3">
                {selectedCase || "Key Concepts"}
              </h1>
              <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs font-medium">
                Moderate
              </span>
            </div>
            <div className="text-right">
              <p
                className="text-sm font-medium text-gray-900 cursor-pointer hover:text-blue-600"
                onClick={() => navigateToView("identify-concepts")}
              >
                Topics
              </p>
            </div>
          </div>
          <div className="mb-6">
            <h2 className="text-lg font-medium text-gray-900 mb-2">Do Read!</h2>
          </div>
        </div>

        <div className="flex-1 flex flex-col">
          {/* Concept Detail Card */}
          <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6 flex-1">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">
              {selectedConcept}
            </h3>
            <div className="prose max-w-none">
              <p className="text-gray-700 leading-relaxed mb-4">
                This concept covers the fundamental understanding of{" "}
                {selectedConcept.toLowerCase()}. It includes key processes,
                mechanisms, and clinical significance that are essential for
                medical practice and understanding.
              </p>

              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">
                    Key Processes:
                  </h4>
                  <ul className="list-disc list-inside space-y-2 text-gray-700">
                    <li>
                      <strong>Definition:</strong> {selectedConcept} refers to
                      the fundamental understanding of this medical concept and
                      its clinical applications.
                    </li>
                    <li>
                      <strong>Mechanism:</strong> The underlying processes
                      involve complex interactions between various physiological
                      systems and pathological changes.
                    </li>
                    <li>
                      <strong>Clinical Significance:</strong> Understanding this
                      concept is crucial for accurate diagnosis, treatment
                      planning, and patient care management.
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Chat Interface */}
          <div className="mt-auto">
            {(() => {
              const contextChatId = `${activeChat}-concept-${selectedConcept}`;
              console.log(
                `🎯 Concept Detail - Generated chatId: ${contextChatId}`
              );
              console.log(`🎯 Active chat: ${activeChat}`);
              console.log(`🎯 Selected concept: ${selectedConcept}`);
              return (
                <AIChat
                  chatId={contextChatId}
                  documentId={getCurrentChatDocument()?.id}
                  caseTitle={selectedConcept}
                  messages={[]}
                  onMessageSent={(message) => {
                    // Don't update the shared chatMessages state
                    // The AIChat component handles its own context-specific messages
                  }}
                />
              );
            })()}
          </div>
        </div>
      </div>
    );
  };

  const renderProfileSettings = () => {
    return <ProfileSettings onBack={() => navigateToView("main")} />;
  };

  const renderNotifications = () => {
    return <Notifications onBack={() => navigateToView("main")} />;
  };

  // Authentication loading is handled by the auth context

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
        {currentView === "admin-analytics" && renderMyAnalytics()}
        {currentView === "case-selection" && renderCaseSelection()}
        {currentView === "generate-mcqs" && renderGenerateMCQs()}
        {currentView === "explore-cases" && renderExploreCases()}
        {currentView === "identify-concepts" && renderIdentifyConcepts()}
        {currentView === "concept-detail" && renderConceptDetail()}
        {currentView === "chatbot-flow" && selectedDocument && (
          <ChatbotFlow
            document={selectedDocument}
            onBack={() => navigateToView("main")}
          />
        )}
        {currentView === "profile-settings" && renderProfileSettings()}
        {currentView === "notifications" && renderNotifications()}
      </div>

      {/* Scroll to Top Button */}
      <ScrollToTop />

      {/* MCQ Completion Popup */}
      <MCQCompletionPopup
        isOpen={showCompletionPopup}
        correctAnswers={completionStats.correct}
        totalQuestions={completionStats.total}
        onClose={handleCompletionPopupClose}
        onContinue={handleCompletionPopupContinue}
        isUpdating={isUpdatingAnalytics}
      />

      {/* Navigation Warning Popup */}
      <NavigationWarningPopup
        isOpen={showNavigationWarning}
        onClose={handleNavigationCancel}
        onConfirm={handleNavigationConfirm}
        onCancel={handleNavigationCancel}
      />
    </div>
  );
}
