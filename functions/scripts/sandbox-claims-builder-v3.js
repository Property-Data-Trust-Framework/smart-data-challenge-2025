#!/usr/bin/env node

const path = require("path");
const fs = require("fs").promises;
const crypto = require("crypto");

// Generate a unique ID like Moverly's format
function generateClaimId() {
  return crypto.randomBytes(10).toString("base64")
    .replace(/[+/=]/g, "")
    .substring(0, 20);
}

// Generate ISO timestamp
function generateTimestamp() {
  return new Date().toISOString();
}

// Create a claim with exact Moverly structure
function createClaim(claimPath, claimValue, evidence, transactionId) {
  return {
    id: generateClaimId(),
    claims: {
      [claimPath]: claimValue,
    },
    transactionId,
    verification: {
      evidence: [evidence],
      trust_framework: "uk_pdtf",
      time: generateTimestamp(),
    },
  };
}

// Calculate realistic asking prices based on property characteristics
function calculateRealisticPrice(residence, conveyancing) {
  // Base prices per square meter by location (rough estimates based on UK property markets)
  const basePricePerSqm = {
    MANCHESTER: 2800, // Manchester average
    ALTRINCHAM: 3500, // Altrincham (more affluent area)
  };

  // Get base price per square meter for the area
  const locationMultiplier = basePricePerSqm[residence.AddressTown] || 3000;

  // Property type multipliers
  const propertyTypeMultipliers = {
    "Detached": 1.2,
    "Semi-detached": 1.0,
    "Terraced": 0.85,
    "Flat": 0.75,
    "Apartment": 0.75,
  };

  // Base calculation from area
  const areaMultiplier = propertyTypeMultipliers[residence.PropertyType] || 1.0;
  let estimatedPrice = residence.TotalArea * locationMultiplier * areaMultiplier;

  // Bedroom premium (properties with more bedrooms command higher prices)
  const bedroomPremium = Math.max(0, residence.NumberOfBedrooms - 2) * 25000;
  estimatedPrice += bedroomPremium;

  // Property condition adjustments from conveyancing data
  if (conveyancing) {
    // New builds command premium
    if (conveyancing.IsNewBuild) {
      estimatedPrice *= 1.1;
    }

    // Construction year affects value
    if (conveyancing.ConstructionYear > 2010) {
      estimatedPrice *= 1.05; // Modern construction
    } else if (conveyancing.ConstructionYear < 1980) {
      estimatedPrice *= 0.95; // Older properties
    }

    // Premium for recent improvements (based on condition scores > 1)
    let improvementBonus = 0;
    if (conveyancing.Windows > 1) improvementBonus += 0.02; // New windows
    if (conveyancing.HeatingHotWater > 1) improvementBonus += 0.015; // New heating
    if (conveyancing.Roofing > 1) improvementBonus += 0.025; // New roof
    if (conveyancing.Electricity > 1) improvementBonus += 0.01; // Electrical work

    estimatedPrice *= (1 + improvementBonus);

    // Negative factors
    if (conveyancing.HasDispute) estimatedPrice *= 0.95;
    if (conveyancing.HadPreviousFlood) estimatedPrice *= 0.90;
    if (conveyancing.HasJapaneseKnotweed) estimatedPrice *= 0.85;
    if (conveyancing.HasAsbestos) estimatedPrice *= 0.92;
  }

  // Energy efficiency affects modern valuations
  const epcScoreBonus = {
    "A": 1.08,
    "B": 1.05,
    "C": 1.02,
    "D": 1.0,
    "E": 0.98,
    "F": 0.95,
    "G": 0.90,
  };
  estimatedPrice *= (epcScoreBonus[residence.EPCCurrentClass] || 1.0);

  // Council tax band indicates property value bracket
  const councilTaxAdjustments = {
    "A": 0.85,
    "B": 0.90,
    "C": 0.95,
    "D": 1.0,
    "E": 1.05,
    "F": 1.15,
    "G": 1.25,
    "H": 1.40,
  };
  estimatedPrice *= (councilTaxAdjustments[residence.CouncilTaxBand] || 1.0);

  // Add market variability (±10% randomness)
  const marketVariation = 0.9 + (Math.random() * 0.2);
  estimatedPrice *= marketVariation;

  // Round to nearest £1000 for realistic asking prices
  return Math.round(estimatedPrice / 1000) * 1000;
}

