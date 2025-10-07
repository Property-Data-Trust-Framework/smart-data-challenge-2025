#!/usr/bin/env node

const path = require("path");
const fs = require("fs").promises;
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const moverlyClient = require("./moverly-api-client");

/**
 * Sanitize filename by removing invalid characters
 * @param {string} filename - The filename to sanitize
 * @return {string} Sanitized filename
 */
function sanitizeFilename(filename) {
  return filename.replace(/[<>:"/\\|?*]/g, "").trim();
}

async function fetchAndSaveMoverlyClaims(transactionId, useMainApiKey = false, customFilename = null) {
  if (!transactionId) {
    throw new Error("transactionId is required");
  }

  const outputDir = path.join(__dirname, "../data/moverly-properties");

  console.log("Fetching Moverly claims data...");
  console.log(`Transaction ID: ${transactionId}`);

  try {
    // Create output directory
    await fs.mkdir(outputDir, { recursive: true });

    let state;
    let claims;
    let keyUsed = useMainApiKey ? "MOVERLY_API_KEY" : "MOVERLY_NPTN_API_KEY";

    console.log(`Trying API key: ${keyUsed}`);

    try {
      // First attempt with specified key
      [state, claims] = await Promise.all([
        moverlyClient.fetchMoverlyState(transactionId, useMainApiKey),
        moverlyClient.fetchMoverlyClaims(transactionId, useMainApiKey),
      ]);
    } catch (error) {
      if (error.message.includes("401") || error.message.includes("Unauthorized")) {
        // Try the other API key
        const fallbackKey = !useMainApiKey;
        keyUsed = fallbackKey ? "MOVERLY_API_KEY" : "MOVERLY_NPTN_API_KEY";
        console.log(`First key failed, trying fallback API key: ${keyUsed}`);

        [state, claims] = await Promise.all([
          moverlyClient.fetchMoverlyState(transactionId, fallbackKey),
          moverlyClient.fetchMoverlyClaims(transactionId, fallbackKey),
        ]);
      } else {
        throw error;
      }
    }

    console.log(`✓ Successfully fetched data using: ${keyUsed}`);

    // Extract the address line1 from the state
    const addressLine1 = state.propertyPack?.address?.line1;
    if (!addressLine1) {
      throw new Error("Could not find address line1 in the state data");
    }

    // Use custom filename if provided, otherwise create from address line1
    let filename;
    if (customFilename) {
      filename = customFilename.endsWith(".json") ? customFilename : `${customFilename}.json`;
    } else {
      const sanitizedAddress = sanitizeFilename(addressLine1);
      filename = `${sanitizedAddress}.json`;
    }
    const filePath = path.join(outputDir, filename);

    // Save only the claims data
    await fs.writeFile(filePath, JSON.stringify(claims, null, 2));
    console.log(`✓ Claims saved to ${filePath}`);
    console.log(`  - Address: ${addressLine1}`);
    console.log(`  - Total claims: ${claims.length}`);

    return { claims, filename, addressLine1 };
  } catch (error) {
    console.error("Error:", error.message);
    throw error;
  }
}

// Run if executed directly
if (require.main === module) {
  const transactionId = process.argv[2];
  const useMainApiKey = process.argv.includes("--main-key");
  const customFilenameIndex = process.argv.indexOf("--filename");
  const customFilename = customFilenameIndex !== -1 ? process.argv[customFilenameIndex + 1] : null;

  if (!transactionId) {
    console.error(
      "Usage: node fetch-moverly-claims.js <transactionId> [--main-key] [--filename <custom-filename>]",
    );
    process.exit(1);
  }

  fetchAndSaveMoverlyClaims(transactionId, useMainApiKey, customFilename)
    .then(({ filename, addressLine1 }) => {
      console.log(`\nClaims for "${addressLine1}" saved as ${filename}`);
    })
    .catch((err) => {
      console.error("Failed:", err);
      process.exit(1);
    });
}

module.exports = { fetchAndSaveMoverlyClaims };
