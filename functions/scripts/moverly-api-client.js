const axios = require("axios");

// Moverly API configuration
const MOVERLY_BASE_URL = "https://www.api-staging.moverly.com/pdtfService/transactions";

/**
 * Get the appropriate Moverly API key from environment
 * @param {boolean} useMainKey - Whether to use MOVERLY_API_KEY instead of MOVERLY_NPTN_API_KEY
 * @return {string} The API key
 */
function getApiKey(useMainKey = false) {
  const keyName = useMainKey ? "MOVERLY_API_KEY" : "MOVERLY_NPTN_API_KEY";
  const apiKey = process.env[keyName];
  if (!apiKey) {
    throw new Error(`${keyName} environment variable not set`);
  }
  return apiKey;
}

/**
 * Fetch state data from Moverly staging API
 * @param {string} transactionId - The transaction ID
 * @param {boolean} useMainKey - Whether to use MOVERLY_API_KEY instead of MOVERLY_NPTN_API_KEY
 * @return {Promise<Object>} The state data
 */
async function fetchMoverlyState(transactionId, useMainKey = false) {
  if (!transactionId) {
    throw new Error("transactionId is required");
  }

  const apiKey = getApiKey(useMainKey);

  try {
    const response = await axios.get(`${MOVERLY_BASE_URL}/${transactionId}/state`, {
      headers: {
        "Moverly-Api-Key": apiKey,
        "Accept": "application/json",
      },
    });
    return response.data;
  } catch (error) {
    if (error.response) {
      console.error(`Moverly API error: ${error.response.status}`);
      throw new Error(`Moverly API error: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
    }
    console.error("Error fetching Moverly state:", error.message);
    throw error;
  }
}

/**
 * Fetch claims data from Moverly staging API
 * @param {string} transactionId - The transaction ID
 * @param {boolean} useMainKey - Whether to use MOVERLY_API_KEY instead of MOVERLY_NPTN_API_KEY
 * @return {Promise<Array>} The claims data
 */
async function fetchMoverlyClaims(transactionId, useMainKey = false) {
  if (!transactionId) {
    throw new Error("transactionId is required");
  }

  const apiKey = getApiKey(useMainKey);

  try {
    const response = await axios.get(`${MOVERLY_BASE_URL}/${transactionId}/claims`, {
      headers: {
        "Moverly-Api-Key": apiKey,
        "Accept": "application/json",
      },
    });
    return response.data;
  } catch (error) {
    if (error.response) {
      console.error(`Moverly API error: ${error.response.status}`);
      throw new Error(`Moverly API error: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
    }
    console.error("Error fetching Moverly claims:", error.message);
    throw error;
  }
}

/**
 * Fetch both state and claims data for a transaction
 * @param {string} transactionId - The transaction ID
 * @param {boolean} useMainKey - Whether to use MOVERLY_API_KEY instead of MOVERLY_NPTN_API_KEY
 * @return {Promise<Object>} Combined state and claims data
 */
async function fetchMoverlyTransaction(transactionId, useMainKey = false) {
  const [state, claims] = await Promise.all([
    fetchMoverlyState(transactionId, useMainKey),
    fetchMoverlyClaims(transactionId, useMainKey),
  ]);

  return {
    transactionId,
    state,
    claims,
  };
}

/**
 * Create a new claim in Moverly staging API
 * @param {string} transactionId - The transaction ID
 * @param {Object} claimData - The claim data to post
 * @param {boolean} useMainKey - Whether to use MOVERLY_API_KEY instead of MOVERLY_NPTN_API_KEY
 * @return {Promise<Object>} The created claim response
 */
async function createMoverlyClaim(transactionId, claimData, useMainKey = false) {
  if (!transactionId) {
    throw new Error("transactionId is required");
  }
  if (!claimData) {
    throw new Error("claimData is required");
  }

  const apiKey = getApiKey(useMainKey);

  try {
    const response = await axios.post(`${MOVERLY_BASE_URL}/${transactionId}/claims`, claimData, {
      headers: {
        "Moverly-Api-Key": apiKey,
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
    });
    return response.data;
  } catch (error) {
    if (error.response) {
      console.error(`Moverly API error: ${error.response.status}`);
      throw new Error(`Moverly API error: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
    }
    console.error("Error creating Moverly claim:", error.message);
    throw error;
  }
}

/**
 * Process method for script compatibility
 * @param {Object} params - Parameters object
 * @param {string} params.transactionId - The transaction ID
 * @param {string} params.dataType - Type of data to fetch: "state", "claims", or "all"
 * @return {Promise<Object>} The requested data
 */
async function processRequest(params = {}) {
  const { transactionId, dataType = "all" } = params;

  if (!transactionId) {
    throw new Error("transactionId parameter is required");
  }

  switch (dataType) {
    case "state":
      return await fetchMoverlyState(transactionId);
    case "claims":
      return await fetchMoverlyClaims(transactionId);
    case "all":
    default:
      return await fetchMoverlyTransaction(transactionId);
  }
}

module.exports = {
  fetchMoverlyState,
  fetchMoverlyClaims,
  fetchMoverlyTransaction,
  createMoverlyClaim,
  process: processRequest,
};
