// Test script to verify frontend-backend integration
// Run this in browser console on https://casewise-beta.vercel.app

async function testBackendConnection() {
  const backendUrl = "https://casewise-backend.onrender.com";

  console.log("🧪 Testing backend connection...");

  try {
    // Test health endpoint
    const healthResponse = await fetch(`${backendUrl}/health`);
    const healthData = await healthResponse.json();
    console.log("✅ Health check:", healthData);

    // Test root endpoint
    const rootResponse = await fetch(`${backendUrl}/`);
    const rootData = await rootResponse.json();
    console.log("✅ Root endpoint:", rootData);

    console.log("🎉 Backend connection successful!");
    return true;
  } catch (error) {
    console.error("❌ Backend connection failed:", error);
    return false;
  }
}

async function testCORS() {
  const backendUrl = "https://casewise-backend.onrender.com";

  console.log("🧪 Testing CORS...");

  try {
    const response = await fetch(`${backendUrl}/health`, {
      method: "GET",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (response.ok) {
      console.log("✅ CORS is working correctly");
      return true;
    } else {
      console.error(
        "❌ CORS test failed:",
        response.status,
        response.statusText
      );
      return false;
    }
  } catch (error) {
    console.error("❌ CORS test failed:", error);
    return false;
  }
}

// Run tests
async function runIntegrationTests() {
  console.log("🚀 Starting integration tests...");

  const backendTest = await testBackendConnection();
  const corsTest = await testCORS();

  if (backendTest && corsTest) {
    console.log("🎉 All integration tests passed!");
  } else {
    console.log("⚠️ Some tests failed. Check the logs above.");
  }
}

// Export for manual testing
window.testIntegration = runIntegrationTests;
console.log("💡 Run testIntegration() to test the connection");
