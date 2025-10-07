import { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Building, MapPin, Users, FileText, Shield, Clock, ExternalLink, Verified, Server, AlertCircle, Bot, Eye, FolderOpen, TrendingUp, Loader2, CheckCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { usePDTF } from '@/contexts/PDTFContext';
import { pdtfAPI } from '@/lib/api';
import jp from 'json-pointer';
import traverse from 'traverse';

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

const contributingClaimsFromMapForData = (claimsMap, dataPath, data) => {
  const claims = [];

  // Ensure dataPath starts with /
  const normalizedPath = dataPath.startsWith('/') ? dataPath : `/${dataPath}`;

  if (data === null || data === undefined) {
    // For simple paths, just check if there are claims directly
    try {
      const directClaims = jp.get(claimsMap, normalizedPath);
      if (directClaims && Array.isArray(directClaims)) {
        claims.push(...directClaims);
      }
    } catch (error) {
      // Path doesn't exist in claims map - silently ignore
      console.debug(`No claims found for path: ${normalizedPath}`);
    }
  } else {
    traverse(data).forEach(function () {
      if (this.isLeaf) {
        const sourcePath =
          // json pointer is weird with "/" as the path
          this.path.length === 0
            ? normalizedPath
            : normalizedPath + "/" + this.path.join("/");
        try {
          const claimsToBeAdded = jp.get(claimsMap, sourcePath);
          if (claimsToBeAdded && Array.isArray(claimsToBeAdded)) {
            claims.push(...claimsToBeAdded);
          }
        } catch (error) {
          // Path doesn't exist in claims map, skip - silently ignore
          console.debug(`No claims found for path: ${sourcePath}`);
        }
      }
    });
  }

  const dedupedClaims = Array.from(new Set(claims));
  return dedupedClaims.sort((a, b) =>
    (a.verification?.time || '').localeCompare(b.verification?.time || '')
  );
};

// Render property pack data for lender AVM view
function LenderPropertyPack({ state, renderDataElement }) {
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
    // If already a formatted string (e.g., "£145000"), return as-is
    if (typeof amount === 'string') {
      return qualifier ? `${amount} (${qualifier})` : amount;
    }
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
          {renderDataElement('UPRN', '/propertyPack/uprn', propertyPack.uprn)}
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
          {renderDataElement('Land Registry Office', '/propertyPack/titlesToBeSold/0/registerExtract/ocSummaryData/title/titleRegistrationDetails/landRegistryOfficeName',
            propertyPack.titlesToBeSold?.[0]?.registerExtract?.ocSummaryData?.title?.titleRegistrationDetails?.landRegistryOfficeName)}
        </CardContent>
      </Card>

      {/* Registered Proprietors */}
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
            propertyPack.titlesToBeSold?.[0]?.registerExtract?.ocSummaryData?.pricePaidEntry?.entryDetails?.infills?.amount,
            (amount) => formatCurrency(amount))}
          {renderDataElement('Sale Date', '/propertyPack/titlesToBeSold/0/registerExtract/ocSummaryData/pricePaidEntry/entryDetails/infills/date',
            propertyPack.titlesToBeSold?.[0]?.registerExtract?.ocSummaryData?.pricePaidEntry?.entryDetails?.infills?.date,
            formatDate)}
          {renderDataElement('Current Asking Price', '/propertyPack/priceInformation/price',
            propertyPack.priceInformation?.price,
            (price) => formatCurrency(price, propertyPack.priceInformation?.priceQualifier))}
        </CardContent>
      </Card>
    </div>
  );
}