// Enhanced comprehensive claims builder matching all 135 Moverly paths
async function buildClaimsFromSandboxPropertyV3(sandboxData, transactionId) {
  const claims = [];
  const { residence, people, conveyancing } = sandboxData;
  const moverlyClaimsPath = path.join(__dirname, "../data/moverly-sample/claims.json");

  // Load Moverly claims as template
  const moverlyClaims = JSON.parse(await fs.readFile(moverlyClaimsPath, "utf8"));

  // Enhanced mapping with ALL Moverly paths - 135 total paths
  const pathMappings = {
    // === CORE IDENTIFIERS ===
    "/propertyPack/uprn": () => parseInt(residence.UPRN),
    "/status": () => "For sale",
    "/externalIds": () => ({
      Sandbox: {
        residenceId: residence.ResidenceId,
        uprn: residence.UPRN,
      },
      Matchmaker: {
        matchmakerId: `MM${crypto.randomBytes(4).toString("hex").toUpperCase()}`,
      },
    }),
    "/externalIds/LMS": () => ({
      workspaceId: `workspace-${crypto.randomBytes(8).toString("hex")}`,
    }),
    "/externalIds/TMGroup": () => ({
      projectId: parseInt(`${residence.UPRN.substring(0, 8)}`),
    }),

    // === PRICE INFORMATION ===
    "/propertyPack/priceInformation": () => {
      // Generate realistic asking prices based on property characteristics
      const basePrice = calculateRealisticPrice(residence, conveyancing);

      // Different property types and locations have different pricing strategies
      let selectedQualifier = "Fixed price"; // Default
      if (residence.PropertyType === "Detached") {
        selectedQualifier = Math.random() > 0.5 ? "Offers in excess of" : "Guide price";
      } else if (residence.PropertyType === "Terraced") {
        selectedQualifier = Math.random() > 0.7 ? "Fixed price" : "Offers in region of";
      }

      return {
        price: basePrice,
        priceQualifier: selectedQualifier,
      };
    },

    // === PARTICIPANTS ===
    "/participants/-": () => {
      const participants = [];

      // Estate agent first (matching Moverly format)
      participants.push({
        role: "Estate Agent",
        name: {
          firstName: "Sarah",
          lastName: "Mitchell",
          title: "Ms",
        },
        email: "sarah.mitchell@property-partners.co.uk",
        organisation: "Property Partners",
        externalIds: {
          propertyPartnersId: "EA2024001",
        },
      });

      // Add people from sandbox data as sellers
      people.forEach((person) => {
        participants.push({
          role: "Seller",
          name: {
            firstName: person.FirstName,
            lastName: person.LastName,
            title: person.Title,
          },
          dateOfBirth: person.DateOfBirth,
          email: person.PersonalEmail || `${person.FirstName.toLowerCase()}.${person.LastName.toLowerCase()}@example.com`,
          phone: person.MobileNumber ? `+44${person.MobileNumber.toString().substring(2)}` : "+447700900000",
          address: {
            line1: residence.AddressLine1,
            town: residence.AddressTown,
            postcode: residence.Postcode,
          },
          externalIds: {
            sandboxPersonId: person.AgentId,
          },
        });
      });
      return participants;
    },

    // === PROPERTY PACK - ADDRESS & LOCATION ===
    "/propertyPack/address": () => ({
      line1: residence.AddressLine1,
      line2: "",
      town: residence.AddressTown,
      county: residence.AddressTown === "MANCHESTER" ? "Greater Manchester" : "Cheshire",
      postcode: residence.Postcode,
    }),
    "/propertyPack/location": () => ({
      latitude: residence.AddressTown === "MANCHESTER" ? 53.4808 : 53.286316,
      longitude: residence.AddressTown === "MANCHESTER" ? -2.2426 : -2.396151,
    }),

    // === ENERGY EFFICIENCY (COMPREHENSIVE) ===
    "/propertyPack/energyEfficiency/certificateIsSupplied": () => "Attached",
    "/propertyPack/energyEfficiency/certificate": () => ({
      certificateNumber: `${residence.UPRN.substring(0, 4)}-${residence.UPRN.substring(4, 8)}-${residence.UPRN.substring(8, 12)}-${Date.now().toString().substring(-4)}`,
      currentEnergyRating: residence.EPCCurrentClass,
      currentEnergyEfficiency: residence.EPCCurrentScore,
      potentialEnergyRating: conveyancing?.EPCPotentialClass || "B",
      potentialEnergyEfficiency: conveyancing?.EPCPotentialScore || 84,
      environmentImpactCurrent: residence.ImpactCurrentScore,
      environmentImpactPotential: conveyancing?.ImpactPotentialScore || 68,
      co2EmissionsCurrent: residence.CarbonEmissions,
      co2EmissionsPotential: Math.max(1.2, residence.CarbonEmissions * 0.6),
      totalFloorArea: residence.TotalArea,
      propertyType: residence.PropertyType,
      builtForm: residence.PropertyType,
      numberHabitableRooms: residence.NumberOfBedrooms + residence.NumberOfLivingRooms,
      numberHeatedRooms: residence.NumberOfBedrooms + residence.NumberOfLivingRooms,
      mainFuel: residence.MainHeatingFuel === "Gas" ? "mains gas (not community)" : residence.MainHeatingFuel,
      mainsGasFlag: residence.HasGas ? "Y" : "N",
      energyConsumptionCurrent: Math.round(residence.EstimatedAnnualElectricityConsumption),
      energyConsumptionPotential: Math.round(residence.EstimatedAnnualElectricityConsumption * 0.8),
      heatingCostCurrent: Math.round(residence.EstimatedAnnualGasConsumption * 0.04),
      heatingCostPotential: Math.round(residence.EstimatedAnnualGasConsumption * 0.025),
      inspectionDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    }),
    "/propertyPack/energyEfficiency/greenDealLoan/hasGreenDealLoan/yesNo": () => "No",

    // === BUILDING INFORMATION ===
    "/propertyPack/buildInformation/internalArea": () => ({
      area: residence.TotalArea,
      unit: "square metres",
    }),
    "/propertyPack/buildInformation/building/propertyType": () => "House",
    "/propertyPack/buildInformation/building/builtForm": () => residence.PropertyType,
    "/propertyPack/buildInformation/roomDimensions": () => ({
      attachments: "With agent",
      hasFloorplan: true,
    }),

    // === HEATING SYSTEM ===
    "/propertyPack/heating/heatingSystem/heatingType": () =>
      residence.HasCentralHeating || residence.HasGas ? "Central heating" : "Electric heating",
    "/propertyPack/heating/heatingSystem/centralHeatingDetails/centralHeatingFuel/centralHeatingFuelType": () => {
      if (residence.MainHeatingFuel === "Gas") return "Mains gas";
      if (residence.HasOil) return "Oil";
      if (residence.HasLPG) return "LPG";
      return residence.MainHeatingFuel;
    },
    "/propertyPack/heating/otherHeatingFeatures": () => {
      const features = [];
      if (residence.HasHeatPump) features.push("Heat pump");
      if (residence.HasSolarPanels) features.push("Solar panels");
      return features.length > 0 ? features : ["None"];
    },

    // === CONNECTIVITY ===
    "/propertyPack/connectivity/broadband": () => ({
      yesNo: residence.HasBroadband ? "Yes" : "No",
      typeOfConnection: residence.HasBroadband ? "FTTP (Fibre to the Premises)" : undefined,
    }),
    "/propertyPack/connectivity/mobilePhone/predictedCoverage": () => ({
      eeDataOutdoor: 4,
      eeVoiceOutdoor: 4,
      voDataOutdoor: 4,
      voVoiceOutdoor: 4,
      h3DataOutdoor: 4,
      h3VoiceOutdoor: 4,
      tfDataOutdoor: 4,
      tfVoiceOutdoor: 4,
    }),
    "/propertyPack/connectivity/telephone": () => ({
      yesNo: residence.HasTelephone ? "Yes" : "No",
    }),
    "/propertyPack/connectivity/cableSatelliteTV": () => ({
      yesNo: residence.HasCableSatellite ? "Yes" : "No",
    }),

    // === LOCAL AUTHORITY & COUNCIL TAX ===
    "/propertyPack/localAuthority/localAuthorityName": () => {
      if (residence.AddressTown === "MANCHESTER") return "Manchester City Council";
      if (residence.AddressTown === "ALTRINCHAM") return "Trafford Borough Council";
      return "Local Authority";
    },
    "/propertyPack/localAuthority/countyCouncil": () => {
      if (residence.AddressTown === "MANCHESTER") return "Greater Manchester Combined Authority";
      return "Cheshire County Council";
    },
    "/propertyPack/localAuthority/districtCouncil": () => {
      if (residence.AddressTown === "MANCHESTER") return "Manchester City Council";
      return "Trafford Borough Council";
    },
    "/propertyPack/localAuthority/regulatedSearchTurnaroundTimeInWorkingDays": () => 10,
    "/propertyPack/councilTax": () => ({
      councilTaxBand: residence.CouncilTaxBand,
      councilTaxAnnualCharge: residence.CouncilTaxBand === "F" ? 2135.86 :
                              residence.CouncilTaxBand === "E" ? 1845.45 :
                              residence.CouncilTaxBand === "D" ? 1555.04 : 1845.45,
      councilTaxAnnualChargeTaxYear: "2024-2025",
      councilTaxAffectingAlterations: { yesNo: "No" },
    }),

    // === ENVIRONMENTAL ISSUES (COMPREHENSIVE) ===
    "/propertyPack/environmentalIssues/coalMining": () => ({
      result: conveyancing?.IsMiningArea ? "Identified" : "Not identified",
      summary: conveyancing?.IsMiningArea ? "Coal mining risk identified in area." : "No coal mining risk has been identified.",
      riskIndicator: conveyancing?.IsMiningArea ? "Yes" : "No",
      datasetAttribution: "Smart Data Challenge Sandbox Assessment",
    }),
    "/propertyPack/environmentalIssues/nonCoalMining": () => ({
      result: "Not identified",
      summary: "No non-coal mining risk has been identified.",
      riskIndicator: "No",
      datasetAttribution: "Smart Data Challenge Sandbox Assessment",
    }),
    "/propertyPack/environmentalIssues/coastalErosion": () => ({
      result: "Not close to an area potentially affected by future coastal erosion.",
      summary: "The property is not close to any area potentially impacted by coastal erosion.",
      riskIndicator: "No",
      actionAlertRating: 1,
      datasetAttribution: "Smart Data Challenge Sandbox Assessment",
    }),
    "/propertyPack/environmentalIssues/flooding/floodRisk": () => ({
      summary: "Flooding from rivers: Very low risk; Flooding from the sea: Very low risk",
      riskSubcategories: [
        {
          result: conveyancing?.HadPreviousFlood ? "Medium risk" : "Very low risk",
          summary: conveyancing?.HadPreviousFlood ? "Risk between 1% and 3.3% chance each year" : "Risk less than 0.1% chance each year",
          subCategory: "Flooding from rivers",
          actionAlertRating: conveyancing?.HadPreviousFlood ? 2 : 1,
        },
        {
          result: "Very low risk",
          summary: "Risk less than 0.1% chance each year",
          subCategory: "Flooding from the sea",
          actionAlertRating: 1,
        },
      ],
      riskIndicator: conveyancing?.HadPreviousFlood ? "Yes" : "No",
      actionAlertRating: conveyancing?.HadPreviousFlood ? 2 : 1,
      datasetAttribution: "Smart Data Challenge Sandbox Assessment",
    }),
    "/propertyPack/environmentalIssues/flooding/historicalFlooding/hasBeenFlooded": () =>
      conveyancing?.HadPreviousFlood ? "Yes" : "No",
    "/propertyPack/environmentalIssues/radon/radonTest": () => ({
      yesNo: "No",
    }),
    "/propertyPack/environmentalIssues/radon/remedialMeasuresOnConstruction": () => ({
      yesNo: "No",
    }),

    // === TITLES & OWNERSHIP (COMPREHENSIVE) ===
    "/propertyPack/titlesToBeSold": () => [{
      titleNumber: `TF${residence.UPRN.substring(0, 6)}`,
      titleIncludedInSale: true,
    }],
    "/propertyPack/titlesToBeSold/0/titleExtents": () => {
      // Generate realistic GeoJSON polygon based on location
      const baseLon = residence.AddressTown === "MANCHESTER" ? -2.2426 : -2.396151;
      const baseLat = residence.AddressTown === "MANCHESTER" ? 53.4808 : 53.286316;
      const offset = 0.0001;
      return JSON.stringify({
        type: "Polygon",
        coordinates: [[
          [baseLon - offset, baseLat - offset],
          [baseLon + offset, baseLat - offset],
          [baseLon + offset, baseLat + offset],
          [baseLon - offset, baseLat + offset],
          [baseLon - offset, baseLat - offset],
        ]],
      });
    },
    "/propertyPack/marketingTenure": () => "Freehold",
    "/propertyPack/ownership/numberOfSellers": () => people.length,
    "/propertyPack/ownership/ownershipsToBeTransferred/-": () => ({
      ownershipType: "Freehold",
      titleNumber: `TF${residence.UPRN.substring(0, 6)}`,
      percentageOwned: 100,
      owner: people.map((p) => ({
        firstName: p.FirstName,
        lastName: p.LastName,
      })),
    }),
    "/propertyPack/legalOwners/namesOfLegalOwners": () =>
      people.map((person) => ({
        ownerType: "Private individual",
        firstName: person.FirstName,
        middleNames: person.SecondName || "",
        lastName: person.LastName,
      })),

    // === DETAILED TITLE INFORMATION ===
    "/propertyPack/titlesToBeSold/0/registerExtract": () => ({
      ocSummaryData: {
        documentDetails: {
          document: [{
            documentDate: conveyancing?.OwnerSince || "2019-01-01",
            documentType: "60",
            planOnlyIndicator: "false",
            entryNumber: ["A1", "B1"],
            registerDescription: "Transfer",
          }],
        },
        officialCopyDateTime: new Date().toISOString(),
        proprietorship: {
          currentProprietorshipDate: conveyancing?.OwnerSince || "2019-01-01",
          registeredProprietorParty: people.map((person) => ({
            privateIndividual: {
              name: {
                forenamesName: person.FirstName,
                surnameName: person.LastName,
              },
            },
            address: {
              postcodeZone: { postcode: residence.Postcode },
              addressLine: { line: [residence.AddressLine1, residence.AddressTown] },
            },
          })),
        },
        propertyAddress: {
          postcodeZone: { postcode: residence.Postcode },
          addressLine: { line: [residence.AddressLine1, residence.AddressTown] },
        },
        editionDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        title: {
          titleNumber: `TF${residence.UPRN.substring(0, 6)}`,
          commonholdIndicator: false,
          classOfTitleCode: "10",
          titleRegistrationDetails: {
            postcodeZone: { postcode: residence.Postcode },
            districtName: residence.AddressTown,
            registrationDate: conveyancing?.OwnerSince || "2019-01-01",
            administrativeArea: residence.AddressTown,
            landRegistryOfficeName: residence.AddressTown === "MANCHESTER" ? "Manchester Office" : "Birkenhead Office",
            latestEditionDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
          },
        },
        registerEntryIndicators: {
          multipleChargeIndicator: false,
          chargeeIndicator: false,
          homeRightsIndicator: false,
          leaseHoldTitleIndicator: false,
          pricePaidIndicator: true,
        },
        pricePaidEntry: {
          entryDetails: {
            entryText: `The price stated to have been paid on ${conveyancing?.OwnerSince || "2019-01-01"} was £325000.`,
            registrationDate: conveyancing?.OwnerSince || "2019-01-01",
            infills: {
              date: conveyancing?.OwnerSince || "2019-01-01",
              amount: "£325000",
            },
            entryNumber: "1",
            subRegisterCode: "B",
          },
        },
      },
      ocRegisterData: {
        proprietorshipRegister: {
          registerEntry: [{
            entryType: "Proprietor",
            entryText: `PROPRIETOR: ${people.map((p) => `${p.FirstName.toUpperCase()} ${p.LastName.toUpperCase()}`).join(" and ")} of ${residence.AddressLine1}, ${residence.AddressTown}, ${residence.Postcode}.`,
            entryDate: conveyancing?.OwnerSince || "2019-01-01",
            entryNumber: "1",
          }],
        },
        propertyRegister: {
          registerEntry: [{
            entryType: "Property Description",
            entryText: `The Freehold land shown edged with red on the plan of the above title filed at the Registry and being ${residence.AddressLine1}, ${residence.AddressTown} (${residence.Postcode}).`,
            entryDate: conveyancing?.OwnerSince || "2019-01-01",
            entryNumber: "1",
          }],
          districtDetails: {
            entryText: residence.AddressTown,
          },
        },
      },
    }),
    "/propertyPack/titlesToBeSold/0/documentAvailability": () => ({
      titlePlan: {
        availabilityCode: "IMMEDIATE",
        availability: "available for immediate download",
        type: "plan",
        backdated: false,
        typeCode: "TITLEPLAN",
      },
      titleStatus: "Title number is valid.",
      titleNumber: `TF${residence.UPRN.substring(0, 6)}`,
      applicationsPending: false,
      titleStatusCode: "VALID",
      referredToDocuments: [{
        date: conveyancing?.OwnerSince || "2019-01-01",
        availabilityCode: "IMMEDIATE",
        availability: "available for immediate download",
        type: "Transfer",
        entryNumbers: ["A1", "B1"],
        filedUnder: `TF${residence.UPRN.substring(0, 6)}`,
        typeCode: "Transfer",
      }],
      register: {
        availabilityCode: "IMMEDIATE",
        availability: "available for immediate download",
        type: "register",
        backdated: false,
        typeCode: "REGISTER",
      },
    }),
    "/propertyPack/titlesToBeSold/0/keyFacts": () => ({
      chargesAndFinancialBurdens: [],
      relatedDocuments: [
        `A transfer dated ${conveyancing?.OwnerSince || "2019-01-01"} showing the transfer of property ownership.`,
      ],
      legalOwners: people.map((p) => `${p.FirstName} ${p.LastName}`),
      rightsOrEasements: [
        "Standard property rights as detailed in the title register.",
      ],
      beneficialOwners: people.map((p) => `${p.FirstName} ${p.LastName}`),
      restrictionsOrRestrictiveCovenants: [],
      propertyAndLandDescription: `The property is the freehold (full ownership) of the land located at ${residence.AddressLine1}, ${residence.AddressTown}, with postcode ${residence.Postcode}. This means the owners own the land and property outright.`,
      complexityScore: 1,
    }),
    "/propertyPack/titlesToBeSold/0/insights/restrictiveCovenants": () => ({
      summary: "No significant restrictive covenants identified",
      items: [],
      riskLevel: "Low",
    }),

    // === ADDITIONAL DOCUMENTS ===
    "/propertyPack/titlesToBeSold/0/additionalDocuments/-": () => [{
      documentType: "Transfer",
      documentDate: conveyancing?.OwnerSince || "2019-01-01",
      documentReference: `TR-${residence.UPRN.substring(0, 8)}`,
    }],

    // === TYPE OF CONSTRUCTION ===
    "/propertyPack/typeOfConstruction/isStandardForm": () => ({ yesNo: "Yes" }),
    "/propertyPack/typeOfConstruction/buildingSafety": () => ({ yesNo: "No" }),
    "/propertyPack/typeOfConstruction/accessibilityAndAdaptations": () => [],

    // === UTILITIES - ELECTRICITY ===
    "/propertyPack/electricity/mainsElectricity": () => ({
      yesNo: residence.HasElectricity ? "Yes" : "No",
      supplier: "British Gas",
      electricityMeter: {
        type: residence.HasSmartMeter ? "Smart meter" : "Standard meter",
        location: "External meter box",
      },
    }),
    "/propertyPack/electricity/mainsElectricity/supplier": () => "British Gas",
    "/propertyPack/electricity/mainsElectricity/electricityMeter": () => ({
      type: residence.HasSmartMeter ? "Smart meter" : "Standard meter",
      location: "External meter box",
    }),
    "/propertyPack/electricity/solarPanels": () => ({
      yesNo: residence.HasSolarPanels ? "Yes" : "No",
    }),
    "/propertyPack/electricity/heatPump": () => ({
      yesNo: residence.HasHeatPump ? "Yes" : "No",
    }),
    "/propertyPack/electricity/otherSources": () => ({
      yesNo: residence.HasLPG || residence.HasOil ? "Yes" : "No",
    }),

    // === UTILITIES - WATER & DRAINAGE ===
    "/propertyPack/waterAndDrainage/water": () => ({
      mainsWater: {
        yesNo: conveyancing?.HasMainsWater ? "Yes" : "No",
        supplier: "United Utilities",
        waterMeter: {
          isSupplyMetered: residence.HasSmartMeter ? "Yes" : "No",
          location: "Front garden",
        },
        stopcock: {
          location: "Under kitchen sink",
        },
      },
    }),
    "/propertyPack/waterAndDrainage/water/mainsWater/waterMeter": () => ({
      isSupplyMetered: residence.HasSmartMeter ? "Yes" : "No",
      location: "Front garden",
    }),
    "/propertyPack/waterAndDrainage/water/mainsWater/waterMeter/location": () => "Front garden",
    "/propertyPack/waterAndDrainage/water/mainsWater/supplier": () => "United Utilities",
    "/propertyPack/waterAndDrainage/water/mainsWater/stopcock": () => ({
      location: "Under kitchen sink",
    }),
    "/propertyPack/waterAndDrainage/drainage": () => ({
      mainsSurfaceWaterDrainage: { yesNo: conveyancing?.HasDrainage ? "Yes" : "No" },
      mainsFoulDrainage: {
        yesNo: conveyancing?.HasFoulDrainage ? "Yes" : "No",
        supplier: "United Utilities",
      },
    }),
    "/propertyPack/waterAndDrainage/drainage/mainsSurfaceWaterDrainage/yesNo": () =>
      conveyancing?.HasDrainage ? "Yes" : "No",
    "/propertyPack/waterAndDrainage/drainage/mainsFoulDrainage": () => ({
      yesNo: conveyancing?.HasFoulDrainage ? "Yes" : "No",
      nonMainsFoulDrainage: conveyancing?.HasSepticTank ? "Septic tank" : undefined,
    }),
    "/propertyPack/waterAndDrainage/drainage/mainsFoulDrainage/supplier": () => "United Utilities",

    // === PARKING ===
    "/propertyPack/parking/parkingArrangements": () => {
      if (residence.PropertyType === "Detached") return ["Driveway", "Garage"];
      if (conveyancing?.ControlledParking) return ["Residents permit"];
      return ["On-street"];
    },
    "/propertyPack/parking/disabledParking": () => ({ yesNo: "No" }),
    "/propertyPack/parking/controlledParking": () => ({
      yesNo: conveyancing?.ControlledParking ? "Yes" : "No",
    }),
    "/propertyPack/parking/electricVehicleChargingPoint": () => ({ yesNo: "No" }),

    // === LISTING & CONSERVATION ===
    "/propertyPack/listingAndConservation/isListed": () => ({
      yesNo: conveyancing?.ListedBuilding ? "Yes" : "No",
    }),
    "/propertyPack/listingAndConservation/isConservationArea": () => ({
      yesNo: conveyancing?.ConservationArea ? "Yes" : "No",
    }),
    "/propertyPack/listingAndConservation/hasTreePreservationOrder": () => ({
      yesNo: conveyancing?.TreesProtected ? "Yes" : "No",
    }),

    // === RIGHTS & ARRANGEMENTS (COMPREHENSIVE) ===
    "/propertyPack/rightsAndInformalArrangements/rightsOrArrangements": () => ({
      publicRightOfWay: { yesNo: "No" },
      rightsOfLight: { yesNo: "No" },
      rightsOfSupport: { yesNo: "No" },
      rightsCreatedThroughCustom: { yesNo: "No" },
      rightsToTakeFromLand: { yesNo: "No" },
      minesAndMinerals: { yesNo: "No" },
      churchChancel: { yesNo: "No" },
      otherRights: { yesNo: "No" },
    }),
    "/propertyPack/rightsAndInformalArrangements/rightsOrArrangements/rightsOfLight": () => ({ yesNo: "No" }),
    "/propertyPack/rightsAndInformalArrangements/rightsOrArrangements/rightsOfSupport": () => ({ yesNo: "No" }),
    "/propertyPack/rightsAndInformalArrangements/rightsOrArrangements/rightsCreatedThroughCustom": () => ({ yesNo: "No" }),
    "/propertyPack/rightsAndInformalArrangements/rightsOrArrangements/rightsToTakeFromLand": () => ({ yesNo: "No" }),
    "/propertyPack/rightsAndInformalArrangements/rightsOrArrangements/minesAndMinerals": () => ({ yesNo: "No" }),
    "/propertyPack/rightsAndInformalArrangements/rightsOrArrangements/churchChancel": () => ({ yesNo: "No" }),
    "/propertyPack/rightsAndInformalArrangements/rightsOrArrangements/otherRights": () => ({ yesNo: "No" }),
    "/propertyPack/rightsAndInformalArrangements/sharedContributions": () => ({ yesNo: "No" }),
    "/propertyPack/rightsAndInformalArrangements/neighbouringLandRights": () => ({ yesNo: "No" }),
    "/propertyPack/rightsAndInformalArrangements/accessRestrictionAttempts": () => ({ yesNo: "No" }),

    // === SERVICES CROSSING ===
    "/propertyPack/servicesCrossing/pipesWiresCablesDrainsToProperty": () => ({ yesNo: "Yes" }),
    "/propertyPack/servicesCrossing/pipesWiresCablesDrainsFromProperty": () => ({ yesNo: "No" }),
    "/propertyPack/servicesCrossing/formalOrInformalAgreements": () => ({ yesNo: "No" }),

    // === NOTICES (COMPREHENSIVE) ===
    "/propertyPack/notices/planningApplication/yesNo": () => "No",
    "/propertyPack/notices/neighbourDevelopment": () => ({ yesNo: "No" }),
    "/propertyPack/notices/requiredMaintenance": () => ({ yesNo: "No" }),
    "/propertyPack/notices/listedBuildingApplication": () => ({ yesNo: "No" }),
    "/propertyPack/notices/infrastructureProject": () => ({ yesNo: "No" }),
    "/propertyPack/notices/partyWallAct": () => ({ yesNo: "No" }),
    "/propertyPack/notices/otherNotices": () => ({ yesNo: "No" }),

    // === LEGAL BOUNDARIES ===
    "/propertyPack/legalBoundaries/ownership": () => ({
      areBoundariesUniform: "Yes",
      uniformBoundaries: {
        rear: "Shared",
        left: "Seller",
        right: "Shared",
        front: "Highway",
      },
    }),
    "/propertyPack/legalBoundaries/haveBoundaryFeaturesMoved": () => ({ yesNo: "No" }),
    "/propertyPack/legalBoundaries/adjacentLandIncluded": () => ({ yesNo: "No" }),
    "/propertyPack/legalBoundaries/flyingFreehold": () => ({ yesNo: "No" }),

    // === DISPUTES & COMPLAINTS ===
    "/propertyPack/disputesAndComplaints/hasDisputesAndComplaints": () => ({
      yesNo: conveyancing?.HasDispute ? "Yes" : "No",
    }),
    "/propertyPack/disputesAndComplaints/leadingToDisputesAndComplaints": () => ({ yesNo: "No" }),

    // === ALTERATIONS & CHANGES (COMPREHENSIVE) ===
    "/propertyPack/alterationsAndChanges/hasStructuralAlterations": () => ({
      yesNo: conveyancing?.HasAlteration ? "Yes" : "No",
      buildingRegApproval: conveyancing?.HasAlteration ? "BR-2024-001" : "N/A",
      details: conveyancing?.HasAlteration ? "Minor internal modifications to kitchen layout" : "No structural alterations",
      planningPermission: conveyancing?.HasAlteration ? "PP-2024-001" : "Not required",
    }),
    "/propertyPack/alterationsAndChanges/changeOfUse": () => ({ yesNo: "No" }),
    "/propertyPack/alterationsAndChanges/windowReplacementsSince2002": () => ({ yesNo: conveyancing?.Windows > 1 ? "Yes" : "No" }),
    "/propertyPack/alterationsAndChanges/hasAddedConservatory": () => ({ yesNo: conveyancing?.Conservatories > 1 ? "Yes" : "No" }),
    "/propertyPack/alterationsAndChanges/worksUnfinished": () => ({ yesNo: "No" }),
    "/propertyPack/alterationsAndChanges/planningPermissionBreaches": () => ({ yesNo: "No" }),
    "/propertyPack/alterationsAndChanges/unresolvedPlanningIssues": () => ({ yesNo: "No" }),

    // === GUARANTEES & WARRANTIES (COMPREHENSIVE) ===
    "/propertyPack/guaranteesWarrantiesAndIndemnityInsurances/hasValidGuaranteesOrWarranties": () =>
      conveyancing && (conveyancing.ConstructionYear > 2010) ? "Yes" : "No",
    "/propertyPack/guaranteesWarrantiesAndIndemnityInsurances/newHomeWarranty": () => ({
      yesNo: conveyancing?.IsNewBuild ? "Yes" : "No",
    }),
    "/propertyPack/guaranteesWarrantiesAndIndemnityInsurances/roofingWork": () => ({ yesNo: conveyancing?.Roofing > 1 ? "Yes" : "No" }),
    "/propertyPack/guaranteesWarrantiesAndIndemnityInsurances/dampProofingTreatment": () => ({
      yesNo: conveyancing?.Dampness ? "Yes" : "No",
    }),
    "/propertyPack/guaranteesWarrantiesAndIndemnityInsurances/timberRotOrInfestationTreatment": () => ({ yesNo: "No" }),
    "/propertyPack/guaranteesWarrantiesAndIndemnityInsurances/centralHeatingAndorPlumbing": () => ({
      yesNo: conveyancing?.HeatingHotWater > 1 ? "Yes" : "No",
    }),
    "/propertyPack/guaranteesWarrantiesAndIndemnityInsurances/doubleGlazing": () => ({
      yesNo: conveyancing?.Windows > 1 ? "Yes" : "No",
    }),
    "/propertyPack/guaranteesWarrantiesAndIndemnityInsurances/electricalRepairOrInstallation": () => ({
      yesNo: conveyancing?.Electricity > 1 ? "Yes" : "No",
    }),
    "/propertyPack/guaranteesWarrantiesAndIndemnityInsurances/subsidenceWork": () => ({
      yesNo: conveyancing?.StructuralMovement > 1 ? "Yes" : "No",
    }),
    "/propertyPack/guaranteesWarrantiesAndIndemnityInsurances/otherGuarantees": () => ({ yesNo: "No" }),
    "/propertyPack/guaranteesWarrantiesAndIndemnityInsurances/outstandingClaimsOrApplications": () => ({ yesNo: "No" }),

    // === INSURANCE ===
    "/propertyPack/insurance/isInsured": () => "Yes",
    "/propertyPack/insurance/insuranceClaims": () => ({ yesNo: "No" }),
    "/propertyPack/insurance/difficultiesObtainingInsurance": () => ({ yesNo: "No" }),

    // === SPECIALIST ISSUES ===
    "/propertyPack/specialistIssues/japaneseKnotweed/yesNo": () =>
      conveyancing?.HasJapaneseKnotweed ? "Yes" : "No",
    "/propertyPack/specialistIssues/asbestos/yesNo": () =>
      conveyancing?.HasAsbestos ? "Yes" : "No",
    "/propertyPack/specialistIssues/dryRot/yesNo": () =>
      conveyancing?.HasDryRotPrevention ? "Yes" : "No",

    // === ELECTRICAL WORKS ===
    "/propertyPack/electricalWorks/testedByQualifiedElectrician": () => ({ yesNo: "Yes" }),
    "/propertyPack/electricalWorks/electricalWorkSince2005": () => ({
      yesNo: conveyancing?.Electricity > 1 ? "Yes" : "No",
    }),

    // === LOCAL SEARCHES ===
    "/propertyPack/localSearches/localAuthoritySearches/planningAndBuildingRegulations/decisionsAndPendingApplications/planningPermission": () => [],

    // === ADDITIONAL INFORMATION ===
    "/propertyPack/additionalInformation/otherCharges/yesNo": () => "No",

    // === OCCUPIERS ===
    "/propertyPack/occupiers/sellerLivesAtProperty": () => ({
      yesNo: conveyancing?.IsOccupied ? "Yes" : "No",
    }),
    "/propertyPack/occupiers/othersAged17OrOver": () => ({ yesNo: "No" }),

    // === COMPLETION & MOVING ===
    "/propertyPack/completionAndMoving/sellerWillEnsure": () => ({
      clearOfPersonalItems: true,
      clearOfDebris: true,
      reasonableDecorative: true,
    }),
    "/propertyPack/completionAndMoving/otherPropertyInChain": () => ({ yesNo: "No" }),
    "/propertyPack/completionAndMoving/moveRestrictionDates": () => ({ yesNo: "No" }),
    "/propertyPack/completionAndMoving/sufficientToRepayAllMortgages": () => ({ yesNo: "Yes" }),

    // === DOCUMENTS ===
    "/propertyPack/documents/-": () => [{
      documentType: "Floorplan",
      documentId: `FP-${residence.ResidenceId}`,
    }, {
      documentType: "Brochure",
      documentId: `BR-${residence.ResidenceId}`,
    }],
    "/propertyPack/documents/0/documentType": () => "Floorplan",
    "/propertyPack/documents/1/documentType": () => "Brochure",
    "/propertyPack/documents/0/alterationsInsights": () => ({
      hasAlterations: conveyancing?.HasAlteration || false,
      summary: "No significant alterations identified",
    }),
    "/propertyPack/documents/1/alterationsInsights": () => [],
    "/propertyPack/documents/0/transcription": () => ({
      rawText: `Property: ${residence.AddressLine1}, ${residence.AddressTown}\nFloor Plan - ${residence.PropertyType} property with ${residence.NumberOfBedrooms} bedrooms`,
      processedText: "Standard floor plan layout",
    }),

    // === TITLE DOCUMENTS TRANSCRIPTION ===
    "/propertyPack/titlesToBeSold/0/additionalDocuments/0/transcription": () => ({
      rawText: `Transfer dated ${conveyancing?.OwnerSince || "2019-01-01"}`,
      processedText: "Standard property transfer document",
    }),
    "/propertyPack/titlesToBeSold/0/additionalDocuments/1/transcription": () => ({
      rawText: "Property register extract",
      processedText: "Standard register entry",
    }),
    "/propertyPack/titlesToBeSold/0/additionalDocuments/2/transcription": () => ({
      rawText: "Title plan",
      processedText: "Standard title plan showing property boundaries",
    }),

    // === FINAL CONFIRMATIONS ===
    "/propertyPack/confirmationOfAccuracyByOwners/confirmInformationIsAccurate": () => true,
  };

  // Add essential claims that should appear early, regardless of Moverly template
  const essentialPaths = [
    "/propertyPack/priceInformation",
    "/propertyPack/uprn",
    "/status",
  ];

  const processedPaths = new Set();

  // Process essential paths first
  for (const essentialPath of essentialPaths) {
    if (pathMappings[essentialPath]) {
      try {
        const sandboxValue = pathMappings[essentialPath]();
        const evidence = generateEvidenceForPath(essentialPath, people);

        claims.push(createClaim(essentialPath, sandboxValue, evidence, transactionId));
        processedPaths.add(essentialPath);
      } catch (error) {
        console.error(`Error processing essential path ${essentialPath}:`, error.message);
      }
    }
  }

  // Process all claims using the comprehensive mappings
  for (const moverlyClaim of moverlyClaims) {
    const claimPaths = Object.keys(moverlyClaim.claims);

    for (const claimPath of claimPaths) {
      // Skip if already processed
      if (processedPaths.has(claimPath)) continue;

      // Check if we have a mapping for this path
      if (pathMappings[claimPath]) {
        try {
          const sandboxValue = pathMappings[claimPath]();

          // Determine evidence type based on claim path
          const evidence = generateEvidenceForPath(claimPath, people);

          // Handle array paths (ending with -)
          if (claimPath.endsWith("-")) {
            const values = Array.isArray(sandboxValue) ? sandboxValue : [sandboxValue];
            values.forEach((value) => {
              const valueEvidence = claimPath.includes("participants") ?
                generateParticipantEvidence(value, people) : evidence;
              claims.push(createClaim(claimPath, value, valueEvidence, transactionId));
            });
          } else {
            claims.push(createClaim(claimPath, sandboxValue, evidence, transactionId));
          }

          processedPaths.add(claimPath);
        } catch (error) {
          console.error(`Error processing path ${claimPath}:`, error.message);
        }
      }
    }
  }

  return claims;
}

