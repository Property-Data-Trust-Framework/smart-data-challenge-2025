import { useState, useEffect, createElement } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Home,
  Shield,
  CreditCard,
  FileText,
  CheckCircle,
  AlertCircle,
  Loader2,
  Download,
  Eye
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { pdtfAPI } from "@/lib/api";

function BuyerConsentAtom() {
  const [propertyData, setPropertyData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [consentGiven, setConsentGiven] = useState(false);
  const [offerLoading, setOfferLoading] = useState(false);
  const [offer, setOffer] = useState(null);
  const [consentChecks, setConsentChecks] = useState({
    identity: false,
    creditScore: false,
    income: false,
    employment: false,
    bankStatements: false,
    propertyDetails: false
  });
  const { toast } = useToast();

  // Use same transaction ID as conveyancer view
  const transactionId = "78HJ1ggqJBuMjED6bvhdx7";
  const pdtfService = "moverly"; // Use Moverly PDTF service

  useEffect(() => {
    const fetchPropertyData = async () => {
      try {
        setLoading(true);
        const result = await pdtfAPI.getPDTFState(pdtfService, transactionId);
        setPropertyData(result);
      } catch (error) {
        console.error("Error fetching property data:", error);
        toast({
          title: "Error",
          description: "Failed to load property data from PDTF API",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchPropertyData();
  }, [toast]);

  const handleConsentChange = (field, checked) => {
    setConsentChecks(prev => ({
      ...prev,
      [field]: checked
    }));
  };

  const allConsentsGiven = Object.values(consentChecks).every(Boolean);

  const handleGiveConsent = async () => {
    if (!allConsentsGiven) {
      toast({
        title: "Incomplete Consent",
        description: "Please check all consent items to proceed",
        variant: "destructive",
      });
      return;
    }

    setOfferLoading(true);
    setConsentGiven(true);

    // Simulate API call delay for retrieving offer
    setTimeout(() => {
      // Calculate realistic mortgage for £161,000 property (85% LTV)
      const propertyValue = propertyDetails?.price || 161000;
      const ltvPercentage = 85;
      const loanAmount = Math.round((propertyValue * ltvPercentage) / 100);
      const deposit = propertyValue - loanAmount;

      setOffer({
        lenderName: "Atom Bank",
        loanAmount: `£${loanAmount.toLocaleString()}`,
        interestRate: "4.89%",
        term: "25 years",
        monthlyPayment: "£784",
        arrangement_fee: "£999",
        valuation_fee: "£350",
        legal_fees: "£850",
        ltv: `${ltvPercentage}%`,
        apr: "5.2%",
        deposit: `£${deposit.toLocaleString()}`,
        propertyValue: `£${propertyValue.toLocaleString()}`,
        offerId: "ATM-" + Math.random().toString(36).substr(2, 9).toUpperCase(),
        validUntil: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toLocaleDateString(),
        status: "Provisional Offer"
      });
      setOfferLoading(false);
      toast({
        title: "Offer Retrieved",
        description: "Your mortgage offer from Atom Bank is ready",
      });
    }, 2000);
  };

  // Format address from actual data
  const formatAddress = (address) => {
    if (!address) return "Address not available";

    if (typeof address === 'string') {
      return address;
    }

    if (typeof address === 'object') {
      const parts = [];
      if (address.line1) parts.push(address.line1);
      if (address.line2) parts.push(address.line2);
      if (address.town) parts.push(address.town);
      if (address.postcode) parts.push(address.postcode);
      return parts.join(', ');
    }

    return "Address format not recognized";
  };

  const addressString = formatAddress(propertyData?.propertyPack?.address);

  // Extract property details from actual data - only use what's actually available
  const getPropertyDetails = () => {
    const propertyPack = propertyData?.propertyPack;
    if (!propertyPack) return null;

    const details = {
      address: addressString,
    };

    // Only add fields that are actually present in the data
    if (propertyPack.priceInformation?.price) {
      details.price = propertyPack.priceInformation.price;
      details.priceQualifier = propertyPack.priceInformation.priceQualifier;
    }

    if (propertyPack.buildInformation?.building?.propertyType) {
      details.propertyType = propertyPack.buildInformation.building.propertyType;
    }

    if (propertyPack.buildInformation?.building?.builtForm) {
      details.builtForm = propertyPack.buildInformation.building.builtForm;
    }

    if (propertyPack.buildInformation?.internalArea) {
      details.internalArea = propertyPack.buildInformation.internalArea;
    }

    // Only add these if they exist
    if (propertyPack.buildInformation?.building?.bedrooms) {
      details.bedrooms = propertyPack.buildInformation.building.bedrooms;
    }

    if (propertyPack.buildInformation?.building?.bathrooms) {
      details.bathrooms = propertyPack.buildInformation.building.bathrooms;
    }

    if (propertyPack.buildInformation?.building?.yearBuilt) {
      details.yearBuilt = propertyPack.buildInformation.building.yearBuilt;
    }

    return details;
  };

  const propertyDetails = getPropertyDetails();

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-8 rounded-lg">
          <Skeleton className="h-8 w-80 mb-4" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-[rgb(55,20,80)] p-8 rounded-lg shadow-lg">
        <div className="flex items-center gap-4 mb-4">
          <img
            src="/Atom_Bank.png"
            alt="Atom Bank"
            className="h-12 w-auto"
          />
          <h1 className="text-3xl font-bold text-white">Mortgage Application</h1>
        </div>
        <p className="text-purple-100">
          Share your data securely with Atom Bank to receive a personalized mortgage offer. Simple, speedy, digital.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Property Information */}
        <Card className="p-6 border-[#3E2469] bg-purple-50/30">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Home className="h-5 w-5 text-[#3E2469]" />
              Property to Mortgage
            </h2>
            <Shield className="h-5 w-5 text-[#FFD500]" />
          </div>

          <div className="space-y-3">
            {propertyDetails ? (
              <div className="p-4 bg-white rounded-lg">
                <div className="font-medium text-lg mb-2">{propertyDetails.address}</div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {propertyDetails.price && (
                    <div>
                      <span className="text-gray-600">
                        {propertyDetails.priceQualifier ? `Price (${propertyDetails.priceQualifier}):` : 'Price:'}
                      </span>
                      <div className="font-semibold text-[#3E2469]">
                        £{propertyDetails.price.toLocaleString()}
                      </div>
                    </div>
                  )}
                  {propertyDetails.propertyType && (
                    <div>
                      <span className="text-gray-600">Property Type:</span>
                      <div className="font-medium">{propertyDetails.propertyType}</div>
                    </div>
                  )}
                  {propertyDetails.builtForm && (
                    <div>
                      <span className="text-gray-600">Built Form:</span>
                      <div className="font-medium">{propertyDetails.builtForm}</div>
                    </div>
                  )}
                  {propertyDetails.internalArea && (
                    <div>
                      <span className="text-gray-600">Internal Area:</span>
                      <div className="font-medium">
                        {propertyDetails.internalArea.area} {propertyDetails.internalArea.unit}
                      </div>
                    </div>
                  )}
                  {propertyDetails.bedrooms && (
                    <div>
                      <span className="text-gray-600">Bedrooms:</span>
                      <div className="font-medium">{propertyDetails.bedrooms}</div>
                    </div>
                  )}
                  {propertyDetails.bathrooms && (
                    <div>
                      <span className="text-gray-600">Bathrooms:</span>
                      <div className="font-medium">{propertyDetails.bathrooms}</div>
                    </div>
                  )}
                  {propertyDetails.yearBuilt && (
                    <div>
                      <span className="text-gray-600">Year Built:</span>
                      <div className="font-medium">{propertyDetails.yearBuilt}</div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <span className="text-sm font-semibold text-red-800">Property Data Unavailable</span>
                </div>
                <div className="text-sm text-red-700">
                  Unable to load property information from PDTF API. Please check your connection and try again.
                </div>
              </div>
            )}

            <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="h-4 w-4 text-[#3E2469]" />
                <span className="text-sm font-semibold text-[#3E2469]">PDTF Verified</span>
              </div>
              <p className="text-sm text-gray-600">
                Property data verified through the Property Data Trust Framework
              </p>
            </div>
          </div>
        </Card>

        {/* Data Consent */}
        <Card className="p-6 border-[#FF6B9D] bg-pink-50/30">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Shield className="h-5 w-5 text-[#FF6B9D]" />
            Data Sharing Consent
          </h2>

          <div className="space-y-4">
            <p className="text-sm text-gray-600 mb-4">
              To provide you with the best mortgage offer, Atom Bank needs access to the following information:
            </p>

            <div className="space-y-3">
              {[
                { key: "identity", label: "Identity verification (ID documents)", icon: FileText },
                { key: "creditScore", label: "Credit score and history", icon: CreditCard },
                { key: "income", label: "Income details and payslips", icon: FileText },
                { key: "employment", label: "Employment status and history", icon: FileText },
                { key: "bankStatements", label: "Bank statements (3 months)", icon: FileText },
                { key: "propertyDetails", label: "Property valuation details", icon: Home }
              ].map(({ key, label, icon }) => (
                <div key={key} className="flex items-center space-x-3 p-3 bg-white rounded-lg">
                  <Checkbox
                    id={key}
                    checked={consentChecks[key]}
                    onCheckedChange={(checked) => handleConsentChange(key, checked)}
                  />
                  {createElement(icon, { className: "h-4 w-4 text-gray-500" })}
                  <label htmlFor={key} className="text-sm flex-1 cursor-pointer">
                    {label}
                  </label>
                  {consentChecks[key] && (
                    <CheckCircle className="h-4 w-4 text-[#3E2469]" />
                  )}
                </div>
              ))}
            </div>

            <div className="pt-4 border-t">
              <Button
                onClick={handleGiveConsent}
                disabled={!allConsentsGiven || offerLoading || consentGiven || !propertyDetails}
                className="w-full bg-[#FFD500] hover:bg-[#FFE033] text-[#3E2469] font-semibold shadow-lg hover:shadow-xl transition-all disabled:bg-gray-300 disabled:text-gray-500"
              >
                {!propertyDetails ? (
                  "Property Data Required"
                ) : offerLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Retrieving Offer...
                  </>
                ) : consentGiven ? (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Consent Given
                  </>
                ) : (
                  "Give Consent & Get Offer"
                )}
              </Button>
            </div>
          </div>
        </Card>
      </div>

      {/* Mortgage Offer */}
      {offer && (
        <Card className="p-6 border-[#3E2469] bg-gradient-to-br from-purple-50 to-pink-50/30">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <img
                src="/Atom_Bank.png"
                alt="Atom Bank"
                className="h-10 w-auto"
              />
              <h2 className="text-2xl font-bold flex items-center gap-2 text-[#3E2469]">
                <CheckCircle className="h-6 w-6 text-[#FFD500]" />
                Your Mortgage Offer
              </h2>
            </div>
            <Badge variant="outline" className="border-[#3E2469] text-[#3E2469] font-semibold">
              {offer.status}
            </Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="p-4 bg-white rounded-lg border-2 border-purple-100">
              <div className="text-sm text-gray-600">Property Value</div>
              <div className="text-xl font-bold text-[#3E2469]">{offer.propertyValue}</div>
            </div>
            <div className="p-4 bg-white rounded-lg border-2 border-purple-200">
              <div className="text-sm text-gray-600">Loan Amount</div>
              <div className="text-xl font-bold text-[#3E2469]">{offer.loanAmount}</div>
            </div>
            <div className="p-4 bg-white rounded-lg border-2 border-pink-200">
              <div className="text-sm text-gray-600">Deposit Required</div>
              <div className="text-xl font-bold text-[#FF6B9D]">{offer.deposit}</div>
            </div>
            <div className="p-4 bg-white rounded-lg border-2 border-yellow-200">
              <div className="text-sm text-gray-600">Monthly Payment</div>
              <div className="text-xl font-bold text-[#3E2469]">{offer.monthlyPayment}</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="p-4 bg-white rounded-lg border-2 border-purple-200">
              <div className="text-sm text-gray-600">Interest Rate</div>
              <div className="text-2xl font-bold text-[#3E2469]">{offer.interestRate}</div>
            </div>
            <div className="p-4 bg-white rounded-lg border-2 border-purple-200">
              <div className="text-sm text-gray-600">Loan to Value</div>
              <div className="text-2xl font-bold text-[#3E2469]">{offer.ltv}</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="space-y-3">
              <h3 className="font-semibold">Offer Details</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Lender:</span>
                  <span className="font-medium">{offer.lenderName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Term:</span>
                  <span className="font-medium">{offer.term}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">APR:</span>
                  <span className="font-medium">{offer.apr}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Product Type:</span>
                  <span className="font-medium">Fixed Rate</span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="font-semibold">Fees</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Arrangement Fee:</span>
                  <span className="font-medium">{offer.arrangement_fee}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Valuation Fee:</span>
                  <span className="font-medium">{offer.valuation_fee}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Legal Fees:</span>
                  <span className="font-medium">{offer.legal_fees}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200 mb-6">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="h-4 w-4 text-yellow-600" />
              <span className="text-sm font-semibold text-yellow-800">Important Information</span>
            </div>
            <div className="text-sm text-gray-700">
              <p>Offer ID: <span className="font-mono">{offer.offerId}</span></p>
              <p>Valid until: <span className="font-medium">{offer.validUntil}</span></p>
              <p className="mt-2 italic">This is a provisional offer subject to final valuation and underwriting approval.</p>
            </div>
          </div>

          <div className="flex gap-4">
            <Button className="bg-[#FFD500] hover:bg-[#FFE033] text-[#3E2469] font-semibold shadow-lg hover:shadow-xl transition-all">
              <CheckCircle className="h-4 w-4 mr-2" />
              Accept Offer
            </Button>
            <Button variant="outline" className="border-[#3E2469] text-[#3E2469] hover:bg-purple-50 font-medium">
              <Eye className="h-4 w-4 mr-2" />
              View Full Terms
            </Button>
            <Button variant="outline" className="border-[#FF6B9D] text-[#FF6B9D] hover:bg-pink-50 font-medium">
              <Download className="h-4 w-4 mr-2" />
              Download PDF
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}

export default BuyerConsentAtom;