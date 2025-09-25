import { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Building, MapPin, Users, FileText, Shield, Clock, ExternalLink, Verified, Server, AlertCircle, Bot, Eye } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { pdtfAPI } from '@/lib/api';
import jp from 'json-pointer';
import traverse from 'traverse';
import ReactMarkdown from 'react-markdown';

const PDTF_SERVICES = [
  {
    id: 'moverly',
    name: 'Moverly PDTF Service',
    description: 'Moverly staging PDTF API',
    icon: '🏢',
  },
  {
    id: 'lms-nptn',
    name: 'LMS NPTN Service',
    description: 'National Property Transaction Network PDTF API',
    icon: '🏛️',
  }
];

// Default transaction ID for demo
const DEFAULT_TRANSACTION_ID = '78HJ1ggqJBuMjED6bvhdx7';

// Generate a comprehensive claims map from verified claims data - handles nested objects and arrays
const getClaimsMap = (verifiedClaims) => {
  const claimsMap = {};

  if (!verifiedClaims || !Array.isArray(verifiedClaims)) {
    return claimsMap;
  }


  verifiedClaims.forEach((verifiedClaim) => {
    if (!verifiedClaim.claims || typeof verifiedClaim.claims !== 'object') {
      return;
    }

    Object.entries(verifiedClaim.claims).forEach(([claimPath, claimObject]) => {

      let subIndex = 0;
      // if the path ends with a dash, it means it is an array append
      let indexedClaimPath = claimPath;
      if (claimPath.endsWith("-")) {
        try {
          const existingIndexedObject = jp.get(claimsMap, claimPath.slice(0, -2));
          if (existingIndexedObject) {
            subIndex = existingIndexedObject.length;
          }
        } catch {
          // Path doesn't exist yet, use 0
          subIndex = 0;
        }
        indexedClaimPath = `${claimPath.slice(0, -2)}/${subIndex}`;
      }

      traverse(claimObject).forEach(function () {
        if (this.isLeaf) {
          const fullPath =
            // json pointer is weird with "/" as the path
            this.path.length === 0
              ? indexedClaimPath
              : indexedClaimPath + "/" + this.path.join("/");

          try {
            const existing = jp.get(claimsMap, fullPath);
            if (existing && Array.isArray(existing)) {
              jp.set(claimsMap, fullPath, [...existing, verifiedClaim]);
            } else {
              jp.set(claimsMap, fullPath, [verifiedClaim]);
            }
          } catch {
            // Path doesn't exist, create it
            jp.set(claimsMap, fullPath, [verifiedClaim]);
          }
        }
      });
    });
  });

  return claimsMap;
};


// const latestClaimFromMapForPath = (claimsMap, path) => {
//   const claims = jp.get(claimsMap, path);
//   if (claims && Array.isArray(claims)) {
//     return claims[claims.length - 1];
//   }
//   return null;
// };

const contributingClaimsFromMapForData = (claimsMap, dataPath, data) => {
  const claims = [];

  if (data === null || data === undefined) {
    // For simple paths, just check if there are claims directly
    try {
      const directClaims = jp.get(claimsMap, dataPath);
      if (directClaims && Array.isArray(directClaims)) {
        claims.push(...directClaims);
      }
    } catch {
      // Path doesn't exist in claims map
    }
  } else {
    traverse(data).forEach(function () {
      if (this.isLeaf) {
        const sourcePath =
          // json pointer is weird with "/" as the path
          this.path.length === 0
            ? dataPath
            : dataPath + "/" + this.path.join("/");
        try {
          const claimsToBeAdded = jp.get(claimsMap, sourcePath);
          if (claimsToBeAdded && Array.isArray(claimsToBeAdded)) {
            claims.push(...claimsToBeAdded);
          }
        } catch {
          // Path doesn't exist in claims map, skip
        }
      }
    });
  }

  const dedupedClaims = Array.from(new Set(claims));
  return dedupedClaims.sort((a, b) =>
    (a.verification?.time || '').localeCompare(b.verification?.time || '')
  );
};

// const latestClaimsFromMapForData = (claimsMap, dataPath, data) => {
//   const claims = [];
//   traverse(data).forEach(function () {
//     if (this.isLeaf) {
//       const sourcePath =
//         // json pointer is weird with "/" as the path
//         this.path.length === 0
//           ? dataPath
//           : dataPath + "/" + this.path.join("/");
//       const claimsHistory = jp.get(claimsMap, sourcePath);
//       if (claimsHistory && Array.isArray(claimsHistory)) {
//         claims.push(claimsHistory[claimsHistory.length - 1]);
//       }
//     }
//   });
//   const dedupedClaims = Array.from(new Set(claims));
//   return dedupedClaims.sort((a, b) =>
//     (a.verification?.time || '').localeCompare(b.verification?.time || '')
//   );
// };

