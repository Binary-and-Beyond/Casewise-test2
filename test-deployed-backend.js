// Test script to verify deployed backend connection
// Run this in your browser console on the deployed frontend

async function testDeployedBackend() {
  console.log("🧪 Testing deployed backend connection...");

  try {
    // Test primary API (deployed backend)
    console.log(
      "🌐 Testing primary API: https://casewise-backend.onrender.com"
    );
    const primaryResponse = await fetch(
      "https://casewise-backend.onrender.com/",
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        mode: "cors",
        credentials: "include",
      }
    );

    console.log("✅ Primary API Status:", primaryResponse.status);
    console.log("✅ Primary API OK:", primaryResponse.ok);

    if (primaryResponse.ok) {
      const data = await primaryResponse.json();
      console.log("✅ Primary API Response:", data);
    }
  } catch (error) {
    console.log("❌ Primary API Error:", error.message);
  }

  try {
    // Test fallback API (localhost)
    console.log("🌐 Testing fallback API: http://localhost:8000");
    const fallbackResponse = await fetch("http://localhost:8000/", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      mode: "cors",
      credentials: "include",
    });

    console.log("✅ Fallback API Status:", fallbackResponse.status);
    console.log("✅ Fallback API OK:", fallbackResponse.ok);

    if (fallbackResponse.ok) {
      const data = await fallbackResponse.json();
      console.log("✅ Fallback API Response:", data);
    }
  } catch (error) {
    console.log("❌ Fallback API Error:", error.message);
  }
}

// Run the test
testDeployedBackend();
