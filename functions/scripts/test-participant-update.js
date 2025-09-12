const axios = require("axios");

// Test script to debug participant status update API calls
async function testParticipantUpdate() {
  const transactionId = "78HJ1ggqJBuMjED6bvhdx7";
  const participantIndex = 0;
  const status = "Removed";

  // Test different payload structures to see which one works

  console.log("=== Testing Participant Status Update ===");
  console.log(`Transaction ID: ${transactionId}`);
  console.log(`Participant Index: ${participantIndex}`);
  console.log(`Status: ${status}`);
  console.log("");

  // Structure 1: verified_claims array with claim object
  const payload1 = [
    {
      claims: {
        [`/participants/${participantIndex}/participantStatus`]: status,
      },
      verification: {
        trust_framework: "uk_pdtf",
        time: new Date().toISOString(),
        evidence: [
          {
            type: "vouch",
            verification_method: {
              type: "auth",
            },
            attestation: {
              type: "digital_attestation",
              voucher: {
                name: "Diane Hardy",
              },
            },
          },
        ],
      },
    },
  ];

  console.log(
    "=== Testing Structure 1: verified_claims array with claim object ===",
  );
  console.log(JSON.stringify(payload1, null, 2));
  await testPayload(transactionId, payload1, "Structure 1");
}

async function testPayload(transactionId, payload, structureName) {
  const MOVERLY_NPTN_BASE_URL =
    "https://www.api-staging.moverly.com/nptnService/transactions";
  const apiKey = process.env.MOVERLY_NPTN_API_KEY;

  if (!apiKey) {
    console.error("MOVERLY_NPTN_API_KEY not found in environment variables");
    return;
  }

  try {
    console.log(`\n--- Testing ${structureName} ---`);
    console.log("URL:", `${MOVERLY_NPTN_BASE_URL}/${transactionId}/claims`);
    console.log("Headers:", {
      "Moverly-Api-Key": apiKey.substring(0, 20) + "...",
      "Content-Type": "application/json",
      Accept: "application/json",
    });
    console.log("Payload being sent:", JSON.stringify(payload, null, 2));

    const response = await axios.post(
      `${MOVERLY_NPTN_BASE_URL}/${transactionId}/claims`,
      payload,
      {
        headers: {
          "Moverly-Api-Key": apiKey,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      },
    );

    console.log(`✅ ${structureName} SUCCESS!`);
    console.log("Response:", JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.log(`❌ ${structureName} FAILED`);
    if (error.response) {
      console.log("Status:", error.response.status);
      console.log("Error:", JSON.stringify(error.response.data, null, 2));
    } else {
      console.log("Error:", error.message);
    }
  }
}

// Load environment variables
require("dotenv").config({ path: ".env" });

// Run the test
testParticipantUpdate().catch(console.error);
