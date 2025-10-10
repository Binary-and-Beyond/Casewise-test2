"use client";
import { useState, useEffect } from "react";
import { apiService } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import Image from "next/image";

interface Chat {
  id: string;
  name: string;
  uploadedFile?: File | null;
  messageCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

interface SidebarProps {
  currentView:
    | "main"
    | "admin-analytics"
    | "generate-cases"
    | "case-selection"
    | "generate-mcqs"
    | "explore-cases"
    | "identify-concepts"
    | "profile-settings"
    | "notifications"
    | "chatbot-flow";
  setCurrentView: (
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
  ) => void;
  chats: Chat[];
  activeChat: string;
  handleChatSelect: (chatId: string) => void;
  onCreateNewChat: () => void;
  onDeleteChat: (chatId: string) => void;
  onLogout: () => void;
}

function NotificationBadge() {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const fetchUnreadCount = async () => {
      try {
        const response = await apiService.getUnreadCount();
        setUnreadCount(response.unread_count);
      } catch (error) {
        console.error("Failed to fetch unread count:", error);
      }
    };

    fetchUnreadCount();

    // Refresh every 30 seconds
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  if (unreadCount === 0) return null;

  return <div className="w-2 h-2 bg-red-500 rounded-full"></div>;
}

export function Sidebar({
  currentView,
  setCurrentView,
  chats,
  activeChat,
  handleChatSelect,
  onCreateNewChat,
  onDeleteChat,
  onLogout,
}: SidebarProps) {
  const { user } = useAuth();
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);

  return (
    <div className="w-64 bg-white border-r border-gray-200 flex flex-col fixed left-0 top-0 z-10 h-screen">
      {/* Header Section */}
      <div className="p-6 flex-shrink-0 border-b border-gray-100">
        <div className="flex items-center mb-4">
          <Image
            src="/casewise_Icon.svg"
            alt="CaseWise"
            width={24}
            height={24}
            className="mr-2"
          />
          <span className="text-lg font-medium text-gray-700">CaseWise</span>
        </div>

        <button
          onClick={() => setCurrentView("admin-analytics")}
          className="text-sm font-medium text-gray-700 hover:text-blue-600 cursor-pointer"
        >
          Admin Analytics
        </button>
      </div>

      {/* Chat List Section */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="p-4 flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">
            Recent Chats
          </span>
          <div className="flex gap-1">
            <button
              onClick={onCreateNewChat}
              className="text-gray-400 hover:text-blue-600 text-sm px-2 py-1 rounded hover:bg-blue-50"
              title="New Chat"
            >
              + New
            </button>
            <button
              onClick={() => setSidebarExpanded(!sidebarExpanded)}
              className="text-gray-400 hover:text-gray-600"
            >
              {sidebarExpanded ? "−" : "+"}
            </button>
          </div>
        </div>

        {sidebarExpanded && (
          <div className="flex-1 overflow-y-auto px-4 pb-4 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
            {chats.length === 0 ? (
              <div className="text-center py-4 text-gray-500 text-sm">
                <div className="mb-2">👋</div>
                <div>No chats yet.</div>
                <div>Click "+ New" to get started!</div>
              </div>
            ) : (
              chats.map((chat) => (
                <div
                  key={chat.id}
                  className={`group flex items-center p-2 rounded-lg cursor-pointer mb-1 ${
                    activeChat === chat.id
                      ? "bg-blue-500 text-white"
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  <div
                    onClick={() => handleChatSelect(chat.id)}
                    className="flex items-center flex-1 min-w-0"
                  >
                    <div className="w-6 h-6 rounded bg-gray-300 mr-3 flex items-center justify-center flex-shrink-0">
                      <svg
                        className="w-3 h-3"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zm-8 0h2v2H9V9z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0 overflow-hidden">
                      <div className="text-sm truncate" title={chat.name}>
                        {chat.name}
                      </div>
                      {chat.messageCount && chat.messageCount > 0 && (
                        <div className="text-xs opacity-75 truncate">
                          {chat.messageCount} messages
                        </div>
                      )}
                    </div>
                    {chat.uploadedFile && (
                      <div className="ml-2 w-2 h-2 bg-green-500 rounded-full flex-shrink-0"></div>
                    )}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteChat(chat.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 ml-1 p-1 hover:bg-red-100 rounded text-red-500 hover:text-red-700 flex-shrink-0"
                    title="Delete chat"
                  >
                    <svg
                      className="w-3 h-3"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Profile Section */}
      <div className="p-4 border-t border-gray-200 flex-shrink-0">
        <div className="relative">
          <button
            onClick={() => setShowProfileDropdown(!showProfileDropdown)}
            className="flex items-center w-full p-2 rounded-lg hover:bg-gray-100"
          >
            <div className="w-8 h-8 bg-gray-300 rounded-full mr-3 overflow-hidden">
              {user?.profile_image_url ? (
                <Image
                  src={user.profile_image_url}
                  alt="Profile"
                  width={32}
                  height={32}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gray-300 rounded-full flex items-center justify-center">
                  <svg
                    className="w-4 h-4 text-gray-500"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
              )}
            </div>
            <div className="flex-1 text-left min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {user?.username ||
                  (user?.first_name && user?.last_name
                    ? `${user.first_name} ${user.last_name}`
                    : user?.full_name || "User")}
              </p>
              <p className="text-xs text-gray-500 truncate">
                {user?.email || "user@example.com"}
              </p>
            </div>
            <svg
              className="w-4 h-4 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>

          {showProfileDropdown && (
            <div className="absolute bottom-full left-0 right-0 mb-2 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
              <div className="p-2">
                <button
                  onClick={() => setCurrentView("profile-settings")}
                  className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded"
                >
                  Profile Settings
                </button>
                <button
                  onClick={() => setCurrentView("notifications")}
                  className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded flex items-center justify-between"
                >
                  Notifications
                  <NotificationBadge />
                </button>
                <hr className="my-1" />
                <button
                  onClick={onLogout}
                  className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded"
                >
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
