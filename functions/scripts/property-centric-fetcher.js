// Smart Data Challenge - Property-Centric Data Fetcher
const axios = require("axios");
const fs = require("fs").promises;
const path = require("path");

function getSandpitKey(providedKey) {
  const key = providedKey || process.env.SMART_DATA_CHALLENGE_API_KEY;
  if (!key) {
    throw new Error("SMART_DATA_CHALLENGE_API_KEY is required");
  }
  return key;
}
const BASE_URL = "https://smart-data-personal.nayaone.com/rest/v1";

async function fetchPeople(apiKey) {
  try {
    const response = await axios.get(`${BASE_URL}/sdpersonal_people`, {
      headers: {
        "sandpit-key": getSandpitKey(apiKey),
      },
    });
    return response.data;
  } catch (error) {
    console.error("Error fetching people data:", error);
    throw error;
  }
}

async function fetchResidences(apiKey) {
  try {
    const response = await axios.get(`${BASE_URL}/sdpersonal_residences`, {
      headers: {
        "sandpit-key": getSandpitKey(apiKey),
      },
    });
    return response.data;
  } catch (error) {
    console.error("Error fetching residences data:", error);
    throw error;
  }
}

async function fetchConveyancing(apiKey) {
  try {
    const response = await axios.get(`${BASE_URL}/sdpersonal_conveyancing`, {
      headers: {
        "sandpit-key": getSandpitKey(apiKey),
      },
    });
    return response.data;
  } catch (error) {
    console.error("Error fetching conveyancing data:", error);
    throw error;
  }
}

async function process(params) {
  const { selectedPropertyId = null, apiKey } = params;

  try {
    // Fetch all three data sources
    const [people, residences, conveyancing] = await Promise.all([
      fetchPeople(apiKey),
      fetchResidences(apiKey),
      fetchConveyancing(apiKey),
    ]);

    // Create property-centric structure
    const properties = await createPropertyCentricData(people, residences, conveyancing);

    if (selectedPropertyId) {
      // Return specific property
      const selectedProperty = properties.find((p) => p.property_id === selectedPropertyId);
      return {
        selected_property: selectedProperty,
        available_properties: properties.map((p) => ({
          property_id: p.property_id,
          address: p.property.address,
          property_type: p.property.property_details.property_type,
        })),
      };
    }

    // Return all properties with summary info
    return {
      properties: properties,
      summary: {
        total_properties: properties.length,
        total_people: people.length,
        total_conveyancing_records: conveyancing.length,
        properties_with_owners: properties.filter((p) => p.owners.length > 0).length,
        properties_with_conveyancing: properties.filter((p) => p.conveyancing_data).length,
      },
    };
  } catch (error) {
    console.error("Error processing property-centric data:", error);
    throw error;
  }
}

