import axios from 'axios';

// Public function URLs - These remain publicly accessible for demo purposes
const PUBLIC_FUNCTION_URLS = {
  getPropertyData: import.meta.env.DEV
    ? 'http://127.0.0.1:5001/moverly-smart-data-challenge/us-central1/getPropertyData'
    : 'https://getpropertydata-sufe6opz3a-uc.a.run.app',
  getPropertyPackData: import.meta.env.DEV
    ? 'http://127.0.0.1:5001/moverly-smart-data-challenge/us-central1/getPropertyPackData'
    : 'https://getpropertypackdata-sufe6opz3a-uc.a.run.app',
  getAggregatedState: import.meta.env.DEV
    ? 'http://127.0.0.1:5001/moverly-smart-data-challenge/us-central1/getAggregatedState'
    : 'https://getaggregatedstate-sufe6opz3a-uc.a.run.app'
};

// Private function URLs - These require authentication (currently disabled in frontend)
const PRIVATE_FUNCTION_URLS = {
  getState: 'https://getstate-sufe6opz3a-uc.a.run.app',
  getClaims: 'https://getclaims-sufe6opz3a-uc.a.run.app', 
  createClaim: 'https://createclaim-sufe6opz3a-uc.a.run.app',
  processSmartData: 'https://processsmartdata-sufe6opz3a-uc.a.run.app',
  getSandboxData: 'https://getsandboxdata-sufe6opz3a-uc.a.run.app', // Available but not used in frontend
};

export const pdtfAPI = {
  // Get property-centric data - PUBLIC
  getPropertyData: async (propertyId = null) => {
    const response = await axios.get(PUBLIC_FUNCTION_URLS.getPropertyData, {
      params: propertyId ? { propertyId } : {}
    });
    return response.data;
  },

  // Get property pack data (claims/summary/validation) - PUBLIC
  getPropertyPackData: async (propertyId, type = 'claims') => {
    const response = await axios.get(PUBLIC_FUNCTION_URLS.getPropertyPackData, {
      params: { propertyId, type }
    });
    return response.data;
  },

  // Get aggregated state from claims using JSON Pointer - PUBLIC
  getAggregatedState: async (propertyId) => {
    const response = await axios.get(PUBLIC_FUNCTION_URLS.getAggregatedState, {
      params: { propertyId }
    });
    return response.data;
  },

  // Get PDTF claims from specified service (Moverly or LMS NPTN) - PUBLIC wrapper
  getPDTFClaims: async (service, transactionId) => {
    const endpoint = import.meta.env.DEV
      ? `http://127.0.0.1:5001/moverly-smart-data-challenge/us-central1/getPDTFClaims`
      : `https://getpdtfclaims-sufe6opz3a-uc.a.run.app`;

    const response = await axios.get(endpoint, {
      params: { service, transactionId }
    });
    return response.data;
  },

  // Get PDTF state from specified service (Moverly or LMS NPTN) - PUBLIC wrapper
  getPDTFState: async (service, transactionId) => {
    const endpoint = import.meta.env.DEV
      ? `http://127.0.0.1:5001/moverly-smart-data-challenge/us-central1/getPDTFState`
      : `https://getpdtfstate-sufe6opz3a-uc.a.run.app`;

    const response = await axios.get(endpoint, {
      params: { service, transactionId }
    });
    return response.data;
  },

  // Update participant status in a transaction - PUBLIC wrapper
  updateParticipantStatus: async (transactionId, participantIndex, status) => {
    const endpoint = import.meta.env.DEV
      ? `http://127.0.0.1:5001/moverly-smart-data-challenge/us-central1/updateParticipantStatus`
      : `https://updateparticipantstatus-sufe6opz3a-uc.a.run.app`;

    const response = await axios.post(endpoint, {
      transactionId,
      participantIndex,
      status
    });
    return response.data;
  },

  // Invite a new participant to a transaction - PUBLIC wrapper
  inviteParticipant: async (transactionId, firstName, lastName, email, role) => {
    const endpoint = import.meta.env.DEV
      ? `http://127.0.0.1:5001/moverly-smart-data-challenge/us-central1/inviteParticipant`
      : `https://inviteparticipant-sufe6opz3a-uc.a.run.app`;

    const response = await axios.post(endpoint, {
      transactionId,
      firstName,
      lastName,
      email,
      role
    });
    return response.data;
  },

  // Generate AI-powered legal diligence analysis report - PUBLIC wrapper
  generateDiligenceReport: async (stateData, claimsData, analysisType = 'legal-diligence') => {
    const endpoint = import.meta.env.DEV
      ? `http://127.0.0.1:5001/moverly-smart-data-challenge/us-central1/generateDiligenceReport`
      : `https://generatediligencereport-sufe6opz3a-uc.a.run.app`;

    const response = await axios.post(endpoint, {
      stateData,
      claimsData,
      analysisType
    });
    return response.data;
  },

  // PRIVATE FUNCTIONS - Disabled in frontend for security
  // These would require proper authentication tokens in a production app
  
  // getState: async (authToken) => {
  //   const response = await axios.get(PRIVATE_FUNCTION_URLS.getState, {
  //     headers: { 'Authorization': `Bearer ${authToken}` }
  //   });
  //   return response.data;
  // },

  // getClaims: async (params = {}, authToken) => {
  //   const response = await axios.get(PRIVATE_FUNCTION_URLS.getClaims, { 
  //     params,
  //     headers: { 'Authorization': `Bearer ${authToken}` }
  //   });
  //   return response.data;
  // },

  // createClaim: async (claimData, authToken) => {
  //   const response = await axios.post(PRIVATE_FUNCTION_URLS.createClaim, claimData, {
  //     headers: { 'Authorization': `Bearer ${authToken}` }
  //   });
  //   return response.data;
  // },

  // processSmartData: async (scriptName, params, authToken) => {
  //   const response = await axios.post(PRIVATE_FUNCTION_URLS.processSmartData, {
  //     scriptName,
  //     ...params,
  //   }, {
  //     headers: { 'Authorization': `Bearer ${authToken}` }
  //   });
  //   return response.data;
  // },
};

