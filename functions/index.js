const admin = require("firebase-admin");

admin.initializeApp();

// Import handlers for different use cases
const sandboxDataHandlers = require("./handlers/sandbox-data");
const propertyPackHandlers = require("./handlers/property-pack");
const pdtfViewerHandlers = require("./handlers/pdtf-viewer");
const sellerConsentHandlers = require("./handlers/seller-consent-management");
const conveyancingDiligenceHandlers = require("./handlers/conveyancing-diligence");

// Export all functions from different handlers

// Sandbox Data & Property Explorer use case
exports.processSmartData = sandboxDataHandlers.processSmartData;
exports.getSandboxData = sandboxDataHandlers.getSandboxData;
exports.getPropertyData = sandboxDataHandlers.getPropertyData;

// Property Pack & Buyer use case
exports.getPropertyPackData = propertyPackHandlers.getPropertyPackData;
exports.getAggregatedState = propertyPackHandlers.getAggregatedState;

// PDTF Viewer use case
exports.getPDTFClaims = pdtfViewerHandlers.getPDTFClaims;
exports.getPDTFState = pdtfViewerHandlers.getPDTFState;

// Seller Consent Management use case
exports.updateParticipantStatus = sellerConsentHandlers.updateParticipantStatus;
exports.inviteParticipant = sellerConsentHandlers.inviteParticipant;

// Conveyancing Diligence use case
exports.generateDiligenceReport = conveyancingDiligenceHandlers.generateDiligenceReport;
