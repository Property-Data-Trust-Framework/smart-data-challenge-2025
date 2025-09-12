import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Toaster } from '@/components/ui/toaster';
import BuyerViewPropertyPack from '@/components/use-cases/BuyerViewPropertyPack';
import SurveyorReportSurvey from '@/components/use-cases/SurveyorReportSurvey';
import PropertyViewer from '@/components/use-cases/PropertyViewer';
import MigratedClaimsViewer from '@/components/use-cases/MigratedClaimsViewer';
import PDTFViewer from '@/components/use-cases/PDTFViewer';
import SellerConsentManagement from '@/components/use-cases/SellerConsentManagement';

const useCases = [
  {
    id: 'pdtf-viewer',
    name: 'PDTF Viewer',
    component: PDTFViewer,
  },
  {
    id: 'migrated-claims-viewer',
    name: 'Migrated Claims Viewer',
    component: MigratedClaimsViewer,
  },
  {
    id: 'seller-consent-management',
    name: 'Seller Consent Management',
    component: SellerConsentManagement,
  },
  {
    id: 'property-viewer',
    name: 'Property Data Explorer',
    component: PropertyViewer,
  },
  {
    id: 'buyer-property-pack',
    name: 'Buyer View Property Pack',
    component: BuyerViewPropertyPack,
  },
  {
    id: 'surveyor-report',
    name: 'Surveyor Report Survey',
    component: SurveyorReportSurvey,
  },
];

function App() {
  const [selectedUseCase, setSelectedUseCase] = useState(useCases.find(uc => uc.id === 'seller-consent-management') || useCases[0]); // Start with Seller Consent Management
  
  const CurrentComponent = selectedUseCase.component;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-900">
                PDTF Prototype Showcase
              </h1>
              <span className="ml-3 text-sm text-gray-500">
                Smart Data Challenge 2025
              </span>
            </div>
            
            {/* Use Case Selector */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="min-w-[200px] justify-between">
                  {selectedUseCase.name}
                  <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[200px]">
                {useCases.map((useCase) => (
                  <DropdownMenuItem
                    key={useCase.id}
                    onClick={() => setSelectedUseCase(useCase)}
                    className="cursor-pointer"
                  >
                    {useCase.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <CurrentComponent />
      </main>

      {/* Footer */}
      <footer className="bg-white border-t mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="text-center text-sm text-gray-500">
            <span>© 2025 Moverly Ltd</span>
          </div>
        </div>
      </footer>
      <Toaster />
    </div>
  );
}

export default App;