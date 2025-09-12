import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Building2, Users, FileText, Zap, Wrench, Shield, 
  RefreshCw, MapPin, Calendar, User, Phone, Mail, PoundSterling 
} from 'lucide-react';
import { pdtfAPI } from '@/lib/api';

function PropertyViewer() {
  const [properties, setProperties] = useState([]);
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [selectedPropertyId, setSelectedPropertyId] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchProperties = async () => {
    setLoading(true);
    try {
      const result = await pdtfAPI.getPropertyData();
      setProperties(result.properties || []);
      if (result.properties && result.properties.length > 0) {
        setSelectedPropertyId(result.properties[0].property_id);
      }
    } catch (error) {
      console.error('Error fetching properties:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSelectedProperty = async (propertyId) => {
    if (!propertyId) return;
    
    setLoading(true);
    try {
      const result = await pdtfAPI.getPropertyData(propertyId);
      setSelectedProperty(result.selected_property);
    } catch (error) {
      console.error('Error fetching property details:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProperties();
  }, []);

  useEffect(() => {
    if (selectedPropertyId) {
      fetchSelectedProperty(selectedPropertyId);
    }
  }, [selectedPropertyId]);

  const handlePropertyChange = (propertyId) => {
    setSelectedPropertyId(propertyId);
  };

  if (loading && !selectedProperty && properties.length === 0) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <Building2 className="h-12 w-12 mx-auto mb-4 text-gray-400 animate-pulse" />
          <p className="text-gray-600">Loading properties...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-emerald-50 to-teal-50 p-8 rounded-lg">
        <div className="flex items-center gap-3 mb-4">
          <Building2 className="h-8 w-8 text-emerald-600" />
          <h1 className="text-3xl font-bold text-gray-900">Property Data Explorer</h1>
        </div>
        <p className="text-gray-600 mb-4">
          Select a property to view comprehensive data including owners, energy performance, and conveyancing details
        </p>
        
        <div className="flex gap-4 items-center">
          <div className="flex-1 max-w-md">
            <Select value={selectedPropertyId} onValueChange={handlePropertyChange}>
              <SelectTrigger className="bg-white">
                <SelectValue placeholder="Select a property..." />
              </SelectTrigger>
              <SelectContent>
                {properties.map((property) => (
                  <SelectItem key={property.property_id} value={property.property_id}>
                    <div className="flex flex-col">
                      <span className="font-medium">{property.property.address.line1}</span>
                      <span className="text-sm text-gray-500">
                        {property.property.address.town} • {property.property.property_details.property_type}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <Button 
            onClick={fetchProperties}
            disabled={loading}
            variant="outline"
            className="border-emerald-300"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {selectedProperty && (
        <>
          {/* Property Header */}
          <Card className="p-6 border-emerald-200 bg-emerald-50/30">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-emerald-100 rounded-lg">
                  <MapPin className="h-6 w-6 text-emerald-600" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    {selectedProperty.property.address.line1}
                  </h2>
                  <p className="text-gray-600">
                    {selectedProperty.property.address.town}, {selectedProperty.property.address.postcode}
                  </p>
                  <div className="flex gap-2 mt-2">
                    <Badge variant="outline">{selectedProperty.property.property_details.property_type}</Badge>
                    <Badge variant={getEPCVariant(selectedProperty.property.energy_performance.epc_current_class)}>
                      EPC: {selectedProperty.property.energy_performance.epc_current_class}
                    </Badge>
                    <Badge variant="secondary">
                      {selectedProperty.owners.length} Owner{selectedProperty.owners.length !== 1 ? 's' : ''}
                    </Badge>
                  </div>
                </div>
              </div>
              <div className="text-right flex flex-col items-end gap-3">
                {/* Price Information - Prominent Display */}
                {selectedProperty.priceInformation && (
                  <div className="bg-white rounded-lg p-4 border-2 border-emerald-300 shadow-sm">
                    <div className="flex items-center gap-2 mb-1">
                      <PoundSterling className="h-4 w-4 text-emerald-600" />
                      <span className="text-sm font-medium text-emerald-700">Asking Price</span>
                    </div>
                    <div className="text-2xl font-bold text-gray-900">
                      £{selectedProperty.priceInformation.price.toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-600">
                      {selectedProperty.priceInformation.priceQualifier}
                    </div>
                  </div>
                )}
                <div className="text-right">
                  <div className="text-sm text-gray-500">UPRN</div>
                  <div className="font-mono text-sm">{selectedProperty.uprn}</div>
                </div>
              </div>
            </div>
          </Card>

          {/* Data Quality Summary */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            {/* Price per sq meter - if price is available */}
            {selectedProperty.priceInformation && (
              <Card className="p-4 text-center">
                <div className="text-2xl font-bold text-emerald-600">
                  £{Math.round(selectedProperty.priceInformation.price / selectedProperty.property.property_details.total_area).toLocaleString()}
                </div>
                <div className="text-sm text-gray-600">Per m²</div>
              </Card>
            )}
            
            <Card className="p-4 text-center">
              <div className="text-2xl font-bold text-emerald-600">
                {selectedProperty.data_quality.data_completeness}%
              </div>
              <div className="text-sm text-gray-600">Complete</div>
            </Card>
            
            <Card className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">
                {selectedProperty.owners.length}
              </div>
              <div className="text-sm text-gray-600">Owners</div>
            </Card>
            
            <Card className="p-4 text-center">
              <div className="text-2xl font-bold text-green-600">
                {selectedProperty.property.property_details.bedrooms}
              </div>
              <div className="text-sm text-gray-600">Bedrooms</div>
            </Card>
            
            <Card className="p-4 text-center">
              <div className="text-2xl font-bold text-purple-600">
                {selectedProperty.property.property_details.total_area}m²
              </div>
              <div className="text-sm text-gray-600">Total Area</div>
            </Card>
            
            <Card className="p-4 text-center">
              <div className="text-2xl font-bold text-orange-600">
                {selectedProperty.property.financial.council_tax_band}
              </div>
              <div className="text-sm text-gray-600">Council Tax</div>
            </Card>
          </div>

          {/* Detailed Information Tabs */}
          <Tabs defaultValue="property" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              {selectedProperty.priceInformation && (
                <TabsTrigger value="pricing">Pricing & Market</TabsTrigger>
              )}
              <TabsTrigger value="property">Property Details</TabsTrigger>
              <TabsTrigger value="owners">Owners ({selectedProperty.owners.length})</TabsTrigger>
              <TabsTrigger value="energy">Energy & Utilities</TabsTrigger>
              <TabsTrigger value="conveyancing">
                Conveyancing {selectedProperty.conveyancing_data ? '✓' : '✗'}
              </TabsTrigger>
            </TabsList>
            
            {selectedProperty.priceInformation && (
              <TabsContent value="pricing" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card className="p-6">
                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                      <PoundSterling className="h-5 w-5" />
                      Asking Price Details
                    </h3>
                    <div className="space-y-4">
                      <div className="bg-emerald-50 p-4 rounded-lg">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm text-gray-600">Asking Price</span>
                          <span className="text-2xl font-bold text-emerald-600">
                            £{selectedProperty.priceInformation.price.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Price Qualifier</span>
                          <Badge variant="outline">{selectedProperty.priceInformation.priceQualifier}</Badge>
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Price per m²</span>
                          <span className="font-medium">
                            £{Math.round(selectedProperty.priceInformation.price / selectedProperty.property.property_details.total_area).toLocaleString()}/m²
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Price per bedroom</span>
                          <span className="font-medium">
                            £{Math.round(selectedProperty.priceInformation.price / selectedProperty.property.property_details.bedrooms).toLocaleString()}
                          </span>
                        </div>
                        {selectedProperty.property.financial.council_tax_band && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Council Tax Band</span>
                            <Badge variant="secondary">{selectedProperty.property.financial.council_tax_band}</Badge>
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>

                  <Card className="p-6">
                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                      <Building2 className="h-5 w-5" />
                      Property Value Indicators
                    </h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Property Type</span>
                        <span className="font-medium">{selectedProperty.property.property_details.property_type}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Total Area</span>
                        <span className="font-medium">{selectedProperty.property.property_details.total_area}m²</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Bedrooms</span>
                        <span className="font-medium">{selectedProperty.property.property_details.bedrooms}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">EPC Rating</span>
                        <Badge variant={getEPCVariant(selectedProperty.property.energy_performance.epc_current_class)}>
                          {selectedProperty.property.energy_performance.epc_current_class}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Location</span>
                        <span className="font-medium">{selectedProperty.property.address.town}</span>
                      </div>
                      {selectedProperty.conveyancing_data && (
                        <>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Construction Year</span>
                            <span className="font-medium">{selectedProperty.conveyancing_data.assessment.construction_year}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">New Build</span>
                            <Badge variant={selectedProperty.conveyancing_data.assessment.is_new_build ? "default" : "secondary"}>
                              {selectedProperty.conveyancing_data.assessment.is_new_build ? 'Yes' : 'No'}
                            </Badge>
                          </div>
                        </>
                      )}
                    </div>
                  </Card>
                </div>

                {/* Additional pricing insights based on available data */}
                <Card className="p-6">
                  <h3 className="font-semibold mb-4">Market Analysis</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <div className="text-lg font-semibold text-gray-900">
                        £{Math.round(selectedProperty.priceInformation.price / selectedProperty.property.property_details.total_area).toLocaleString()}
                      </div>
                      <div className="text-sm text-gray-600">Price per m²</div>
                    </div>
                    
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <div className="text-lg font-semibold text-gray-900">
                        {selectedProperty.property.energy_performance.epc_current_class}
                      </div>
                      <div className="text-sm text-gray-600">Energy Rating</div>
                    </div>
                    
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <div className="text-lg font-semibold text-gray-900">
                        {selectedProperty.data_quality.data_completeness}%
                      </div>
                      <div className="text-sm text-gray-600">Data Completeness</div>
                    </div>
                  </div>
                </Card>
              </TabsContent>
            )}
            
            <TabsContent value="property" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="p-6">
                  <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    Property Details
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Property Type</span>
                      <span className="font-medium">{selectedProperty.property.property_details.property_type}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Area</span>
                      <span className="font-medium">{selectedProperty.property.property_details.total_area}m²</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Bedrooms</span>
                      <span className="font-medium">{selectedProperty.property.property_details.bedrooms}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Bathrooms</span>
                      <span className="font-medium">{selectedProperty.property.property_details.bathrooms}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Living Rooms</span>
                      <span className="font-medium">{selectedProperty.property.property_details.living_rooms}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Kitchens</span>
                      <span className="font-medium">{selectedProperty.property.property_details.kitchens}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Other Rooms</span>
                      <span className="font-medium">{selectedProperty.property.property_details.other_rooms}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Adults</span>
                      <span className="font-medium">{selectedProperty.property.property_details.adults}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Children</span>
                      <span className="font-medium">{selectedProperty.property.property_details.children}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Occupancy</span>
                      <span className="font-medium">{selectedProperty.property.property_details.occupancy} people</span>
                    </div>
                  </div>
                </Card>

                <Card className="p-6">
                  <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Financial & Legal
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Property Status</span>
                      <Badge variant="outline">{selectedProperty.property.financial.property_status}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Council Tax Band</span>
                      <Badge variant="secondary">{selectedProperty.property.financial.council_tax_band}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Residential</span>
                      <span className="font-medium">
                        {selectedProperty.property.financial.is_residential ? 'Yes' : 'No'}
                      </span>
                    </div>
                  </div>
                </Card>
              </div>
            </TabsContent>
            
            <TabsContent value="owners" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {selectedProperty.owners.map((owner, index) => (
                  <Card key={index} className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <User className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold">{owner.title} {owner.name}</h3>
                        <p className="text-sm text-gray-500">ID: {owner.person_id}</p>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Date of Birth</span>
                        <span className="font-medium">{owner.personal_details.date_of_birth}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Sex</span>
                        <span className="font-medium">{owner.personal_details.sex}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Birth Locale</span>
                        <span className="font-medium">{owner.personal_details.birth_locale}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">National ID</span>
                        <span className="font-medium font-mono text-sm">{owner.personal_details.national_id}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Education Level</span>
                        <span className="font-medium">{owner.personal_details.education_level}</span>
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="h-4 w-4 text-gray-500" />
                        <span>{owner.contact_info.personal_email}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="h-4 w-4 text-gray-500" />
                        <span>{owner.contact_info.mobile}</span>
                      </div>
                      {owner.contact_info.landline && (
                        <div className="flex items-center gap-2 text-sm">
                          <Phone className="h-4 w-4 text-gray-500" />
                          <span className="text-gray-600">{owner.contact_info.landline} (landline)</span>
                        </div>
                      )}
                      {owner.contact_info.work_email && (
                        <div className="flex items-center gap-2 text-sm">
                          <Mail className="h-4 w-4 text-gray-500" />
                          <span className="text-gray-600">{owner.contact_info.work_email} (work)</span>
                        </div>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            </TabsContent>
            
            <TabsContent value="energy" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="p-6">
                  <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <Zap className="h-5 w-5" />
                    Energy Performance
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">EPC Rating</span>
                      <Badge variant={getEPCVariant(selectedProperty.property.energy_performance.epc_current_class)}>
                        {selectedProperty.property.energy_performance.epc_current_class} 
                        ({selectedProperty.property.energy_performance.epc_current_score})
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Annual Electricity</span>
                      <span className="font-medium">{selectedProperty.property.energy_performance.electricity_consumption} kWh</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Annual Gas</span>
                      <span className="font-medium">{selectedProperty.property.energy_performance.gas_consumption} kWh</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Main Heating Fuel</span>
                      <span className="font-medium">{selectedProperty.property.energy_performance.main_heating_fuel}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Carbon Emissions</span>
                      <span className="font-medium">{selectedProperty.property.energy_performance.carbon_emissions} tonnes/year</span>
                    </div>
                  </div>
                </Card>

                <Card className="p-6">
                  <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <Wrench className="h-5 w-5" />
                    Utilities & Features
                  </h3>
                  <div className="space-y-3">
                    {[
                      ['Solar Panels', selectedProperty.property.energy_performance.has_solar_panels],
                      ['Heat Pump', selectedProperty.property.energy_performance.has_heat_pump],
                      ['Smart Meter', selectedProperty.property.energy_performance.has_smart_meter],
                      ['Electricity', selectedProperty.property.energy_performance.has_electricity],
                      ['Gas', selectedProperty.property.energy_performance.has_gas],
                      ['Broadband', selectedProperty.property.utilities.has_broadband],
                      ['Cable/Satellite', selectedProperty.property.utilities.has_cable_satellite],
                      ['Home Battery', selectedProperty.property.utilities.has_home_battery],
                      ['Telephone', selectedProperty.property.utilities.has_telephone]
                    ].map(([feature, hasFeature]) => (
                      <div key={feature} className="flex justify-between items-center">
                        <span className="text-gray-600">{feature}</span>
                        <Badge variant={hasFeature ? "default" : "secondary"}>
                          {hasFeature ? 'Yes' : 'No'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            </TabsContent>
            
            <TabsContent value="conveyancing" className="space-y-6">
              {selectedProperty.conveyancing_data ? (
                <>
                  {/* Assessment Information */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card className="p-6">
                      <h3 className="font-semibold mb-4 flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        Assessment Information
                      </h3>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Assessment Date</span>
                          <span className="font-medium">{selectedProperty.conveyancing_data.assessment.assessment_date}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Organisation</span>
                          <span className="font-medium text-sm">{selectedProperty.conveyancing_data.assessment.approved_organisation}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Assessment Type</span>
                          <span className="font-medium">{selectedProperty.conveyancing_data.assessment.type_of_assessment}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Construction Year</span>
                          <span className="font-medium">{selectedProperty.conveyancing_data.assessment.construction_year}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">New Build</span>
                          <Badge variant={selectedProperty.conveyancing_data.assessment.is_new_build ? "default" : "secondary"}>
                            {selectedProperty.conveyancing_data.assessment.is_new_build ? 'Yes' : 'No'}
                          </Badge>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">First Owner</span>
                          <Badge variant={selectedProperty.conveyancing_data.assessment.is_first_owner ? "default" : "secondary"}>
                            {selectedProperty.conveyancing_data.assessment.is_first_owner ? 'Yes' : 'No'}
                          </Badge>
                        </div>
                      </div>
                    </Card>

                    <Card className="p-6">
                      <h3 className="font-semibold mb-4 flex items-center gap-2">
                        <Building2 className="h-5 w-5" />
                        Building Structure
                      </h3>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Floors in Block</span>
                          <span className="font-medium">{selectedProperty.conveyancing_data.building_structure.floors_in_block}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Floor Located</span>
                          <span className="font-medium">{selectedProperty.conveyancing_data.building_structure.floor_located}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Lift Provided</span>
                          <Badge variant={selectedProperty.conveyancing_data.building_structure.lift_provided ? "default" : "secondary"}>
                            {selectedProperty.conveyancing_data.building_structure.lift_provided ? 'Yes' : 'No'}
                          </Badge>
                        </div>
                      </div>
                    </Card>
                  </div>

                  {/* Service Charges */}
                  <Card className="p-6">
                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Service Charges
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Service Charge Paid</span>
                        <Badge variant={selectedProperty.conveyancing_data.service_charges.service_charge_paid ? "default" : "secondary"}>
                          {selectedProperty.conveyancing_data.service_charges.service_charge_paid ? 'Yes' : 'No'}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Amount</span>
                        <span className="font-medium">{selectedProperty.conveyancing_data.service_charges.service_charge_amount}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Currency</span>
                        <span className="font-medium">{selectedProperty.conveyancing_data.service_charges.service_charge_currency}</span>
                      </div>
                    </div>
                  </Card>

                  {/* Property Condition - Comprehensive */}
                  <Card className="p-6">
                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                      <Wrench className="h-5 w-5" />
                      Property Condition Assessment
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {[
                        ['Structural Movement', selectedProperty.conveyancing_data.property_condition.structural_movement],
                        ['Dampness', selectedProperty.conveyancing_data.property_condition.dampness],
                        ['Chimney Stacks', selectedProperty.conveyancing_data.property_condition.chimney_stacks],
                        ['Roofing', selectedProperty.conveyancing_data.property_condition.roofing],
                        ['Main Walls', selectedProperty.conveyancing_data.property_condition.main_walls],
                        ['Windows', selectedProperty.conveyancing_data.property_condition.windows],
                        ['External Decorations', selectedProperty.conveyancing_data.property_condition.external_decorations],
                        ['Conservatories', selectedProperty.conveyancing_data.property_condition.conservatories],
                        ['Communal Areas', selectedProperty.conveyancing_data.property_condition.communal_areas],
                        ['Garages/Outbuildings', selectedProperty.conveyancing_data.property_condition.garages_outbuildings],
                        ['Outside Boundaries', selectedProperty.conveyancing_data.property_condition.outside_area_boundaries],
                        ['Ceilings', selectedProperty.conveyancing_data.property_condition.ceilings],
                        ['Internal Walls', selectedProperty.conveyancing_data.property_condition.internal_walls],
                        ['Floors', selectedProperty.conveyancing_data.property_condition.floors],
                        ['Internal Fittings', selectedProperty.conveyancing_data.property_condition.internal_fittings],
                        ['Chimney Breast/Fireplace', selectedProperty.conveyancing_data.property_condition.chimney_breast_fireplace],
                        ['Internal Decorations', selectedProperty.conveyancing_data.property_condition.internal_decorations],
                        ['Cellars', selectedProperty.conveyancing_data.property_condition.cellars]
                      ].map(([condition, rating]) => (
                        <div key={condition} className="text-center p-3 bg-gray-50 rounded">
                          <div className="text-xs text-gray-600 mb-1">{condition}</div>
                          <Badge variant={rating >= 3 ? "default" : rating >= 2 ? "secondary" : "destructive"}>
                            {rating}/5
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </Card>

                  {/* Utilities & Services */}
                  <Card className="p-6">
                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                      <Zap className="h-5 w-5" />
                      Utilities & Services Assessment
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {[
                        ['Electricity', selectedProperty.conveyancing_data.utilities_services.electricity],
                        ['Gas', selectedProperty.conveyancing_data.utilities_services.gas],
                        ['Water Fittings', selectedProperty.conveyancing_data.utilities_services.water_fittings],
                        ['Heating/Hot Water', selectedProperty.conveyancing_data.utilities_services.heating_hot_water],
                        ['Drainage', selectedProperty.conveyancing_data.utilities_services.drainage]
                      ].map(([utility, rating]) => (
                        <div key={utility} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                          <span className="text-sm text-gray-600">{utility}</span>
                          <Badge variant={rating >= 3 ? "default" : rating >= 2 ? "secondary" : "destructive"}>
                            {rating}/5
                          </Badge>
                        </div>
                      ))}
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t">
                      {[
                        ['Mains Water', selectedProperty.conveyancing_data.utilities_services.has_mains_water],
                        ['Drainage System', selectedProperty.conveyancing_data.utilities_services.has_drainage],
                        ['Foul Drainage', selectedProperty.conveyancing_data.utilities_services.has_foul_drainage],
                        ['Septic Tank', selectedProperty.conveyancing_data.utilities_services.has_septic_tank],
                        ['Central Heating', selectedProperty.conveyancing_data.utilities_services.has_central_heating]
                      ].map(([utility, hasUtility]) => (
                        <div key={utility} className="text-center p-3 bg-gray-50 rounded">
                          <div className="text-xs text-gray-600 mb-1">{utility}</div>
                          <Badge variant={hasUtility ? "default" : "secondary"}>
                            {hasUtility ? 'Yes' : 'No'}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </Card>

                  {/* Planning & Legal */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card className="p-6">
                      <h3 className="font-semibold mb-4 flex items-center gap-2">
                        <Shield className="h-5 w-5" />
                        Planning & Legal Status
                      </h3>
                      <div className="space-y-3">
                        {[
                          ['Listed Building', selectedProperty.conveyancing_data.planning_legal.listed_building],
                          ['Conservation Area', selectedProperty.conveyancing_data.planning_legal.conservation_area],
                          ['Protected Trees', selectedProperty.conveyancing_data.planning_legal.trees_protected],
                          ['Private Road', selectedProperty.conveyancing_data.planning_legal.private_road],
                          ['Controlled Parking', selectedProperty.conveyancing_data.planning_legal.controlled_parking]
                        ].map(([status, hasStatus]) => (
                          <div key={status} className="flex justify-between items-center">
                            <span className="text-gray-600">{status}</span>
                            <Badge variant={hasStatus ? "default" : "secondary"}>
                              {hasStatus ? 'Yes' : 'No'}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </Card>

                    <Card className="p-6">
                      <h3 className="font-semibold mb-4 flex items-center gap-2">
                        <Shield className="h-5 w-5" />
                        Environmental Risks
                      </h3>
                      <div className="space-y-3">
                        {[
                          ['Environmental Issue', selectedProperty.conveyancing_data.environmental_risks.has_environmental_issue],
                          ['Excessive Noise', selectedProperty.conveyancing_data.environmental_risks.has_excessive_noise],
                          ['Violent Crime', selectedProperty.conveyancing_data.environmental_risks.has_violent_crime],
                          ['Previous Flood', selectedProperty.conveyancing_data.environmental_risks.had_previous_flood],
                          ['Mining Area', selectedProperty.conveyancing_data.environmental_risks.is_mining_area]
                        ].map(([risk, hasRisk]) => (
                          <div key={risk} className="flex justify-between items-center">
                            <span className="text-gray-600">{risk}</span>
                            <Badge variant={hasRisk ? "destructive" : "default"}>
                              {hasRisk ? 'Yes' : 'No'}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </Card>
                  </div>

                  {/* Property Issues */}
                  <Card className="p-6">
                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                      <Shield className="h-5 w-5 text-red-500" />
                      Property Issues & Risks
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {[
                        ['Dispute', selectedProperty.conveyancing_data.property_issues.has_dispute],
                        ['Japanese Knotweed', selectedProperty.conveyancing_data.property_issues.has_japanese_knotweed],
                        ['Asbestos', selectedProperty.conveyancing_data.property_issues.has_asbestos],
                        ['Dry Rot Prevention', selectedProperty.conveyancing_data.property_issues.has_dry_rot_prevention],
                        ['Property Affected', selectedProperty.conveyancing_data.property_issues.is_property_affected],
                        ['Alteration', selectedProperty.conveyancing_data.property_issues.has_alteration]
                      ].map(([issue, hasIssue]) => (
                        <div key={issue} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                          <span className="text-sm text-gray-600">{issue}</span>
                          <Badge variant={hasIssue ? "destructive" : "default"}>
                            {hasIssue ? 'Yes' : 'No'}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </Card>

                  {/* Occupancy History */}
                  <Card className="p-6">
                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                      <Calendar className="h-5 w-5" />
                      Occupancy History
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Owner Since</span>
                          <span className="font-medium">{selectedProperty.conveyancing_data.occupancy_history.owner_since}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Currently Occupied</span>
                          <Badge variant={selectedProperty.conveyancing_data.occupancy_history.is_occupied ? "default" : "secondary"}>
                            {selectedProperty.conveyancing_data.occupancy_history.is_occupied ? 'Yes' : 'No'}
                          </Badge>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Additional Occupied</span>
                          <Badge variant={selectedProperty.conveyancing_data.occupancy_history.is_additional_occupied ? "default" : "secondary"}>
                            {selectedProperty.conveyancing_data.occupancy_history.is_additional_occupied ? 'Yes' : 'No'}
                          </Badge>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Failed Purchase</span>
                          <Badge variant={selectedProperty.conveyancing_data.occupancy_history.has_failed_purchase ? "destructive" : "default"}>
                            {selectedProperty.conveyancing_data.occupancy_history.has_failed_purchase ? 'Yes' : 'No'}
                          </Badge>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Prosecuted</span>
                          <Badge variant={selectedProperty.conveyancing_data.occupancy_history.is_prosecuted ? "destructive" : "default"}>
                            {selectedProperty.conveyancing_data.occupancy_history.is_prosecuted ? 'Yes' : 'No'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </Card>

                  {/* Solar Energy & EPC Potential */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card className="p-6">
                      <h3 className="font-semibold mb-4 flex items-center gap-2">
                        <Zap className="h-5 w-5 text-yellow-500" />
                        Solar Energy
                      </h3>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Installation Year</span>
                          <span className="font-medium">{selectedProperty.conveyancing_data.solar_energy.solar_panel_year_installed || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Solar Panels Owned</span>
                          <Badge variant={selectedProperty.conveyancing_data.solar_energy.solar_panel_owned ? "default" : "secondary"}>
                            {selectedProperty.conveyancing_data.solar_energy.solar_panel_owned ? 'Yes' : 'No'}
                          </Badge>
                        </div>
                      </div>
                    </Card>

                    <Card className="p-6">
                      <h3 className="font-semibold mb-4 flex items-center gap-2">
                        <Zap className="h-5 w-5 text-green-500" />
                        EPC Potential
                      </h3>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Potential EPC Class</span>
                          <Badge variant={getEPCVariant(selectedProperty.conveyancing_data.epc_potential.epc_potential_class)}>
                            {selectedProperty.conveyancing_data.epc_potential.epc_potential_class}
                          </Badge>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Potential Score</span>
                          <span className="font-medium">{selectedProperty.conveyancing_data.epc_potential.epc_potential_score}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Impact Potential Class</span>
                          <Badge variant="secondary">{selectedProperty.conveyancing_data.epc_potential.impact_potential_class}</Badge>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Impact Score</span>
                          <span className="font-medium">{selectedProperty.conveyancing_data.epc_potential.impact_potential_score}</span>
                        </div>
                      </div>
                    </Card>
                  </div>
                </>
              ) : (
                <Card className="p-12 text-center">
                  <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-lg font-semibold mb-2">No Conveyancing Data Available</h3>
                  <p className="text-gray-600">
                    This property does not have associated conveyancing assessment data in the sandbox.
                  </p>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}

function getEPCVariant(rating) {
  if (!rating) return 'secondary';
  switch (rating.toUpperCase()) {
    case 'A':
    case 'B': return 'default'; // Green
    case 'C':
    case 'D': return 'secondary'; // Yellow  
    default: return 'destructive'; // Red for E, F, G
  }
}

export default PropertyViewer;