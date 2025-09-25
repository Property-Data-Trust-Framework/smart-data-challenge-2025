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
const TRANSACTION_ID = "6bQY64R5mjzRDzkiVhDWf1";
const PROPERTY_ID = "91-south-hill-avenue-142222";

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

  // Update the claim with the correct transaction ID and send as array
  const updatedClaim = {
    ...claim,
    transactionId: TRANSACTION_ID,
  };

  // Send as direct array (not wrapped in verified_claims object)
  const claimData = [updatedClaim];

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
 * Push all claims for the property to Moverly
 */
async function pushPropertyClaimsToMoverly() {
  console.log(`🏠 Pushing claims for ${PROPERTY_ID} to Moverly API`);
  console.log(`📋 Transaction ID: ${TRANSACTION_ID}`);
  console.log("");

  try {
    // Load claims data
    const claimsFilePath = path.join(
      __dirname,
      "../data/moverly-properties",
      "91 South Hill Avenue.json",
    );
    const claimsData = await fs.readFile(claimsFilePath, "utf8");
    const claims = JSON.parse(claimsData);

    console.log(`📊 Found ${claims.length} claims to push`);
    console.log("");

    let successCount = 0;
    let errorCount = 0;

    // Push claims in batches to avoid overwhelming the API
    const BATCH_SIZE = 5;
    for (let i = 0; i < claims.length; i += BATCH_SIZE) {
      const batch = claims.slice(i, i + BATCH_SIZE);
      const batchNum = Math.floor(i / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(claims.length / BATCH_SIZE);

      console.log(
        `📦 Processing batch ${batchNum}/${totalBatches} (${batch.length} claims)`,
      );

      // Process batch concurrently
      const batchPromises = batch.map(async (claim, index) => {
        const claimIdentifier = `batch-${batchNum}-claim-${index + 1}`;
        try {
          await pushClaimToMoverly(claim);
          console.log(`✅ Claim ${claimIdentifier} pushed successfully`);
          return { success: true, claimId: claimIdentifier };
        } catch (error) {
          console.log(
            `❌ Failed to push claim ${claimIdentifier}: ${error.message}`,
          );
          return {
            success: false,
            claimId: claimIdentifier,
            error: error.message,
          };
        }
      });

      const batchResults = await Promise.all(batchPromises);

      // Count results
      batchResults.forEach((result) => {
        if (result.success) {
          successCount++;
        } else {
          errorCount++;
        }
      });

      console.log(
        `   Batch ${batchNum} completed: ${
          batchResults.filter((r) => r.success).length
        } success, ${batchResults.filter((r) => !r.success).length} errors`,
      );

      // Add delay between batches to be respectful to the API
      if (i + BATCH_SIZE < claims.length) {
        console.log("   ⏱️  Waiting 2 seconds before next batch...");
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }

      console.log("");
    }

    console.log("📋 FINAL RESULTS:");
    console.log("==================");
    console.log(`✅ Successfully pushed: ${successCount} claims`);
    console.log(`❌ Failed to push: ${errorCount} claims`);
    console.log(`📊 Total processed: ${claims.length} claims`);
    console.log(
      `🎯 Success rate: ${((successCount / claims.length) * 100).toFixed(1)}%`,
    );

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
  pushPropertyClaimsToMoverly()
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

module.exports = { pushPropertyClaimsToMoverly, pushClaimToMoverly };
