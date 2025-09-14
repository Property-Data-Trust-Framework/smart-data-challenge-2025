const { onRequest } = require("firebase-functions/v2/https");
const { logger } = require("firebase-functions");
const cors = require("cors")({ origin: true });
const axios = require("axios");

// OAuth token storage (for LMS NPTN SIT - currently unused)
// let oauthToken = null;
// let tokenExpiry = null;

// LMS NPTN server configuration (currently unused)
// const LMS_NPTN_BASE_URL = process.env.LMS_NPTN_BASE_URL;
// const OAUTH_TOKEN_URL = process.env.LMS_OAUTH_TOKEN_URL;
// const CLIENT_ID = process.env.LMS_NPTN_CLIENT_ID;
// const CLIENT_SECRET = process.env.LMS_NPTN_CLIENT_SECRET;

/**
 * Get OAuth token using client credentials flow (for LMS NPTN SIT - currently unused)
 * @return {Promise<string>} The OAuth token.
 */
// async function getOAuthToken() {
//   if (oauthToken && tokenExpiry && Date.now() < tokenExpiry) {
//     return oauthToken;
//   }

//   try {
//     const response = await axios.post(
//       OAUTH_TOKEN_URL,
//       new URLSearchParams({
//         grant_type: "client_credentials",
//         client_id: CLIENT_ID,
//         client_secret: CLIENT_SECRET,
//       }),
//       {
//         headers: {
//           "Content-Type": "application/x-www-form-urlencoded",
//         },
//       },
//     );

//     oauthToken = response.data.access_token;
//     tokenExpiry = Date.now() + response.data.expires_in * 1000 - 60000;
//     return oauthToken;
//   } catch (error) {
//     logger.error("OAuth token error:", error);
//     throw new Error("Failed to obtain OAuth token");
//   }
// }


// Public endpoint to update participant status via Moverly NPTN API
exports.updateParticipantStatus = onRequest(
  {
    cors: true,
    invoker: "public",
  },
  async (req, res) => {
    cors(req, res, async () => {
      try {
        const { transactionId, participantIndex, status } = req.body;

        if (!transactionId || participantIndex === undefined || !status) {
          return res.status(400).json({
            error: "transactionId, participantIndex, and status are required",
          });
        }

        if (!["active", "removed", "invited"].includes(status)) {
          return res.status(400).json({
            error: "Invalid status. Use 'active', 'removed', or 'invited'",
          });
        }

        // Convert status to the format expected by the API
        const statusMap = {
          active: "Active",
          removed: "Removed",
          invited: "Invited",
        };
        const apiStatus = statusMap[status];

        // Use Moverly NPTN API
        const MOVERLY_NPTN_BASE_URL = "https://www.api-staging.moverly.com/nptnService/transactions";
        const apiKey = process.env.MOVERLY_NPTN_API_KEY;

        if (!apiKey) {
          return res.status(500).json({
            error: "MOVERLY_NPTN_API_KEY environment variable not set",
          });
        }

        // Create a claim with the participant status update using the working array structure
        const claimData = [
          {
            transactionId: transactionId,
            claims: {
              [`/participants/${participantIndex}/participantStatus`]: apiStatus,
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

        const response = await axios.post(`${MOVERLY_NPTN_BASE_URL}/${transactionId}/claims`, claimData, {
          headers: {
            "Moverly-Api-Key": apiKey,
            "Content-Type": "application/json",
            "Accept": "application/json",
          },
        });

        res.json({
          success: true,
          processedClaims: response.data.processedClaims,
          message: response.data.message || `Participant ${participantIndex} status updated to ${status}`,
        });
      } catch (error) {
        logger.error("Error in updateParticipantStatus:", error);
        res.status(500).json({
          error: "Failed to update participant status",
          message: error.message,
        });
      }
    });
  },
);

// Public endpoint to invite a new participant via Moverly NPTN API
exports.inviteParticipant = onRequest(
  {
    cors: true,
    invoker: "public",
  },
  async (req, res) => {
    cors(req, res, async () => {
      try {
        const { transactionId, firstName, lastName, email, role } = req.body;

        if (!transactionId || !firstName || !lastName || !email || !role) {
          return res.status(400).json({
            error: "transactionId, firstName, lastName, email, and role are required",
          });
        }

        // Use Moverly NPTN API
        const MOVERLY_NPTN_BASE_URL = "https://www.api-staging.moverly.com/nptnService/transactions";
        const apiKey = process.env.MOVERLY_NPTN_API_KEY;

        if (!apiKey) {
          return res.status(500).json({
            error: "MOVERLY_NPTN_API_KEY environment variable not set",
          });
        }

        // Create a claim to add a new participant using the /participants/- path
        const claimData = [
          {
            transactionId: transactionId,
            claims: {
              "/participants/-": {
                name: {
                  firstName: firstName,
                  lastName: lastName,
                },
                email: email,
                role: role,
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

        const response = await axios.post(`${MOVERLY_NPTN_BASE_URL}/${transactionId}/claims`, claimData, {
          headers: {
            "Moverly-Api-Key": apiKey,
            "Content-Type": "application/json",
            "Accept": "application/json",
          },
        });

        res.json({
          success: true,
          processedClaims: response.data.processedClaims,
          message: response.data.message || `Participant ${firstName} ${lastName} invited as ${role}`,
        });
      } catch (error) {
        logger.error("Error in inviteParticipant:", error);
        res.status(500).json({
          error: "Failed to invite participant",
          message: error.message,
        });
      }
    });
  },
);