// Generate appropriate evidence based on claim path
function generateEvidenceForPath(claimPath, people) {
  if (claimPath.includes("energyEfficiency/certificate")) {
    return {
      type: "electronic_record",
      record: {
        source: {
          name: "Energy Performance Certificate obtained from https://find-energy-certificate.service.gov.uk/",
        },
      },
      attachments: [{
        digest: {
          alg: "md5",
          value: crypto.randomBytes(16).toString("base64"),
        },
        url: "https://find-energy-certificate.service.gov.uk/energy-certificate/synthetic-cert",
        desc: "Energy Performance Certificate from GOV.UK",
      }],
    };
  }

  if (claimPath.includes("councilTax")) {
    return {
      type: "electronic_record",
      record: {
        source: {
          name: "Council Tax information obtained from the Valuation Office Agency",
        },
      },
      attachments: [{
        digest: {
          alg: "md5",
          value: crypto.randomBytes(16).toString("base64"),
        },
        url: "https://www.tax.service.gov.uk/check-council-tax-band/property/synthetic",
        desc: "Council Tax band on GOV.UK",
      }],
    };
  }

  if (claimPath.includes("connectivity/")) {
    return {
      type: "electronic_record",
      record: {
        source: {
          name: "Coverage retrieved from Ofcom Connected Nations APIs",
        },
      },
    };
  }

  if (claimPath.includes("localAuthority")) {
    return {
      type: "electronic_record",
      record: {
        source: {
          name: "Local council information retrieved from https://www.gov.uk/find-local-council",
        },
      },
    };
  }

  if (claimPath.includes("titlesToBeSold") || claimPath.includes("ownership") || claimPath.includes("registerExtract") || claimPath.includes("documentAvailability")) {
    return {
      type: "electronic_record",
      record: {
        source: {
          name: "HMLR Register Extract Service",
        },
      },
      attachments: [{
        digest: {
          alg: "md5",
          value: crypto.randomBytes(16).toString("base64"),
        },
        url: "https://landregistry.data.gov.uk/synthetic-extract",
        desc: "Register Extract from HMLR",
      }],
    };
  }

  if (claimPath.includes("environmentalIssues/flooding")) {
    return {
      type: "electronic_record",
      record: {
        source: {
          name: "Environment Agency Long-term Flood Risk service",
        },
      },
      attachments: [{
        digest: {
          alg: "md5",
          value: crypto.randomBytes(16).toString("base64"),
        },
        url: "https://check-long-term-flood-risk.service.gov.uk/synthetic-report",
        desc: "Environment Agency flood risk report",
      }],
    };
  }

  if (claimPath.includes("environmentalIssues")) {
    return {
      type: "electronic_record",
      record: {
        source: {
          name: "Environmental risk assessment - Smart Data Challenge Sandbox",
        },
      },
    };
  }

  if (claimPath.includes("location")) {
    return {
      type: "electronic_record",
      record: {
        source: {
          name: "Address coordinates obtained from Ordnance Survey API",
        },
      },
    };
  }

  if (claimPath.includes("priceInformation")) {
    const firstSeller = people[0];
    return {
      type: "vouch",
      verification_method: {
        type: "auth",
      },
      attestation: {
        type: "digital_attestation",
        voucher: {
          name: `${firstSeller.FirstName} ${firstSeller.LastName}`,
        },
      },
    };
  }

  // Seller attestation for personal/property details
  if (
    claimPath.includes("alterationsAndChanges") ||
    claimPath.includes("guaranteesWarrantiesAndIndemnityInsurances") ||
    claimPath.includes("insurance") ||
    claimPath.includes("electricity/") ||
    claimPath.includes("waterAndDrainage/") ||
    claimPath.includes("heating/") ||
    claimPath.includes("parking/") ||
    claimPath.includes("listingAndConservation/") ||
    claimPath.includes("rightsAndInformalArrangements/") ||
    claimPath.includes("notices/") ||
    claimPath.includes("legalBoundaries/") ||
    claimPath.includes("disputesAndComplaints/") ||
    claimPath.includes("specialistIssues/") ||
    claimPath.includes("electricalWorks/") ||
    claimPath.includes("occupiers/") ||
    claimPath.includes("completionAndMoving/") ||
    claimPath.includes("confirmationOfAccuracyByOwners/") ||
    claimPath === "/status"
  ) {
    const firstSeller = people[0];
    return {
      type: "vouch",
      verification_method: {
        type: "auth",
      },
      attestation: {
        type: "digital_attestation",
        voucher: {
          name: `${firstSeller.FirstName} ${firstSeller.LastName}`,
        },
      },
    };
  }

  // Default to electronic record
  return {
    type: "electronic_record",
    record: {
      source: {
        name: "Property data verification service - Smart Data Challenge Sandbox",
      },
    },
  };
}

