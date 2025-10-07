import { createContext, useContext, useState, useCallback, useEffect } from "react";
import { pdtfAPI } from "@/lib/api";

const PDTFContext = createContext(null);

const PDTF_SERVICES = [
  {
    id: "moverly",
    name: "Moverly PDTF Service",
    description: "Moverly staging PDTF API",
    icon: "🏢",
  },
  {
    id: "lms-nptn",
    name: "LMS NPTN Service",
    description: "National Property Transaction Network PDTF API",
    icon: "🏛️",
  }
];

// Default transaction ID
const DEFAULT_TRANSACTION_ID = "HLbVvS2z3LCEVedziZ3kx8";

export function PDTFProvider({ children }) {
  const [selectedService, setSelectedService] = useState(PDTF_SERVICES[0]);
  const [transactionId, setTransactionId] = useState(DEFAULT_TRANSACTION_ID);
  const [claimsData, setClaimsData] = useState(null);
  const [stateData, setStateData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasLoaded, setHasLoaded] = useState(false);

  const loadPDTFData = useCallback(async (serviceId, txnId) => {
    const service = serviceId || selectedService.id;
    const transaction = txnId || transactionId;

    if (!transaction.trim()) {
      setError("Please enter a transaction ID");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Call the appropriate backend API based on selected service
      const [claimsResponse, stateResponse] = await Promise.all([
        pdtfAPI.getPDTFClaims(service, transaction),
        pdtfAPI.getPDTFState(service, transaction)
      ]);

      setClaimsData(claimsResponse);
      setStateData(stateResponse);
      setHasLoaded(true);

    } catch (err) {
      console.error("Failed to load PDTF data:", err);
      let errorMessage = err.response?.data?.error || err.message;

      // Check if it's a demo data suggestion
      if (errorMessage.includes("Try transaction ID:")) {
        errorMessage += "\n\nNote: Live API credentials may be expired. Use the demo transaction ID for testing.";
      }

      setError(`Failed to load PDTF data: ${errorMessage}`);
      setClaimsData(null);
      setStateData(null);
    } finally {
      setLoading(false);
    }
  }, [selectedService, transactionId]);

  // Auto-load data on mount
  useEffect(() => {
    if (!hasLoaded) {
      loadPDTFData();
    }
  }, [loadPDTFData, hasLoaded]);

  const value = {
    // Configuration
    services: PDTF_SERVICES,
    selectedService,
    setSelectedService,
    transactionId,
    setTransactionId,

    // Data
    claimsData,
    stateData,
    loading,
    error,
    hasLoaded,

    // Actions
    loadPDTFData,
    reload: () => loadPDTFData(selectedService.id, transactionId),
  };

  return (
    <PDTFContext.Provider value={value}>
      {children}
    </PDTFContext.Provider>
  );
}

export function usePDTF() {
  const context = useContext(PDTFContext);
  if (!context) {
    throw new Error("usePDTF must be used within a PDTFProvider");
  }
  return context;
}
