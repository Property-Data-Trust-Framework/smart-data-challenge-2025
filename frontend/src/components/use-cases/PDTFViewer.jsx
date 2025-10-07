import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Building, MapPin, Users, FileText, Shield, Clock, ExternalLink, Verified, Server, AlertCircle, Settings, Eye } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { usePDTF } from '@/contexts/PDTFContext';

function PDTFViewer() {
  const {
    services,
    selectedService,
    setSelectedService,
    transactionId,
    setTransactionId,
    claimsData,
    stateData,
    loading,
    error,
    hasLoaded,
    loadPDTFData
  } = usePDTF();

  const [showConfig, setShowConfig] = useState(false);

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      loadPDTFData();
    }
  };

  const formatClaimPath = (path) => {
    return path
      .split('/')
      .filter(Boolean)
      .map(part => part.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()))
      .join(' › ');
  };

  // const formatClaimValue = (value) => {
  //   if (typeof value === 'object' && value !== null) {
  //     return JSON.stringify(value, null, 2);
  //   }
  //   return String(value);
  // };

  const getSourceBadgeVariant = (evidence) => {
    if (!evidence) return 'outline';
    if (evidence.type === 'vouch') return 'secondary';
    if (evidence.record?.source?.name?.includes('*')) return 'outline';
    return 'default';
  };

  const getSourceName = (evidence) => {
    if (!evidence) return 'Unknown source';
    if (evidence.type === 'vouch') {
      return `Vouched by ${evidence.attestation?.voucher?.name || 'Unknown'}`;
    }
    return evidence.record?.source?.name || 'Unknown source';
  };

  const getConfidentialityBadgeVariant = (level) => {
    if (!level) return 'outline';
    switch (level.toLowerCase()) {
      case 'restricted': return 'destructive';
      case 'confidential': return 'destructive';
      case 'private': return 'secondary';
      case 'public': return 'default';
      default: return 'outline';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">PDTF Claims & State Viewer</h2>
          <p className="text-gray-600">
            Viewing raw claims and aggregated state for this transaction
          </p>
        </div>
      </div>

      {/* Service Selection and Transaction Input - Hidden by default, config is in main header */}
      {showConfig && (
        <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Server className="h-5 w-5" />
            <span>PDTF Service Configuration</span>
          </CardTitle>
          <CardDescription>
            Select a PDTF service and enter a transaction ID to retrieve data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="service-select">PDTF Service</Label>
              <Select value={selectedService.id} onValueChange={(value) => {
                setSelectedService(services.find(s => s.id === value));
              }}>
                <SelectTrigger id="service-select">
                  <SelectValue placeholder="Select a service">
                    <div className="flex items-center space-x-2">
                      <span>{selectedService.icon}</span>
                      <span>{selectedService.name}</span>
                    </div>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {services.map((service) => (
                    <SelectItem key={service.id} value={service.id}>
                      <div className="flex items-center space-x-2">
                        <span>{service.icon}</span>
                        <div>
                          <div className="font-medium">{service.name}</div>
                          <div className="text-xs text-gray-500">{service.description}</div>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="transaction-id">Transaction ID</Label>
              <div className="flex space-x-2">
                <Input
                  id="transaction-id"
                  type="text"
                  placeholder={selectedService.id === 'moverly' ? 'e.g., 12345' : 'e.g., TX-2024-001'}
                  value={transactionId}
                  onChange={(e) => setTransactionId(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="flex-1"
                />
                <Button 
                  onClick={loadPDTFData}
                  disabled={loading || !transactionId.trim()}
                >
                  {loading ? 'Loading...' : 'Fetch Data'}
                </Button>
              </div>
            </div>
          </div>

          {selectedService.id === 'lms-nptn' && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>LMS NPTN Service</AlertTitle>
              <AlertDescription>
                This service uses OAuth authentication with the NPTN network. 
                Ensure you have valid credentials configured in the backend.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
        </Card>
      )}

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Loading State */}
      {loading && (
        <div className="space-y-4">
          <div className="text-center mb-4">
            <p className="text-gray-600">Fetching PDTF data from {selectedService.name}...</p>
          </div>
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-32" />
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-8 w-full" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-8 w-full" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-20 w-full" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Demo Mode Indicator */}
      {!loading && hasLoaded && (claimsData || stateData) && (claimsData?._metadata?.mode === 'demo' || stateData?._metadata?.mode === 'demo') && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Demo Mode Active</AlertTitle>
          <AlertDescription>
            You are viewing demonstration data for transaction {transactionId}.
            {claimsData?._metadata?.note && <div className="mt-2 text-sm text-gray-600">{claimsData._metadata.note}</div>}
          </AlertDescription>
        </Alert>
      )}

      {/* Data Display */}
      {!loading && hasLoaded && (claimsData || stateData) && (() => {
        // Log any claims containing "valuations"
        if (claimsData) {
          const valuationClaims = claimsData.filter(claim =>
            JSON.stringify(claim).toLowerCase().includes('valuation')
          );
          if (valuationClaims.length > 0) {
            console.log('=== CLAIMS CONTAINING "VALUATION" ===');
            valuationClaims.forEach((claim, index) => {
              console.log(`Claim ${index + 1}:`, JSON.stringify(claim, null, 2));
            });
          }
        }
        return null;
      })()}
      {!loading && hasLoaded && (claimsData || stateData) && (
        <Tabs defaultValue="state" className="space-y-4">
          <TabsList>
            <TabsTrigger value="state">Transaction State</TabsTrigger>
            <TabsTrigger value="claims">Claims List</TabsTrigger>
          </TabsList>

          {/* State Tab */}
          <TabsContent value="state">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Verified className="h-5 w-5" />
                  <span>Transaction State</span>
                </CardTitle>
                <CardDescription>
                  Current aggregated state for transaction {transactionId}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {stateData ? (
                  <div className="space-y-6">
                    {/* Display state data */}
                    <div className="bg-gray-50 rounded-lg p-4">
                      <pre className="text-sm overflow-x-auto whitespace-pre-wrap">
                        {JSON.stringify(stateData, null, 2)}
                      </pre>
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-gray-600 py-8">
                    No state data available for this transaction
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Claims Tab */}
          <TabsContent value="claims">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <FileText className="h-5 w-5" />
                  <span>Transaction Claims</span>
                </CardTitle>
                <CardDescription>
                  Individual claims for transaction {transactionId}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {claimsData && claimsData.length > 0 ? (
                  <div className="space-y-4">
                    {claimsData.map((claim, index) => (
                      <Card key={claim.id || index} className="border-l-4 border-l-blue-500">
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-lg">
                              {claim.claims ? Object.keys(claim.claims).map(formatClaimPath).join(', ') :
                               claim.path ? formatClaimPath(claim.path) : `Claim ${index + 1}`}
                            </CardTitle>
                            <div className="flex items-center gap-2">
                              {claim.verification?.evidence?.[0] && (
                                <Badge variant={getSourceBadgeVariant(claim.verification.evidence[0])}>
                                  {getSourceName(claim.verification.evidence[0])}
                                </Badge>
                              )}
                              {claim.terms_of_use?.confidentiality_level && (
                                <Badge variant={getConfidentialityBadgeVariant(claim.terms_of_use.confidentiality_level)}>
                                  {claim.terms_of_use.confidentiality_level.charAt(0).toUpperCase() + claim.terms_of_use.confidentiality_level.slice(1)}
                                </Badge>
                              )}
                            </div>
                          </div>
                          {claim.verification && (
                            <div className="flex items-center space-x-4 text-sm text-gray-600">
                              <span className="flex items-center space-x-1">
                                <Shield className="h-4 w-4" />
                                <span>{claim.verification.trust_framework || 'PDTF'}</span>
                              </span>
                              <span className="flex items-center space-x-1">
                                <Clock className="h-4 w-4" />
                                <span>{new Date(claim.verification.time || claim.timestamp || Date.now()).toLocaleString()}</span>
                              </span>
                            </div>
                          )}
                        </CardHeader>
                        <CardContent>
                          <div className="bg-gray-50 rounded p-3">
                            <pre className="text-sm overflow-x-auto whitespace-pre-wrap">
                              {claim.claims ? 
                                JSON.stringify(claim.claims, null, 2) : 
                                JSON.stringify(claim.object || claim.value || claim, null, 2)}
                            </pre>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-gray-600 py-8">
                    No claims data available for this transaction
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {/* Empty State */}
      {!loading && !hasLoaded && (
        <Card className="border-dashed">
          <CardContent className="text-center py-12">
            <Server className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-2">No data loaded</p>
            <p className="text-sm text-gray-500">
              Enter a transaction ID and click "Fetch Data" to retrieve PDTF information
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default PDTFViewer;