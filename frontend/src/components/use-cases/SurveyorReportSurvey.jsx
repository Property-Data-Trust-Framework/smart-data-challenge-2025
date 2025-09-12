import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { ClipboardCheck, Camera, AlertTriangle, CheckCircle, Upload, FileText } from 'lucide-react';
import { pdtfAPI } from '@/lib/api';

function SurveyorReportSurvey() {
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const mockSurveyData = {
    propertyId: "PROP-2024-001",
    surveyDate: "2024-01-15",
    surveyor: "John Smith MRICS",
    surveyType: "HomeBuyer Report",
    overallCondition: "2 - Satisfactory",
    urgentRepairs: [],
    advisoryRepairs: [
      "Guttering needs cleaning and minor repairs",
      "Garden fence panels need replacement"
    ],
    structuralMovement: "No significant movement observed",
    dampness: "No evidence of dampness",
    timber: "No evidence of timber defects"
  };

  const submitSurveyReport = async () => {
    setSubmitting(true);
    try {
      const claimData = {
        schema: 'surveyor-report',
        subject: mockSurveyData.propertyId,
        data: mockSurveyData,
        timestamp: new Date().toISOString()
      };
      
      const result = await pdtfAPI.createClaim(claimData);
      console.log('Survey report submitted:', result);
      toast({
        title: "Success",
        description: "Survey report successfully submitted to PDTF!",
      });
    } catch (error) {
      console.error('Error submitting survey report:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to submit survey report",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-orange-50 to-amber-50 p-8 rounded-lg">
        <div className="flex items-center gap-3 mb-4">
          <ClipboardCheck className="h-8 w-8 text-orange-600" />
          <h1 className="text-3xl font-bold text-gray-900">Surveyor Report Portal</h1>
        </div>
        <p className="text-gray-600">Submit and manage property survey reports through the Property Data Trust Framework</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-6 border-orange-200 bg-orange-50/30">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <FileText className="h-5 w-5 text-orange-600" />
              Survey Information
            </h2>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-600">Property ID</label>
                <p className="font-medium">{mockSurveyData.propertyId}</p>
              </div>
              <div>
                <label className="text-sm text-gray-600">Survey Date</label>
                <p className="font-medium">{mockSurveyData.surveyDate}</p>
              </div>
              <div>
                <label className="text-sm text-gray-600">Surveyor</label>
                <p className="font-medium">{mockSurveyData.surveyor}</p>
              </div>
              <div>
                <label className="text-sm text-gray-600">Survey Type</label>
                <p className="font-medium">{mockSurveyData.surveyType}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6 border-orange-200 bg-orange-50/30">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Property Condition
            </h2>
            
            <div className="space-y-4">
              <div className="p-4 bg-white rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-medium">Overall Condition</span>
                  <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                    {mockSurveyData.overallCondition}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-3 bg-white rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Structural Movement</p>
                  <p className="text-sm font-medium text-green-600">✓ No issues</p>
                </div>
                <div className="p-3 bg-white rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Dampness</p>
                  <p className="text-sm font-medium text-green-600">✓ No evidence</p>
                </div>
                <div className="p-3 bg-white rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Timber Defects</p>
                  <p className="text-sm font-medium text-green-600">✓ None found</p>
                </div>
              </div>

              {mockSurveyData.advisoryRepairs.length > 0 && (
                <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-4 w-4 text-yellow-600" />
                    <span className="font-medium text-yellow-800">Advisory Repairs</span>
                  </div>
                  <ul className="text-sm text-gray-700 space-y-1">
                    {mockSurveyData.advisoryRepairs.map((repair, index) => (
                      <li key={index}>• {repair}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="p-6 border-orange-200 bg-gradient-to-br from-orange-50 to-amber-50">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Camera className="h-5 w-5 text-orange-600" />
              Evidence & Photos
            </h3>
            <div className="space-y-3">
              <Button variant="outline" className="w-full border-orange-300 text-orange-700 hover:bg-orange-50">
                <Upload className="h-4 w-4 mr-2" />
                Upload Photos
              </Button>
              <div className="grid grid-cols-2 gap-2">
                <div className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center text-gray-400">
                  <Camera className="h-8 w-8" />
                </div>
                <div className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center text-gray-400">
                  <Camera className="h-8 w-8" />
                </div>
                <div className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center text-gray-400">
                  <Camera className="h-8 w-8" />
                </div>
                <div className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center text-gray-400">
                  <Camera className="h-8 w-8" />
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-6 border-green-200 bg-green-50">
            <h3 className="font-semibold mb-4">PDTF Submission</h3>
            <div className="space-y-3">
              <div className="text-sm space-y-2">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span>Report completed</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span>Evidence attached</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span>Ready for submission</span>
                </div>
              </div>
              
              <Button 
                className="w-full bg-green-600 hover:bg-green-700"
                onClick={submitSurveyReport}
                disabled={submitting}
              >
                {submitting ? 'Submitting...' : 'Submit to PDTF'}
              </Button>
              
              <Button variant="outline" className="w-full border-gray-300">
                Save as Draft
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default SurveyorReportSurvey;