// Render property pack data organized for conveyancer review
function ConveyancerPropertyPack({ state, renderDataElement }) {
  if (!state) return null;

  const formatAddress = (address) => {
    if (typeof address === 'string') return address;
    if (!address) return 'Not provided';

    const parts = [];
    if (address.line1) parts.push(address.line1);
    if (address.line2) parts.push(address.line2);
    if (address.town) parts.push(address.town);
    if (address.county) parts.push(address.county);
    if (address.postcode) parts.push(address.postcode);
    return parts.join(', ');
  };

  const formatCurrency = (amount, qualifier = '') => {
    if (!amount) return 'Not specified';
    const formatted = new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 0
    }).format(amount);
    return qualifier ? `${formatted} (${qualifier})` : formatted;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Not provided';
    try {
      return new Date(dateString).toLocaleDateString('en-GB');
    } catch {
      return dateString;
    }
  };

  const propertyPack = state.propertyPack || {};

  return (
    <div className="space-y-6">
      {/* Transaction Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Transaction Overview
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          {renderDataElement('Status', '/status', state.status)}
          {renderDataElement('UPRN', '/propertyPack/uprn', propertyPack.uprn)}
          {renderDataElement('Marketing Tenure', '/propertyPack/marketingTenure', propertyPack.marketingTenure)}
        </CardContent>
      </Card>

      {/* Property Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            Property Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          {renderDataElement('Address', '/propertyPack/address', propertyPack.address, formatAddress)}
          {renderDataElement('Property Type', '/propertyPack/buildInformation/building/propertyType', propertyPack.buildInformation?.building?.propertyType)}
          {renderDataElement('Built Form', '/propertyPack/buildInformation/building/builtForm', propertyPack.buildInformation?.building?.builtForm)}
          {renderDataElement('Internal Area', '/propertyPack/buildInformation/internalArea', propertyPack.buildInformation?.internalArea,
            (area) => area ? `${area.area} ${area.unit}` : 'Not provided')}
          {renderDataElement('Number of Bedrooms', '/propertyPack/residentialPropertyFeatures/bedrooms', propertyPack.residentialPropertyFeatures?.bedrooms)}
          {renderDataElement('Bathrooms', '/propertyPack/residentialPropertyFeatures/bathrooms', propertyPack.residentialPropertyFeatures?.bathrooms)}
          {renderDataElement('Reception Rooms', '/propertyPack/residentialPropertyFeatures/receptions', propertyPack.residentialPropertyFeatures?.receptions)}
          {renderDataElement('Outside Areas', '/propertyPack/residentialPropertyFeatures/outsideAreas', propertyPack.residentialPropertyFeatures?.outsideAreas)}
        </CardContent>
      </Card>


      {/* Title Registry Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Land Registry Title Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          {renderDataElement('Title Number', '/propertyPack/titlesToBeSold/0/registerExtract/ocSummaryData/title/titleNumber',
            propertyPack.titlesToBeSold?.[0]?.registerExtract?.ocSummaryData?.title?.titleNumber)}
          {renderDataElement('Class of Title', '/propertyPack/titlesToBeSold/0/registerExtract/ocSummaryData/title/classOfTitleCode',
            propertyPack.titlesToBeSold?.[0]?.registerExtract?.ocSummaryData?.title?.classOfTitleCode)}
          {renderDataElement('Registration Date', '/propertyPack/titlesToBeSold/0/registerExtract/ocSummaryData/title/titleRegistrationDetails/registrationDate',
            propertyPack.titlesToBeSold?.[0]?.registerExtract?.ocSummaryData?.title?.titleRegistrationDetails?.registrationDate,
            formatDate)}
          {renderDataElement('Edition Date', '/propertyPack/titlesToBeSold/0/registerExtract/ocSummaryData/editionDate',
            propertyPack.titlesToBeSold?.[0]?.registerExtract?.ocSummaryData?.editionDate,
            formatDate)}
          {renderDataElement('Official Copy Date & Time', '/propertyPack/titlesToBeSold/0/registerExtract/ocSummaryData/officialCopyDateTime',
            propertyPack.titlesToBeSold?.[0]?.registerExtract?.ocSummaryData?.officialCopyDateTime,
            formatDate)}
          {renderDataElement('Land Registry Office', '/propertyPack/titlesToBeSold/0/registerExtract/ocSummaryData/title/titleRegistrationDetails/landRegistryOfficeName',
            propertyPack.titlesToBeSold?.[0]?.registerExtract?.ocSummaryData?.title?.titleRegistrationDetails?.landRegistryOfficeName)}
        </CardContent>
      </Card>

      {/* Registered Proprietors (from Land Registry) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Registered Proprietors
          </CardTitle>
          <CardDescription>Legal owners as recorded on the Land Registry title</CardDescription>
        </CardHeader>
        <CardContent className="space-y-1">
          {propertyPack.titlesToBeSold?.[0]?.registerExtract?.ocSummaryData?.proprietorship?.registeredProprietorParty?.map((proprietor, index) =>
            renderDataElement(
              `Registered Proprietor ${index + 1}`,
              `/propertyPack/titlesToBeSold/0/registerExtract/ocSummaryData/proprietorship/registeredProprietorParty/${index}`,
              proprietor,
              (p) => {
                const name = p.privateIndividual?.name ?
                  `${p.privateIndividual.name.forenamesName || ''} ${p.privateIndividual.name.surnameName || ''}`.trim() :
                  'Unknown Name';
                const address = p.address?.addressLine?.line ?
                  Array.isArray(p.address.addressLine.line) ? p.address.addressLine.line.join(', ') : p.address.addressLine.line :
                  'Address not recorded';
                const postcode = p.address?.postcodeZone?.postcode || '';
                return `${name} - ${address}${postcode ? ', ' + postcode : ''}`;
              }
            )
          )}
          {propertyPack.legalOwners?.namesOfLegalOwners?.map((owner, index) =>
            renderDataElement(
              `Legal Owner ${index + 1}`,
              `/propertyPack/legalOwners/namesOfLegalOwners/${index}`,
              owner,
              (o) => `${o.firstName} ${o.middleNames ? o.middleNames + ' ' : ''}${o.lastName} (${o.ownerType})`
            )
          )}
          {renderDataElement('Current Proprietorship Date', '/propertyPack/titlesToBeSold/0/registerExtract/ocSummaryData/proprietorship/currentProprietorshipDate',
            propertyPack.titlesToBeSold?.[0]?.registerExtract?.ocSummaryData?.proprietorship?.currentProprietorshipDate,
            formatDate)}
        </CardContent>
      </Card>

      {/* Price Paid Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Price Paid History
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          {renderDataElement('Last Sale Price', '/propertyPack/titlesToBeSold/0/registerExtract/ocSummaryData/pricePaidEntry/entryDetails/infills/amount',
            propertyPack.titlesToBeSold?.[0]?.registerExtract?.ocSummaryData?.pricePaidEntry?.entryDetails?.infills?.amount)}
          {renderDataElement('Last Sale Date', '/propertyPack/titlesToBeSold/0/registerExtract/ocSummaryData/pricePaidEntry/entryDetails/infills/date',
            propertyPack.titlesToBeSold?.[0]?.registerExtract?.ocSummaryData?.pricePaidEntry?.entryDetails?.infills?.date,
            formatDate)}
          {renderDataElement('Price Paid Registration Date', '/propertyPack/titlesToBeSold/0/registerExtract/ocSummaryData/pricePaidEntry/entryDetails/registrationDate',
            propertyPack.titlesToBeSold?.[0]?.registerExtract?.ocSummaryData?.pricePaidEntry?.entryDetails?.registrationDate,
            formatDate)}
          {renderDataElement('Current Marketing Price', '/propertyPack/priceInformation/price',
            propertyPack.priceInformation?.price,
            (price) => formatCurrency(price, propertyPack.priceInformation?.priceQualifier))}
        </CardContent>
      </Card>

      {/* Transaction Participants */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Transaction Participants
          </CardTitle>
          <CardDescription>Parties involved in the current transaction</CardDescription>
        </CardHeader>
        <CardContent className="space-y-1">
          {state.participants?.map((participant, index) =>
            renderDataElement(
              `${participant.role || 'Participant'}`,
              `/participants/${index}`,
              participant,
              (p) => `${p.name?.firstName || p.firstName || ''} ${p.name?.lastName || p.lastName || ''} (${p.email}) - Status: ${p.participantStatus || 'Active'}`
            )
          )}
        </CardContent>
      </Card>

      {/* Energy Efficiency */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Energy Efficiency
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          {renderDataElement('Current Energy Rating', '/propertyPack/energyEfficiency/certificate/currentEnergyRating',
            propertyPack.energyEfficiency?.certificate?.currentEnergyRating)}
          {renderDataElement('Current Energy Efficiency', '/propertyPack/energyEfficiency/certificate/currentEnergyEfficiency',
            propertyPack.energyEfficiency?.certificate?.currentEnergyEfficiency)}
          {renderDataElement('Potential Energy Rating', '/propertyPack/energyEfficiency/certificate/potentialEnergyRating',
            propertyPack.energyEfficiency?.certificate?.potentialEnergyRating)}
          {renderDataElement('Total Floor Area', '/propertyPack/energyEfficiency/certificate/totalFloorArea',
            propertyPack.energyEfficiency?.certificate?.totalFloorArea,
            (area) => area ? `${area} m²` : 'Not provided')}
          {renderDataElement('Inspection Date', '/propertyPack/energyEfficiency/certificate/inspectionDate',
            propertyPack.energyEfficiency?.certificate?.inspectionDate,
            formatDate)}
        </CardContent>
      </Card>

      {/* Local Authority & Council Tax */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Local Authority & Council Tax
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          {renderDataElement('Local Authority', '/propertyPack/localAuthority/localAuthorityName',
            propertyPack.localAuthority?.localAuthorityName)}
          {renderDataElement('Council Tax Band', '/propertyPack/councilTax/councilTaxBand',
            propertyPack.councilTax?.councilTaxBand)}
          {renderDataElement('Council Tax Annual Charge', '/propertyPack/councilTax/councilTaxAnnualCharge',
            propertyPack.councilTax?.councilTaxAnnualCharge,
            (charge) => charge ? formatCurrency(charge) + ` (${propertyPack.councilTax?.councilTaxAnnualChargeTaxYear})` : 'Not provided')}
        </CardContent>
      </Card>

      {/* Utilities & Services */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            Utilities & Services
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          {renderDataElement('Electricity Supplier', '/propertyPack/electricity/mainsElectricity/supplier',
            propertyPack.electricity?.mainsElectricity?.supplier)}
          {renderDataElement('Water Supplier', '/propertyPack/waterAndDrainage/water/mainsWater/supplier',
            propertyPack.waterAndDrainage?.water?.mainsWater?.supplier)}
          {renderDataElement('Heating Type', '/propertyPack/heating/heatingSystem/heatingType',
            propertyPack.heating?.heatingSystem?.heatingType)}
          {renderDataElement('Heating Fuel', '/propertyPack/heating/heatingSystem/centralHeatingDetails/centralHeatingFuel/centralHeatingFuelType',
            propertyPack.heating?.heatingSystem?.centralHeatingDetails?.centralHeatingFuel?.centralHeatingFuelType)}
          {renderDataElement('Broadband Type', '/propertyPack/connectivity/broadband/typeOfConnection',
            propertyPack.connectivity?.broadband?.typeOfConnection)}
          {renderDataElement('Max Download Speed', '/propertyPack/connectivity/broadband/predictedSpeed/maxPredictedDown',
            propertyPack.connectivity?.broadband?.predictedSpeed?.maxPredictedDown,
            (speed) => speed ? `${speed} Mbps` : 'Not provided')}
        </CardContent>
      </Card>

      {/* Environmental Issues */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Environmental Issues
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          {renderDataElement('Flooding Risk', '/propertyPack/environmentalIssues/flooding/floodRisk/summary',
            propertyPack.environmentalIssues?.flooding?.floodRisk?.summary)}
          {renderDataElement('Coal Mining Risk', '/propertyPack/environmentalIssues/coalMining/result',
            propertyPack.environmentalIssues?.coalMining?.result)}
          {renderDataElement('Coastal Erosion Risk', '/propertyPack/environmentalIssues/coastalErosion/result',
            propertyPack.environmentalIssues?.coastalErosion?.result)}
        </CardContent>
      </Card>

      {/* Planning & Conservation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Planning & Conservation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          {renderDataElement('Listed Building', '/propertyPack/listingAndConservation/isListed/yesNo',
            propertyPack.listingAndConservation?.isListed?.yesNo)}
          {renderDataElement('Conservation Area', '/propertyPack/listingAndConservation/isConservationArea/yesNo',
            propertyPack.listingAndConservation?.isConservationArea?.yesNo)}
          {renderDataElement('Tree Preservation Order', '/propertyPack/listingAndConservation/hasTreePreservationOrder/yesNo',
            propertyPack.listingAndConservation?.hasTreePreservationOrder?.yesNo)}
        </CardContent>
      </Card>

      {/* Legal Matters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Legal Matters
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          {renderDataElement('Disputes & Complaints', '/propertyPack/disputesAndComplaints/hasDisputesAndComplaints/yesNo',
            propertyPack.disputesAndComplaints?.hasDisputesAndComplaints?.yesNo)}
          {renderDataElement('Boundary Issues', '/propertyPack/legalBoundaries/haveBoundaryFeaturesMoved/yesNo',
            propertyPack.legalBoundaries?.haveBoundaryFeaturesMoved?.yesNo)}
          {renderDataElement('Public Right of Way', '/propertyPack/rightsAndInformalArrangements/rightsOrArrangements/publicRightOfWay/yesNo',
            propertyPack.rightsAndInformalArrangements?.rightsOrArrangements?.publicRightOfWay?.yesNo)}
          {renderDataElement('Services Crossing', '/propertyPack/servicesCrossing/pipesWiresCablesDrainsToProperty/yesNo',
            propertyPack.servicesCrossing?.pipesWiresCablesDrainsToProperty?.yesNo)}
          {renderDataElement('Services Crossing Details', '/propertyPack/servicesCrossing/pipesWiresCablesDrainsToProperty/details',
            propertyPack.servicesCrossing?.pipesWiresCablesDrainsToProperty?.details)}
        </CardContent>
      </Card>

      {/* Alterations & Works */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            Alterations & Works
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          {renderDataElement('Structural Alterations', '/propertyPack/alterationsAndChanges/hasStructuralAlterations/yesNo',
            propertyPack.alterationsAndChanges?.hasStructuralAlterations?.yesNo)}
          {renderDataElement('Change of Use', '/propertyPack/alterationsAndChanges/changeOfUse/yesNo',
            propertyPack.alterationsAndChanges?.changeOfUse?.yesNo)}
          {renderDataElement('Window Replacements Since 2002', '/propertyPack/alterationsAndChanges/windowReplacementsSince2002/yesNo',
            propertyPack.alterationsAndChanges?.windowReplacementsSince2002?.yesNo)}
          {renderDataElement('Planning Permission Breaches', '/propertyPack/alterationsAndChanges/planningPermissionBreaches/yesNo',
            propertyPack.alterationsAndChanges?.planningPermissionBreaches?.yesNo)}
        </CardContent>
      </Card>

      {/* Insurance & Warranties */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Insurance & Warranties
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          {renderDataElement('Property Insured', '/propertyPack/insurance/isInsured',
            propertyPack.insurance?.isInsured)}
          {renderDataElement('Insurance Claims', '/propertyPack/insurance/insuranceClaims/yesNo',
            propertyPack.insurance?.insuranceClaims?.yesNo)}
          {renderDataElement('Valid Guarantees/Warranties', '/propertyPack/guaranteesWarrantiesAndIndemnityInsurances/hasValidGuaranteesOrWarranties',
            propertyPack.guaranteesWarrantiesAndIndemnityInsurances?.hasValidGuaranteesOrWarranties)}
        </CardContent>
      </Card>

      {/* Occupancy */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Occupancy
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          {renderDataElement('Seller Lives at Property', '/propertyPack/occupiers/sellerLivesAtProperty/yesNo',
            propertyPack.occupiers?.sellerLivesAtProperty?.yesNo)}
          {renderDataElement('Others Aged 17 or Over', '/propertyPack/occupiers/othersAged17OrOver/aged17OrOverNames',
            propertyPack.occupiers?.othersAged17OrOver?.aged17OrOverNames)}
          {renderDataElement('Vacant Possession', '/propertyPack/occupiers/othersAged17OrOver/vacantPossession/soldWithVacantPossession',
            propertyPack.occupiers?.othersAged17OrOver?.vacantPossession?.soldWithVacantPossession)}
        </CardContent>
      </Card>
    </div>
  );
}

function ConveyancingDiligence() {
  const [claimsData, setClaimsData] = useState(null);
  const [stateData, setStateData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [claimsMap, setClaimsMap] = useState(null);

  // Claims dialog state
  const [selectedClaims, setSelectedClaims] = useState(null);
  const [claimsDialogOpen, setClaimsDialogOpen] = useState(false);

  // GPT analysis state
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);

  // Diligence Insights state
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [insightsResult, setInsightsResult] = useState(null);

  const { toast } = useToast();

  // Helper function to filter claims by IDs
  const getClaimsByIds = (claimIds) => {
    if (!claimIds || !Array.isArray(claimIds) || !claimsData) {
      return [];
    }

    // claimsData might be an array or have a data property with array
    const claims = Array.isArray(claimsData) ? claimsData : claimsData.data || [];
    if (!Array.isArray(claims)) return [];

    return claims.filter(claim => claimIds.includes(claim.id));
  };

  // Helper to open claims dialog with filtered claims
  const showClaimsForCheck = (check) => {
    const relevantClaims = getClaimsByIds(check.relevantClaimIds);
    setSelectedClaims({
      label: `${check.name} - Supporting Evidence`,
      path: `Relevant Claims for ${check.name}`,
      claims: relevantClaims
    });
    setClaimsDialogOpen(true);
  };

  // Helper formatting functions
  const formatAddress = (address) => {
    if (typeof address === 'string') return address;
    if (!address) return 'Not provided';

    const parts = [];
    if (address.line1) parts.push(address.line1);
    if (address.line2) parts.push(address.line2);
    if (address.town) parts.push(address.town);
    if (address.county) parts.push(address.county);
    if (address.postcode) parts.push(address.postcode);
    return parts.join(', ');
  };

  const formatPrettyJson = (obj) => {
    if (!obj || typeof obj !== 'object') return String(obj || 'Not provided');

    // Handle arrays of simple values
    if (Array.isArray(obj)) {
      if (obj.length === 0) return 'None';
      if (obj.every(item => typeof item === 'string' || typeof item === 'number')) {
        return obj.join(', ');
      }
    }

    // Handle objects - create a more readable format
    const formatObjectEntry = (key, value) => {
      if (value === null || value === undefined) return null;
      if (typeof value === 'boolean') return `${key}: ${value ? 'Yes' : 'No'}`;
      if (typeof value === 'string') return `${key}: ${value}`;
      if (typeof value === 'number') return `${key}: ${value}`;
      if (Array.isArray(value) && value.length === 0) return `${key}: None`;
      if (Array.isArray(value)) return `${key}: ${value.join(', ')}`;
      if (typeof value === 'object') {
        const subEntries = Object.entries(value)
          .map(([k, v]) => formatObjectEntry(k, v))
          .filter(Boolean)
          .join('; ');
        return subEntries ? `${key}: (${subEntries})` : null;
      }
      return `${key}: ${String(value)}`;
    };

    const entries = Object.entries(obj)
      .map(([key, value]) => formatObjectEntry(key, value))
      .filter(Boolean);

    return entries.length > 0 ? entries.join(' • ') : 'Not provided';
  };

  const formatCurrency = (amount, qualifier = '') => {
    if (!amount) return 'Not specified';
    const formatted = new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 0
    }).format(amount);
    return qualifier ? `${formatted} (${qualifier})` : formatted;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Not provided';
    try {
      return new Date(dateString).toLocaleDateString('en-GB');
    } catch {
      return dateString;
    }
  };

  // Render data element with claims support - shared function for tabs
  const renderDataElement = (label, path, value, customRenderer = null) => {
    // Get contributing claims for this data element using the improved mapping
    const contributingClaims = claimsMap ? contributingClaimsFromMapForData(claimsMap, path, value) : [];
    const hasClaimsData = contributingClaims && contributingClaims.length > 0;

    let displayValue = value;
    if (customRenderer) {
      displayValue = customRenderer(value);
    } else if (value === null || value === undefined) {
      displayValue = 'Not provided';
    } else if (typeof value === 'boolean') {
      displayValue = value ? 'Yes' : 'No';
    } else if (typeof value === 'object') {
      if (Array.isArray(value)) {
        displayValue = value.length > 0 ? value.join(', ') : 'None';
      } else {
        displayValue = JSON.stringify(value, null, 2);
      }
    } else {
      displayValue = String(value);
    }

    return (
      <div key={path} className="flex items-center justify-between py-2 px-3 hover:bg-gray-50 rounded-md group">
        <div className="flex-1">
          <div className="font-medium text-sm text-gray-900">{label}</div>
          <div className="text-sm text-gray-600 whitespace-pre-wrap">
            {displayValue}
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            if (hasClaimsData) {
              handleShowClaims(path, label, contributingClaims);
            }
          }}
          className={hasClaimsData ? "opacity-0 group-hover:opacity-100 transition-opacity" : "opacity-50 transition-opacity"}
        >
          <Eye className="h-4 w-4 mr-1" />
          {hasClaimsData ? "Claims (" + contributingClaims.length + ")" : "No Claims"}
        </Button>
      </div>
    );
  };

  const loadPDTFData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [claimsResponse, stateResponse] = await Promise.all([
        pdtfAPI.getPDTFClaims(PDTF_SERVICES[0].id, DEFAULT_TRANSACTION_ID),
        pdtfAPI.getPDTFState(PDTF_SERVICES[0].id, DEFAULT_TRANSACTION_ID)
      ]);


      setClaimsData(claimsResponse);
      setStateData(stateResponse);

      // Check different possible structures for claims data
      let claims = null;
      if (Array.isArray(claimsResponse)) {
        claims = claimsResponse;
      } else if (claimsResponse.claims && claimsResponse.claims.claims && Array.isArray(claimsResponse.claims.claims)) {
        claims = claimsResponse.claims.claims;
      } else if (claimsResponse.claims && Array.isArray(claimsResponse.claims)) {
        claims = claimsResponse.claims;
      } else if (claimsResponse.data && Array.isArray(claimsResponse.data)) {
        claims = claimsResponse.data;
      }

      // Generate claims map for UI interactions using improved mapping
      const generatedClaimsMap = getClaimsMap(claims);
      setClaimsMap(generatedClaimsMap);

      toast({
        title: "Data loaded successfully",
        description: `Loaded ${claims?.length || 0} claims from ${PDTF_SERVICES[0].name}`,
      });

    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to load PDTF data');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const handleShowClaims = (path, label, claims) => {
    setSelectedClaims({ path, label, claims });
    setClaimsDialogOpen(true);
  };

  const generateReportOnTitle = async () => {
    if (!stateData) {
      toast({
        title: "No data available",
        description: "Please load transaction data first",
        variant: "destructive"
      });
      return;
    }

    setAnalysisLoading(true);

    try {
      const response = await pdtfAPI.generateDiligenceReport(stateData, claimsData, 'report-on-title');

      if (response.success && response.report) {
        setAnalysisResult({
          reportOnTitle: response.report.reportOnTitle,
          property: response.report.property,
          fullReport: response.report
        });

        toast({
          title: "Report on Title generated",
          description: "AI-powered Report on Title completed successfully",
        });
      } else {
        throw new Error('Invalid response from Report on Title service');
      }

    } catch (err) {
      toast({
        title: "Report generation failed",
        description: err.response?.data?.error || err.message || "Failed to generate Report on Title",
        variant: "destructive"
      });
    } finally {
      setAnalysisLoading(false);
    }
  };

  const generateDiligenceInsights = async () => {
    if (!stateData) {
      toast({
        title: "No data available",
        description: "Please load transaction data first",
        variant: "destructive"
      });
      return;
    }

    setInsightsLoading(true);

    try {
      const response = await pdtfAPI.generateDiligenceInsights(stateData, claimsData);

      if (response.success && response.insights) {
        setInsightsResult(response.insights);

        toast({
          title: "Diligence Insights generated",
          description: "AI-powered diligence checks completed successfully",
        });
      } else {
        throw new Error('Invalid response from Diligence Insights service');
      }

    } catch (err) {
      toast({
        title: "Insights generation failed",
        description: err.response?.data?.error || err.message || "Failed to generate Diligence Insights",
        variant: "destructive"
      });
    } finally {
      setInsightsLoading(false);
    }
  };

  // Auto-load data on component mount
  useEffect(() => {
    loadPDTFData();
  }, [loadPDTFData]);

  // Extract address information for title and subtitle
  const getAddressTitle = () => {
    if (!stateData?.propertyPack?.address) return "Conveyancing Diligence";

    const address = stateData.propertyPack.address;
    if (typeof address === 'string') {
      // If address is a string, use first line as title
      const addressLines = address.split(',').map(line => line.trim());
      return addressLines[0] || "Conveyancing Diligence";
    } else if (typeof address === 'object') {
      // If address is an object, use line1 or first available field
      return address.line1 || address.street || address.number || "Conveyancing Diligence";
    }
    return "Conveyancing Diligence";
  };

  const getAddressSubtitle = () => {
    if (!stateData?.propertyPack?.address) return "Review property pack data with comprehensive claims provenance and AI-powered legal analysis";

    const address = stateData.propertyPack.address;
    if (typeof address === 'string') {
      // If address is a string, use remaining lines as subtitle
      const addressLines = address.split(',').map(line => line.trim());
      const remainingLines = addressLines.slice(1).filter(line => line.length > 0);
      return remainingLines.length > 0 ? remainingLines.join(', ') : "Property conveyancing review";
    } else if (typeof address === 'object') {
      // If address is an object, concatenate other address fields
      const parts = [];
      if (address.line2) parts.push(address.line2);
      if (address.city) parts.push(address.city);
      if (address.county) parts.push(address.county);
      if (address.postcode) parts.push(address.postcode);
      return parts.length > 0 ? parts.join(', ') : "Property conveyancing review";
    }
    return "Property conveyancing review";
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="flex items-center gap-3">
                <FileText className="h-6 w-6" />
                {getAddressTitle()}
              </CardTitle>
              <CardDescription>
                {getAddressSubtitle()}
              </CardDescription>
            </div>
            {stateData?.transactionId && (
              <div className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                {stateData.transactionId}
              </div>
            )}
          </div>
        </CardHeader>
      </Card>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {loading && (
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          </CardContent>
        </Card>
      )}


      {stateData && !loading && (
        <Tabs defaultValue="property" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="property" className="flex items-center gap-2">
              <Building className="h-4 w-4" />
              Property Details
            </TabsTrigger>
            <TabsTrigger value="title" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Title Register
            </TabsTrigger>
            <TabsTrigger value="analysis" className="flex items-center gap-2">
              <Bot className="h-4 w-4" />
              Report on Title
            </TabsTrigger>
            <TabsTrigger value="insights" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Insights
            </TabsTrigger>
          </TabsList>

          <TabsContent value="property" className="space-y-6">
            {/* Transaction Participants - Featured at Top */}
            {stateData.participants && stateData.participants.length > 0 && (
              <Card className="border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Users className="h-5 w-5 text-blue-600" />
                    Transaction Participants
                  </CardTitle>
                  <p className="text-sm text-gray-600">People and organizations involved in this property transaction</p>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {stateData.participants.map((participant, index) => (
                      <div key={index} className="bg-white rounded-lg border p-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <h4 className="font-semibold text-gray-900">
                            {participant.name ?
                              `${participant.name.title || ''} ${participant.name.firstName || ''} ${participant.name.middleName || ''} ${participant.name.lastName || ''}`.trim() :
                              `${participant.firstName || ''} ${participant.lastName || ''}`.trim()
                            }
                          </h4>
                          <Badge variant={
                            participant.participantStatus === 'Active' ? 'default' :
                            participant.participantStatus === 'Invited' ? 'secondary' : 'outline'
                          }>
                            {participant.role}
                          </Badge>
                        </div>
                        <div className="text-sm text-gray-600 space-y-1">
                          {participant.email && (
                            <div className="flex items-center gap-1">
                              <span className="font-medium">Email:</span>
                              <span>{participant.email}</span>
                            </div>
                          )}
                          {participant.phone && (
                            <div className="flex items-center gap-1">
                              <span className="font-medium">Phone:</span>
                              <span>{participant.phone}</span>
                            </div>
                          )}
                          {participant.organisation && (
                            <div className="flex items-center gap-1">
                              <span className="font-medium">Organisation:</span>
                              <span>{participant.organisation}</span>
                            </div>
                          )}
                          {participant.participantStatus && (
                            <div className="flex items-center gap-1">
                              <span className="font-medium">Status:</span>
                              <Badge variant="outline" className="text-xs">
                                {participant.participantStatus}
                              </Badge>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Title Register Summary */}
            {stateData.propertyPack?.titlesToBeSold?.[0]?.registerExtract?.ocSummaryData && (
              <Card className="border-2 border-amber-200 bg-gradient-to-r from-amber-50 to-yellow-50">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FileText className="h-5 w-5 text-amber-600" />
                    Title Register Summary
                  </CardTitle>
                  <p className="text-sm text-gray-600">Key title information - see full details in Title Register tab</p>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {renderDataElement('Title Number', '/propertyPack/titlesToBeSold/0/registerExtract/ocSummaryData/title/titleNumber', stateData.propertyPack.titlesToBeSold[0].registerExtract?.ocSummaryData?.title?.titleNumber)}
                  {renderDataElement('Class of Title', '/propertyPack/titlesToBeSold/0/registerExtract/ocSummaryData/title/classOfTitleCode', stateData.propertyPack.titlesToBeSold[0].registerExtract?.ocSummaryData?.title?.classOfTitleCode)}
                  {stateData.propertyPack.titlesToBeSold[0].registerExtract?.ocSummaryData?.pricePaidEntry &&
                    renderDataElement('Last Sale Price', '/propertyPack/titlesToBeSold/0/registerExtract/ocSummaryData/pricePaidEntry/entryDetails/infills/amount', stateData.propertyPack.titlesToBeSold[0].registerExtract?.ocSummaryData?.pricePaidEntry?.entryDetails?.infills?.amount, formatCurrency)}
                </CardContent>
              </Card>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Property Pack Data */}
              <div className="lg:col-span-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Building className="h-5 w-5" />
                      Transaction Overview
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Property Details */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">Property Pack</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {renderDataElement('Address', '/propertyPack/address', stateData.propertyPack?.address, formatAddress)}
                          {renderDataElement('UPRN', '/propertyPack/uprn', stateData.propertyPack?.uprn)}
                          {renderDataElement('Marketing Tenure', '/propertyPack/marketingTenure', stateData.propertyPack?.marketingTenure)}
                          {renderDataElement('Property Type', '/propertyPack/buildInformation/building/propertyType', stateData.propertyPack?.buildInformation?.building?.propertyType)}
                          {renderDataElement('Built Form', '/propertyPack/buildInformation/building/builtForm', stateData.propertyPack?.buildInformation?.building?.builtForm)}
                        </CardContent>
                      </Card>

                      {/* Energy Performance */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">Energy Performance</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {renderDataElement('Current Energy Rating', '/propertyPack/energyEfficiency/certificate/currentEnergyRating', stateData.propertyPack?.energyEfficiency?.certificate?.currentEnergyRating)}
                          {renderDataElement('Current Energy Efficiency', '/propertyPack/energyEfficiency/certificate/currentEnergyEfficiency', stateData.propertyPack?.energyEfficiency?.certificate?.currentEnergyEfficiency)}
                          {renderDataElement('Potential Energy Rating', '/propertyPack/energyEfficiency/certificate/potentialEnergyRating', stateData.propertyPack?.energyEfficiency?.certificate?.potentialEnergyRating)}
                        </CardContent>
                      </Card>

                      {/* Financial Information */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">Financial Information</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {renderDataElement('Council Tax Band', '/propertyPack/councilTax/councilTaxBand', stateData.propertyPack?.councilTax?.councilTaxBand)}
                          {renderDataElement('Council Tax Annual Charge', '/propertyPack/councilTax/councilTaxAnnualCharge', stateData.propertyPack?.councilTax?.councilTaxAnnualCharge, formatCurrency)}
                          {renderDataElement('Marketing Price', '/propertyPack/priceInformation/price', stateData.propertyPack?.priceInformation?.price, formatCurrency)}
                        </CardContent>
                      </Card>

                      {/* Physical Characteristics */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">Physical Characteristics</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {renderDataElement('Bedrooms', '/propertyPack/residentialPropertyFeatures/bedrooms', stateData.propertyPack?.residentialPropertyFeatures?.bedrooms)}
                          {renderDataElement('Bathrooms', '/propertyPack/residentialPropertyFeatures/bathrooms', stateData.propertyPack?.residentialPropertyFeatures?.bathrooms)}
                          {renderDataElement('Reception Rooms', '/propertyPack/residentialPropertyFeatures/receptions', stateData.propertyPack?.residentialPropertyFeatures?.receptions)}
                          {renderDataElement('Internal Area', '/propertyPack/buildInformation/internalArea', stateData.propertyPack?.buildInformation?.internalArea, (area) => area ? `${area.area} ${area.unit}` : 'Not provided')}
                        </CardContent>
                      </Card>

                      {/* Utilities & Services */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">Utilities & Services</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {renderDataElement('Electricity Supplier', '/propertyPack/electricity/mainsElectricity/supplier', stateData.propertyPack?.electricity?.mainsElectricity?.supplier)}
                          {renderDataElement('Electricity Meter', '/propertyPack/electricity/mainsElectricity/electricityMeter', stateData.propertyPack?.electricity?.mainsElectricity?.electricityMeter, (meter) => meter ? `${meter.type || 'Unknown type'} - ${meter.location || 'Location not specified'}` : 'Not provided')}
                          {renderDataElement('Water Supplier', '/propertyPack/waterAndDrainage/mainsWater/supplier', stateData.propertyPack?.waterAndDrainage?.mainsWater?.supplier)}
                          {renderDataElement('Water Meter', '/propertyPack/waterAndDrainage/mainsWater/waterMeter', stateData.propertyPack?.waterAndDrainage?.mainsWater?.waterMeter, formatPrettyJson)}
                          {renderDataElement('Drainage', '/propertyPack/waterAndDrainage/drainage', stateData.propertyPack?.waterAndDrainage?.drainage, formatPrettyJson)}
                        </CardContent>
                      </Card>

                      {/* Heating & Energy */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">Heating & Energy</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {renderDataElement('Heating Type', '/propertyPack/heating/heatingSystem/heatingType', stateData.propertyPack?.heating?.heatingSystem?.heatingType)}
                          {renderDataElement('Central Heating Fuel', '/propertyPack/heating/heatingSystem/centralHeatingDetails/centralHeatingFuel/centralHeatingFuelType', stateData.propertyPack?.heating?.heatingSystem?.centralHeatingDetails?.centralHeatingFuel?.centralHeatingFuelType)}
                          {renderDataElement('Heating Last Serviced', '/propertyPack/heating/heatingSystem/centralHeatingDetails/heatingLastServicedDate', stateData.propertyPack?.heating?.heatingSystem?.centralHeatingDetails?.heatingLastServicedDate, formatDate)}
                          {renderDataElement('Heating Working Order', '/propertyPack/heating/heatingSystem/centralHeatingDetails/heatingInGoodWorkingOrder/yesNo', stateData.propertyPack?.heating?.heatingSystem?.centralHeatingDetails?.heatingInGoodWorkingOrder?.yesNo)}
                          {renderDataElement('Other Heating Features', '/propertyPack/heating/otherHeatingFeatures', stateData.propertyPack?.heating?.otherHeatingFeatures, (features) => Array.isArray(features) ? features.join(', ') : formatPrettyJson(features))}
                          {renderDataElement('Heat Pump', '/propertyPack/electricity/heatPump/yesNo', stateData.propertyPack?.electricity?.heatPump?.yesNo)}
                          {renderDataElement('Solar Panels', '/propertyPack/electricity/solarPanels/yesNo', stateData.propertyPack?.electricity?.solarPanels?.yesNo)}
                        </CardContent>
                      </Card>

                      {/* Connectivity */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">Connectivity</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {renderDataElement('Broadband Available', '/propertyPack/connectivity/broadband/yesNo', stateData.propertyPack?.connectivity?.broadband?.yesNo)}
                          {renderDataElement('Broadband Type', '/propertyPack/connectivity/broadband/typeOfConnection', stateData.propertyPack?.connectivity?.broadband?.typeOfConnection)}
                          {renderDataElement('Broadband Speed', '/propertyPack/connectivity/broadband/predictedSpeed', stateData.propertyPack?.connectivity?.broadband?.predictedSpeed, (speed) => speed ? `Max Download: ${speed.maxPredictedDown || speed.maxBbPredictedDown}Mbps, Max Upload: ${speed.maxPredictedUp || speed.maxBbPredictedUp}Mbps` : 'Not provided')}
                          {renderDataElement('Cable/Satellite TV', '/propertyPack/connectivity/cableSatelliteTV', stateData.propertyPack?.connectivity?.cableSatelliteTV, formatPrettyJson)}
                          {renderDataElement('Mobile Coverage', '/propertyPack/connectivity/mobilePhone/predictedCoverage', stateData.propertyPack?.connectivity?.mobilePhone?.predictedCoverage, (coverage) => coverage ? `Indoor: EE ${coverage.eeDataIndoor}/4, Outdoor: EE ${coverage.eeDataOutdoor}/4` : 'Not provided')}
                        </CardContent>
                      </Card>

                      {/* Environmental Issues */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">Environmental Issues</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {renderDataElement('Flood Risk', '/propertyPack/environmentalIssues/flooding/floodRisk/summary', stateData.propertyPack?.environmentalIssues?.flooding?.floodRisk?.summary)}
                          {renderDataElement('Historical Flooding', '/propertyPack/environmentalIssues/flooding/historicalFlooding/hasBeenFlooded', stateData.propertyPack?.environmentalIssues?.flooding?.historicalFlooding?.hasBeenFlooded)}
                          {renderDataElement('Coal Mining Risk', '/propertyPack/environmentalIssues/coalMining/result', stateData.propertyPack?.environmentalIssues?.coalMining?.result)}
                          {renderDataElement('Non-Coal Mining Risk', '/propertyPack/environmentalIssues/nonCoalMining/result', stateData.propertyPack?.environmentalIssues?.nonCoalMining?.result)}
                          {renderDataElement('Coastal Erosion Risk', '/propertyPack/environmentalIssues/coastalErosion/result', stateData.propertyPack?.environmentalIssues?.coastalErosion?.result)}
                          {renderDataElement('Radon Test Required', '/propertyPack/environmentalIssues/radon/radonTest/yesNo', stateData.propertyPack?.environmentalIssues?.radon?.radonTest?.yesNo)}
                        </CardContent>
                      </Card>

                      {/* Legal Matters */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">Legal Matters</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {renderDataElement('Disputes', '/propertyPack/legal/disputes', stateData.propertyPack?.legal?.disputes, formatPrettyJson)}
                          {renderDataElement('Boundaries', '/propertyPack/legal/boundaries', stateData.propertyPack?.legal?.boundaries, formatPrettyJson)}
                          {renderDataElement('Rights of Way', '/propertyPack/legal/rightsOfWay', stateData.propertyPack?.legal?.rightsOfWay, formatPrettyJson)}
                          {renderDataElement('Easements', '/propertyPack/legal/easements', stateData.propertyPack?.legal?.easements, formatPrettyJson)}
                          {renderDataElement('Covenants', '/propertyPack/covenants', stateData.propertyPack?.covenants, (covenants) => Array.isArray(covenants) ? covenants.map(c => c.description || c.text || formatPrettyJson(c)).join(' • ') : formatPrettyJson(covenants))}
                          {renderDataElement('Charges', '/propertyPack/charges', stateData.propertyPack?.charges, (charges) => Array.isArray(charges) ? charges.map(c => `${c.chargeType || 'Charge'}: ${c.chargeDate || ''} ${c.chargee || ''}`.trim()).join(' • ') : formatPrettyJson(charges))}
                        </CardContent>
                      </Card>

                      {/* Insurance & Warranties */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">Insurance & Warranties</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {renderDataElement('Building Insurance', '/propertyPack/insurance/building', stateData.propertyPack?.insurance?.building, formatPrettyJson)}
                          {renderDataElement('Structural Warranty', '/propertyPack/insurance/structuralWarranty', stateData.propertyPack?.insurance?.structuralWarranty, formatPrettyJson)}
                          {renderDataElement('NHBC/Premier Guarantee', '/propertyPack/insurance/nhbc', stateData.propertyPack?.insurance?.nhbc, formatPrettyJson)}
                          {renderDataElement('Defects Insurance', '/propertyPack/insurance/defects', stateData.propertyPack?.insurance?.defects, formatPrettyJson)}
                        </CardContent>
                      </Card>

                      {/* Alterations & Works */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">Alterations & Works</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {renderDataElement('Building Works', '/propertyPack/alterations/buildingWork', stateData.propertyPack?.alterations?.buildingWork, formatPrettyJson)}
                          {renderDataElement('Extensions', '/propertyPack/alterations/extensions', stateData.propertyPack?.alterations?.extensions, formatPrettyJson)}
                          {renderDataElement('Building Control', '/propertyPack/alterations/buildingControl', stateData.propertyPack?.alterations?.buildingControl, formatPrettyJson)}
                          {renderDataElement('Party Wall', '/propertyPack/alterations/partyWall', stateData.propertyPack?.alterations?.partyWall, formatPrettyJson)}
                        </CardContent>
                      </Card>

                      {/* Local Authority Information */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">Local Authority Information</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {renderDataElement('Local Authority', '/propertyPack/localAuthority/localAuthorityName', stateData.propertyPack?.localAuthority?.localAuthorityName)}
                          {renderDataElement('District Council', '/propertyPack/localAuthority/districtCouncil', stateData.propertyPack?.localAuthority?.districtCouncil)}
                          {renderDataElement('County Council', '/propertyPack/localAuthority/countyCouncil', stateData.propertyPack?.localAuthority?.countyCouncil)}
                          {renderDataElement('Council Tax Band', '/propertyPack/councilTax/councilTaxBand', stateData.propertyPack?.councilTax?.councilTaxBand)}
                          {renderDataElement('Council Tax Annual Charge', '/propertyPack/councilTax/councilTaxAnnualCharge', stateData.propertyPack?.councilTax?.councilTaxAnnualCharge, formatCurrency)}
                        </CardContent>
                      </Card>

                      {/* Planning & Conservation */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">Planning & Conservation</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {renderDataElement('Listed Building', '/propertyPack/listingAndConservation/isListed/yesNo', stateData.propertyPack?.listingAndConservation?.isListed?.yesNo)}
                          {renderDataElement('Conservation Area', '/propertyPack/listingAndConservation/isConservationArea/yesNo', stateData.propertyPack?.listingAndConservation?.isConservationArea?.yesNo)}
                          {renderDataElement('Tree Preservation Order', '/propertyPack/listingAndConservation/hasTreePreservationOrder/yesNo', stateData.propertyPack?.listingAndConservation?.hasTreePreservationOrder?.yesNo)}
                          {renderDataElement('Planning Applications', '/planningApplications', stateData.planningApplications, (apps) => Array.isArray(apps) ? apps.map(app => `${app.reference}: ${app.proposal} (${app.status})`).join(' • ') : formatPrettyJson(apps))}
                        </CardContent>
                      </Card>

                      {/* Transport & Access */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">Transport & Access</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {renderDataElement('Parking Arrangements', '/propertyPack/parking/parkingArrangements', stateData.propertyPack?.parking?.parkingArrangements, (arrangements) => Array.isArray(arrangements) ? arrangements.join(', ') : arrangements)}
                          {renderDataElement('Controlled Parking', '/propertyPack/parking/controlledParking/yesNo', stateData.propertyPack?.parking?.controlledParking?.yesNo)}
                          {renderDataElement('Disabled Parking', '/propertyPack/parking/disabledParking/yesNo', stateData.propertyPack?.parking?.disabledParking?.yesNo)}
                          {renderDataElement('EV Charging Point', '/propertyPack/parking/electricVehicleChargingPoint/yesNo', stateData.propertyPack?.parking?.electricVehicleChargingPoint?.yesNo)}
                        </CardContent>
                      </Card>

                      {/* Services & Amenities */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">Services & Amenities</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {renderDataElement('Schools', '/propertyPack/amenities/schools', stateData.propertyPack?.amenities?.schools, formatPrettyJson)}
                          {renderDataElement('Healthcare', '/propertyPack/amenities/healthcare', stateData.propertyPack?.amenities?.healthcare, formatPrettyJson)}
                          {renderDataElement('Shopping', '/propertyPack/amenities/shopping', stateData.propertyPack?.amenities?.shopping, formatPrettyJson)}
                          {renderDataElement('Leisure Facilities', '/propertyPack/amenities/leisure', stateData.propertyPack?.amenities?.leisure, formatPrettyJson)}
                        </CardContent>
                      </Card>
                    </div>


                    {/* Legal Owners - Land Registry Title Information */}
                    {(stateData.propertyPack?.registeredProprietor || stateData.propertyPack?.legalOwners) && (
                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-gray-900">Land Registry Title Summary</h3>

                        {/* Registered Proprietor */}
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-base">Registered Proprietor</CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            {stateData.propertyPack?.registeredProprietor && (
                              renderDataElement('Registered Proprietor', '/propertyPack/registeredProprietor', stateData.propertyPack.registeredProprietor)
                            )}
                            {stateData.propertyPack?.legalOwners && Array.isArray(stateData.propertyPack.legalOwners) && stateData.propertyPack.legalOwners.map((owner, index) => (
                              <div key={index}>
                                {renderDataElement(`Legal Owner ${index + 1}`, `/propertyPack/legalOwners/${index}`, owner)}
                              </div>
                            ))}
                          </CardContent>
                        </Card>

                        {/* Title Restrictions */}
                        {stateData.propertyPack?.restrictions && stateData.propertyPack.restrictions.length > 0 && (
                          <Card>
                            <CardHeader>
                              <CardTitle className="text-base">Title Restrictions</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                              {stateData.propertyPack.restrictions.map((restriction, index) => (
                                <div key={index}>
                                  {renderDataElement(`Restriction ${index + 1}`, `/propertyPack/restrictions/${index}`, restriction)}
                                </div>
                              ))}
                            </CardContent>
                          </Card>
                        )}

                        {/* Charges */}
                        {stateData.propertyPack?.charges && stateData.propertyPack.charges.length > 0 && (
                          <Card>
                            <CardHeader>
                              <CardTitle className="text-base">Registered Charges</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                              {stateData.propertyPack.charges.map((charge, index) => (
                                <div key={index}>
                                  {renderDataElement(`Charge ${index + 1}`, `/propertyPack/charges/${index}`, charge)}
                                </div>
                              ))}
                            </CardContent>
                          </Card>
                        )}

                        {/* Covenants */}
                        {stateData.propertyPack?.covenants && stateData.propertyPack.covenants.length > 0 && (
                          <Card>
                            <CardHeader>
                              <CardTitle className="text-base">Covenants</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                              {stateData.propertyPack.covenants.map((covenant, index) => (
                                <div key={index}>
                                  {renderDataElement(`Covenant ${index + 1}`, `/propertyPack/covenants/${index}`, covenant)}
                                </div>
                              ))}
                            </CardContent>
                          </Card>
                        )}
                      </div>
                    )}

                    {/* Planning Applications */}
                    {stateData.planningApplications && stateData.planningApplications.length > 0 && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">Planning Applications</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {stateData.planningApplications.map((application, index) => (
                            <div key={index} className="border rounded-lg p-3 space-y-2">
                              {renderDataElement('Reference', `/planningApplications/${index}/reference`, application.reference)}
                              {renderDataElement('Description', `/planningApplications/${index}/description`, application.description)}
                              {renderDataElement('Status', `/planningApplications/${index}/status`, application.status)}
                              {renderDataElement('Date Submitted', `/planningApplications/${index}/dateSubmitted`, application.dateSubmitted, formatDate)}
                              {renderDataElement('Date Decided', `/planningApplications/${index}/dateDecided`, application.dateDecided, formatDate)}
                            </div>
                          ))}
                        </CardContent>
                      </Card>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Summary Panel */}
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <Server className="h-4 w-4" />
                      Data Sources
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span>Claims:</span>
                        <Badge variant="outline">{claimsData?.claims?.length || 0}</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Service:</span>
                        <Badge variant="secondary">{PDTF_SERVICES[0].name}</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="title" className="space-y-6">
            {stateData.propertyPack?.titlesToBeSold?.[0]?.registerExtract?.ocSummaryData ? (
              <div className="space-y-6">
                {/* Complete Title Register Extract */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-xl flex items-center gap-2">
                      <FileText className="h-6 w-6 text-amber-600" />
                      Land Registry Title Register - Complete Extract
                    </CardTitle>
                    <p className="text-gray-600">Full official copy of the Land Registry title for this property</p>
                  </CardHeader>
                  <CardContent className="space-y-6">

                    {/* Title Details */}
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h3 className="font-semibold text-lg mb-4">Title Information</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {renderDataElement('Title Number', '/propertyPack/titlesToBeSold/0/registerExtract/ocSummaryData/title/titleNumber', stateData.propertyPack.titlesToBeSold[0].registerExtract?.ocSummaryData?.title?.titleNumber)}
                        {renderDataElement('Class of Title', '/propertyPack/titlesToBeSold/0/registerExtract/ocSummaryData/title/classOfTitleCode', stateData.propertyPack.titlesToBeSold[0].registerExtract?.ocSummaryData?.title?.classOfTitleCode)}
                        {renderDataElement('Registration Date', '/propertyPack/titlesToBeSold/0/registerExtract/ocSummaryData/title/titleRegistrationDetails/registrationDate', stateData.propertyPack.titlesToBeSold[0].registerExtract?.ocSummaryData?.title?.titleRegistrationDetails?.registrationDate, formatDate)}
                        {renderDataElement('Edition Date', '/propertyPack/titlesToBeSold/0/registerExtract/ocSummaryData/editionDate', stateData.propertyPack.titlesToBeSold[0].registerExtract?.ocSummaryData?.editionDate, formatDate)}
                        {renderDataElement('Official Copy Date & Time', '/propertyPack/titlesToBeSold/0/registerExtract/ocSummaryData/officialCopyDateTime', stateData.propertyPack.titlesToBeSold[0].registerExtract?.ocSummaryData?.officialCopyDateTime, formatDate)}
                        {renderDataElement('Land Registry Office', '/propertyPack/titlesToBeSold/0/registerExtract/ocSummaryData/title/titleRegistrationDetails/landRegistryOfficeName', stateData.propertyPack.titlesToBeSold[0].registerExtract?.ocSummaryData?.title?.titleRegistrationDetails?.landRegistryOfficeName)}
                      </div>
                    </div>

                    {/* Registered Proprietors */}
                    {stateData.propertyPack.titlesToBeSold[0].registerExtract?.ocSummaryData?.proprietorship?.registeredProprietorParty && (
                      <div className="bg-blue-50 p-4 rounded-lg">
                        <h3 className="font-semibold text-lg mb-4">Registered Proprietors (Legal Owners)</h3>
                        <div className="space-y-4">
                          {stateData.propertyPack.titlesToBeSold[0].registerExtract.ocSummaryData.proprietorship.registeredProprietorParty.map((proprietor, index) => (
                            <div key={index} className="bg-white border border-blue-200 p-4 rounded-lg">
                              <h4 className="font-medium text-lg mb-3">Proprietor {index + 1}</h4>
                              <div className="space-y-2">
                                {proprietor.privateIndividual?.name && (
                                  <div>
                                    <span className="font-medium text-gray-700">Name: </span>
                                    <span className="text-gray-900">
                                      {proprietor.privateIndividual.name.forenamesName} {proprietor.privateIndividual.name.surnameName}
                                    </span>
                                  </div>
                                )}
                                {proprietor.address && (
                                  <div>
                                    <span className="font-medium text-gray-700">Address: </span>
                                    <span className="text-gray-900">
                                      {Array.isArray(proprietor.address.addressLine?.line)
                                        ? proprietor.address.addressLine.line.join(', ')
                                        : proprietor.address.addressLine?.line
                                      }
                                      {proprietor.address.postcodeZone?.postcode &&
                                        `, ${proprietor.address.postcodeZone.postcode}`
                                      }
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                          <div className="mt-4">
                            {renderDataElement('Current Proprietorship Date', '/propertyPack/titlesToBeSold/0/registerExtract/ocSummaryData/proprietorship/currentProprietorshipDate', stateData.propertyPack.titlesToBeSold[0].registerExtract?.ocSummaryData?.proprietorship?.currentProprietorshipDate, formatDate)}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Price Paid Information */}
                    {stateData.propertyPack.titlesToBeSold[0].registerExtract?.ocSummaryData?.pricePaidEntry && (
                      <div className="bg-green-50 p-4 rounded-lg">
                        <h3 className="font-semibold text-lg mb-4">Price Paid Information</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {renderDataElement('Last Sale Price', '/propertyPack/titlesToBeSold/0/registerExtract/ocSummaryData/pricePaidEntry/entryDetails/infills/amount', stateData.propertyPack.titlesToBeSold[0].registerExtract?.ocSummaryData?.pricePaidEntry?.entryDetails?.infills?.amount, formatCurrency)}
                          {renderDataElement('Last Sale Date', '/propertyPack/titlesToBeSold/0/registerExtract/ocSummaryData/pricePaidEntry/entryDetails/infills/date', stateData.propertyPack.titlesToBeSold[0].registerExtract?.ocSummaryData?.pricePaidEntry?.entryDetails?.infills?.date, formatDate)}
                          {renderDataElement('Price Paid Registration Date', '/propertyPack/titlesToBeSold/0/registerExtract/ocSummaryData/pricePaidEntry/entryDetails/registrationDate', stateData.propertyPack.titlesToBeSold[0].registerExtract?.ocSummaryData?.pricePaidEntry?.entryDetails?.registrationDate, formatDate)}
                        </div>
                      </div>
                    )}

                    {/* Document Details */}
                    {stateData.propertyPack.titlesToBeSold[0].registerExtract?.ocSummaryData?.documentDetails?.document && (
                      <div className="bg-purple-50 p-4 rounded-lg">
                        <h3 className="font-semibold text-lg mb-4">Document History</h3>
                        <div className="space-y-3">
                          {stateData.propertyPack.titlesToBeSold[0].registerExtract.ocSummaryData.documentDetails.document.map((doc, index) => (
                            <div key={index} className="bg-white border border-purple-200 p-3 rounded">
                              <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                  <span className="font-medium text-gray-700">Date: </span>
                                  <span className="text-gray-900">{formatDate(doc.documentDate)}</span>
                                </div>
                                <div>
                                  <span className="font-medium text-gray-700">Type: </span>
                                  <span className="text-gray-900">{doc.registerDescription || `Document Type ${doc.documentType}`}</span>
                                </div>
                                {doc.entryNumber && (
                                  <div className="col-span-2">
                                    <span className="font-medium text-gray-700">Entry Numbers: </span>
                                    <span className="text-gray-900">
                                      {Array.isArray(doc.entryNumber) ? doc.entryNumber.join(', ') : doc.entryNumber}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Title Extents (Boundary Information) */}
                    {stateData.propertyPack.titlesToBeSold[0].titleExtents && (
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <h3 className="font-semibold text-lg mb-4">Property Boundaries</h3>
                        <div className="text-sm text-gray-600">
                          <p>Boundary coordinates are available in GeoJSON format for mapping applications.</p>
                          <details className="mt-2">
                            <summary className="cursor-pointer font-medium text-gray-700 hover:text-gray-900">
                              View Boundary Data
                            </summary>
                            <pre className="mt-2 p-2 bg-white border rounded text-xs overflow-x-auto">
                              {stateData.propertyPack.titlesToBeSold[0].titleExtents}
                            </pre>
                          </details>
                        </div>
                      </div>
                    )}

                  </CardContent>
                </Card>
              </div>
            ) : (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>No Title Register Data</AlertTitle>
                <AlertDescription>
                  Title register information is not available for this property.
                </AlertDescription>
              </Alert>
            )}
          </TabsContent>

          <TabsContent value="analysis" className="space-y-6">
            {/* AI Report on Title Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <Bot className="h-5 w-5 text-blue-600" />
                  AI Report on Title
                </CardTitle>
                <CardDescription>
                  Generate a comprehensive Report on Title using AI analysis of the property data
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Button
                    onClick={generateReportOnTitle}
                    disabled={analysisLoading || !stateData}
                    className="w-full sm:w-auto"
                  >
                    {analysisLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                        Generating Report on Title...
                      </>
                    ) : (
                      <>
                        <Bot className="h-4 w-4 mr-2" />
                        Generate Report on Title
                      </>
                    )}
                  </Button>

                  {analysisResult && (
                    <div className="mt-6 space-y-4">
                      {/* Property Summary */}
                      {analysisResult.property && (
                        <div className="border rounded-lg p-4 bg-gradient-to-r from-blue-50 to-indigo-50">
                          <h4 className="font-semibold text-lg mb-2 flex items-center gap-2">
                            <Building className="h-5 w-5 text-blue-600" />
                            Property Summary
                          </h4>
                          <div className="text-sm text-gray-700">
                            <div><strong>Address:</strong> {formatAddress(analysisResult.property.address)}</div>
                            <div><strong>Title Number:</strong> {analysisResult.property.titleNumber}</div>
                          </div>
                        </div>
                      )}

                      {/* Report on Title Content */}
                      {analysisResult.reportOnTitle && (
                        <div className="border rounded-lg">
                          <div className="p-4 border-b bg-gradient-to-r from-amber-50 to-yellow-50">
                            <h4 className="font-semibold text-lg flex items-center gap-2">
                              <FileText className="h-5 w-5 text-amber-600" />
                              Report on Title
                            </h4>
                            <p className="text-sm text-gray-600 mt-1">AI-generated comprehensive title analysis</p>
                          </div>
                          <div className="p-6">
                            <div className="prose prose-sm max-w-none prose-headings:text-slate-900 prose-p:text-slate-700 prose-strong:text-slate-900 prose-ul:text-slate-700 prose-ol:text-slate-700 prose-li:text-slate-700 prose-table:text-slate-700">
                              <ReactMarkdown>
                                {analysisResult.reportOnTitle}
                              </ReactMarkdown>
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="text-xs text-gray-500 italic border-l-4 border-amber-200 pl-3 py-2 bg-amber-50">
                        <strong>Important Notice:</strong> This Report on Title is generated by AI for demonstration purposes only.
                        This analysis should not be relied upon for actual conveyancing transactions. Professional legal advice should always be sought.
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="insights" className="space-y-6">
            {/* AI Diligence Insights Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <Shield className="h-5 w-5 text-purple-600" />
                  AI Diligence Insights
                </CardTitle>
                <CardDescription>
                  Structured AI checks for common conveyancing issues with risk scoring
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Button
                    onClick={generateDiligenceInsights}
                    disabled={insightsLoading || !stateData}
                    className="w-full sm:w-auto"
                  >
                    {insightsLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                        Analyzing Property Data...
                      </>
                    ) : (
                      <>
                        <Shield className="h-4 w-4 mr-2" />
                        Generate Diligence Insights
                      </>
                    )}
                  </Button>

                  {insightsResult && (
                    <div className="mt-6 space-y-6">
                      {/* Overall Risk Assessment */}
                      <div className="border rounded-lg p-6 bg-gradient-to-r from-slate-50 to-gray-50">
                        <h4 className="font-semibold text-lg mb-4 flex items-center gap-2">
                          <Shield className="h-5 w-5 text-purple-600" />
                          Overall Risk Assessment
                        </h4>
                        <div className="flex items-center gap-4">
                          <Badge
                            variant={
                              insightsResult.overallRisk.level === 'critical' ? 'destructive' :
                              insightsResult.overallRisk.level === 'high' ? 'destructive' :
                              insightsResult.overallRisk.level === 'medium' ? 'secondary' : 'outline'
                            }
                            className="text-sm px-3 py-1"
                          >
                            {insightsResult.overallRisk.level.toUpperCase()} RISK
                          </Badge>
                          <span className="text-gray-700">{insightsResult.overallRisk.description}</span>
                        </div>

                        {/* Summary Statistics */}
                        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="text-center p-2 bg-white rounded border">
                            <div className="text-2xl font-bold text-green-600">{insightsResult.summary.passedChecks}</div>
                            <div className="text-xs text-gray-600">Passed</div>
                          </div>
                          <div className="text-center p-2 bg-white rounded border">
                            <div className="text-2xl font-bold text-yellow-600">{insightsResult.summary.warningChecks}</div>
                            <div className="text-xs text-gray-600">Warnings</div>
                          </div>
                          <div className="text-center p-2 bg-white rounded border">
                            <div className="text-2xl font-bold text-red-600">{insightsResult.summary.failedChecks}</div>
                            <div className="text-xs text-gray-600">Failed</div>
                          </div>
                          <div className="text-center p-2 bg-white rounded border">
                            <div className="text-2xl font-bold text-blue-600">{insightsResult.summary.totalChecks}</div>
                            <div className="text-xs text-gray-600">Total</div>
                          </div>
                        </div>
                      </div>

                      {/* Individual Check Results */}
                      <div className="space-y-4">
                        <h4 className="font-semibold text-lg flex items-center gap-2">
                          <FileText className="h-5 w-5 text-blue-600" />
                          Individual Check Results
                        </h4>

                        {insightsResult.checks.map((check, index) => (
                          <Card key={check.checkId || index} className={`border-l-4 ${
                            check.status === 'fail' ? 'border-red-500 bg-red-50' :
                            check.status === 'warning' ? 'border-yellow-500 bg-yellow-50' :
                            'border-green-500 bg-green-50'
                          }`}>
                            <CardHeader className="pb-3">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <CardTitle className="text-base flex items-center gap-2">
                                    {check.name}
                                    <Badge
                                      variant={
                                        check.status === 'fail' ? 'destructive' :
                                        check.status === 'warning' ? 'secondary' : 'default'
                                      }
                                      className="text-xs"
                                    >
                                      {check.status.toUpperCase()}
                                    </Badge>
                                  </CardTitle>
                                  <p className="text-sm text-gray-600 mt-1">{check.description}</p>
                                </div>
                                <div className="flex flex-col items-end gap-1">
                                  <Badge
                                    variant={
                                      check.riskLevel === 'critical' ? 'destructive' :
                                      check.riskLevel === 'high' ? 'destructive' :
                                      check.riskLevel === 'medium' ? 'secondary' : 'outline'
                                    }
                                    className="text-xs"
                                  >
                                    {check.riskLevel.toUpperCase()}
                                  </Badge>
                                  <Badge variant="outline" className="text-xs">
                                    {check.confidence} confidence
                                  </Badge>
                                </div>
                              </div>
                            </CardHeader>
                            <CardContent className="space-y-3">
                              <div>
                                <h5 className="font-medium text-sm mb-1">Findings</h5>
                                <p className="text-sm text-gray-700">{check.findings}</p>
                              </div>

                              <div>
                                <h5 className="font-medium text-sm mb-1">Details</h5>
                                <p className="text-sm text-gray-700">{check.details}</p>
                              </div>

                              <div>
                                <h5 className="font-medium text-sm mb-1">Recommendations</h5>
                                <p className="text-sm text-gray-700">{check.recommendations}</p>
                              </div>

                              {/* Relevant Claims Section */}
                              {check.relevantClaimIds && check.relevantClaimIds.length > 0 && (
                                <div className="pt-3 border-t border-gray-200">
                                  <div className="flex items-center justify-between mb-2">
                                    <h5 className="font-medium text-sm text-gray-700">Supporting Evidence</h5>
                                    <Badge variant="outline" className="text-xs">
                                      {check.relevantClaimIds.length} claim{check.relevantClaimIds.length > 1 ? 's' : ''}
                                    </Badge>
                                  </div>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => showClaimsForCheck(check)}
                                    className="text-xs h-7 px-3"
                                  >
                                    <FileText className="h-3 w-3 mr-1" />
                                    View Source Claims ({check.relevantClaimIds.length})
                                  </Button>
                                </div>
                              )}

                              <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-gray-200">
                                <span>Category: {check.category}</span>
                                <span>Analyzed: {new Date(check.timestamp).toLocaleString()}</span>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>

                      {/* Property Summary */}
                      {insightsResult.property && (
                        <div className="border rounded-lg p-4 bg-gradient-to-r from-blue-50 to-indigo-50">
                          <h4 className="font-semibold text-lg mb-2 flex items-center gap-2">
                            <Building className="h-5 w-5 text-blue-600" />
                            Property Summary
                          </h4>
                          <div className="text-sm text-gray-700">
                            <div><strong>Address:</strong> {formatAddress(insightsResult.property.address)}</div>
                            <div><strong>Title Number:</strong> {insightsResult.property.titleNumber}</div>
                          </div>
                        </div>
                      )}

                      <div className="text-xs text-gray-500 italic border-l-4 border-purple-200 pl-3 py-2 bg-purple-50">
                        <strong>Important Notice:</strong> {insightsResult.disclaimer}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {/* Claims Detail Dialog */}
      <Dialog open={claimsDialogOpen} onOpenChange={setClaimsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Claims for: {selectedClaims?.label}</DialogTitle>
            <DialogDescription>
              Path: {selectedClaims?.path} | {selectedClaims?.claims?.length || 0} contributing claims
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {selectedClaims?.claims?.map((claim, index) => (
              <Card key={claim.id || index}>
                <CardContent className="p-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <strong>Claim ID:</strong> {claim.id || 'Unknown'}
                    </div>
                    <div>
                      <strong>Trust Framework:</strong> {claim.verification?.trust_framework || 'Unknown'}
                    </div>
                    <div className="col-span-2">
                      <strong>Timestamp:</strong> {claim.verification?.time ? new Date(claim.verification.time).toLocaleString() : 'Unknown'}
                    </div>
                    <div className="col-span-2">
                      <strong>Claims Data:</strong>
                      <pre className="mt-1 p-2 bg-gray-100 rounded text-xs overflow-x-auto">
                        {JSON.stringify(claim.claims || {}, null, 2)}
                      </pre>
                    </div>
                    {claim.verification?.evidence && (
                      <div className="col-span-2">
                        <strong>Evidence:</strong>
                        <div className="mt-1 space-y-2">
                          {claim.verification.evidence.map((evidence, evidenceIndex) => (
                            <div key={evidenceIndex} className="p-2 bg-blue-50 rounded text-xs">
                              <div><strong>Type:</strong> {evidence.type}</div>

                              {/* Show verification method only if not 'unknown' and evidence type is not electronic_record */}
                              {evidence.verification_method?.type &&
                               evidence.verification_method.type !== 'unknown' &&
                               evidence.type !== 'electronic_record' && (
                                <div><strong>Method:</strong> {evidence.verification_method.type}</div>
                              )}

                              {/* Show data source for electronic records */}
                              {evidence.record?.source?.name && (
                                <div><strong>Data Source:</strong> {evidence.record.source.name}</div>
                              )}

                              {/* Show attestation information for vouch types */}
                              {evidence.attestation && (
                                <div>
                                  <strong>Attestation:</strong> {evidence.attestation.type}
                                  {evidence.attestation.voucher?.name && (
                                    <span> by {evidence.attestation.voucher.name}</span>
                                  )}
                                </div>
                              )}

                              {/* Show attachments if available */}
                              {evidence.attachments && evidence.attachments.length > 0 && (
                                <div>
                                  <strong>Attachments:</strong>
                                  <ul className="ml-2 mt-1">
                                    {evidence.attachments.map((attachment, attachIndex) => (
                                      <li key={attachIndex} className="text-xs">
                                        {attachment.desc && <span>{attachment.desc}</span>}
                                        {attachment.url && (
                                          <a href={attachment.url} target="_blank" rel="noopener noreferrer"
                                             className="text-blue-600 hover:text-blue-800 ml-1">
                                            (View)
                                          </a>
                                        )}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default ConveyancingDiligence;