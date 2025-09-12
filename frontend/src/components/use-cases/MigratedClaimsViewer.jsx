import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Building, MapPin, Users, FileText, Shield, Clock, ExternalLink, Verified } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { pdtfAPI } from '@/lib/api';

const SYNTHETIC_PROPERTIES = [
  {
    id: '59-hawkley-gardens',
    name: '59 Hawkley Gardens, ALTRINCHAM',
    address: '59 Hawkley Gardens, ALTRINCHAM WA14 5SL',
    type: 'Detached House',
    uprn: '635044300628'
  },
  {
    id: '101-broadbridge-close-manchester',
    name: '101 Broadbridge Close, MANCHESTER',
    address: '101 Broadbridge Close, MANCHESTER M41 9NQ',
    type: 'Terraced House',
    uprn: '799425638234'
  },
  {
    id: '107-sunbeam-crescent-910358',
    name: '107 Sunbeam Crescent, MANCHESTER',
    address: '107 Sunbeam Crescent, MANCHESTER M9 0358',
    type: 'Terraced House',
    uprn: '910358169111'
  },
  {
    id: '91-south-hill-avenue-142222',
    name: '91 South Hill Avenue, MANCHESTER',
    address: '91 South Hill Avenue, MANCHESTER M14 2222',
    type: 'Semi-detached House',
    uprn: '142222141245'
  }
];

