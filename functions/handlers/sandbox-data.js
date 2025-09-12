const { onRequest } = require("firebase-functions/v2/https");
const { logger } = require("firebase-functions");
const { defineString } = require("firebase-functions/params");
const cors = require("cors")({ origin: true });
const path = require("path");
const fs = require("fs").promises;

// Define environment parameters
const smartDataApiKey = defineString("SMART_DATA_CHALLENGE_API_KEY");

// Smart Data Challenge sandbox endpoint - Private access only
exports.processSmartData = onRequest(
  {
    cors: true,
    invoker: "private",
  },
  async (req, res) => {
    cors(req, res, async () => {
      try {
        const { scriptName, ...params } = req.body;

        // Dynamic script loading for different data processing needs
        const scriptPath = `../scripts/${scriptName}`;
        const script = require(scriptPath);

        const result = await script.process(params);
        res.json(result);
      } catch (error) {
        logger.error("Error processing smart data:", error);
        res.status(500).json({ error: "Failed to process smart data" });
      }
    });
  },
);

// Get sandbox data (joined property records)
exports.getSandboxData = onRequest(
  {
    cors: true,
    invoker: "public",
  },
  async (req, res) => {
    cors(req, res, async () => {
      try {
        const { joinData = true } = req.query;

        const sandboxFetcher = require("../scripts/sandbox-data-fetcher");
        const result = await sandboxFetcher.process({
          joinData: joinData === "true" || joinData === true,
        });

        res.json(result);
      } catch (error) {
        logger.error("Error fetching sandbox data:", error);
        res.status(500).json({ error: "Failed to fetch sandbox data" });
      }
    });
  },
);

// Get property-centric data
exports.getPropertyData = onRequest(
  {
    cors: true,
    invoker: "public",
  },
  async (req, res) => {
    cors(req, res, async () => {
      try {
        const { propertyId = null } = req.query;

        const propertyFetcher = require("../scripts/property-centric-fetcher");
        const result = await propertyFetcher.process({
          selectedPropertyId: propertyId,
          apiKey: smartDataApiKey.value(),
        });

        res.json(result);
      } catch (error) {
        logger.error("Error fetching property data:", error);
        res.status(500).json({ error: "Failed to fetch property data" });
      }
    });
  },
);