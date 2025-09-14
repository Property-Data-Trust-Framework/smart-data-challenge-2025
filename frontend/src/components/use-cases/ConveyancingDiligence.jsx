import { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Building, MapPin, Users, FileText, Shield, Clock, ExternalLink, Verified, Server, AlertCircle, Bot, Eye } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { pdtfAPI } from '@/lib/api';
import jp from 'json-pointer';
import traverse from 'traverse';

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
    console.log('getClaimsMap: No verified claims or not an array:', verifiedClaims);
    return claimsMap;
  }

  console.log('getClaimsMap: Processing', verifiedClaims.length, 'verified claims');
  console.log('Sample verified claim:', verifiedClaims[0]);

  verifiedClaims.forEach((verifiedClaim, index) => {
    if (!verifiedClaim.claims || typeof verifiedClaim.claims !== 'object') {
      console.log(`Verified claim ${index}: No claims object found`, verifiedClaim);
      return;
    }

    Object.entries(verifiedClaim.claims).forEach(([claimPath, claimObject]) => {
      console.log(`Processing claim path: ${claimPath}`, claimObject);

      let subIndex = 0;
      // if the path ends with a dash, it means it is an array append
      let indexedClaimPath = claimPath;
      if (claimPath.endsWith("-")) {
        try {
          const existingIndexedObject = jp.get(claimsMap, claimPath.slice(0, -2));
          if (existingIndexedObject) {
            subIndex = existingIndexedObject.length;
          }
        } catch (e) {
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
          } catch (e) {
            // Path doesn't exist, create it
            jp.set(claimsMap, fullPath, [verifiedClaim]);
          }
        }
      });
    });
  });

  console.log('getClaimsMap: Created claims map with paths:', Object.keys(flatten(claimsMap)));
  return claimsMap;
};

// Helper function to flatten nested objects to see all paths
const flatten = (obj, prefix = '') => {
  let result = {};
  for (let key in obj) {
    if (obj.hasOwnProperty(key)) {
      const newKey = prefix ? `${prefix}/${key}` : key;
      if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
        Object.assign(result, flatten(obj[key], newKey));
      } else {
        result[newKey] = obj[key];
      }
    }
  }
  return result;
};

const latestClaimFromMapForPath = (claimsMap, path) => {
  const claims = jp.get(claimsMap, path);
  if (claims && Array.isArray(claims)) {
    return claims[claims.length - 1];
  }
  return null;
};

