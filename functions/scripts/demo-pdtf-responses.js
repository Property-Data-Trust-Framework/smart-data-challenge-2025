/**
 * Demo PDTF responses for testing UI functionality
 * Returns mock data when specific demo transaction ID is used
 */

const { mockMoverlyResponse, mockLMSNPTNResponse } = require("./mock-pdtf-test");

// Demo transaction ID for fallback scenarios
const DEMO_TRANSACTION_ID = "3jDdw933iw1gdtoxG2g1eM";

function getDemoResponse(service, transactionId, dataType) {
  // Only provide demo data for our test transaction ID
  if (transactionId !== DEMO_TRANSACTION_ID) {
    throw new Error(`No demo data available for transaction: ${transactionId}. Try transaction ID: ${DEMO_TRANSACTION_ID}`);
  }

  let responseData;
  if (service === "moverly") {
    responseData = dataType === "state" ? mockMoverlyResponse.state : mockMoverlyResponse.claims;
  } else if (service === "lms-nptn") {
    responseData = dataType === "state" ? mockLMSNPTNResponse.state : mockLMSNPTNResponse.claims;
  } else {
    throw new Error(`Unknown service: ${service}`);
  }

  return responseData;
}

function isDemoTransaction(transactionId) {
  return transactionId === DEMO_TRANSACTION_ID;
}

module.exports = {
  getDemoResponse,
  isDemoTransaction,
  DEMO_TRANSACTION_ID,
};
