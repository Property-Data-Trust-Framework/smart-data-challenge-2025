const { onRequest } = require("firebase-functions/v2/https");
const { logger } = require("firebase-functions");
const cors = require("cors")({ origin: true });
const path = require("path");
const fs = require("fs").promises;

// Public endpoint for serving synthetic property pack data
exports.getPropertyPackData = onRequest(
  {
    cors: true,
    invoker: "public",
  },
  async (req, res) => {
    cors(req, res, async () => {
      try {
        const { propertyId, type } = req.query;

        if (!propertyId) {
          return res
            .status(400)
            .json({ error: "propertyId parameter is required" });
        }

        // Valid property IDs
        const validProperties = [
          "59-hawkley-gardens",
          "101-broadbridge-close-manchester",
          "107-sunbeam-crescent-910358",
          "91-south-hill-avenue-142222",
        ];

        if (!validProperties.includes(propertyId)) {
          return res.status(404).json({ error: "Property not found" });
        }

        const dataType = type || "claims"; // claims, summary, validation
        let filename;

        switch (dataType) {
          case "claims":
            filename = `${propertyId}-claims.json`;
            break;
          case "summary":
            filename = `${propertyId}-summary.json`;
            break;
          case "validation":
            filename = `${propertyId}-validation-report.json`;
            break;
          default:
            return res.status(400).json({
              error:
                "Invalid type parameter. Use: claims, summary, or validation",
            });
        }

        const filePath = path.join(
          __dirname,
          "..",
          "data",
          "sandbox-claims-v3",
          filename,
        );

        try {
          const data = await fs.readFile(filePath, "utf8");
          const jsonData = JSON.parse(data);

          res.json({
            success: true,
            propertyId,
            type: dataType,
            data: jsonData,
          });
        } catch (fileError) {
          logger.warn(`File not found: ${filePath}`);
          res.status(404).json({
            error: "Property pack data not found",
            propertyId,
            type: dataType,
          });
        }
      } catch (error) {
        logger.error("Error in getPropertyPackData:", error);
        res.status(500).json({
          error: "Internal server error",
          message: error.message,
        });
      }
    });
  },
);

// Public endpoint for aggregating state from claims using JSON Pointer
exports.getAggregatedState = onRequest(
  {
    cors: true,
    invoker: "public",
  },
  async (req, res) => {
    cors(req, res, async () => {
      try {
        const { propertyId } = req.query;

        if (!propertyId) {
          return res
            .status(400)
            .json({ error: "propertyId parameter is required" });
        }

        // Valid property IDs
        const validProperties = [
          "59-hawkley-gardens",
          "101-broadbridge-close-manchester",
          "107-sunbeam-crescent-910358",
          "91-south-hill-avenue-142222",
        ];

        if (!validProperties.includes(propertyId)) {
          return res.status(404).json({ error: "Property not found" });
        }

        const claimsFilePath = path.join(
          __dirname,
          "..",
          "data",
          "sandbox-claims-v3",
          `${propertyId}-claims.json`,
        );

        try {
          // Load claims data
          const claimsData = await fs.readFile(claimsFilePath, "utf8");
          const claims = JSON.parse(claimsData);

          // Use our state aggregator to build the state
          const stateAggregator = require("../scripts/state-aggregator");
          const aggregatedState = stateAggregator.aggregateState(claims);

          res.json({
            success: true,
            propertyId,
            claimsCount: claims.length,
            aggregatedState,
            timestamp: new Date().toISOString(),
          });
        } catch (fileError) {
          logger.warn(`Claims file not found: ${claimsFilePath}`);
          res.status(404).json({
            error: "Claims data not found for property",
            propertyId,
          });
        }
      } catch (error) {
        logger.error("Error in getAggregatedState:", error);
        res.status(500).json({
          error: "Internal server error",
          message: error.message,
        });
      }
    });
  },
);