// Generate participant-specific evidence
function generateParticipantEvidence(participant, people) {
  if (participant.role === "Estate Agent") {
    return {
      type: "electronic_record",
      record: {
        source: {
          name: "Property Partners Estate Agents - Professional Services Registry",
        },
      },
    };
  } else {
    const firstSeller = people[0];
    return {
      type: "vouch",
      verification_method: {
        type: "auth",
      },
      attestation: {
        type: "digital_attestation",
        voucher: {
          name: `${firstSeller.FirstName} ${firstSeller.LastName}`,
        },
      },
    };
  }
}

// Main function to generate claims file
async function generateClaimsFileV3(propertyAddress) {
  const sandboxDir = path.join(__dirname, "../data/sandbox-properties");
  const outputDir = path.join(__dirname, "../data/sandbox-claims-v3");

  try {
    // Load sandbox property data
    const filename = propertyAddress.toLowerCase().replace(/[^a-z0-9]+/g, "-") + ".json";
    const sandboxPath = path.join(sandboxDir, filename);
    const sandboxData = JSON.parse(await fs.readFile(sandboxPath, "utf8"));

    // Generate transaction ID
    const transactionId = generateClaimId();

    // Build comprehensive claims
    const claims = await buildClaimsFromSandboxPropertyV3(sandboxData, transactionId);

    // Create output directory
    await fs.mkdir(outputDir, { recursive: true });

    // Save claims
    const claimsPath = path.join(outputDir, `${filename.replace(".json", "")}-claims.json`);
    await fs.writeFile(claimsPath, JSON.stringify(claims, null, 2));
    console.log(`✓ Claims saved to ${claimsPath}`);
    console.log(`  - Total claims: ${claims.length}`);
    console.log(`  - Transaction ID: ${transactionId}`);

    // Generate comprehensive summary
    const uniquePaths = [...new Set(claims.flatMap((c) => Object.keys(c.claims)))];
    const summary = {
      transactionId,
      property: `${sandboxData.residence.AddressLine1}, ${sandboxData.residence.AddressTown} ${sandboxData.residence.Postcode}`,
      totalClaims: claims.length,
      uniquePaths: uniquePaths.length,
      dataSources: {
        official: claims.filter((c) => {
          const evidence = c.verification.evidence[0];
          return evidence.type === "electronic_record" &&
                 evidence.record?.source?.name &&
                 !evidence.record.source.name.includes("Sandbox");
        }).length,
        synthetic: claims.filter((c) => {
          const evidence = c.verification.evidence[0];
          return evidence.type === "electronic_record" &&
                 evidence.record?.source?.name?.includes("Sandbox");
        }).length,
        vouched: claims.filter((c) => c.verification.evidence[0].type === "vouch").length,
      },
      claimPaths: uniquePaths.sort(),
      people: sandboxData.people.length,
      hasConveyancing: !!sandboxData.conveyancing,
      moverlyCompatibility: {
        targetClaims: 67,
        targetPaths: 135,
        actualClaims: claims.length,
        actualPaths: uniquePaths.length,
        coveragePercentage: Math.round((uniquePaths.length / 135) * 100),
      },
    };

    const summaryPath = path.join(outputDir, `${filename.replace(".json", "")}-summary.json`);
    await fs.writeFile(summaryPath, JSON.stringify(summary, null, 2));
    console.log(`✓ Summary saved to ${summaryPath}`);

    return { claims, summary };
  } catch (error) {
    console.error("Error generating claims:", error.message);
    throw error;
  }
}

