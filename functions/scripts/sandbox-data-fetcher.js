// Smart Data Challenge - Simple Data Fetcher (No Synthetic Enhancements)
const axios = require("axios");

function getSandpitKey() {
  const key = process.env.SMART_DATA_CHALLENGE_API_KEY;
  if (!key) {
    throw new Error("SMART_DATA_CHALLENGE_API_KEY environment variable is required");
  }
  return key;
}
const BASE_URL = "https://smart-data-personal.nayaone.com/rest/v1";

async function fetchPeople() {
  try {
    const response = await axios.get(`${BASE_URL}/sdpersonal_people`, {
      headers: {
        "sandpit-key": getSandpitKey(),
      },
    });
    return response.data;
  } catch (error) {
    console.error("Error fetching people data:", error);
    throw error;
  }
}

async function fetchResidences() {
  try {
    const response = await axios.get(`${BASE_URL}/sdpersonal_residences`, {
      headers: {
        "sandpit-key": getSandpitKey(),
      },
    });
    return response.data;
  } catch (error) {
    console.error("Error fetching residences data:", error);
    throw error;
  }
}

async function fetchConveyancing() {
  try {
    const response = await axios.get(`${BASE_URL}/sdpersonal_conveyancing`, {
      headers: {
        "sandpit-key": getSandpitKey(),
      },
    });
    return response.data;
  } catch (error) {
    console.error("Error fetching conveyancing data:", error);
    throw error;
  }
}

async function process(params) {
  const { joinData = true } = params;

  try {
    // Fetch all three data sources
    const [people, residences, conveyancing] = await Promise.all([
      fetchPeople(),
      fetchResidences(),
      fetchConveyancing(),
    ]);

    if (!joinData) {
      // Return separate datasets
      return {
        people,
        residences,
        conveyancing,
        summary: {
          people_count: people.length,
          residences_count: residences.length,
          conveyancing_count: conveyancing.length,
        },
      };
    }

    // Join data based on common identifiers
    const joinedRecords = joinPropertyRecords(people, residences, conveyancing);

    return {
      joined_records: joinedRecords,
      raw_data: {
        people,
        residences,
        conveyancing,
      },
      summary: {
        total_joined_records: joinedRecords.length,
        people_count: people.length,
        residences_count: residences.length,
        conveyancing_count: conveyancing.length,
      },
    };
  } catch (error) {
    console.error("Error processing sandbox data:", error);
    throw error;
  }
}

function joinPropertyRecords(people, residences, conveyancing) {
  const joinedRecords = [];
  const residenceMap = new Map();

  // Index residences by ResidenceId for faster lookup
  residences.forEach((residence) => {
    residenceMap.set(residence.ResidenceId, residence);
  });

  // Index conveyancing by UPRN for property matching
  const conveyancingMap = new Map();
  conveyancing.forEach((conv) => {
    conveyancingMap.set(conv.UPRN, conv);
  });

  // Join people with their residences and associated conveyancing data
  people.forEach((person) => {
    const residence = residenceMap.get(person.ResidenceId);

    if (residence) {
      // Try to find conveyancing data using UPRN
      const conveyancingData = conveyancingMap.get(residence.UPRN);

      const joinedRecord = {
        person: {
          id: person.AgentId,
          name: `${person.FirstName} ${person.LastName}`,
          title: person.Title,
          date_of_birth: person.DateOfBirth,
          birth_locale: person.BirthLocale,
          sex: person.Sex,
          national_id: person.NationalId,
          landline: person.LandLine,
          mobile: person.MobileNumber,
          personal_email: person.PersonalEmail,
          work_email: person.WorkEmail,
          education_level: person.EducationLevel,
          residence_id: person.ResidenceId,
        },
        residence: {
          id: residence.ResidenceId,
          uprn: residence.UPRN,
          address: {
            line1: residence.AddressLine1,
            town: residence.AddressTown,
            postcode: residence.Postcode,
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
          energy: {
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
          council_tax_band: residence.CouncilTaxBand,
          is_residential: residence.IsResidential,
          property_status: residence.PropertyStatus,
        },
        conveyancing: conveyancingData ? {
          uprn: conveyancingData.UPRN,
          assessment: {
            assessment_date: conveyancingData.AssessmentDate,
            approved_organisation: conveyancingData.ApprovedOrganisation,
            type_of_assessment: conveyancingData.TypeOfAssessment,
            construction_year: conveyancingData.ConstructionYear,
            is_new_build: conveyancingData.IsNewBuild,
          },
          property_condition: {
            structural_movement: conveyancingData.StructuralMovement,
            dampness: conveyancingData.Dampness,
            roofing: conveyancingData.Roofing,
            main_walls: conveyancingData.MainWalls,
            windows: conveyancingData.Windows,
            floors: conveyancingData.Floors,
            ceilings: conveyancingData.Ceilings,
            internal_walls: conveyancingData.InternalWalls,
          },
          utilities: {
            electricity: conveyancingData.Electricity,
            gas: conveyancingData.Gas,
            water_fittings: conveyancingData.WaterFittings,
            heating_hot_water: conveyancingData.HeatingHotWater,
            drainage: conveyancingData.Drainage,
            has_mains_water: conveyancingData.HasMainsWater,
            has_central_heating: conveyancingData.HasCentralHeating,
          },
          issues_and_risks: {
            has_dispute: conveyancingData.HasDispute,
            has_japanese_knotweed: conveyancingData.HasJapaneseKnotweed,
            has_asbestos: conveyancingData.HasAsbestos,
            had_previous_flood: conveyancingData.HadPreviousFlood,
            is_mining_area: conveyancingData.IsMiningArea,
            has_environmental_issue: conveyancingData.HasEnvironmentalIssue,
            has_excessive_noise: conveyancingData.HasExcessiveNoise,
            has_violent_crime: conveyancingData.HasViolentCrime,
          },
          planning: {
            listed_building: conveyancingData.ListedBuilding,
            conservation_area: conveyancingData.ConservationArea,
            trees_protected: conveyancingData.TreesProtected,
            private_road: conveyancingData.PrivateRoad,
            controlled_parking: conveyancingData.ControlledParking,
          },
        } : null,
        match_quality: {
          has_residence_data: !!residence,
          has_conveyancing_data: !!conveyancingData,
          uprn_match: residence && conveyancingData ? residence.UPRN === conveyancingData.UPRN : false,
        },
      };

      joinedRecords.push(joinedRecord);
    }
  });

  return joinedRecords;
}

module.exports = { process, fetchPeople, fetchResidences, fetchConveyancing };
