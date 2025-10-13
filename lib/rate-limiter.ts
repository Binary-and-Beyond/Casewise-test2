// Frontend rate limiting utility

export class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  private maxRequests: number;
  private timeWindow: number;

  constructor(maxRequests: number = 10, timeWindow: number = 1000) {
    this.maxRequests = maxRequests;
    this.timeWindow = timeWindow;
  }

  isAllowed(key: string): boolean {
    const now = Date.now();
    const requests = this.requests.get(key) || [];

    // Remove old requests outside the time window
    const validRequests = requests.filter(
      (time) => now - time < this.timeWindow
    );

    // Check if under the limit
    if (validRequests.length < this.maxRequests) {
      validRequests.push(now);
      this.requests.set(key, validRequests);
      return true;
    }

    return false;
  }

  getTimeUntilReset(key: string): number {
    const requests = this.requests.get(key) || [];
    if (requests.length === 0) return 0;

    const oldestRequest = Math.min(...requests);
    return Math.max(0, this.timeWindow - (Date.now() - oldestRequest));
  }
}

// Global rate limiter instance
export const rateLimiter = new RateLimiter(10, 1000); // 10 requests per second

// Utility function to handle rate limiting in API calls
export const handleRateLimit = async (
  apiCall: () => Promise<any>,
  retryDelay: number = 1000
): Promise<any> => {
  try {
    return await apiCall();
  } catch (error: any) {
    if (error.status === 429) {
      // Rate limit exceeded, wait and retry
      await new Promise((resolve) => setTimeout(resolve, retryDelay));
      return await apiCall();
    }
    throw error;
  }
};

// Utility function to show rate limit message to user
export const showRateLimitMessage = (timeUntilReset: number): string => {
  const seconds = Math.ceil(timeUntilReset / 1000);
  return `Rate limit exceeded. Please wait ${seconds} seconds before trying again.`;
};
