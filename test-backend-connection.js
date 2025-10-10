// Simple script to test backend connection
// Run with: node test-backend-connection.js

const API_BASE_URL = "http://localhost:8000";

async function testBackendConnection() {
  console.log("🔍 Testing backend connection...");
  console.log(`📍 Backend URL: ${API_BASE_URL}`);

  try {
    // Test basic connection
    const response = await fetch(`${API_BASE_URL}/`);

    if (response.ok) {
      const data = await response.json();
      console.log("✅ Backend connection successful!");
      console.log("📋 Available endpoints:", data.endpoints);
    } else {
      console.log(`❌ Backend responded with status: ${response.status}`);
    }
  } catch (error) {
    if (error.message.includes("fetch")) {
      console.log("❌ CORS Error: Cannot connect to backend");
      console.log(
        "💡 Make sure your backend is running and CORS is configured"
      );
    } else {
      console.log("❌ Connection error:", error.message);
    }
  }
}

// Test CORS preflight
async function testCORSPreflight() {
  console.log("\n🔍 Testing CORS preflight...");

  try {
    const response = await fetch(`${API_BASE_URL}/signup`, {
      method: "OPTIONS",
      headers: {
        Origin: "http://localhost:3000",
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "Content-Type, Authorization",
      },
    });

    if (response.ok) {
      console.log("✅ CORS preflight successful!");
      console.log("📋 CORS headers:", {
        "Access-Control-Allow-Origin": response.headers.get(
          "Access-Control-Allow-Origin"
        ),
        "Access-Control-Allow-Methods": response.headers.get(
          "Access-Control-Allow-Methods"
        ),
        "Access-Control-Allow-Headers": response.headers.get(
          "Access-Control-Allow-Headers"
        ),
      });
    } else {
      console.log(`❌ CORS preflight failed with status: ${response.status}`);
    }
  } catch (error) {
    console.log("❌ CORS preflight error:", error.message);
  }
}

// Run tests
async function runTests() {
  await testBackendConnection();
  await testCORSPreflight();

  console.log("\n📝 Next steps:");
  console.log(
    "1. If you see CORS errors, update your backend CORS configuration"
  );
  console.log("2. Make sure your backend is running on http://localhost:8000");
  console.log(
    "3. Check the CORS-TROUBLESHOOTING.md file for detailed solutions"
  );
}

runTests();
