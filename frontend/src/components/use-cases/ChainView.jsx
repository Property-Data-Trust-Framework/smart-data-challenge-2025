import { useState, useEffect } from "react";
import { CheckCircle2, Circle, Clock, ArrowDown, ArrowUp, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { usePDTF } from "@/contexts/PDTFContext";
import { pdtfAPI } from "@/lib/api";

const MILESTONE_CONFIGS = [
  { key: "listed", label: "Listed", shortLabel: "Listed" },
  { key: "legalForms", label: "Legal Forms", shortLabel: "Legal Forms" },
  { key: "soldSubjectToContract", label: "Sold STC", shortLabel: "Sold STC" },
  { key: "searches", label: "Searches", shortLabel: "Searches" },
  { key: "enquiries", label: "Enquiries", shortLabel: "Enquiries" },
  { key: "exchangeOfContracts", label: "Exchange", shortLabel: "Exchange" },
  { key: "completion", label: "Completion", shortLabel: "Completion" }
];

function MilestoneIcon({ milestone }) {
  if (milestone?.completed) {
    return <CheckCircle2 className="h-6 w-6 text-green-600 fill-green-100" />;
  }
  if (milestone?.expected || milestone?.started) {
    return <Clock className="h-6 w-6 text-blue-600" />;
  }
  return <Circle className="h-6 w-6 text-gray-300" />;
}

function MilestoneTimeline({ milestones, label, address, isMain = false }) {
  const hasMilestones = milestones && Object.keys(milestones).length > 0;

  return (
    <div className={`${isMain ? "bg-blue-50 border-2 border-blue-200" : "bg-white border border-gray-200"} rounded-lg p-4`}>
      <div className="mb-3">
        <div className="flex items-center gap-2">
          {isMain && <Badge variant="default" className="bg-blue-600">Current Transaction</Badge>}
          <h3 className="font-semibold text-sm">{label}</h3>
        </div>
        {address && (
          <p className="text-xs text-gray-500 mt-1">{address}</p>
        )}
      </div>

      {!hasMilestones && (
        <div className="py-4">
          <p className="text-sm text-gray-500 text-center mb-4">
            Milestone data not yet available for this transaction
          </p>
          <div className="flex items-start justify-between opacity-40">
            {MILESTONE_CONFIGS.map((config, index) => (
              <div key={config.key} className="flex items-start flex-1">
                <div className="flex flex-col items-center flex-shrink-0">
                  <Circle className="h-6 w-6 text-gray-300" />
                  <div className="text-xs text-center mt-1 w-16">
                    {config.shortLabel}
                  </div>
                </div>
                {index < MILESTONE_CONFIGS.length - 1 && (
                  <div className="h-0.5 flex-1 mt-3 bg-gray-300" />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {hasMilestones && (
        <div className="flex items-start justify-between">
          {MILESTONE_CONFIGS.map((config, index) => (
            <div
              key={config.key}
              className="flex items-start flex-1 opacity-0 animate-fade-slide-in"
              style={{ animationDelay: `${index * 120}ms` }}
            >
              <div className="flex flex-col items-center flex-shrink-0">
                <MilestoneIcon milestone={milestones?.[config.key]} />
                <div className="text-xs text-center mt-1 w-16">
                  {config.shortLabel}
                </div>
                {milestones?.[config.key]?.completed && (
                  <div className="text-xs text-gray-500 mt-0.5">
                    {new Date(milestones[config.key].completed).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short"
                    })}
                  </div>
                )}
                {milestones?.[config.key]?.expected && !milestones?.[config.key]?.completed && (
                  <div className="text-xs text-blue-600 mt-0.5">
                    {new Date(milestones[config.key].expected).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short"
                    })}
                  </div>
                )}
              </div>
              {index < MILESTONE_CONFIGS.length - 1 && (
                <div
                  className={`h-0.5 flex-1 mt-3 ${
                    milestones?.[config.key]?.completed ? "bg-green-600" : "bg-gray-300"
                  }`}
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function formatAddress(address) {
  if (!address) return "";
  const parts = [];
  // Handle propertyPack address structure (line1, line2, town, postcode)
  if (address.line1?.trim()) parts.push(address.line1.trim());
  if (address.line2?.trim()) parts.push(address.line2.trim());
  if (address.town?.trim()) parts.push(address.town.trim());
  if (address.postcode?.trim()) parts.push(address.postcode.trim());
  // Fallback to chain address structure (buildingNumber, street, etc.)
  if (!parts.length) {
    if (address.buildingNumber) parts.push(address.buildingNumber);
    if (address.buildingName) parts.push(address.buildingName);
    if (address.street) parts.push(address.street);
    if (address.town) parts.push(address.town);
    if (address.postcode) parts.push(address.postcode);
  }
  return parts.join(", ");
}

export default function ChainView() {
  const { stateData, loading: pdtfLoading, error: pdtfError, selectedService } = usePDTF();
  const { toast } = useToast();
  const [chainData, setChainData] = useState({
    onwardPurchase: null,
    current: null,
    buyersSale: null
  });
  const [loadingOnward, setLoadingOnward] = useState(false);
  const [loadingBuyers, setLoadingBuyers] = useState(false);
  const [chainFetched, setChainFetched] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadInitialData() {
      if (pdtfLoading) return;

      if (pdtfError) {
        setError(pdtfError);
        setLoading(false);
        return;
      }

      if (!stateData) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Only load current transaction data initially
        const newChainData = {
          current: {
            milestones: stateData.milestones,
            address: stateData.propertyPack?.address || stateData.address
          },
          onwardPurchase: null,
          buyersSale: null
        };

        setChainData(newChainData);
        setChainFetched(false);
      } catch (err) {
        console.error("Failed to load chain data:", err);
        setError(`Failed to load chain data: ${err.message}`);
      } finally {
        setLoading(false);
      }
    }

    loadInitialData();
  }, [stateData, pdtfLoading, pdtfError]);

  const handleFetchLinkedMilestones = async () => {
    if (!stateData?.chain) return;

    const chain = stateData.chain;
    const hasOnward = chain.onwardPurchase && chain.onwardPurchase.length > 0;
    const hasBuyers = chain.buyersSale && chain.buyersSale.length > 0;

    if (!hasOnward && !hasBuyers) return;

    try {
      const updates = { ...chainData };

      // Start loading both sides simultaneously
      if (hasOnward) setLoadingOnward(true);
      if (hasBuyers) setLoadingBuyers(true);

      // Fetch both sides in parallel
      const fetchPromises = [];

      // Fetch onward purchase
      if (hasOnward) {
        const onward = chain.onwardPurchase[0];
        fetchPromises.push(
          (async () => {
            try {
              // Add dramatic delay for visual effect
              await new Promise(resolve => setTimeout(resolve, 800));
              const onwardState = await pdtfAPI.getPDTFState(selectedService.id, onward.transactionId);
              updates.onwardPurchase = {
                milestones: onwardState.milestones,
                address: onwardState.propertyPack?.address || onwardState.address || onward.address,
                transactionId: onward.transactionId,
                hasOnwardPurchase: onwardState.chain?.onwardPurchase && onwardState.chain.onwardPurchase.length > 0
              };
            } catch (err) {
              console.error("Failed to load onward purchase:", err);
              toast({
                variant: "destructive",
                title: "Error loading onward purchase",
                description: err.message
              });
            } finally {
              setLoadingOnward(false);
            }
          })()
        );
      }

      // Fetch buyer's sale
      if (hasBuyers) {
        const sale = chain.buyersSale[0];
        fetchPromises.push(
          (async () => {
            try {
              // Add dramatic delay for visual effect
              await new Promise(resolve => setTimeout(resolve, 800));
              const saleState = await pdtfAPI.getPDTFState(selectedService.id, sale.transactionId);
              updates.buyersSale = {
                milestones: saleState.milestones,
                address: saleState.propertyPack?.address || saleState.address || sale.address,
                transactionId: sale.transactionId,
                hasBuyersSale: saleState.chain?.buyersSale && saleState.chain.buyersSale.length > 0
              };
            } catch (err) {
              console.error("Failed to load buyer's sale:", err);
              toast({
                variant: "destructive",
                title: "Error loading buyer's sale",
                description: err.message
              });
            } finally {
              setLoadingBuyers(false);
            }
          })()
        );
      }

      // Wait for all fetches to complete
      await Promise.all(fetchPromises);

      setChainData(updates);
      setChainFetched(true);
    } catch (err) {
      console.error("Failed to fetch linked milestones:", err);
      toast({
        variant: "destructive",
        title: "Error fetching chain data",
        description: err.message
      });
    }
  };

  if (loading || pdtfLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!stateData) {
    return (
      <Alert>
        <AlertDescription>No transaction data available</AlertDescription>
      </Alert>
    );
  }

  const hasChain = stateData?.chain?.onwardPurchase?.length > 0 || stateData?.chain?.buyersSale?.length > 0;
  const showFetchButton = hasChain && !chainFetched;
  const isFetching = loadingOnward || loadingBuyers;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Property Chain View</CardTitle>
              <CardDescription>
                Transaction progress for the property chain
              </CardDescription>
            </div>
            {showFetchButton && (
              <Button
                onClick={handleFetchLinkedMilestones}
                disabled={isFetching}
                variant="outline"
              >
                {isFetching && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Fetch Linked Milestones
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {!hasChain && (
            <Alert>
              <AlertDescription>
                No chain information available for this transaction
              </AlertDescription>
            </Alert>
          )}

          {/* Onward Purchase Section */}
          {stateData?.chain?.onwardPurchase?.length > 0 && (
            <>
              {/* Chain start indicator - only show when loaded and confirmed */}
              {chainData.onwardPurchase && !chainData.onwardPurchase.hasOnwardPurchase && (
                <div className="relative flex items-center justify-center py-4">
                  <div className="absolute inset-x-0 top-1/2 h-px bg-gray-300"></div>
                  <span className="relative text-xs text-gray-500 bg-gray-50 px-3 py-1 rounded border border-gray-300">Chain starts here</span>
                </div>
              )}

              {/* Loading state for onward purchase */}
              {loadingOnward && (
                <div className="bg-white border border-gray-200 rounded-lg p-8 flex items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                </div>
              )}

              {/* Loaded onward purchase */}
              {!loadingOnward && chainData.onwardPurchase && (
                <MilestoneTimeline
                  milestones={chainData.onwardPurchase.milestones}
                  label="Property Being Purchased"
                  address={formatAddress(chainData.onwardPurchase.address)}
                />
              )}
            </>
          )}

          {!stateData?.chain?.onwardPurchase?.length && (
            <div className="relative flex items-center justify-center py-4">
              <div className="absolute inset-x-0 top-1/2 h-px bg-gray-300"></div>
              <span className="relative text-xs text-gray-500 bg-gray-50 px-3 py-1 rounded border border-gray-300">Chain starts here</span>
            </div>
          )}

          {/* Current Transaction */}
          <div className="flex items-center gap-2 text-sm text-gray-600">
            {chainData.onwardPurchase && (
              <>
                <ArrowUp className="h-4 w-4" />
                <span className="font-medium">Onward Purchase</span>
              </>
            )}
          </div>
          <MilestoneTimeline
            milestones={chainData.current.milestones}
            label=""
            address={formatAddress(chainData.current.address)}
            isMain={true}
          />

          {/* Buyer's Sale Section */}
          <div className="flex items-center gap-2 text-sm text-gray-600">
            {chainData.buyersSale && (
              <>
                <ArrowDown className="h-4 w-4" />
                <span className="font-medium">Buyer's Sale</span>
              </>
            )}
          </div>

          {stateData?.chain?.buyersSale?.length > 0 && (
            <>
              {/* Loading state for buyer's sale */}
              {loadingBuyers && (
                <div className="bg-white border border-gray-200 rounded-lg p-8 flex items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                </div>
              )}

              {/* Loaded buyer's sale */}
              {!loadingBuyers && chainData.buyersSale && (
                <MilestoneTimeline
                  milestones={chainData.buyersSale.milestones}
                  label="Property Being Sold by Buyer"
                  address={formatAddress(chainData.buyersSale.address)}
                />
              )}

              {/* Chain end indicator - only show when loaded and confirmed */}
              {chainData.buyersSale && !chainData.buyersSale.hasBuyersSale && (
                <div className="relative flex items-center justify-center py-4">
                  <div className="absolute inset-x-0 top-1/2 h-px bg-gray-300"></div>
                  <span className="relative text-xs text-gray-500 bg-gray-50 px-3 py-1 rounded border border-gray-300">Chain ends here</span>
                </div>
              )}
            </>
          )}

          {!stateData?.chain?.buyersSale?.length && (
            <div className="relative flex items-center justify-center py-4">
              <div className="absolute inset-x-0 top-1/2 h-px bg-gray-300"></div>
              <span className="relative text-xs text-gray-500 bg-gray-50 px-3 py-1 rounded border border-gray-300">Chain ends here</span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
