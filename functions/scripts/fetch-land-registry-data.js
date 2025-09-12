// Script to fetch land registry data from SDC sandbox and update property files
require("dotenv").config();
const axios = require("axios");
const fs = require("fs").promises;
const path = require("path");

const BASE_URL = "https://smart-data-personal.nayaone.com/rest/v1";

function getSandpitKey() {
  const key = process.env.SMART_DATA_CHALLENGE_API_KEY;
  if (!key) {
    throw new Error("SMART_DATA_CHALLENGE_API_KEY environment variable is required");
  }
  return key;
}

// Fetch land_registry data
async function fetchLandRegistry() {
  try {
    const response = await axios.get(`${BASE_URL}/sdpersonal_land_registry`, {
      headers: {
        "sandpit-key": getSandpitKey(),
      },
    });
    return response.data;
  } catch (error) {
    console.error("Error fetching land_registry data:", error.message);
    throw error;
  }
}

// Fetch charge_register data
async function fetchChargeRegister() {
  try {
    const response = await axios.get(`${BASE_URL}/sdpersonal_charge_register`, {
      headers: {
        "sandpit-key": getSandpitKey(),
      },
    });
    return response.data;
  } catch (error) {
    console.error("Error fetching charge_register data:", error.message);
    throw error;
  }
}

async function updatePropertyFiles() {
  console.log("Fetching land registry data from SDC sandbox...");

  // Fetch both land registry datasets
  const [landRegistryData, chargeRegisterData] = await Promise.all([
    fetchLandRegistry(),
    fetchChargeRegister(),
  ]);

  console.log(`Found ${landRegistryData.length} land registry records`);
  console.log(`Found ${chargeRegisterData.length} charge register records`);

  // Create maps by UPRN for quick lookup
  const landRegistryMap = new Map();
  landRegistryData.forEach((record) => {
    if (record.UPRN) {
      landRegistryMap.set(record.UPRN, record);
    }
  });

  const chargeRegisterMap = new Map();
  chargeRegisterData.forEach((record) => {
    if (record.UPRN) {
      chargeRegisterMap.set(record.UPRN, record);
    }
  });

  // Read and update each property file
  const propertiesDir = path.join(__dirname, "../data/sandbox-properties");
  const files = await fs.readdir(propertiesDir);

  for (const file of files) {
    if (!file.endsWith(".json")) continue;

    const filePath = path.join(propertiesDir, file);
    const content = await fs.readFile(filePath, "utf8");
    const propertyData = JSON.parse(content);

    const uprn = propertyData.residence?.UPRN;
    if (!uprn) {
      console.log(`No UPRN found in ${file}, skipping...`);
      continue;
    }

    console.log(`Processing ${file} (UPRN: ${uprn})`);

    // Add land registry data if found
    const landRegistry = landRegistryMap.get(uprn);
    const chargeRegister = chargeRegisterMap.get(uprn);

    if (landRegistry || chargeRegister) {
      // Add the new fields to the property data
      propertyData.land_registry = landRegistry || null;
      propertyData.charge_register = chargeRegister || null;

      // Write the updated data back to the file
      await fs.writeFile(filePath, JSON.stringify(propertyData, null, 2));

      console.log(`✓ Updated ${file} with land registry data`);
      if (landRegistry) {
        console.log(`  - Added land_registry (Title: ${landRegistry.TitleNumber || "N/A"})`);
      }
      if (chargeRegister) {
        console.log(`  - Added charge_register (${chargeRegister.ChargeDate || "N/A"})`);
      }
    } else {
      console.log(`  - No land registry data found for UPRN ${uprn}`);
    }
  }

  console.log("\nLand registry data fetch complete!");
}

// Run the update
updatePropertyFiles().catch(console.error);
