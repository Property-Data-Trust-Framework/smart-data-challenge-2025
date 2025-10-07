import { useState } from 'react';
import { ChevronDown, Server, Settings } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Toaster } from '@/components/ui/toaster';
import { PDTFProvider, usePDTF } from '@/contexts/PDTFContext';
import PDTFConfigDialog from '@/components/PDTFConfigDialog';
import BuyerViewPropertyPack from '@/components/use-cases/BuyerViewPropertyPack';
import BuyerConsentAtom from '@/components/use-cases/BuyerConsentAtom';
import SurveyorReportSurvey from '@/components/use-cases/SurveyorReportSurvey';
import PropertyViewer from '@/components/use-cases/PropertyViewer';
import PDTFViewer from '@/components/use-cases/PDTFViewer';
import SellerConsentManagement from '@/components/use-cases/SellerConsentManagement';
import ConveyancingDiligence from '@/components/use-cases/ConveyancingDiligence';
import ListingAndPropertyDIP from '@/components/use-cases/ListingAndPropertyDIP';
import ChainView from '@/components/use-cases/ChainView';
import LenderAVMView from '@/components/use-cases/LenderAVMView';

const useCases = [
  {
    id: 'listing-property-dip',
    name: 'Listing, DSR and Property DIP',
    trl: 'TRL5',
    description: 'OnTheMarket-style listing powered by PDTF claims data',
    component: ListingAndPropertyDIP,
  },
  {
    id: 'property-viewer',
    name: 'SDC Sandbox Data',
    trl: 'TRL6',
    description: 'Smart Data Challenge sandbox data exploration and visualization',
    component: PropertyViewer,
  },
  {
    id: 'pdtf-viewer',
    name: 'PDTF Claims & State',
    trl: 'TRL9',
    description: 'Combining synthetic data, legal forms, and provenance labelling',
    component: PDTFViewer,
  },
  {
    id: 'seller-consent-management',
    name: 'Consent Management Dashboard',
    trl: 'TRL6',
    description: 'Seller can view and control who has access to their data at every stage',
    component: SellerConsentManagement,
  },
  // {
  //   id: 'conveyancing-diligence',
  //   name: 'Seller Conveyancer Workspace',
  //   trl: 'TRL6',
  //   description: 'AI-assisted analysis to highlight potential issues before a buyer is found',
  //   component: ConveyancingDiligence,
  // },
  {
    id: 'buyer-property-pack',
    name: 'Buyer Dashboard View',
    trl: 'TRL6',
    description: 'User-friendly dashboard with summaries and risk flags',
    component: BuyerViewPropertyPack,
  },
  {
    id: 'buyer-consent-atom',
    name: 'Lender Interaction (Atom)',
    trl: 'TRL5',
    description: 'Automated checks against the pack returning mortgage-ready status',
    component: BuyerConsentAtom,
  },
  {
    id: 'lender-avm-view',
    name: 'Lender AVM View (Atom)',
    trl: 'TRL6',
    description: 'Internal lender tool for AVM generation using verified PDTF property data',
    component: LenderAVMView,
  },
  // {
  //   id: 'surveyor-report',
  //   name: 'Surveyor Interface',
  //   trl: 'TRL6',
  //   description: 'Pre-filled valuation report reducing duplication and error',
  //   component: SurveyorReportSurvey,
  // },
  {
    id: 'chain-view',
    name: 'Property Chain Timeline',
    trl: 'TRL6',
    description: 'Visualize transaction progress across the entire property chain',
    component: ChainView,
  },
];

function AppContent() {
  const [selectedUseCase, setSelectedUseCase] = useState(useCases.find(uc => uc.id === 'listing-property-dip') || useCases[0]);
  const [showConfig, setShowConfig] = useState(false);
  const { selectedService, transactionId } = usePDTF();

  const CurrentComponent = selectedUseCase.component;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-gray-800 shadow-lg border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16 gap-4">
            {/* PDTF Config Display */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-sm">
                <Server className="h-4 w-4 text-gray-400" />
                <span className="font-medium text-gray-200">{selectedService.icon} {selectedService.name}</span>
              </div>
              <div className="h-4 w-px bg-gray-600" />
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="font-mono text-xs border-gray-600 text-gray-300">
                  {transactionId}
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowConfig(true)}
                  className="h-7 px-2 text-xs text-gray-300 hover:text-white hover:bg-gray-700"
                >
                  <Settings className="h-3 w-3 mr-1" />
                  Change
                </Button>
              </div>
            </div>

            {/* Use Case Selector */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="min-w-[280px] justify-between bg-gray-700 border-gray-600 text-gray-200 hover:bg-gray-600 hover:text-white">
                  <span className="flex items-center gap-2">
                    {selectedUseCase.trl && (
                      <span className="text-xs bg-blue-600 text-blue-100 px-2 py-0.5 rounded font-mono">
                        {selectedUseCase.trl}
                      </span>
                    )}
                    {selectedUseCase.name}
                  </span>
                  <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[320px]">
                {useCases.map((useCase) => (
                  <DropdownMenuItem
                    key={useCase.id}
                    onClick={() => setSelectedUseCase(useCase)}
                    className="cursor-pointer p-3 flex flex-col items-start gap-1"
                  >
                    <div className="flex items-center gap-2 w-full">
                      {useCase.trl && (
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded font-mono">
                          {useCase.trl}
                        </span>
                      )}
                      <span className="font-medium">{useCase.name}</span>
                    </div>
                    <span className={`text-xs text-gray-500 ${useCase.trl ? 'ml-12' : 'ml-0'}`}>
                      {useCase.description}
                    </span>
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

      {/* PDTF Config Dialog */}
      <PDTFConfigDialog open={showConfig} onOpenChange={setShowConfig} />

      <Toaster />
    </div>
  );
}

function App() {
  return (
    <PDTFProvider>
      <AppContent />
    </PDTFProvider>
  );
}

export default App;