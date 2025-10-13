"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiService, ChatMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import {
  createTimestamp,
  formatTime,
  isValidTimestamp,
} from "@/lib/timestamp-utils";
import Image from "next/image";

interface LocalChatMessage {
  id: string;
  type: "user" | "ai";
  message: string;
  timestamp: Date;
}

interface AIChatProps {
  chatId?: string;
  documentId?: string;
  caseTitle?: string;
  messages?: ChatMessage[];
  onMessageSent?: (message: ChatMessage) => void;
}

export function AIChat({
  chatId,
  documentId,
  caseTitle,
  messages: propMessages,
  onMessageSent,
}: AIChatProps) {
  const { user } = useAuth();
  const [localMessages, setLocalMessages] = useState<LocalChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [showScrollToTop, setShowScrollToTop] = useState(false);
  const [userJustSentMessage, setUserJustSentMessage] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Extract the main chat ID from context-specific chat ID
  const getMainChatId = (contextChatId?: string): string => {
    if (!contextChatId) return "";

    // If it's a context-specific ID (contains -case- or -concept-), extract the main ID
    if (
      contextChatId.includes("-case-") ||
      contextChatId.includes("-concept-")
    ) {
      const parts = contextChatId.split("-");
      return parts[0]; // Return the main chat ID (first part)
    }

    // If it's a regular chat ID, return as is
    return contextChatId;
  };

  const mainChatId = getMainChatId(chatId);

  // Utility to strip context prefix for display
  const stripContextPrefix = (message: string): string => {
    const contextRegex = /^\[Context:.*?\]\s*/;
    return message.replace(contextRegex, "").trim();
  };

  // Get context-specific storage key
  const getContextStorageKey = (): string => {
    if (!chatId) return "";
    const key = `chat_messages_${chatId}`;
    console.log(`🔑 Generated storage key: ${key}`);
    return key;
  };

  // Load context-specific messages from localStorage
  const loadContextMessages = (): LocalChatMessage[] => {
    if (typeof window === "undefined") return [];

    try {
      const storageKey = getContextStorageKey();
      console.log(`🔍 Loading messages for key: ${storageKey}`);
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        console.log(`✅ Found ${parsed.length} stored messages for ${chatId}`);
        // Convert timestamp strings back to Date objects
        return parsed.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp),
        }));
      } else {
        console.log(`❌ No stored messages found for ${chatId}`);
      }
    } catch (error) {
      console.error("Error loading context messages:", error);
    }
    return [];
  };

  // Save context-specific messages to localStorage
  const saveContextMessages = (messages: LocalChatMessage[]) => {
    if (typeof window === "undefined") return;

    try {
      const storageKey = getContextStorageKey();
      console.log(
        `💾 Saving ${messages.length} messages to key: ${storageKey}`
      );
      localStorage.setItem(storageKey, JSON.stringify(messages));
      console.log(`✅ Successfully saved messages for ${chatId}`);
    } catch (error) {
      console.error("Error saving context messages:", error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const scrollToTop = () => {
    messagesContainerRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleScroll = () => {
    const container = messagesContainerRef.current;
    if (container) {
      const scrollTop = container.scrollTop;
      const scrollHeight = container.scrollHeight;
      const clientHeight = container.clientHeight;

      // Show scroll to top button when user has scrolled down more than 300px
      // and there's enough content to scroll
      setShowScrollToTop(scrollTop > 300 && scrollHeight > clientHeight + 100);
    }
  };

  // Only scroll to bottom when user sends a message, not when AI responds
  useEffect(() => {
    if (userJustSentMessage) {
      scrollToBottom();
      setUserJustSentMessage(false); // Reset the flag
    }
  }, [localMessages, userJustSentMessage]);

  // Initialize messages when component mounts or when propMessages change
  useEffect(() => {
    console.log(`🔄 AIChat useEffect triggered for chatId: ${chatId}`);
    console.log(`🔄 Main chat ID: ${mainChatId}`);
    console.log(`🔄 Case title: ${caseTitle}`);

    // First, try to load context-specific messages from localStorage
    if (typeof window !== "undefined") {
      const contextMessages = loadContextMessages();
      if (contextMessages.length > 0) {
        console.log(
          `🔄 Loaded ${contextMessages.length} context messages for ${chatId}`
        );
        setLocalMessages(contextMessages);
        return;
      }
    }

    // If no context messages, create initial messages
    const welcomeMessage: LocalChatMessage = {
      id: "welcome",
      type: "ai",
      message: `Hello! I'm your AI assistant for ${
        caseTitle || "this case"
      }. I can help you explore the case, answer questions, and provide insights. What would you like to know?`,
      timestamp: createTimestamp(),
    };

    const initialMessages = [welcomeMessage];

    // Only add propMessages if we don't have context-specific messages
    // This prevents propMessages from overriding context-specific conversations
    if (
      propMessages &&
      propMessages.length > 0 &&
      initialMessages.length === 1
    ) {
      // Only add propMessages if we only have the welcome message (no context messages)
      propMessages.forEach((msg) => {
        // Add user message (strip context prefix for display)
        initialMessages.push({
          id: `${msg.id}-user`,
          type: "user",
          message: stripContextPrefix(msg.message),
          timestamp: new Date(msg.timestamp),
        });
        // Add AI response
        initialMessages.push({
          id: msg.id,
          type: "ai",
          message: msg.response,
          timestamp: new Date(msg.timestamp),
        });
      });
    }

    console.log(
      `🔄 Initialized with ${initialMessages.length} messages for ${chatId}`
    );
    setLocalMessages(initialMessages);
  }, [chatId, caseTitle, propMessages]); // Depend on chatId, caseTitle and propMessages

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading || !chatId) {
      console.log("Cannot send message:", {
        inputMessage: inputMessage.trim(),
        isLoading,
        chatId,
      });
      return;
    }

    const userMessage: LocalChatMessage = {
      id: Date.now().toString(),
      type: "user",
      message: inputMessage.trim(), // Keep original message for display
      timestamp: createTimestamp(),
    };

    const updatedMessages = [...localMessages, userMessage];
    setLocalMessages(updatedMessages);
    saveContextMessages(updatedMessages); // Save to localStorage
    setInputMessage("");
    setIsLoading(true);
    setError("");
    setUserJustSentMessage(true); // Set flag to scroll to bottom

    try {
      console.log("Sending message to chat:", {
        chatId,
        message: inputMessage.trim(),
        documentId,
      });
      // Use the new chat session API
      // If we have a case title, prepend it to the message for context
      const messageWithContext = caseTitle
        ? `[Context: ${caseTitle}] ${inputMessage.trim()}`
        : inputMessage.trim();

      const apiResponse = await apiService.sendChatMessageToSession(
        mainChatId,
        messageWithContext,
        documentId
      );
      console.log("API response:", apiResponse);

      const aiMessage: LocalChatMessage = {
        id: apiResponse.id,
        type: "ai",
        message: apiResponse.response,
        timestamp: isValidTimestamp(apiResponse.timestamp)
          ? new Date(apiResponse.timestamp)
          : createTimestamp(),
      };

      setLocalMessages((prev) => {
        // Check if message already exists to prevent duplicates
        const messageExists = prev.some((msg) => msg.id === apiResponse.id);
        if (messageExists) {
          return prev;
        }
        const finalMessages = [...prev, aiMessage];
        saveContextMessages(finalMessages); // Save to localStorage
        return finalMessages;
      });

      // Notify parent component about the new message
      if (onMessageSent) {
        onMessageSent(apiResponse);
      }
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Failed to get AI response"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Use the utility function for consistent time formatting

  return (
    <div className="flex flex-col h-full relative">
      {/* Chat Messages */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 mb-4"
        onScroll={handleScroll}
      >
        {localMessages.map((message) => (
          <div
            key={message.id}
            className={`flex ${
              message.type === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`flex ${
                message.type === "user" ? "flex-row-reverse" : "flex-row"
              } items-start gap-3 max-w-[80%]`}
            >
              {/* Profile Picture */}
              <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
                {message.type === "user" ? (
                  user?.profile_image_url ? (
                    <Image
                      src={user.profile_image_url}
                      alt="User"
                      width={32}
                      height={32}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-blue-500 flex items-center justify-center">
                      <span className="text-white text-sm font-medium">
                        {user?.full_name?.charAt(0) ||
                          user?.username?.charAt(0) ||
                          "U"}
                      </span>
                    </div>
                  )
                ) : (
                  <Image
                    src="/casewise_Icon.svg"
                    alt="AI"
                    width={32}
                    height={32}
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
              {/* Message Content */}
              <div
                className={`rounded-lg p-3 ${
                  message.type === "user"
                    ? "bg-blue-500 text-white"
                    : "bg-gray-100 text-gray-900"
                }`}
              >
                <div className="text-sm prose prose-sm max-w-none">
                  {message.type === "ai" ? (
                    <div
                      className="ai-response"
                      dangerouslySetInnerHTML={{
                        __html: message.message
                          // Headers
                          .replace(
                            /## (.*?)(?=\n|$)/g,
                            '<h3 class="font-bold text-gray-800 mt-6 mb-3 text-base border-b border-gray-200 pb-1">$1</h3>'
                          )
                          // Bold text
                          .replace(
                            /\*\*(.*?)\*\*/g,
                            '<strong class="font-semibold text-gray-900">$1</strong>'
                          )
                          // Bullet points with better formatting
                          .replace(
                            /^- (.*?)(?=\n|$)/gm,
                            '<div class="bullet-point"><span class="bullet">•</span><span class="content">$1</span></div>'
                          )
                          // Code blocks (if any)
                          .replace(
                            /`([^`]+)`/g,
                            '<code class="bg-gray-100 px-1 py-0.5 rounded text-xs font-mono">$1</code>'
                          )
                          // Paragraphs
                          .replace(/\n\n/g, '</p><p class="mb-3">')
                          // Single line breaks
                          .replace(/\n/g, "<br>")
                          // Wrap in paragraph tags
                          .replace(/^(.*)/, '<p class="mb-3">$1</p>'),
                      }}
                    />
                  ) : (
                    <div className="user-message">
                      <p className="whitespace-pre-wrap">{message.message}</p>
                    </div>
                  )}
                </div>
                <p
                  className={`text-xs mt-1 ${
                    message.type === "user" ? "text-blue-100" : "text-gray-500"
                  }`}
                >
                  {formatTime(message.timestamp)}
                </p>
              </div>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="flex items-start gap-3 max-w-[80%]">
              {/* AI Profile Picture */}
              <Image
                src="/casewise_Icon.svg"
                alt="AI"
                width={32}
                height={32}
                className="w-8 h-8 rounded-full object-cover"
              />
              {/* Loading Message */}
              <div className="bg-gray-100 rounded-lg p-3">
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                  <span className="text-sm text-gray-600">
                    AI is thinking...
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Scroll to Top Button */}
      {showScrollToTop && (
        <div className="absolute bottom-20 right-4 z-10">
          <button
            onClick={scrollToTop}
            className="bg-blue-500 hover:bg-blue-600 text-white rounded-full p-3 shadow-lg transition-all duration-200 hover:scale-105"
            title="Scroll to top"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 10l7-7m0 0l7 7m-7-7v18"
              />
            </svg>
          </button>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Chat Input */}
      <div className="border-t border-gray-200 p-4">
        <div className="flex space-x-2">
          <Input
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask me anything about this case..."
            disabled={isLoading}
            className="flex-1"
          />
          <Button
            onClick={handleSendMessage}
            disabled={!inputMessage.trim() || isLoading}
            className="px-6"
          >
            Send
          </Button>
        </div>
      </div>
    </div>
  );
}

// Mock AI response function - replace with actual API call
async function mockAIChatResponse(
  message: string,
  documentId?: string
): Promise<string> {
  // Simulate API delay
  await new Promise((resolve) =>
    setTimeout(resolve, 1000 + Math.random() * 2000)
  );

  const responses = [
    "Based on the case information, this is a complex medical scenario that requires careful analysis. The key factors to consider include the patient's symptoms, medical history, and current presentation.",
    "That's an excellent question! Let me break down the pathophysiology involved in this case. The underlying mechanism involves several interconnected systems.",
    "The differential diagnosis for this presentation includes several possibilities. Here are the most likely conditions to consider:",
    "The treatment approach should be evidence-based and tailored to the specific patient. Key considerations include the severity of symptoms and any contraindications.",
    "This case highlights important clinical concepts that are commonly tested in medical examinations. The learning objectives include understanding the diagnostic process and treatment protocols.",
  ];

  return responses[Math.floor(Math.random() * responses.length)];
}