// Run if executed directly
if (require.main === module) {
  const address = process.argv[2] || "59 Hawkley Gardens";

  console.log(`Generating comprehensive PDTF claims (v3 - Full Moverly structure) for: ${address}\n`);

  generateClaimsFileV3(address)
    .then(async (result) => {
      console.log("\n✅ Comprehensive claims generation complete!");
      console.log(`Generated ${result.claims.length} claims with ${result.summary.uniquePaths} unique paths`);
      console.log(`Moverly compatibility: ${result.summary.moverlyCompatibility.coveragePercentage}% path coverage`);
      console.log(`Official source claims: ${result.summary.dataSources.official}`);
      console.log(`Synthetic source claims: ${result.summary.dataSources.synthetic}`);
      console.log(`Seller vouched claims: ${result.summary.dataSources.vouched}`);

      // Run validation on generated claims
      console.log("\n🔍 Running PDTF schema validation...");
      try {
        const { ClaimValidator } = require("./claim-validator.js");
        const validator = new ClaimValidator();

        // Wait for schema initialization
        await new Promise((resolve) => setTimeout(resolve, 1500));

        // Find the generated claims file
        const filename = address.toLowerCase().replace(/[^a-z0-9]+/g, "-") + ".json";
        const claimsPath = path.join(__dirname, "../data/sandbox-claims-v3", `${filename.replace(".json", "")}-claims.json`);

        const validationResult = await validator.validateClaimsFile(claimsPath);

        if (validationResult.valid) {
          console.log("✅ All claims passed PDTF schema validation!");
        } else {
          console.log(`❌ Validation failed with ${validationResult.errors.length} errors`);
          // Don't exit on validation failure for now, just report
        }
      } catch (validationError) {
        console.warn("⚠️  Could not run validation:", validationError.message);
      }
    })
    .catch((err) => {
      console.error("Failed:", err);
      process.exit(1);
    });
}

module.exports = { buildClaimsFromSandboxPropertyV3, generateClaimsFileV3 };
