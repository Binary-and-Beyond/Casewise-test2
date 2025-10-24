// Test script to verify CORS fix
// Run this in your browser console on the deployed frontend

async function testCorsFix() {
  console.log("🧪 Testing CORS fix...");

  try {
    // Test the login endpoint specifically
    console.log("🌐 Testing login endpoint with CORS...");

    const response = await fetch(
      "https://casewise-backend.onrender.com/login",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Origin: "https://casewise-beta.vercel.app",
        },
        mode: "cors",
        credentials: "include",
        body: JSON.stringify({
          email: "test@example.com",
          password: "testpassword",
        }),
      }
    );

    console.log("✅ Response Status:", response.status);
    console.log("✅ Response OK:", response.ok);
    console.log(
      "✅ Response Headers:",
      Object.fromEntries(response.headers.entries())
    );

    if (response.ok) {
      const data = await response.json();
      console.log("✅ Response Data:", data);
    } else {
      const errorText = await response.text();
      console.log("❌ Error Response:", errorText);
    }
  } catch (error) {
    console.log("❌ CORS Error:", error.message);

    if (error.message.includes("CORS")) {
      console.log(
        "🔧 CORS is still not working. The backend needs to be redeployed."
      );
    }
  }
}

// Run the test
testCorsFix();
