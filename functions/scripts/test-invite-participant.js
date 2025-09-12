const axios = require("axios");

// Test script to test inviting a new participant
async function testInviteParticipant() {
  const transactionId = "78HJ1ggqJBuMjED6bvhdx7";
  const testParticipant = {
    firstName: "John",
    lastName: "Smith",
    email: "john.smith@example.com",
    role: "Surveyor",
  };

  console.log("=== Testing Invite Participant ==>");
  console.log(`Transaction ID: ${transactionId}`);
  console.log(`Participant:`, testParticipant);
  console.log("");

  const MOVERLY_NPTN_BASE_URL = "https://www.api-staging.moverly.com/nptnService/transactions";
  const apiKey = process.env.MOVERLY_NPTN_API_KEY;

  if (!apiKey) {
    console.error("MOVERLY_NPTN_API_KEY not found in environment variables");
    return;
  }

  // Create a claim to add a new participant using the /participants/- path
  const claimData = [
    {
      claims: {
        "/participants/-": {
          name: {
            firstName: testParticipant.firstName,
            lastName: testParticipant.lastName,
          },
          email: testParticipant.email,
          role: testParticipant.role,
          participantStatus: "Invited",
        },
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

  try {
    console.log("--- Testing Direct API Call ---");
    console.log("URL:", `${MOVERLY_NPTN_BASE_URL}/${transactionId}/claims`);
    console.log("Headers:", {
      "Moverly-Api-Key": apiKey.substring(0, 20) + "...",
      "Content-Type": "application/json",
      Accept: "application/json",
    });
    console.log("Payload being sent:", JSON.stringify(claimData, null, 2));

    const response = await axios.post(
      `${MOVERLY_NPTN_BASE_URL}/${transactionId}/claims`,
      claimData,
      {
        headers: {
          "Moverly-Api-Key": apiKey,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      },
    );

    console.log("✅ Invite Participant SUCCESS!");
    console.log("Response:", JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.log("❌ Invite Participant FAILED");
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
testInviteParticipant().catch(console.error);
