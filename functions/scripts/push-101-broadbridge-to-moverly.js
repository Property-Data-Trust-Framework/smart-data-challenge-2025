#!/usr/bin/env node

const fs = require("fs").promises;
const path = require("path");
const axios = require("axios");

// Load environment variables from .env file
require("dotenv").config({
  path: path.join(__dirname, "../.env"),
  quiet: true,
});

// Moverly NPTN API configuration
const MOVERLY_BASE_URL =
  "https://www.api-staging.moverly.com/nptnService/transactions";
const TRANSACTION_ID = "8HjwFCAy3EY4UmtpfEyAVo";

/**
 * Get the Moverly API key from environment
 * @return {string} The API key
 */
function getApiKey() {
  const apiKey = process.env.MOVERLY_NPTN_API_KEY;
  if (!apiKey) {
    throw new Error("MOVERLY_NPTN_API_KEY environment variable not set");
  }
  return apiKey;
}

/**
 * Push a single claim to Moverly API
 * @param {Object} claim - The claim object
 * @return {Promise<Object>} The API response
 */
async function pushClaimToMoverly(claim) {
  const apiKey = getApiKey();

  // Send as direct array (not wrapped in verified_claims object)
  const claimData = [claim];

  try {
    const response = await axios.post(
      `${MOVERLY_BASE_URL}/${TRANSACTION_ID}/claims`,
      claimData,
      {
        headers: {
          "Moverly-Api-Key": apiKey,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      },
    );

    return response.data;
  } catch (error) {
    if (error.response) {
      console.error(`❌ Moverly API error for claim: ${error.response.status}`);
      console.error(
        "Response data:",
        JSON.stringify(error.response.data, null, 2),
      );
      throw new Error(
        `Moverly API error: ${error.response.status} - ${JSON.stringify(
          error.response.data,
        )}`,
      );
    }
    console.error("❌ Network error pushing claim:", error.message);
    throw error;
  }
}

/**
 * Push 101 Broadbridge claims to Moverly
 */
async function push101BroadbridgeToMoverly() {
  console.log("🏠 Pushing 101 Broadbridge claims to Moverly API");
  console.log(`📋 Transaction ID: ${TRANSACTION_ID}`);
  console.log("");

  try {
    // Load claims data
    const claimsFilePath = path.join(
      __dirname,
      "../data/moverly-properties",
      "101 Broadbridge.json",
    );
    const claimsData = await fs.readFile(claimsFilePath, "utf8");
    const claims = JSON.parse(claimsData);

    console.log(`📊 Found ${claims.length} claims to push`);
    console.log("");

    let successCount = 0;
    let errorCount = 0;

    // Push each claim
    for (let i = 0; i < claims.length; i++) {
      const claim = claims[i];
      const claimType = Object.keys(claim.claims)[0];
      const claimNum = i + 1;

      try {
        console.log(`📤 Pushing claim ${claimNum}/${claims.length}: ${claimType}`);
        await pushClaimToMoverly(claim);
        console.log(`✅ Claim ${claimNum} pushed successfully`);
        successCount++;
      } catch (error) {
        console.log(`❌ Failed to push claim ${claimNum}: ${error.message}`);
        errorCount++;
      }

      // Add delay between claims
      if (i < claims.length - 1) {
        console.log("   ⏱️  Waiting 1 second...");
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      console.log("");
    }

    console.log("📋 FINAL RESULTS:");
    console.log("==================");
    console.log(`✅ Successfully pushed: ${successCount} claims`);
    console.log(`❌ Failed to push: ${errorCount} claims`);
    console.log(`📊 Total processed: ${claims.length} claims`);

    if (successCount > 0) {
      console.log("");
      console.log(
        `🔗 View transaction at: ${MOVERLY_BASE_URL}/${TRANSACTION_ID}`,
      );
    }
  } catch (error) {
    console.error("❌ Fatal error during claims push:", error.message);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  push101BroadbridgeToMoverly()
    .then(() => {
      console.log("");
      console.log("🎉 Claims push completed!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("");
      console.error("💥 Claims push failed:", error.message);
      process.exit(1);
    });
}

module.exports = { push101BroadbridgeToMoverly };