const contributingClaimsFromMapForData = (claimsMap, dataPath, data) => {
  const claims = [];

  if (data === null || data === undefined) {
    // For simple paths, just check if there are claims directly
    try {
      const directClaims = jp.get(claimsMap, dataPath);
      if (directClaims && Array.isArray(directClaims)) {
        claims.push(...directClaims);
      }
    } catch (e) {
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
        } catch (e) {
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

const latestClaimsFromMapForData = (claimsMap, dataPath, data) => {
  const claims = [];
  traverse(data).forEach(function () {
    if (this.isLeaf) {
      const sourcePath =
        // json pointer is weird with "/" as the path
        this.path.length === 0
          ? dataPath
          : dataPath + "/" + this.path.join("/");
      const claimsHistory = jp.get(claimsMap, sourcePath);
      if (claimsHistory && Array.isArray(claimsHistory)) {
        claims.push(claimsHistory[claimsHistory.length - 1]);
      }
    }
  });
  const dedupedClaims = Array.from(new Set(claims));
  return dedupedClaims.sort((a, b) =>
    (a.verification?.time || '').localeCompare(b.verification?.time || '')
  );
};

// Render property pack data organized for conveyancer review
function ConveyancerPropertyPack({ state, claimsMap, onShowClaims }) {
  if (!state) return null;

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
            console.log('=== BUTTON CLICK DEBUG ===');
            console.log('Path:', path);
            console.log('Value:', value);
            console.log('Contributing claims found:', contributingClaims ? contributingClaims.length : 0);
            console.log('Has claims data:', hasClaimsData);
            if (claimsMap) {
              console.log('Available paths in claimsMap:', Object.keys(flatten(claimsMap)));
              console.log('Raw claimsMap structure:', claimsMap);
            }
            console.log('=== END DEBUG ===');

            if (hasClaimsData) {
              onShowClaims(path, label, contributingClaims);
            } else {
              console.log('No claims data for path:', path);
            }
          }}
          className={`${hasClaimsData ? 'opacity-0 group-hover:opacity-100' : 'opacity-50'} transition-opacity`}
        >
          <Eye className="h-4 w-4 mr-1" />
          {hasClaimsData ? `Claims (${contributingClaims.length})` : 'No Claims'}
        </Button>
      </div>
    );
  };

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

  const { toast } = useToast();

  const loadPDTFData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [claimsResponse, stateResponse] = await Promise.all([
        pdtfAPI.getPDTFClaims(PDTF_SERVICES[0].id, DEFAULT_TRANSACTION_ID),
        pdtfAPI.getPDTFState(PDTF_SERVICES[0].id, DEFAULT_TRANSACTION_ID)
      ]);

      console.log('claimsResponse:', claimsResponse);
      console.log('stateResponse:', stateResponse);

      setClaimsData(claimsResponse);
      setStateData(stateResponse);

      // Check different possible structures for claims data
      let claims = null;
      if (Array.isArray(claimsResponse)) {
        claims = claimsResponse;
        console.log('claimsResponse is an array (direct)');
      } else if (claimsResponse.claims && claimsResponse.claims.claims && Array.isArray(claimsResponse.claims.claims)) {
        claims = claimsResponse.claims.claims;
        console.log('Found claims at claimsResponse.claims.claims (nested structure)');
      } else if (claimsResponse.claims && Array.isArray(claimsResponse.claims)) {
        claims = claimsResponse.claims;
        console.log('Found claims at claimsResponse.claims');
      } else if (claimsResponse.data && Array.isArray(claimsResponse.data)) {
        claims = claimsResponse.data;
        console.log('Found claims at claimsResponse.data');
      } else {
        console.log('Could not find claims array in response structure');
        console.log('Full claimsResponse structure:', JSON.stringify(claimsResponse, null, 2));
      }

      // Generate claims map for UI interactions using improved mapping
      const generatedClaimsMap = getClaimsMap(claims);
      setClaimsMap(generatedClaimsMap);

      toast({
        title: "Data loaded successfully",
        description: `Loaded ${claims?.length || 0} claims from ${PDTF_SERVICES[0].name}`,
      });

    } catch (err) {
      console.error('Error loading PDTF data:', err);
      setError(err.response?.data?.error || err.message || 'Failed to load PDTF data');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const handleShowClaims = (path, label, claims) => {
    setSelectedClaims({ path, label, claims });
    setClaimsDialogOpen(true);
  };

  const generateDiligenceReport = async () => {
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
      const response = await pdtfAPI.generateDiligenceReport(stateData, claimsData, 'legal-diligence');

      if (response.success && response.report) {
        setAnalysisResult({
          summary: response.report.executiveSummary,
          riskLevel: response.report.riskAssessment.overallRisk,
          keyFindings: response.report.riskAssessment.riskFactors.map(factor => factor.description),
          fullReport: response.report
        });

        toast({
          title: "Analysis complete",
          description: "Legal diligence report generated successfully",
        });
      } else {
        throw new Error('Invalid response from diligence service');
      }

    } catch (err) {
      console.error('Error generating analysis:', err);
      toast({
        title: "Analysis failed",
        description: err.response?.data?.error || err.message || "Failed to generate diligence report",
        variant: "destructive"
      });
    } finally {
      setAnalysisLoading(false);
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Property Pack Data */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Property Pack Review</CardTitle>
                <CardDescription>
                  Click on any data element to view supporting claims and provenance
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ConveyancerPropertyPack
                  state={stateData}
                  claimsMap={claimsMap}
                  onShowClaims={handleShowClaims}
                />
              </CardContent>
            </Card>
          </div>

          {/* Analysis Panel */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bot className="h-5 w-5" />
                  AI Legal Analysis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={generateDiligenceReport}
                  disabled={analysisLoading}
                  className="w-full mb-4"
                >
                  {analysisLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Bot className="h-4 w-4 mr-2" />
                      Generate Report
                    </>
                  )}
                </Button>

                {analysisResult && (
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium mb-2">Risk Assessment</h4>
                      <Badge variant={
                        analysisResult.riskLevel === 'LOW' ? 'default' :
                        analysisResult.riskLevel === 'MEDIUM' ? 'secondary' : 'destructive'
                      }>
                        {analysisResult.riskLevel} Risk
                      </Badge>
                    </div>

                    <div>
                      <h4 className="font-medium mb-2">Executive Summary</h4>
                      <p className="text-sm text-gray-600">{analysisResult.summary}</p>
                    </div>

                    <div>
                      <h4 className="font-medium mb-2">Key Risk Factors</h4>
                      <ul className="text-sm space-y-1">
                        {analysisResult.keyFindings.map((finding, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <span className="text-orange-500 mt-1">⚠</span>
                            {finding}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {analysisResult.fullReport && analysisResult.fullReport.actionItems && (
                      <div>
                        <h4 className="font-medium mb-2">Action Items</h4>
                        <ul className="text-sm space-y-1">
                          {analysisResult.fullReport.actionItems.slice(0, 3).map((action, index) => (
                            <li key={index} className="flex items-start gap-2">
                              <Badge variant="outline" className="text-xs px-1 py-0">
                                {action.priority}
                              </Badge>
                              <span className="flex-1">{action.description}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {analysisResult.fullReport && (
                      <div className="pt-2 border-t">
                        <p className="text-xs text-gray-500">
                          {analysisResult.fullReport.disclaimer}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Claims Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Claims Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Total Claims:</span>
                    <Badge variant="outline">{Array.isArray(claimsData) ? claimsData.length : (claimsData?.claims?.length || 0)}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Data Points:</span>
                    <Badge variant="outline">{claimsMap?.size || 0}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Service:</span>
                    <Badge variant="secondary">{PDTF_SERVICES[0].name}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
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