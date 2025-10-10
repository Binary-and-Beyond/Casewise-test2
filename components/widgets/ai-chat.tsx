"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiService, ChatMessage } from "@/lib/api";
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
  const [localMessages, setLocalMessages] = useState<LocalChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [showScrollToTop, setShowScrollToTop] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    scrollToBottom();
  }, [localMessages, propMessages]);

  // Initialize messages only once when component mounts
  useEffect(() => {
    if (localMessages.length === 0) {
      const welcomeMessage: LocalChatMessage = {
        id: "welcome",
        type: "ai",
        message: `Hello! I'm your AI assistant for ${
          caseTitle || "this case"
        }. I can help you explore the case, answer questions, and provide insights. What would you like to know?`,
        timestamp: new Date(),
      };

      const initialMessages = [welcomeMessage];

      // Add existing messages from props if they exist
      if (propMessages && propMessages.length > 0) {
        propMessages.forEach((msg) => {
          initialMessages.push({
            id: msg.id,
            type: "ai",
            message: msg.response,
            timestamp: new Date(msg.timestamp),
          });
        });
      }

      setLocalMessages(initialMessages);
    }
  }, [caseTitle]); // Only depend on caseTitle, not propMessages

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
      message: inputMessage.trim(),
      timestamp: new Date(),
    };

    setLocalMessages((prev) => [...prev, userMessage]);
    setInputMessage("");
    setIsLoading(true);
    setError("");

    try {
      console.log("Sending message to chat:", {
        chatId,
        message: inputMessage.trim(),
        documentId,
      });
      // Use the new chat session API
      const apiResponse = await apiService.sendChatMessageToSession(
        chatId,
        inputMessage.trim(),
        documentId
      );
      console.log("API response:", apiResponse);

      const aiMessage: LocalChatMessage = {
        id: apiResponse.id,
        type: "ai",
        message: apiResponse.response,
        timestamp: new Date(apiResponse.timestamp),
      };

      setLocalMessages((prev) => {
        // Check if message already exists to prevent duplicates
        const messageExists = prev.some((msg) => msg.id === apiResponse.id);
        if (messageExists) {
          return prev;
        }
        return [...prev, aiMessage];
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

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

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
              <Image
                src={
                  message.type === "user"
                    ? "/placeholder-user.jpg"
                    : "/casewise_Icon.svg"
                }
                alt={message.type === "user" ? "User" : "AI"}
                width={32}
                height={32}
                className="w-8 h-8 rounded-full object-cover"
              />
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