// Main LenderAVMView Component
function LenderAVMView() {
  const [loadingAVM, setLoadingAVM] = useState(false);
  const [avmGenerated, setAvmGenerated] = useState(false);
  const [valuationData, setValuationData] = useState(null);
  const { toast } = useToast();
  const { stateData: state, loading } = usePDTF();

  const handleGenerateAVM = async () => {
    setLoadingAVM(true);

    // Simulate AVM generation delay
    setTimeout(() => {
      // Extract valuation data from /propertyPack/valuations path
      try {
        const valuationPath = '/propertyPack/valuations';
        let extractedData = null;

        // Safely attempt to get valuation data from state
        try {
          extractedData = jp.get(state, valuationPath);
        } catch (error) {
          console.debug("Valuation data not found at path:", valuationPath);
        }

        if (extractedData) {
          // Add current timestamp to each valuation
          const currentTimestamp = new Date().toISOString();
          const dataWithTimestamp = Array.isArray(extractedData)
            ? extractedData.map(val => ({
                ...val,
                valuationTimestamp: currentTimestamp
              }))
            : { ...extractedData, valuationTimestamp: currentTimestamp };

          setValuationData(dataWithTimestamp);
          setAvmGenerated(true);
          setLoadingAVM(false);
          toast({
            title: "AVM Generated",
            description: "Automated Valuation Model generated successfully",
          });
        } else {
          // No data found - reset state and show error
          setValuationData(null);
          setAvmGenerated(false);
          setLoadingAVM(false);
          toast({
            title: "AVM Generation Failed",
            description: "No valuation data found at path /propertyPack/valuations",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error("Error generating AVM:", error);
        setValuationData(null);
        setAvmGenerated(false);
        setLoadingAVM(false);
        toast({
          title: "AVM Generation Failed",
          description: error.message || "Unable to generate AVM from available data",
          variant: "destructive",
        });
      }
    }, 2000);
  };

  const renderDataElement = useCallback((label, path, data, formatter = null) => {
    const displayValue = formatter ? formatter(data) : (data || 'Not provided');

    return (
      <div key={path} className="flex justify-between items-start py-2 border-b last:border-0">
        <span className="font-medium text-sm text-gray-700">{label}:</span>
        <div className="flex items-center gap-2">
          <span className="text-sm">{displayValue}</span>
        </div>
      </div>
    );
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="bg-gradient-to-r from-purple-100 to-purple-50 p-6 rounded-lg">
          <Skeleton className="h-12 w-12 mb-4" />
          <Skeleton className="h-8 w-96 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  const formatAddress = (address) => {
    if (typeof address === 'string') return address;
    if (!address) return 'Not available';

    const parts = [];
    if (address.line1) parts.push(address.line1);
    if (address.line2) parts.push(address.line2);
    if (address.town) parts.push(address.town);
    if (address.postcode) parts.push(address.postcode);
    return parts.join(', ');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-[rgb(55,20,80)] p-6 rounded-lg shadow-lg">
        <div className="flex items-center gap-4 mb-3">
          <img
            src="/Atom_Bank.png"
            alt="Atom Bank"
            className="h-10 w-auto"
          />
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-white">Lender AVM View</h1>
            <p className="text-purple-100 text-sm">Internal Valuation Tool</p>
          </div>
          <Badge variant="outline" className="bg-white text-[#3E2469] border-white font-semibold">
            TRL6
          </Badge>
        </div>
      </div>

      {/* AVM Generation Section */}
      <Card className="border-[#3E2469] bg-purple-50/30">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-[#3E2469]" />
                Automated Valuation Model
              </CardTitle>
              <CardDescription>
                Generate property valuation using verified PDTF data
              </CardDescription>
            </div>
            <img
              src="/HomeTrack-Logo_RGB.png"
              alt="HomeTrack"
              className="h-8 w-auto"
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Button
              onClick={handleGenerateAVM}
              disabled={loadingAVM || avmGenerated}
              className="bg-[#FFD500] hover:bg-[#FFE033] text-[#3E2469] font-semibold"
            >
              {loadingAVM ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating AVM...
                </>
              ) : avmGenerated ? (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  AVM Generated
                </>
              ) : (
                'Generate AVM'
              )}
            </Button>
            <p className="text-sm text-gray-600">
              Property: {formatAddress(state?.propertyPack?.address)}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* AVM Results */}
      {avmGenerated && valuationData && (
        <Alert className="border-green-200 bg-green-50">
          <div className="flex items-start gap-4">
            <img
              src="/HomeTrack-Logo_RGB.png"
              alt="HomeTrack"
              className="h-12 w-auto mt-1"
            />
            <div className="flex-1">
              <AlertTitle className="text-green-900 font-semibold mb-2">
                Valuation Data Available
              </AlertTitle>
              <AlertDescription className="text-green-800">
                <div className="space-y-2">
                  <p className="font-medium">
                    Valuation data retrieved from PDTF
                  </p>
                  <div className="text-sm">
                    {Array.isArray(valuationData) ? (
                      valuationData.map((valuation, index) => (
                        <div key={index} className="mt-2 p-4 bg-white rounded-lg border border-green-200 shadow-sm">
                          <div className="flex items-center justify-between mb-3 pb-2 border-b border-green-100">
                            <span className="font-semibold text-base text-gray-900">Valuation {index + 1}</span>
                            {valuation.valuationId && (
                              <Badge variant="outline" className="text-xs">
                                ID: {valuation.valuationId}
                              </Badge>
                            )}
                          </div>
                          <div className="space-y-3 text-sm">
                            {valuation.capitalValue && (
                              <div className="flex justify-between py-2 border-b border-gray-100">
                                <span className="text-gray-600 font-medium">Capital Value:</span>
                                <span className="font-bold text-[#3E2469] text-lg">£{valuation.capitalValue.toLocaleString()}</span>
                              </div>
                            )}
                            {valuation.rentalValue > 0 && (
                              <div className="flex justify-between py-2 border-b border-gray-100">
                                <span className="text-gray-600 font-medium">Rental Value:</span>
                                <span className="font-semibold">£{valuation.rentalValue.toLocaleString()}</span>
                              </div>
                            )}
                            {valuation.reinstatementCost && (
                              <div className="flex justify-between py-2 border-b border-gray-100">
                                <span className="text-gray-600 font-medium">Reinstatement Cost:</span>
                                <span className="font-semibold">£{valuation.reinstatementCost.toLocaleString()}</span>
                              </div>
                            )}
                            {(valuation.confidenceLevel !== undefined || valuation.confidenceBand) && (
                              <div className="flex justify-between py-2 border-b border-gray-100">
                                <span className="text-gray-600 font-medium">Confidence:</span>
                                <span className="font-medium">
                                  {valuation.confidenceLevel && `Level ${valuation.confidenceLevel}`}
                                  {valuation.confidenceLevel && valuation.confidenceBand && ' / '}
                                  {valuation.confidenceBand && `Band ${valuation.confidenceBand}`}
                                </span>
                              </div>
                            )}
                            {valuation.instructionType && (
                              <div className="py-2 border-b border-gray-100">
                                <span className="text-gray-600 font-medium">Instruction Type:</span>
                                <p className="text-gray-900 mt-1">{valuation.instructionType}</p>
                              </div>
                            )}
                            {valuation.valuationType && (
                              <div className="py-2 border-b border-gray-100">
                                <span className="text-gray-600 font-medium">Valuation Type:</span>
                                <p className="text-gray-700 mt-1 text-xs leading-relaxed">{valuation.valuationType}</p>
                              </div>
                            )}
                            {valuation.valuationContext && (
                              <div className="py-2 border-b border-gray-100">
                                <span className="text-gray-600 font-medium">Context:</span>
                                <p className="text-gray-700 mt-1 text-xs leading-relaxed">{valuation.valuationContext}</p>
                              </div>
                            )}
                            {valuation.checkValuationResult && (
                              <div className="py-2 border-b border-gray-100">
                                <span className="text-gray-600 font-medium">Check Result:</span>
                                <p className="text-gray-700 mt-1 text-xs leading-relaxed">{valuation.checkValuationResult}</p>
                              </div>
                            )}
                            {valuation.valuationTimestamp && (
                              <div className="flex justify-between py-2 mt-1">
                                <span className="text-gray-600 font-medium">Timestamp:</span>
                                <span className="text-xs text-gray-600">
                                  {new Date(valuation.valuationTimestamp).toLocaleString('en-GB', {
                                    day: '2-digit',
                                    month: '2-digit',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="mt-2 p-3 bg-white rounded border border-green-200">
                        <pre className="text-xs overflow-auto max-h-60 bg-gray-50 p-2 rounded">
                          {JSON.stringify(valuationData, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              </AlertDescription>
            </div>
          </div>
        </Alert>
      )}

      {/* Property Data */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-[#3E2469]" />
            PDTF Verified Property Data
          </CardTitle>
          <CardDescription>
            Property information verified through the Property Data Trust Framework
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LenderPropertyPack state={state} renderDataElement={renderDataElement} />
        </CardContent>
      </Card>
    </div>
  );
}

export default LenderAVMView;
