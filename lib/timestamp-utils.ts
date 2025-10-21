// Utility functions for consistent timestamp handling

export const createTimestamp = (): Date => {
  return new Date(Date.now());
};

export const formatTime = (date: Date): string => {
  // Ensure we're working with a valid date
  if (!date || isNaN(date.getTime())) {
    return "Invalid time";
  }

  // Use local timezone for display
  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const formatTimeAgo = (dateString: string): string => {
  try {
    // Ensure we have a valid date string
    if (!dateString) {
      console.warn("formatTimeAgo: Empty dateString");
      return "Just now";
    }

    const date = new Date(dateString);
    const now = new Date();

    // Debug logging for problematic timestamps
    if (dateString.includes("Just now") || dateString === "Just now") {
      console.warn("formatTimeAgo: Received 'Just now' as input:", dateString);
      return "Just now";
    }

    // Check if date is valid
    if (isNaN(date.getTime())) {
      console.warn(
        "formatTimeAgo: Invalid date:",
        dateString,
        "parsed as:",
        date
      );
      return "Just now";
    }

    // Calculate difference in seconds
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    // Debug logging for very recent dates
    if (diffInSeconds < 10) {
      console.log("formatTimeAgo: Very recent date:", {
        dateString,
        date: date.toISOString(),
        now: now.toISOString(),
        diffInSeconds,
      });
    }

    // Handle future dates or very recent dates (within 5 seconds)
    if (diffInSeconds < 0 || diffInSeconds < 5) {
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
    console.error("Error formatting date:", error, "input:", dateString);
    return "Just now";
  }
};

export const isValidTimestamp = (timestamp: any): boolean => {
  if (!timestamp) return false;
  const date = new Date(timestamp);
  return !isNaN(date.getTime());
};