async function createPropertyCentricData(people, residences, conveyancing) {
  const properties = [];

  // Index conveyancing by UPRN for quick lookup
  const conveyancingMap = new Map();
  conveyancing.forEach((conv) => {
    conveyancingMap.set(conv.UPRN, conv);
  });

  // For each residence, find all owners and conveyancing data (changed to for...of for async)
  for (const residence of residences) {
    // Find all people who live at this residence
    const owners = people.filter((person) => person.ResidenceId === residence.ResidenceId);

    // Find conveyancing data for this property
    const conveyancingData = conveyancingMap.get(residence.UPRN);

    // Load price information from synthetic claims
    const priceInformation = await loadPriceInformation(residence);

    const propertyRecord = {
      property_id: residence.ResidenceId,
      uprn: residence.UPRN,
      priceInformation: priceInformation,
      property: {
        id: residence.ResidenceId,
        uprn: residence.UPRN,
        address: {
          line1: residence.AddressLine1,
          town: residence.AddressTown,
          postcode: residence.Postcode,
          full_address: `${residence.AddressLine1}, ${residence.AddressTown}, ${residence.Postcode}`,
        },
        property_details: {
          occupancy: residence.Occupancy,
          property_type: residence.PropertyType,
          total_area: residence.TotalArea,
          bedrooms: residence.NumberOfBedrooms,
          bathrooms: residence.NumberOfBathrooms,
          kitchens: residence.NumberOfKitchens,
          living_rooms: residence.NumberOfLivingRooms,
          other_rooms: residence.NumberOfOtherRooms,
          adults: residence.NumberAdults,
          children: residence.NumberChildren,
        },
        energy_performance: {
          electricity_consumption: residence.EstimatedAnnualElectricityConsumption,
          gas_consumption: residence.EstimatedAnnualGasConsumption,
          has_electricity: residence.HasElectricity,
          has_gas: residence.HasGas,
          has_solar_panels: residence.HasSolarPanels,
          has_heat_pump: residence.HasHeatPump,
          has_smart_meter: residence.HasSmartMeter,
          main_heating_fuel: residence.MainHeatingFuel,
          epc_current_class: residence.EPCCurrentClass,
          epc_current_score: residence.EPCCurrentScore,
          carbon_emissions: residence.CarbonEmissions,
        },
        utilities: {
          has_telephone: residence.HasTelephone,
          has_home_battery: residence.HasHomeBattery,
          has_cable_satellite: residence.HasCableSatellite,
          has_broadband: residence.HasBroadband,
        },
        financial: {
          council_tax_band: residence.CouncilTaxBand,
          property_status: residence.PropertyStatus,
          is_residential: residence.IsResidential,
        },
      },
      owners: owners.map((person) => ({
        person_id: person.AgentId,
        name: `${person.FirstName} ${person.LastName}`,
        title: person.Title,
        personal_details: {
          date_of_birth: person.DateOfBirth,
          birth_locale: person.BirthLocale,
          sex: person.Sex,
          national_id: person.NationalId,
          education_level: person.EducationLevel,
        },
        contact_info: {
          landline: person.LandLine,
          mobile: person.MobileNumber,
          personal_email: person.PersonalEmail,
          work_email: person.WorkEmail,
        },
      })),
      conveyancing_data: conveyancingData ? {
        uprn: conveyancingData.UPRN,
        assessment: {
          assessment_date: conveyancingData.AssessmentDate,
          approved_organisation: conveyancingData.ApprovedOrganisation,
          type_of_assessment: conveyancingData.TypeOfAssessment,
          construction_year: conveyancingData.ConstructionYear,
          is_new_build: conveyancingData.IsNewBuild,
          is_first_owner: conveyancingData.IsFirstOwner,
        },
        building_structure: {
          floors_in_block: conveyancingData.FloorsInBlock,
          floor_located: conveyancingData.FloorLocated,
          lift_provided: conveyancingData.LiftProvided,
        },
        service_charges: {
          service_charge_paid: conveyancingData.ServiceChargePaid,
          service_charge_amount: conveyancingData.ServiceChargeAmount,
          service_charge_currency: conveyancingData.ServiceChargeCurrency,
        },
        property_condition: {
          structural_movement: conveyancingData.StructuralMovement,
          dampness: conveyancingData.Dampness,
          chimney_stacks: conveyancingData.ChimneyStacks,
          roofing: conveyancingData.Roofing,
          main_walls: conveyancingData.MainWalls,
          windows: conveyancingData.Windows,
          external_decorations: conveyancingData.ExternalDecorations,
          conservatories: conveyancingData.Conservatories,
          communal_areas: conveyancingData.CommunalAreas,
          garages_outbuildings: conveyancingData.GaragesOutbuildings,
          outside_area_boundaries: conveyancingData.OutsideAreaBoundaries,
          ceilings: conveyancingData.Ceilings,
          internal_walls: conveyancingData.InternalWalls,
          floors: conveyancingData.Floors,
          internal_fittings: conveyancingData.InternalFittings,
          chimney_breast_fireplace: conveyancingData.ChimneyBreastFireplace,
          internal_decorations: conveyancingData.InternalDecorations,
          cellars: conveyancingData.Cellars,
        },
        utilities_services: {
          electricity: conveyancingData.Electricity,
          gas: conveyancingData.Gas,
          water_fittings: conveyancingData.WaterFittings,
          heating_hot_water: conveyancingData.HeatingHotWater,
          drainage: conveyancingData.Drainage,
          has_mains_water: conveyancingData.HasMainsWater,
          has_drainage: conveyancingData.HasDrainage,
          has_foul_drainage: conveyancingData.HasFoulDrainage,
          has_septic_tank: conveyancingData.HasSepticTank,
          has_central_heating: conveyancingData.HasCentralHeating,
        },
        planning_legal: {
          listed_building: conveyancingData.ListedBuilding,
          conservation_area: conveyancingData.ConservationArea,
          trees_protected: conveyancingData.TreesProtected,
          private_road: conveyancingData.PrivateRoad,
          controlled_parking: conveyancingData.ControlledParking,
        },
        environmental_risks: {
          has_environmental_issue: conveyancingData.HasEnvironmentalIssue,
          has_excessive_noise: conveyancingData.HasExcessiveNoise,
          has_violent_crime: conveyancingData.HasViolentCrime,
          had_previous_flood: conveyancingData.HadPreviousFlood,
          is_mining_area: conveyancingData.IsMiningArea,
        },
        property_issues: {
          has_dispute: conveyancingData.HasDispute,
          has_japanese_knotweed: conveyancingData.HasJapaneseKnotweed,
          has_asbestos: conveyancingData.HasAsbestos,
          has_dry_rot_prevention: conveyancingData.HasDryRotPrevention,
          is_property_affected: conveyancingData.IsPropertyAffected,
          has_alteration: conveyancingData.HasAlteration,
        },
        occupancy_history: {
          owner_since: conveyancingData.OwnerSince,
          is_occupied: conveyancingData.IsOccupied,
          is_additional_occupied: conveyancingData.IsAdditionalOccupied,
          has_failed_purchase: conveyancingData.HasFailedPurchase,
          is_prosecuted: conveyancingData.IsProsecuted,
        },
        solar_energy: {
          solar_panel_year_installed: conveyancingData.SolarPanelYearInstalled,
          solar_panel_owned: conveyancingData.SolarPanelOwned,
        },
        epc_potential: {
          epc_potential_class: conveyancingData.EPCPotentialClass,
          epc_potential_score: conveyancingData.EPCPotentialScore,
          impact_potential_class: conveyancingData.ImpactPotentialClass,
          impact_potential_score: conveyancingData.ImpactPotentialScore,
        },
      } : null,
      data_quality: {
        has_property_data: true,
        has_owner_data: owners.length > 0,
        has_conveyancing_data: !!conveyancingData,
        uprn_match: conveyancingData ? residence.UPRN === conveyancingData.UPRN : false,
        owner_count: owners.length,
        data_completeness: calculateDataCompleteness(residence, owners, conveyancingData),
      },
    };

    properties.push(propertyRecord);
  }

  return properties;
}

