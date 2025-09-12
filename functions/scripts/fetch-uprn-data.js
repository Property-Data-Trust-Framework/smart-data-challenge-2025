#!/usr/bin/env node

const axios = require("axios");
const fs = require("fs").promises;
const path = require("path");

function getSandpitKey() {
  const key = process.env.SMART_DATA_CHALLENGE_API_KEY;
  if (!key) {
    console.error("❌ SMART_DATA_CHALLENGE_API_KEY environment variable is required");
    console.error("Please set the API key: export SMART_DATA_CHALLENGE_API_KEY=your_key_here");
    throw new Error("SMART_DATA_CHALLENGE_API_KEY environment variable is required");
  }
  return key;
}

const BASE_URL = "https://smart-data-personal.nayaone.com/rest/v1";

async function fetchAllData(apiKey) {
  try {
    console.log("📡 Fetching all sandbox data...");

    const [people, residences, conveyancing] = await Promise.all([
      axios.get(`${BASE_URL}/sdpersonal_people`, {
        headers: { "sandpit-key": apiKey },
      }),
      axios.get(`${BASE_URL}/sdpersonal_residences`, {
        headers: { "sandpit-key": apiKey },
      }),
      axios.get(`${BASE_URL}/sdpersonal_conveyancing`, {
        headers: { "sandpit-key": apiKey },
      }),
    ]);

    return {
      people: people.data,
      residences: residences.data,
      conveyancing: conveyancing.data,
    };
  } catch (error) {
    console.error("❌ Error fetching sandbox data:", error.message);
    throw error;
  }
}

async function findPropertyByUPRN(uprn, apiKey) {
  console.log(`🔍 Searching for property with UPRN: ${uprn}`);

  const allData = await fetchAllData(apiKey);

  // Find residence by UPRN
  const residence = allData.residences.find((r) => r.UPRN === uprn);
  if (!residence) {
    console.log(`❌ No residence found for UPRN: ${uprn}`);
    console.log("Available UPRNs:");
    allData.residences.forEach((r) => {
      console.log(`  - ${r.UPRN}: ${r.AddressLine1}, ${r.AddressTown}`);
    });
    return null;
  }

  // Find people associated with this residence
  const associatedPeople = allData.people.filter((p) => p.ResidenceId === residence.ResidenceId);

  // Find conveyancing data for this UPRN
  const conveyancing = allData.conveyancing.find((c) => c.UPRN === uprn);

  const propertyData = {
    residence,
    people: associatedPeople,
    conveyancing: conveyancing || null,
  };

  console.log(`✅ Found property: ${residence.AddressLine1}, ${residence.AddressTown}`);
  console.log(`   - ${associatedPeople.length} associated people`);
  console.log(`   - ${conveyancing ? "Has" : "No"} conveyancing data`);

  return propertyData;
}

async function savePropertyData(uprn, propertyData) {
  if (!propertyData) return;

  const outputDir = path.join(__dirname, "../data/sandbox-properties");
  await fs.mkdir(outputDir, { recursive: true });

  const filename = `${propertyData.residence.AddressLine1.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${uprn.substring(0, 6)}.json`;
  const filepath = path.join(outputDir, filename);

  await fs.writeFile(filepath, JSON.stringify(propertyData, null, 2));
  console.log(`💾 Saved property data to: ${filepath}`);

  return filepath;
}

async function main() {
  const uprn = process.argv[2];

  if (!uprn) {
    console.error("❌ Usage: node fetch-uprn-data.js <UPRN>");
    console.error("Example: node fetch-uprn-data.js 910358169111");
    process.exit(1);
  }

  try {
    const apiKey = getSandpitKey();
    const propertyData = await findPropertyByUPRN(uprn, apiKey);

    if (propertyData) {
      const savedPath = await savePropertyData(uprn, propertyData);
      console.log(`🎉 Successfully fetched and saved data for UPRN ${uprn}`);
      return savedPath;
    } else {
      console.error(`❌ Could not find property data for UPRN: ${uprn}`);
      process.exit(1);
    }
  } catch (error) {
    console.error("❌ Script failed:", error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { findPropertyByUPRN, savePropertyData, fetchAllData };
