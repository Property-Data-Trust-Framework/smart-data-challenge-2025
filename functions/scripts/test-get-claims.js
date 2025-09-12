const axios = require("axios");

// Test script to GET existing claims and understand the format
async function testGetClaims() {
  const transactionId = "78HJ1ggqJBuMjED6bvhdx7";

  console.log("=== Getting existing claims ===");
  console.log(`Transaction ID: ${transactionId}`);
  
  const MOVERLY_BASE_URL = "https://www.api-staging.moverly.com/pdtfService/transactions";
  const apiKey = process.env.MOVERLY_NPTN_API_KEY || process.env.MOVERLY_API_KEY;
  
  if (!apiKey) {
    console.error("No API key found in environment variables");
    return;
  }

  try {
    console.log("--- Getting Claims ---");
    const response = await axios.get(`${MOVERLY_BASE_URL}/${transactionId}/claims`, {
      headers: {
        "Moverly-Api-Key": apiKey,
        "Accept": "application/json",
      },
    });
    
    console.log("✅ GET Claims SUCCESS!");
    console.log("Response:", JSON.stringify(response.data, null, 2));
    
    // Look for participants in the claims
    const participantClaims = response.data.filter(claim => 
      claim.claims && Object.keys(claim.claims).some(path => path.includes("participants"))
    );
    
    console.log("\n=== Participant-related claims ===");
    console.log(JSON.stringify(participantClaims, null, 2));
    
  } catch (error) {
    console.log("❌ GET Claims FAILED");
    if (error.response) {
      console.log("Status:", error.response.status);
      console.log("Error:", JSON.stringify(error.response.data, null, 2));
    } else {
      console.log("Error:", error.message);
    }
  }

  // Also try to get the current state
  try {
    console.log("\n--- Getting State ---");
    const stateResponse = await axios.get(`${MOVERLY_BASE_URL}/${transactionId}/state`, {
      headers: {
        "Moverly-Api-Key": apiKey,
        "Accept": "application/json",
      },
    });
    
    console.log("✅ GET State SUCCESS!");
    console.log("Participants from state:", JSON.stringify(stateResponse.data.participants, null, 2));
    
  } catch (error) {
    console.log("❌ GET State FAILED");
    if (error.response) {
      console.log("Status:", error.response.status);
      console.log("Error:", JSON.stringify(error.response.data, null, 2));
    } else {
      console.log("Error:", error.message);
    }
  }
}

// Load environment variables
require('dotenv').config({ path: '.env' });

// Run the test
testGetClaims().catch(console.error);