async function loadPriceInformation(residence) {
  try {
    // Look for synthetic claims files that match this property
    const claimsDir = path.join(__dirname, "../data/sandbox-claims-v3");
    const files = await fs.readdir(claimsDir);

    // Find claims file that matches this property
    const uprn = residence.UPRN;
    const address = residence.AddressLine1.toLowerCase().replace(/[^a-z0-9]+/g, "-");

    // Try to find matching claims file
    const claimsFile = files.find((file) =>
      file.includes(uprn.substring(0, 6)) ||
      file.includes(address.substring(0, 15)),
    );

    if (!claimsFile || !claimsFile.endsWith("-claims.json")) {
      console.log(`No claims file found for ${residence.AddressLine1} (UPRN: ${uprn})`);
      return null;
    }

    const claimsPath = path.join(claimsDir, claimsFile);
    const claimsContent = await fs.readFile(claimsPath, "utf8");
    const claims = JSON.parse(claimsContent);

    // Find the price information claim
    const priceInfoClaim = claims.find((claim) =>
      claim.claims && claim.claims["/propertyPack/priceInformation"],
    );

    if (priceInfoClaim) {
      const priceInfo = priceInfoClaim.claims["/propertyPack/priceInformation"];
      console.log(`Found price info for ${residence.AddressLine1}: £${priceInfo.price.toLocaleString()}`);
      return priceInfo;
    }

    return null;
  } catch (error) {
    console.warn(`Error loading price information for ${residence.AddressLine1}:`, error.message);
    return null;
  }
}

function calculateDataCompleteness(residence, owners, conveyancing) {
  let completeness = 0;
  const totalFields = 3; // property, owners, conveyancing

  // Property data completeness
  if (residence) completeness += 1;

  // Owner data completeness
  if (owners && owners.length > 0) completeness += 1;

  // Conveyancing data completeness
  if (conveyancing) completeness += 1;

  return Math.round((completeness / totalFields) * 100);
}

module.exports = { process, fetchPeople, fetchResidences, fetchConveyancing };