function MigratedClaimsViewer() {
  const [selectedProperty, setSelectedProperty] = useState(SYNTHETIC_PROPERTIES[0]);
  const [claimsData, setClaimsData] = useState(null);
  const [stateData, setStateData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Note: State aggregation now handled by backend using JSON Pointer library

  const loadPropertyData = useCallback(async (propertyId) => {
    setLoading(true);
    setError(null);
    
    try {
      // Load real data from our backend API
      const [claimsResponse, stateResponse] = await Promise.all([
        pdtfAPI.getPropertyPackData(propertyId, 'claims'),
        pdtfAPI.getAggregatedState(propertyId)
      ]);
      
      const claimsData = claimsResponse.data;
      const stateData = stateResponse.aggregatedState;
      
      setClaimsData(claimsData);
      setStateData(stateData);
      
    } catch (err) {
      console.error('Failed to load property data:', err);
      setError('Failed to load property data: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load claims data when property changes
  useEffect(() => {
    if (selectedProperty) {
      loadPropertyData(selectedProperty.id);
    }
  }, [selectedProperty, loadPropertyData]);

  const getSourceBadgeVariant = (evidence) => {
    if (evidence.type === 'vouch') return 'secondary';
    if (evidence.record?.source?.name?.includes('*')) return 'outline';
    return 'default';
  };

  const getSourceName = (evidence) => {
    if (evidence.type === 'vouch') {
      return `Vouched by ${evidence.attestation?.voucher?.name}`;
    }
    return evidence.record?.source?.name || 'Unknown source';
  };

  const formatClaimPath = (path) => {
    return path
      .split('/')
      .filter(Boolean)
      .map(part => part.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()))
      .join(' › ');
  };

  const formatClaimValue = (value) => {
    if (typeof value === 'object' && value !== null) {
      return JSON.stringify(value, null, 2);
    }
    return String(value);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="text-center mb-4">
          <p className="text-gray-600">Loading property data...</p>
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-red-600 p-8">
        <p>{error}</p>
        <Button onClick={() => loadPropertyData(selectedProperty.id)} className="mt-4">
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Migrated Claims Viewer</h2>
          <p className="text-gray-600">View migrated property claims and aggregated state data</p>
        </div>
        
        <Select value={selectedProperty.id} onValueChange={(value) => 
          setSelectedProperty(SYNTHETIC_PROPERTIES.find(p => p.id === value))
        }>
          <SelectTrigger className="w-[300px]">
            <SelectValue placeholder="Select a property" />
          </SelectTrigger>
          <SelectContent>
            {SYNTHETIC_PROPERTIES.map((property) => (
              <SelectItem key={property.id} value={property.id}>
                <div className="flex items-center space-x-2">
                  <Building className="h-4 w-4" />
                  <span>{property.name}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Property Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Building className="h-5 w-5" />
            <span>{selectedProperty.name}</span>
          </CardTitle>
          <CardDescription className="flex items-center space-x-4">
            <span className="flex items-center space-x-1">
              <MapPin className="h-4 w-4" />
              <span>UPRN: {selectedProperty.uprn}</span>
            </span>
            <span className="flex items-center space-x-1">
              <FileText className="h-4 w-4" />
              <span>{claimsData ? `${claimsData.length} claims` : 'Loading...'}</span>
            </span>
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Main Content Tabs */}
      <Tabs defaultValue="claims" className="space-y-4">
        <TabsList>
          <TabsTrigger value="claims">Claims List</TabsTrigger>
          <TabsTrigger value="state">Aggregated State</TabsTrigger>
        </TabsList>

        {/* Claims List Tab */}
        <TabsContent value="claims">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <FileText className="h-5 w-5" />
                <span>Individual Claims</span>
              </CardTitle>
              <CardDescription>
                All claims in the property pack with their verification evidence
              </CardDescription>
            </CardHeader>
            <CardContent>
              {claimsData && claimsData.length > 0 ? (
                <div className="space-y-4">
                  {claimsData.map((claim) => (
                    <Card key={claim.id} className="border-l-4 border-l-blue-500">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg">
                            {Object.keys(claim.claims).map(formatClaimPath).join(', ')}
                          </CardTitle>
                          <Badge variant={getSourceBadgeVariant(claim.verification.evidence[0])}>
                            {getSourceName(claim.verification.evidence[0])}
                          </Badge>
                        </div>
                        <div className="flex items-center space-x-4 text-sm text-gray-600">
                          <span className="flex items-center space-x-1">
                            <Shield className="h-4 w-4" />
                            <span>{claim.verification.trust_framework}</span>
                          </span>
                          <span className="flex items-center space-x-1">
                            <Clock className="h-4 w-4" />
                            <span>{new Date(claim.verification.time).toLocaleString()}</span>
                          </span>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {Object.entries(claim.claims).map(([path, value]) => (
                            <div key={path} className="border rounded p-3 bg-gray-50">
                              <div className="font-medium text-sm text-gray-700 mb-2">{path}</div>
                              <pre className="text-sm bg-white p-2 rounded border overflow-x-auto">
                                {formatClaimValue(value)}
                              </pre>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center text-gray-600 py-8">
                  No claims data available
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Aggregated State Tab */}
        <TabsContent value="state">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Verified className="h-5 w-5" />
                <span>Aggregated Property State</span>
              </CardTitle>
              <CardDescription>
                Current property state derived from all claims
              </CardDescription>
            </CardHeader>
            <CardContent>
              {stateData ? (
                <div className="space-y-6">
                  {/* Participants */}
                  {stateData.participants && (
                    <div>
                      <h3 className="text-lg font-semibold mb-3 flex items-center space-x-2">
                        <Users className="h-5 w-5" />
                        <span>Participants</span>
                      </h3>
                      <div className="grid gap-4">
                        {stateData.participants.map((participant, index) => (
                          <Card key={index} className="p-4">
                            <div className="flex items-start justify-between">
                              <div>
                                <div className="font-semibold">
                                  {participant.name?.title} {participant.name?.firstName} {participant.name?.lastName}
                                </div>
                                <Badge variant="outline" className="mt-1">
                                  {participant.role}
                                </Badge>
                                <div className="mt-2 space-y-1 text-sm text-gray-600">
                                  {participant.email && <div>📧 {participant.email}</div>}
                                  {participant.phone && <div>📞 {participant.phone}</div>}
                                  {participant.address && (
                                    <div>📍 {participant.address.line1}, {participant.address.town} {participant.address.postcode}</div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Property Pack Data */}
                  {stateData.propertyPack && (
                    <div>
                      <h3 className="text-lg font-semibold mb-3 flex items-center space-x-2">
                        <Building className="h-5 w-5" />
                        <span>Property Information</span>
                      </h3>
                      <div className="grid gap-4 md:grid-cols-2">
                        {Object.entries(stateData.propertyPack).map(([key, value]) => (
                          <Card key={key} className="p-4">
                            <div className="font-semibold capitalize mb-2">
                              {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                            </div>
                            <pre className="text-sm bg-gray-50 p-2 rounded border overflow-x-auto">
                              {formatClaimValue(value)}
                            </pre>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center text-gray-600 py-8">
                  No state data available
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default MigratedClaimsViewer;