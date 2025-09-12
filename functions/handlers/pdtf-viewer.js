const { onRequest } = require("firebase-functions/v2/https");
const { logger } = require("firebase-functions");
const cors = require("cors")({ origin: true });
const axios = require("axios");

// OAuth token storage
let oauthToken = null;
let tokenExpiry = null;

// LMS NPTN server configuration
const LMS_NPTN_BASE_URL = process.env.LMS_NPTN_BASE_URL;
const OAUTH_TOKEN_URL = process.env.LMS_OAUTH_TOKEN_URL;
const CLIENT_ID = process.env.LMS_NPTN_CLIENT_ID;
const CLIENT_SECRET = process.env.LMS_NPTN_CLIENT_SECRET;

/**
 * Get OAuth token using client credentials flow.
 * @return {Promise<string>} The OAuth token.
 */
async function getOAuthToken() {
  if (oauthToken && tokenExpiry && Date.now() < tokenExpiry) {
    return oauthToken;
  }

  try {
    const response = await axios.post(
      OAUTH_TOKEN_URL,
      new URLSearchParams({
        grant_type: "client_credentials",
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
      }),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      },
    );

    oauthToken = response.data.access_token;
    tokenExpiry = Date.now() + response.data.expires_in * 1000 - 60000;
    return oauthToken;
  } catch (error) {
    logger.error("OAuth token error:", error);
    throw new Error("Failed to obtain OAuth token");
  }
}

// Public endpoint to get PDTF claims from Moverly or LMS NPTN
exports.getPDTFClaims = onRequest(
  {
    cors: true,
    invoker: "public",
  },
  async (req, res) => {
    cors(req, res, async () => {
      try {
        const { service, transactionId } = req.query;

        if (!service || !transactionId) {
          return res.status(400).json({
            error: "Both service and transactionId parameters are required",
          });
        }

        if (!["moverly", "lms-nptn"].includes(service)) {
          return res.status(400).json({
            error: "Invalid service. Use 'moverly' or 'lms-nptn'",
          });
        }

        let claims;

        if (service === "moverly") {
          // Use Moverly API
          const moverlyClient = require("../scripts/moverly-api-client");
          claims = await moverlyClient.fetchMoverlyClaims(transactionId);
        } else {
          // Use LMS NPTN API with OAuth
          const token = await getOAuthToken();
          const response = await axios.get(
            `${LMS_NPTN_BASE_URL}/transactions/${transactionId}/claims`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
                Accept: "application/json",
              },
            },
          );
          claims = response.data;
        }

        res.json(claims);
      } catch (error) {
        logger.error("Error in getPDTFClaims:", error);
        res.status(500).json({
          error: "Failed to fetch claims",
          message: error.message,
        });
      }
    });
  },
);

// Public endpoint to get PDTF state from Moverly or LMS NPTN
exports.getPDTFState = onRequest(
  {
    cors: true,
    invoker: "public",
  },
  async (req, res) => {
    cors(req, res, async () => {
      try {
        const { service, transactionId } = req.query;

        if (!service || !transactionId) {
          return res.status(400).json({
            error: "Both service and transactionId parameters are required",
          });
        }

        if (!["moverly", "lms-nptn"].includes(service)) {
          return res.status(400).json({
            error: "Invalid service. Use 'moverly' or 'lms-nptn'",
          });
        }

        let state;

        if (service === "moverly") {
          // Use Moverly API
          const moverlyClient = require("../scripts/moverly-api-client");
          state = await moverlyClient.fetchMoverlyState(transactionId);
        } else {
          // Use LMS NPTN API with OAuth
          const token = await getOAuthToken();
          const response = await axios.get(
            `${LMS_NPTN_BASE_URL}/transactions/${transactionId}/state`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
                Accept: "application/json",
              },
            },
          );
          state = response.data;
        }

        res.json(state);
      } catch (error) {
        logger.error("Error in getPDTFState:", error);
        res.status(500).json({
          error: "Failed to fetch state",
          message: error.message,
        });
      }
    });
  },
);