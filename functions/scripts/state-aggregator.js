const jp = require("jsonpointer");

/**
 * Aggregates claims into a final state using JSON Pointer paths
 * @param {Array} claims - Array of claim objects with path-based claims
 * @param {Object} initialState - Optional initial state to build upon
 * @return {Object} The aggregated state
 */
function aggregateState(claims, initialState = {}) {
  // Start with a copy of the initial state
  const state = JSON.parse(JSON.stringify(initialState));

  // Sort claims by timestamp to ensure consistent ordering
  const sortedClaims = claims.sort((a, b) => {
    const timeA = a.verification?.time || a.timestamp || "1970-01-01T00:00:00.000Z";
    const timeB = b.verification?.time || b.timestamp || "1970-01-01T00:00:00.000Z";
    return new Date(timeA) - new Date(timeB);
  });

  // Process each claim in chronological order
  for (const claim of sortedClaims) {
    if (!claim.claims) {
      continue; // Skip invalid claims
    }

    // Process each path/value pair in the claim
    for (const [claimPath, claimValue] of Object.entries(claim.claims)) {
      try {
        // Handle array append notation (paths ending with /-)
        if (claimPath.endsWith("/-")) {
          const arrayPath = claimPath.slice(0, -2); // Remove the /-

          // Get the current array or create empty array if none exists
          let currentArray;
          try {
            currentArray = jp.get(state, arrayPath);
          } catch {
            currentArray = [];
          }

          // Ensure it's an array and append the new value
          if (!Array.isArray(currentArray)) {
            currentArray = [];
          }
          currentArray.push(claimValue);
          jp.set(state, arrayPath, currentArray);
        } else {
          // Regular path - set the value directly, replacing whatever is there
          jp.set(state, claimPath, claimValue);
        }
      } catch (error) {
        console.warn(`Failed to apply claim path "${claimPath}":`, error.message);
        // Continue processing other claims even if one fails
      }
    }
  }

  return state;
}

/**
 * Validates that a path is a valid JSON Pointer
 * @param {string} path - The path to validate
 * @return {boolean} True if valid JSON Pointer
 */
function isValidJsonPointer(path) {
  try {
    // JSON Pointer must start with / or be empty string
    if (path !== "" && !path.startsWith("/")) {
      return false;
    }

    // Test by trying to compile it
    jp.compile(path);
    return true;
  } catch {
    return false;
  }
}

/**
 * Gets a value from state using JSON Pointer path
 * @param {Object} state - The state object
 * @param {string} path - JSON Pointer path
 * @return {*} The value at the path, or undefined if not found
 */
function getFromState(state, path) {
  try {
    return jp.get(state, path);
  } catch (error) {
    // Path doesn't exist or other error
    return undefined;
  }
}

/**
 * Checks if a path exists in the state
 * @param {Object} state - The state object
 * @param {string} path - JSON Pointer path
 * @return {boolean} True if the path exists
 */
function hasInState(state, path) {
  try {
    jp.get(state, path);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Process method for script compatibility
 * @param {Object} params - Parameters object
 * @param {Array} params.claims - Array of claims to aggregate
 * @param {Object} params.initialState - Optional initial state
 * @return {Promise<Object>} The aggregated state
 */
async function processRequest(params = {}) {
  const { claims = [], initialState = {} } = params;

  if (!Array.isArray(claims)) {
    throw new Error("claims parameter must be an array");
  }

  return aggregateState(claims, initialState);
}

module.exports = {
  aggregateState,
  isValidJsonPointer,
  getFromState,
  hasInState,
  process: processRequest,
};
