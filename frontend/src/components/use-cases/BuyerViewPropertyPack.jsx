import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Home, FileText, Download, Shield, Info } from 'lucide-react';
import { pdtfAPI } from '@/lib/api';

function BuyerViewPropertyPack() {
  const [loading, setLoading] = useState(false);
  const [claims, setClaims] = useState([]);

  const fetchPropertyClaims = async () => {
    setLoading(true);
    try {
      // Fetch claims related to property pack
      const result = await pdtfAPI.getClaims({ schema: 'property-pack' });
      setClaims(result.claims || []);
    } catch (error) {
      console.error('Error fetching property claims:', error);
    } finally {
      setLoading(false);
    }
  };

  const mockPropertyData = {
    address: "123 High Street, London, SW1A 1AA",
    price: "£750,000",
    bedrooms: 3,
    bathrooms: 2,
    sqft: 1500,
    yearBuilt: 1920,
    epcRating: "C",
    councilTaxBand: "E"
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-8 rounded-lg">
        <div className="flex items-center gap-3 mb-4">
          <Home className="h-8 w-8 text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-900">Property Pack Viewer</h1>
        </div>
        <p className="text-gray-600">Access comprehensive property information verified through the Property Data Trust Framework</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6 border-blue-200 bg-blue-50/30">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" />
              Property Details
            </h2>
            <Shield className="h-5 w-5 text-green-600" />
          </div>
          
          <div className="space-y-3">
            <div className="flex justify-between py-2 border-b border-blue-100">
              <span className="text-gray-600">Address</span>
              <span className="font-medium">{mockPropertyData.address}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-blue-100">
              <span className="text-gray-600">Price</span>
              <span className="font-medium">{mockPropertyData.price}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-blue-100">
              <span className="text-gray-600">Bedrooms</span>
              <span className="font-medium">{mockPropertyData.bedrooms}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-blue-100">
              <span className="text-gray-600">Bathrooms</span>
              <span className="font-medium">{mockPropertyData.bathrooms}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-blue-100">
              <span className="text-gray-600">Square Feet</span>
              <span className="font-medium">{mockPropertyData.sqft}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-gray-600">Year Built</span>
              <span className="font-medium">{mockPropertyData.yearBuilt}</span>
            </div>
          </div>
        </Card>

        <Card className="p-6 border-blue-200 bg-blue-50/30">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Info className="h-5 w-5 text-blue-600" />
            Compliance & Ratings
          </h2>
          
          <div className="space-y-4">
            <div className="p-4 bg-white rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">EPC Rating</span>
                <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full font-semibold">
                  {mockPropertyData.epcRating}
                </span>
              </div>
            </div>
            
            <div className="p-4 bg-white rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Council Tax Band</span>
                <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full font-semibold">
                  {mockPropertyData.councilTaxBand}
                </span>
              </div>
            </div>

            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="h-4 w-4 text-green-600" />
                <span className="text-sm font-semibold text-green-800">Verified Documents</span>
              </div>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Title Deeds</li>
                <li>• Planning Permissions</li>
                <li>• Building Regulations</li>
                <li>• Environmental Search</li>
              </ul>
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-6 border-blue-200 bg-gradient-to-r from-blue-50/50 to-indigo-50/50">
        <h2 className="text-xl font-semibold mb-4">PDTF Actions</h2>
        <div className="flex gap-4 flex-wrap">
          <Button 
            onClick={fetchPropertyClaims}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {loading ? 'Loading...' : 'Fetch PDTF Claims'}
          </Button>
          <Button variant="outline" className="border-blue-300 text-blue-700 hover:bg-blue-50">
            <Download className="h-4 w-4 mr-2" />
            Download Property Pack
          </Button>
          <Button variant="outline" className="border-green-300 text-green-700 hover:bg-green-50">
            <Shield className="h-4 w-4 mr-2" />
            Verify Documents
          </Button>
        </div>
        
        {claims.length > 0 && (
          <div className="mt-4 p-4 bg-white rounded-lg">
            <h3 className="font-semibold mb-2">Retrieved Claims:</h3>
            <pre className="text-xs bg-gray-50 p-2 rounded overflow-auto">
              {JSON.stringify(claims, null, 2)}
            </pre>
          </div>
        )}
      </Card>
    </div>
  );
}

export default BuyerViewPropertyPack;