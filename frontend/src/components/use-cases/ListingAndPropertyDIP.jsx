import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { usePDTF } from "@/contexts/PDTFContext";
import {
  ChevronLeft,
  ChevronRight,
  Bed,
  Bath,
  Ruler,
  MapPin,
  Star,
  Download,
  CheckCircle2,
  ShieldCheck
} from "lucide-react";

function ListingAndPropertyDIP() {
  const { stateData, loading } = usePDTF();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showDIPDialog, setShowDIPDialog] = useState(false);

  const propertyImages = [
    "/91_South_Hill_Avenue/image-0-1024x1024.webp",
    "/91_South_Hill_Avenue/image-1-1024x1024.webp",
    "/91_South_Hill_Avenue/image-3-1024x1024.webp",
    "/91_South_Hill_Avenue/image-4-1024x1024.webp"
  ];

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % propertyImages.length);
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) =>
      prev === 0 ? propertyImages.length - 1 : prev - 1
    );
  };

  // Extract key information from property state
  const getPropertyInfo = () => {
    if (!stateData?.propertyPack) return null;

    const { propertyPack } = stateData;
    const address = propertyPack.address || {};
    const buildInfo = propertyPack.buildInformation || {};
    const residentialFeatures = propertyPack.residentialPropertyFeatures || {};
    const epc = propertyPack.energyEfficiency?.certificate || {};
    const priceInfo = propertyPack.priceInformation || {};

    // Convert square meters to square feet
    const sqm = buildInfo.internalArea?.area || epc.totalFloorArea || 0;
    const sqft = Math.round(sqm * 10.764);

    // Format price
    const price = priceInfo.price || null;
    const priceQualifier = priceInfo.priceQualifier || "";

    return {
      address: `${address.line1}${address.line2 ? ", " + address.line2 : ""}, ${address.town}, ${address.postcode}`,
      propertyType: buildInfo.building?.propertyType || epc.propertyType || "Property",
      bedrooms: residentialFeatures.bedrooms || buildInfo.bedrooms || epc.numberHabitableRooms || null,
      bathrooms: residentialFeatures.bathrooms || buildInfo.bathrooms || null,
      receptionRooms: residentialFeatures.receptions || null,
      sqft: sqft,
      sqm: sqm,
      epcRating: epc.currentEnergyRating || null,
      builtForm: buildInfo.building?.builtForm || epc.builtForm || null,
      status: stateData.status || "For sale",
      price: price,
      priceQualifier: priceQualifier,
      tenure: propertyPack.marketingTenure || propertyPack.ownership?.tenure || null
    };
  };

  const property = getPropertyInfo();

  // Format price for display
  const formatPrice = (price) => {
    if (!price) return "Price on request";
    return `£${price.toLocaleString()}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <Skeleton className="h-8 w-48" />
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 py-8">
          <Skeleton className="w-full h-96 mb-4" />
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-6 w-96" />
        </div>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="p-8">
          <p className="text-gray-600">No property data available</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <img
              src="/OTM-logo_final_full-col.png"
              alt="OnTheMarket"
              className="h-10"
            />
            <div className="flex gap-6 text-sm text-gray-600">
              <a href="#" className="hover:text-gray-900">For sale</a>
              <a href="#" className="hover:text-gray-900">To rent</a>
              <a href="#" className="hover:text-gray-900">Find an agent</a>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Photo Collage Gallery */}
        <div className="grid grid-cols-4 gap-2 mb-8">
          {/* Main large image */}
          <div className="col-span-3 h-96 relative rounded-lg overflow-hidden bg-black">
            <img
              src={propertyImages[0]}
              alt="Property main view"
              className="w-full h-full object-cover"
            />
            <div className="absolute top-4 left-4">
              <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">
                <Star className="w-3 h-3 mr-1 fill-current" />
                Spotlight Property
              </Badge>
            </div>
          </div>

          {/* Three stacked images */}
          <div className="col-span-1 h-96 flex flex-col gap-2">
            {propertyImages.slice(1, 4).map((img, idx) => (
              <div key={idx} className="flex-1 rounded-lg overflow-hidden bg-black">
                <img
                  src={img}
                  alt={`Property view ${idx + 2}`}
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Property Details and Sidebar */}
        <div className="grid grid-cols-3 gap-8">
          {/* Left Column - Details */}
          <div className="col-span-2">
            {/* Property Title and Price */}
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">
                  <Star className="w-3 h-3 mr-1 fill-current" />
                  Spotlight Property
                </Badge>
                {property.priceQualifier && (
                  <Badge variant="outline" className="text-gray-600">
                    {property.priceQualifier}
                  </Badge>
                )}
              </div>

              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {formatPrice(property.price)}
              </h1>

              <div className="flex items-center gap-2 text-gray-600 mb-4">
                <MapPin className="w-4 h-4" />
                <span className="text-lg">{property.address}</span>
              </div>

              <div className="flex items-center gap-6 text-gray-700 mb-4">
                {property.bedrooms && (
                  <div className="flex items-center gap-2">
                    <Bed className="w-5 h-5" />
                    <span className="font-medium">{property.bedrooms} bed</span>
                  </div>
                )}
                {property.bathrooms && (
                  <div className="flex items-center gap-2">
                    <Bath className="w-5 h-5" />
                    <span className="font-medium">{property.bathrooms} bath</span>
                  </div>
                )}
                {property.receptionRooms && (
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{property.receptionRooms} reception</span>
                  </div>
                )}
                {property.sqft > 0 && (
                  <div className="flex items-center gap-2">
                    <Ruler className="w-5 h-5" />
                    <span className="font-medium">{property.sqft} sq ft</span>
                  </div>
                )}
                {property.epcRating && (
                  <Badge variant="outline" className="bg-green-50 border-green-600 text-green-700">
                    EPC {property.epcRating}
                  </Badge>
                )}
              </div>

              <p className="text-lg text-gray-700">
                {property.propertyType} {property.status?.toLowerCase()}
              </p>
            </div>

            {/* Key Features */}
            <Card className="p-6">
              <h2 className="text-xl font-bold mb-4">Key Features</h2>
              <ul className="space-y-2 text-gray-700">
                {property.builtForm && (
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>{property.builtForm}</span>
                  </li>
                )}
                {property.tenure && (
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>{property.tenure}</span>
                  </li>
                )}
                {property.bedrooms && (
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>{property.bedrooms} bedroom{property.bedrooms !== 1 ? 's' : ''}</span>
                  </li>
                )}
                {property.bathrooms && (
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>{property.bathrooms} bathroom{property.bathrooms !== 1 ? 's' : ''}</span>
                  </li>
                )}
                {property.receptionRooms && (
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>{property.receptionRooms} reception room{property.receptionRooms !== 1 ? 's' : ''}</span>
                  </li>
                )}
                {property.sqm > 0 && (
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>
                      Internal area: {property.sqm.toFixed(1)} sq m ({property.sqft} sq ft)
                    </span>
                  </li>
                )}
                {stateData?.propertyPack?.energyEfficiency?.certificate?.currentEnergyEfficiency && (
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>
                      Energy efficiency rating: {stateData.propertyPack.energyEfficiency.certificate.currentEnergyRating}
                      ({stateData.propertyPack.energyEfficiency.certificate.currentEnergyEfficiency})
                    </span>
                  </li>
                )}
                {stateData?.propertyPack?.councilTax && (
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>Council tax band: {stateData.propertyPack.councilTax.band || stateData.propertyPack.councilTax.councilTaxBand}</span>
                  </li>
                )}
              </ul>
            </Card>

            {/* Additional Property Details */}
            <div className="space-y-6 mt-6">
              {/* Energy Efficiency */}
              {stateData?.propertyPack?.energyEfficiency?.certificate && (
                <Card className="p-6">
                  <h2 className="text-xl font-bold mb-4">Energy Efficiency</h2>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600 mb-1">Current Rating</p>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="bg-green-50 border-green-600 text-green-700">
                          {stateData.propertyPack.energyEfficiency.certificate.currentEnergyRating}
                        </Badge>
                        <span className="text-gray-900">
                          ({stateData.propertyPack.energyEfficiency.certificate.currentEnergyEfficiency})
                        </span>
                      </div>
                    </div>
                    <div>
                      <p className="text-gray-600 mb-1">Potential Rating</p>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="bg-blue-50 border-blue-600 text-blue-700">
                          {stateData.propertyPack.energyEfficiency.certificate.potentialEnergyRating}
                        </Badge>
                        <span className="text-gray-900">
                          ({stateData.propertyPack.energyEfficiency.certificate.potentialEnergyEfficiency})
                        </span>
                      </div>
                    </div>
                    {stateData.propertyPack.energyEfficiency.certificate.heatingCostCurrent && (
                      <div>
                        <p className="text-gray-600 mb-1">Current Heating Cost</p>
                        <p className="font-medium">£{stateData.propertyPack.energyEfficiency.certificate.heatingCostCurrent}/year</p>
                      </div>
                    )}
                    {stateData.propertyPack.energyEfficiency.certificate.heatingCostPotential && (
                      <div>
                        <p className="text-gray-600 mb-1">Potential Heating Cost</p>
                        <p className="font-medium">£{stateData.propertyPack.energyEfficiency.certificate.heatingCostPotential}/year</p>
                      </div>
                    )}
                    {stateData.propertyPack.energyEfficiency.certificate.mainFuel && (
                      <div>
                        <p className="text-gray-600 mb-1">Main Fuel</p>
                        <p className="font-medium capitalize">{stateData.propertyPack.energyEfficiency.certificate.mainFuel}</p>
                      </div>
                    )}
                    {stateData.propertyPack.energyEfficiency.certificate.inspectionDate && (
                      <div>
                        <p className="text-gray-600 mb-1">Certificate Date</p>
                        <p className="font-medium">{new Date(stateData.propertyPack.energyEfficiency.certificate.inspectionDate).toLocaleDateString()}</p>
                      </div>
                    )}
                  </div>
                </Card>
              )}

              {/* Utilities & Services */}
              <Card className="p-6">
                <h2 className="text-xl font-bold mb-4">Utilities & Services</h2>
                <div className="space-y-3 text-sm">
                  {stateData?.propertyPack?.electricity?.mainsElectricity && (
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-gray-600">Electricity</span>
                      <span className="font-medium">Mains supply</span>
                    </div>
                  )}
                  {stateData?.propertyPack?.waterAndDrainage?.mainsWater && (
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-gray-600">Water Supply</span>
                      <span className="font-medium">Mains water</span>
                    </div>
                  )}
                  {stateData?.propertyPack?.waterAndDrainage?.drainage && (
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-gray-600">Drainage</span>
                      <span className="font-medium">
                        {stateData.propertyPack.waterAndDrainage.drainage.type || "Connected"}
                      </span>
                    </div>
                  )}
                  {stateData?.propertyPack?.heating?.heatingSystem && (
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-gray-600">Heating</span>
                      <span className="font-medium capitalize">
                        {stateData.propertyPack.heating.heatingSystem.heatingType || "Central heating"}
                      </span>
                    </div>
                  )}
                  {stateData?.propertyPack?.connectivity?.broadband?.typeOfConnection && (
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-gray-600">Broadband</span>
                      <span className="font-medium capitalize">
                        {stateData.propertyPack.connectivity.broadband.typeOfConnection}
                      </span>
                    </div>
                  )}
                  {stateData?.propertyPack?.connectivity?.broadband?.predictedSpeed?.maxPredictedDown && (
                    <div className="flex justify-between py-2">
                      <span className="text-gray-600">Max Download Speed</span>
                      <span className="font-medium">
                        {stateData.propertyPack.connectivity.broadband.predictedSpeed.maxPredictedDown} Mbps
                      </span>
                    </div>
                  )}
                </div>
              </Card>

              {/* Environmental & Location */}
              {stateData?.propertyPack?.environmentalIssues && (
                <Card className="p-6">
                  <h2 className="text-xl font-bold mb-4">Environmental Information</h2>
                  <div className="space-y-3 text-sm">
                    {stateData.propertyPack.environmentalIssues.flooding?.floodRisk && (
                      <div className="flex justify-between py-2 border-b">
                        <span className="text-gray-600">Flood Risk</span>
                        <span className="font-medium capitalize">
                          {stateData.propertyPack.environmentalIssues.flooding.floodRisk.summary ||
                           stateData.propertyPack.environmentalIssues.flooding.floodRisk}
                        </span>
                      </div>
                    )}
                    {stateData.propertyPack.environmentalIssues.coalMining && (
                      <div className="flex justify-between py-2 border-b">
                        <span className="text-gray-600">Coal Mining</span>
                        <span className="font-medium capitalize">
                          {stateData.propertyPack.environmentalIssues.coalMining.result ||
                           stateData.propertyPack.environmentalIssues.coalMining}
                        </span>
                      </div>
                    )}
                    {stateData.propertyPack.environmentalIssues.coastalErosion && (
                      <div className="flex justify-between py-2">
                        <span className="text-gray-600">Coastal Erosion</span>
                        <span className="font-medium capitalize">
                          {stateData.propertyPack.environmentalIssues.coastalErosion.result ||
                           stateData.propertyPack.environmentalIssues.coastalErosion}
                        </span>
                      </div>
                    )}
                  </div>
                </Card>
              )}

              {/* Legal & Planning */}
              {(stateData?.propertyPack?.listingAndConservation ||
                stateData?.propertyPack?.disputesAndComplaints ||
                stateData?.propertyPack?.legalBoundaries) && (
                <Card className="p-6">
                  <h2 className="text-xl font-bold mb-4">Legal & Planning</h2>
                  <div className="space-y-3 text-sm">
                    {stateData.propertyPack.listingAndConservation?.isListed && (
                      <div className="flex justify-between py-2 border-b">
                        <span className="text-gray-600">Listed Building</span>
                        <span className="font-medium">
                          {stateData.propertyPack.listingAndConservation.isListed.yesNo || "No"}
                        </span>
                      </div>
                    )}
                    {stateData.propertyPack.listingAndConservation?.isConservationArea && (
                      <div className="flex justify-between py-2 border-b">
                        <span className="text-gray-600">Conservation Area</span>
                        <span className="font-medium">
                          {stateData.propertyPack.listingAndConservation.isConservationArea.yesNo || "No"}
                        </span>
                      </div>
                    )}
                    {stateData.propertyPack.listingAndConservation?.hasTreePreservationOrder && (
                      <div className="flex justify-between py-2 border-b">
                        <span className="text-gray-600">Tree Preservation Order</span>
                        <span className="font-medium">
                          {stateData.propertyPack.listingAndConservation.hasTreePreservationOrder.yesNo || "No"}
                        </span>
                      </div>
                    )}
                    {stateData.propertyPack.disputesAndComplaints?.hasDisputesAndComplaints && (
                      <div className="flex justify-between py-2 border-b">
                        <span className="text-gray-600">Disputes & Complaints</span>
                        <span className="font-medium">
                          {stateData.propertyPack.disputesAndComplaints.hasDisputesAndComplaints.yesNo || "No"}
                        </span>
                      </div>
                    )}
                    {stateData.propertyPack.legalBoundaries?.haveBoundaryFeaturesMoved && (
                      <div className="flex justify-between py-2">
                        <span className="text-gray-600">Boundary Changes</span>
                        <span className="font-medium">
                          {stateData.propertyPack.legalBoundaries.haveBoundaryFeaturesMoved.yesNo || "No"}
                        </span>
                      </div>
                    )}
                  </div>
                </Card>
              )}

              {/* Local Authority & Charges */}
              {stateData?.propertyPack?.localAuthority && (
                <Card className="p-6">
                  <h2 className="text-xl font-bold mb-4">Local Authority</h2>
                  <div className="space-y-3 text-sm">
                    {stateData.propertyPack.localAuthority.localAuthorityName && (
                      <div className="flex justify-between py-2 border-b">
                        <span className="text-gray-600">Authority</span>
                        <span className="font-medium">{stateData.propertyPack.localAuthority.localAuthorityName}</span>
                      </div>
                    )}
                    {stateData.propertyPack.councilTax?.councilTaxBand && (
                      <div className="flex justify-between py-2 border-b">
                        <span className="text-gray-600">Council Tax Band</span>
                        <span className="font-medium">{stateData.propertyPack.councilTax.councilTaxBand}</span>
                      </div>
                    )}
                    {stateData.propertyPack.councilTax?.councilTaxAnnualCharge && (
                      <div className="flex justify-between py-2">
                        <span className="text-gray-600">Annual Council Tax</span>
                        <span className="font-medium">£{stateData.propertyPack.councilTax.councilTaxAnnualCharge.toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                </Card>
              )}
            </div>
          </div>

          {/* Right Column - Agent Card */}
          <div className="col-span-1">
            <div className="space-y-4">
            <Card className="p-6">
              <div className="mb-6">
                <div className="w-full bg-white rounded flex items-center justify-center gap-3 p-4 mb-4">
                  <img
                    src="/Screenshot_2025_08_06_at_08_24_59_9890604c-1c78-4372-b0a0-1cfa15ec5085.png"
                    alt="NPTN"
                    className="h-16 w-auto"
                  />
                  <span className="text-2xl font-bold text-gray-900">NPTN Estates</span>
                </div>
              </div>

              <div className="space-y-3">
                <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                  Request details
                </Button>
                <Button variant="outline" className="w-full">
                  Arrange viewing
                </Button>
                <Button variant="outline" className="w-full">
                  Make an offer
                </Button>
              </div>

              <div className="mt-6 pt-6 border-t">
                <h3 className="font-semibold mb-2">Listed by</h3>
                <p className="text-sm text-gray-600">NPTN Estates</p>
              </div>

              <div className="mt-6 pt-6 border-t">
                {/* Digital Sale Ready Badge */}
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-300 rounded-lg p-4">
                  <div className="flex items-start gap-3 mb-3">
                    <ShieldCheck className="h-6 w-6 text-green-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-green-900 mb-2">Digital Sale Ready</p>
                      <ul className="space-y-1.5 text-xs text-green-800">
                        <li className="flex items-start gap-2">
                          <span className="text-green-600 mt-0.5">•</span>
                          <span>All property data digitally verified and organized</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-green-600 mt-0.5">•</span>
                          <span>Verified with industry-standard Property Data Trust Framework</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-green-600 mt-0.5">•</span>
                          <span>Instant secure access for your solicitor and lender</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-green-600 mt-0.5">•</span>
                          <span>Move faster - no waiting for paperwork</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full border-green-600 text-green-700 hover:bg-green-100"
                    onClick={() => window.open('https://www.moverly.com', '_blank')}
                  >
                    Get started...
                  </Button>
                </div>
              </div>
            </Card>

            {/* Nationwide Mortgage Ready Card */}
            <Card className="p-6 mt-4">
              <div className="mb-4">
                <img
                  src="/nationwide.png"
                  alt="Nationwide"
                  className="h-16 w-auto mb-3"
                />
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <span className="font-semibold text-gray-900">Mortgage Ready</span>
                </div>
                <p className="text-sm text-gray-600 mb-4">
                  This property has been verified and is ready for mortgage applications.
                </p>
              </div>

              <Button
                onClick={() => setShowDIPDialog(true)}
                className="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white"
              >
                View Decision in Principle
              </Button>

              <p className="text-xs text-gray-500 mt-3 text-center">
                Pre-approved based on PDTF verified data
              </p>
            </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Decision in Principle Dialog */}
      <Dialog open={showDIPDialog} onOpenChange={setShowDIPDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <img
                src="/nationwide.png"
                alt="Nationwide"
                className="h-12 w-auto"
              />
              <DialogTitle>Decision in Principle</DialogTitle>
            </div>
            <DialogDescription>
              Mortgage pre-approval based on verified property data
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Property Details */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-3">Property Details</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-gray-600">Address</p>
                  <p className="font-medium">{property?.address}</p>
                </div>
                <div>
                  <p className="text-gray-600">Property Value</p>
                  <p className="font-medium">{formatPrice(property?.price)}</p>
                </div>
                <div>
                  <p className="text-gray-600">Property Type</p>
                  <p className="font-medium">{property?.propertyType}</p>
                </div>
                <div>
                  <p className="text-gray-600">EPC Rating</p>
                  <p className="font-medium">{property?.epcRating || "N/A"}</p>
                </div>
              </div>
            </div>

            {/* Mortgage Details */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <h3 className="font-semibold text-gray-900">Pre-Approval Status</h3>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-gray-600">Maximum Loan Amount</p>
                  <p className="font-medium text-lg text-green-700">
                    £{Math.round((property?.price || 161000) * 0.8).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600">Loan to Value (LTV)</p>
                  <p className="font-medium">80%</p>
                </div>
                <div>
                  <p className="text-gray-600">Estimated Rate</p>
                  <p className="font-medium">4.5% fixed (5 years)</p>
                </div>
                <div>
                  <p className="text-gray-600">Monthly Payment</p>
                  <p className="font-medium">
                    £{Math.round(((property?.price || 161000) * 0.8 * 0.045) / 12).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            {/* PDTF Verification */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-2">PDTF Verification</h3>
              <ul className="space-y-2 text-sm text-gray-700">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <span>Property title verified via Land Registry</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <span>Energy performance certificate validated</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <span>Local authority searches completed</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <span>No adverse findings or restrictions identified</span>
                </li>
              </ul>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => alert("DIP document download started")}
              >
                <Download className="h-4 w-4 mr-2" />
                Download DIP
              </Button>
              <Button
                className="flex-1 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700"
                onClick={() => setShowDIPDialog(false)}
              >
                Close
              </Button>
            </div>

            <p className="text-xs text-gray-500 text-center">
              This Decision in Principle is valid for 90 days and is subject to full application and affordability assessment.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default ListingAndPropertyDIP;
