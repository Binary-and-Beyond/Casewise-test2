// Configuration file for environment variables
const getGoogleClientId = () => {
  // Try multiple ways to get the client ID
  if (typeof window !== "undefined") {
    // Client-side: try to get from window object or process.env
    return (
      (window as any).NEXT_PUBLIC_GOOGLE_CLIENT_ID ||
      process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
    );
  } else {
    // Server-side: use process.env
    return process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  }
};

export const config = {
  get googleClientId() {
    return getGoogleClientId();
  },
  get API_BASE_URL() {
    // Use environment variable for production, fallback to localhost for development
    const url = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";
    console.log("🔧 Config: API_BASE_URL set to:", url);
    return url;
  },
  get FALLBACK_API_BASE_URL() {
    // Use environment variable for production, fallback to localhost for development
    return process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";
  },
};

// Debug function to check environment variables
export const debugEnv = () => {
  console.log("🔍 Config Google Client ID:", config.googleClientId);
  console.log("🔍 Config API Base URL:", config.API_BASE_URL);
  console.log(
    "🔍 Process env Google Client ID:",
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
  );
  console.log(
    "🔍 Process env API Base URL:",
    process.env.NEXT_PUBLIC_API_BASE_URL
  );
  console.log(
    "🔍 All NEXT_PUBLIC env vars:",
    Object.keys(process.env).filter((key) => key.startsWith("NEXT_PUBLIC_"))
  );
  console.log(
    "🔍 Window object check:",
    typeof window !== "undefined" ? "Client-side" : "Server-side"
  );
};
