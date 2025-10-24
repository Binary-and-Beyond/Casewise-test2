// Test script to verify timeout fix
// Run this in your browser console on the deployed frontend

async function testTimeoutFix() {
  console.log("🧪 Testing timeout fix...");

  // Test with a real document ID if available
  const testData = {
    document_id: "test-document-id", // Replace with actual document ID
    num_concepts: 3,
  };

  try {
    console.log("🌐 Testing with enhanced timeout handling...");
    console.log("📊 Test data:", testData);

    const startTime = Date.now();

    // Test the API call with a longer timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      console.log("⏰ Client-side timeout triggered after 3 minutes");
      controller.abort();
    }, 180000); // 3 minutes

    const response = await fetch(
      "https://casewise-backend.onrender.com/ai/identify-concepts",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
        },
        mode: "cors",
        credentials: "include",
        body: JSON.stringify(testData),
        signal: controller.signal,
      }
    );

    clearTimeout(timeoutId);
    const endTime = Date.now();
    const duration = endTime - startTime;

    console.log("✅ Response Status:", response.status);
    console.log("✅ Response OK:", response.ok);
    console.log("⏰ Duration:", duration, "ms");
    console.log("⏰ Duration in seconds:", duration / 1000, "s");

    if (response.ok) {
      const data = await response.json();
      console.log("✅ Response Data:", data);
    } else {
      const errorText = await response.text();
      console.log("❌ Error Response:", errorText);
    }
  } catch (error) {
    console.log("❌ Request Error:", error.message);

    if (error.name === "AbortError") {
      console.log("⏰ This is a client-side timeout (3 minutes)");
    } else if (
      error.message.includes("timed out") ||
      error.message.includes("timeout")
    ) {
      console.log("⏰ This is a server-side timeout");
    } else if (error.message.includes("CORS")) {
      console.log("🌐 This is a CORS error");
    } else if (error.message.includes("fetch")) {
      console.log("🌐 This is a network error");
    }
  }
}

// Test the backend health first
async function testBackendHealth() {
  console.log("🏥 Testing backend health...");

  try {
    const response = await fetch("https://casewise-backend.onrender.com/", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      mode: "cors",
      credentials: "include",
    });

    console.log("✅ Backend Health Status:", response.status);
    console.log("✅ Backend Health OK:", response.ok);

    if (response.ok) {
      const data = await response.json();
      console.log("✅ Backend Health Data:", data);
    }
  } catch (error) {
    console.log("❌ Backend Health Error:", error.message);
  }
}

// Run both tests
async function runAllTests() {
  await testBackendHealth();
  console.log("---");
  await testTimeoutFix();
}

// Run the tests
runAllTests();
