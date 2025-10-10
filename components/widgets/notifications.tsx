"use client";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { apiService } from "@/lib/api";

interface Notification {
  id: string;
  title: string;
  message: string;
  created_at: string;
  type: string;
  is_read: boolean;
  metadata?: any;
}

interface NotificationsProps {
  onBack: () => void;
}

export function Notifications({ onBack }: NotificationsProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load notifications on component mount
  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await apiService.getNotifications(50, false);
      setNotifications(data);
    } catch (err: any) {
      console.error("Failed to load notifications:", err);
      setError(err.message || "Failed to load notifications");
    } finally {
      setIsLoading(false);
    }
  };

  const [filter, setFilter] = useState<"all" | "unread" | "read">("all");

  const formatTimeAgo = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const now = new Date();

      // Check if date is valid
      if (isNaN(date.getTime())) {
        return "Invalid date";
      }

      const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

      // Handle future dates (negative values)
      if (diffInSeconds < 0) {
        return "Just now";
      }

      if (diffInSeconds < 60) return `${diffInSeconds} seconds ago`;
      if (diffInSeconds < 3600)
        return `${Math.floor(diffInSeconds / 60)} minutes ago`;
      if (diffInSeconds < 86400)
        return `${Math.floor(diffInSeconds / 3600)} hours ago`;
      if (diffInSeconds < 2592000)
        return `${Math.floor(diffInSeconds / 86400)} days ago`;

      // For dates older than 30 days, show the actual date
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (error) {
      console.error("Error formatting date:", error);
      return "Invalid date";
    }
  };

  const getNotificationType = (type: string) => {
    switch (type) {
      case "file_upload":
        return "success";
      case "profile_update":
        return "info";
      case "system":
        return "warning";
      case "error":
        return "error";
      default:
        return "info";
    }
  };

  const getNotificationIcon = (type: string) => {
    const notificationType = getNotificationType(type);
    switch (notificationType) {
      case "success":
        return (
          <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
            <svg
              className="w-4 h-4 text-green-600"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        );
      case "warning":
        return (
          <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
            <svg
              className="w-4 h-4 text-yellow-600"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.725-1.36 3.49 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        );
      case "error":
        return (
          <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
            <svg
              className="w-4 h-4 text-red-600"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        );
      default:
        return (
          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
            <svg
              className="w-4 h-4 text-blue-600"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        );
    }
  };

  const filteredNotifications = notifications.filter((notification) => {
    if (filter === "unread") return !notification.is_read;
    if (filter === "read") return notification.is_read;
    return true;
  });

  const markAsRead = async (id: string) => {
    try {
      await apiService.markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((notification) =>
          notification.id === id
            ? { ...notification, is_read: true }
            : notification
        )
      );
    } catch (err: any) {
      console.error("Failed to mark notification as read:", err);
    }
  };

  const markAllAsRead = async () => {
    try {
      await apiService.markAllNotificationsRead();
      setNotifications((prev) =>
        prev.map((notification) => ({ ...notification, is_read: true }))
      );
    } catch (err: any) {
      console.error("Failed to mark all notifications as read:", err);
    }
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="flex-1 p-8">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-gray-900">
            Notifications
          </h1>
          {unreadCount > 0 && (
            <Button
              onClick={markAllAsRead}
              variant="outline"
              className="text-sm"
            >
              Mark all as read
            </Button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="mb-6">
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg w-fit">
          <button
            onClick={() => setFilter("all")}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              filter === "all"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            All ({notifications.length})
          </button>
          <button
            onClick={() => setFilter("unread")}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              filter === "unread"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Unread ({unreadCount})
          </button>
          <button
            onClick={() => setFilter("read")}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              filter === "read"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Read ({notifications.length - unreadCount})
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800">{error}</p>
          <button
            onClick={loadNotifications}
            className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
          >
            Try again
          </button>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading notifications...</p>
        </div>
      )}

      {/* Notifications List */}
      {!isLoading && (
        <div className="space-y-4">
          {filteredNotifications.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 17h5l-5 5-5-5h5v-5a7.5 7.5 0 00-15 0v5h5l-5 5-5-5h5v-5a7.5 7.5 0 0115 0v5z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No notifications
              </h3>
              <p className="text-gray-500">
                {filter === "unread"
                  ? "You're all caught up! No unread notifications."
                  : filter === "read"
                  ? "No read notifications to show."
                  : "No notifications yet."}
              </p>
            </div>
          ) : (
            filteredNotifications.map((notification) => (
              <div
                key={notification.id}
                className={`bg-white border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow ${
                  !notification.is_read ? "border-l-4 border-l-blue-500" : ""
                }`}
              >
                <div className="flex items-start space-x-3">
                  {getNotificationIcon(notification.type)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3
                        className={`text-sm font-medium ${
                          !notification.is_read
                            ? "text-gray-900"
                            : "text-gray-700"
                        }`}
                      >
                        {notification.title}
                      </h3>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-gray-500">
                          {formatTimeAgo(notification.created_at)}
                        </span>
                        {!notification.is_read && (
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        )}
                      </div>
                    </div>
                    <p className="mt-1 text-sm text-gray-600">
                      {notification.message}
                    </p>
                    {notification.metadata && (
                      <div className="mt-2 text-xs text-gray-500">
                        {notification.metadata.filename && (
                          <span>File: {notification.metadata.filename}</span>
                        )}
                        {notification.metadata.updated_fields && (
                          <span>
                            Updated:{" "}
                            {notification.metadata.updated_fields.join(", ")}
                          </span>
                        )}
                      </div>
                    )}
                    {!notification.is_read && (
                      <button
                        onClick={() => markAsRead(notification.id)}
                        className="mt-2 text-xs text-blue-600 hover:text-blue-800"
                      >
                        Mark as read
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
